<#
.SYNOPSIS
  Despliega portal-api + portal web en Azure (Container Apps + PostgreSQL Flexible Server).

.DESCRIPTION
  Primera vez:      .\deploy\azure\deploy.ps1
  Nueva versión:    .\deploy\azure\deploy.ps1 -UpdateOnly
  Requiere Azure CLI (az) con sesión iniciada (`az login`). Ver docs/azure.md.

  Los secretos se generan una vez y se guardan en deploy/azure/.secrets.<Name>.json (ignorado por
  git). Esa misma clave STORE_SERVICE_KEY va en el .env de la tienda.
#>
[CmdletBinding()]
param(
  [string]$Name = 'karen',
  # Azure for Students limita las regiones permitidas; si falla, prueba otra (az account list-locations).
  [string]$Location = 'eastus2',
  [string]$ResourceGroup = '',
  [switch]$UpdateOnly
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
if (-not $ResourceGroup) { $ResourceGroup = "rg-$Name" }
$secretsFile = Join-Path $PSScriptRoot ".secrets.$Name.json"

function Invoke-Az {
  # `az` es un ejecutable nativo: $ErrorActionPreference no detiene el script si falla.
  $output = & az @args
  if ($LASTEXITCODE -ne 0) { throw "az $($args -join ' ') falló (código $LASTEXITCODE)." }
  return $output
}

function New-Secret([int]$Length = 48) {
  # Solo alfanuméricos: sirven tal cual en URLs, variables de entorno y en la contraseña de Postgres.
  $chars = [char[]]'abcdefghijkmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ23456789'
  $bytes = New-Object byte[] $Length
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw 'Falta Azure CLI. Instálala con: winget install -e --id Microsoft.AzureCLI'
}
Invoke-Az account show --query id -o tsv | Out-Null

# --- Secretos y nombres (se conservan entre ejecuciones) ----------------------------------------
if (Test-Path $secretsFile) {
  $cfg = Get-Content $secretsFile -Raw | ConvertFrom-Json
} else {
  if ($UpdateOnly) { throw "No existe ${secretsFile}: ejecuta primero el despliegue completo." }
  $suffix = -join ((1..5) | ForEach-Object { Get-Random -Maximum 10 })
  $cfg = [pscustomobject]@{
    suffix         = $suffix
    dbPassword     = New-Secret 32
    jwtSecret      = New-Secret 48
    storeServiceKey = New-Secret 48
  }
  $cfg | ConvertTo-Json | Set-Content -Path $secretsFile -Encoding UTF8
  Write-Host "Secretos generados en $secretsFile (no lo subas a git)."
}

$acrName   = ("$Name" + "acr" + $cfg.suffix) -replace '[^a-zA-Z0-9]', ''
$dbServer  = "$Name-pg-$($cfg.suffix)"
$dbName    = 'karen_portal'
$dbUser    = 'karenadmin'
$envName   = "$Name-env"
$appName   = "$Name-portal"
$image     = "$acrName.azurecr.io/karen-portal"
$tag       = (Get-Date -Format 'yyyyMMdd-HHmmss')

if (-not $UpdateOnly) {
  Write-Host '==> Proveedores de recursos'
  foreach ($ns in 'Microsoft.App', 'Microsoft.OperationalInsights', 'Microsoft.ContainerRegistry', 'Microsoft.DBforPostgreSQL') {
    Invoke-Az provider register --namespace $ns | Out-Null
  }
  Invoke-Az extension add --name containerapp --upgrade --only-show-errors | Out-Null

  Write-Host "==> Grupo de recursos $ResourceGroup ($Location)"
  Invoke-Az group create --name $ResourceGroup --location $Location | Out-Null

  Write-Host "==> Registro de contenedores $acrName"
  Invoke-Az acr create --name $acrName --resource-group $ResourceGroup --sku Basic --admin-enabled true | Out-Null

  Write-Host "==> PostgreSQL $dbServer (tarda varios minutos)"
  # 0.0.0.0 = "servicios de Azure": Container Apps no tiene IP de salida fija en el plan Consumption.
  # La base exige TLS y contraseña; ver docs/azure.md sobre cómo restringirla más.
  Invoke-Az postgres flexible-server create `
    --name $dbServer --resource-group $ResourceGroup --location $Location `
    --admin-user $dbUser --admin-password $cfg.dbPassword `
    --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 14 `
    --public-access 0.0.0.0 --yes | Out-Null
  Invoke-Az postgres flexible-server db create `
    --resource-group $ResourceGroup --server-name $dbServer --database-name $dbName | Out-Null

  Write-Host "==> Entorno de Container Apps $envName"
  Invoke-Az containerapp env create --name $envName --resource-group $ResourceGroup --location $Location | Out-Null
}

Write-Host "==> Construyendo la imagen en Azure ($tag)"
Push-Location $root
try {
  Invoke-Az acr build --registry $acrName --image "karen-portal:$tag" --file deploy/azure/Dockerfile.portal . | Out-Null
} finally {
  Pop-Location
}

$domain = (Invoke-Az containerapp env show --name $envName --resource-group $ResourceGroup --query properties.defaultDomain -o tsv).Trim()
$fqdn = "$appName.$domain"

if ($UpdateOnly) {
  Write-Host '==> Publicando nueva revisión'
  Invoke-Az containerapp update --name $appName --resource-group $ResourceGroup --image "${image}:$tag" | Out-Null
} else {
  Write-Host "==> Creando la aplicación $appName"
  $acrPassword = (Invoke-Az acr credential show --name $acrName --query 'passwords[0].value' -o tsv).Trim()
  # DB_* (no PORTAL_DB_*): en un despliegue solo del portal los DB_* bastan y producción exige DB_PASSWORD.
  # max-replicas 1: el límite de tasa general se lleva en memoria de cada instancia.
  Invoke-Az containerapp create `
    --name $appName --resource-group $ResourceGroup --environment $envName `
    --image "${image}:$tag" `
    --registry-server "$acrName.azurecr.io" --registry-username $acrName --registry-password $acrPassword `
    --target-port 4001 --ingress external `
    --min-replicas 1 --max-replicas 1 --cpu 0.5 --memory 1.0Gi `
    --secrets "db-password=$($cfg.dbPassword)" "jwt-secret=$($cfg.jwtSecret)" "store-service-key=$($cfg.storeServiceKey)" `
    --env-vars `
      "DB_HOST=$dbServer.postgres.database.azure.com" "DB_PORT=5432" "DB_NAME=$dbName" "DB_USER=$dbUser" `
      "DB_SSL=true" "DB_PASSWORD=secretref:db-password" `
      "JWT_SECRET=secretref:jwt-secret" "STORE_SERVICE_KEY=secretref:store-service-key" `
      "CORS_ORIGINS=https://$fqdn" "TRUST_PROXY_HOPS=1" | Out-Null
}

Write-Host ''
Write-Host "Listo: https://$fqdn"
Write-Host "Salud:  https://$fqdn/readyz"
Write-Host ''
Write-Host 'Para la PC de la tienda (.env.store):'
Write-Host "  PORTAL_URL=https://$fqdn"
Write-Host "  STORE_SERVICE_KEY=$($cfg.storeServiceKey)"
