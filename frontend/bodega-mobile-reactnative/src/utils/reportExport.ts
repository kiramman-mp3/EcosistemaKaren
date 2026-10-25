import { InventoryMovement, InventoryWaste } from '../types';
import { STORE_INFO } from '../config/storeInfo';
import { formatDateTime } from './dates';

export const MOVEMENT_LABEL: Record<string, string> = {
  INGRESO: 'Ingreso', TRASLADO: 'Traslado', MERMA: 'Merma', RESERVA: 'Reserva web',
  LIBERACION: 'Liberación', VENTA: 'Venta', VENCIMIENTO: 'Vencimiento', AJUSTE: 'Ajuste',
};

export const money = (value?: number | null) => value == null ? 'No registrado' : `$${Number(value).toFixed(2)}`;

// Cifras de los indicadores con separador de miles: "$14,480.77", "36,488".
const thousands = (value: number, decimals: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
export const formatAmount = (value: number) => `$${thousands(Number(value) || 0, 2)}`;
export const formatCount = (value: number) => thousands(Number(value) || 0, 0);

export interface ReportTotals { ingresos: number; ventas: number; mermas: number; costoMerma: number }

export interface ReportData {
  totals: ReportTotals;
  wastes: InventoryWaste[];
  movements: InventoryMovement[];
  issuedAt: Date;
}

/** Texto seguro para insertar en HTML: los nombres de producto y los motivos los escribe el personal. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Celda de CSV. Los textos van entre comillas y, si empiezan por un carácter que Excel interpreta como fórmula
 * (= + - @ o tabulación), se les antepone una comilla simple para que se muestren como texto y no se ejecuten.
 * Los números se escriben tal cual.
 */
export function csvCell(value: unknown): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const csvRow = (cells: unknown[]) => cells.map(csvCell).join(',');

export function buildCsv({ totals, wastes, movements, issuedAt }: ReportData): string {
  const lines: string[] = [];
  lines.push(csvRow([`${STORE_INFO.tradeName.toUpperCase()} - REPORTE DE MOVIMIENTOS Y MERMAS`]));
  lines.push(csvRow(['Fecha de emisión', issuedAt.toLocaleString('es-EC')]));
  lines.push(csvRow(['Razón social', STORE_INFO.legalName]));
  lines.push(csvRow(['RUC', STORE_INFO.ruc]));
  lines.push(csvRow(['Dirección', `${STORE_INFO.address}, ${STORE_INFO.city}`]));
  lines.push('');
  lines.push(csvRow(['RESUMEN DE MÉTRICAS']));
  lines.push(csvRow(['Unidades recibidas', totals.ingresos]));
  lines.push(csvRow(['Unidades vendidas', totals.ventas]));
  lines.push(csvRow(['Unidades de merma', totals.mermas]));
  lines.push(csvRow(['Costo total de merma', Number(totals.costoMerma.toFixed(2))]));
  lines.push('');
  lines.push(csvRow(['BAJAS Y MERMAS']));
  lines.push(csvRow(['ID', 'Producto', 'Lote', 'Motivo', 'Cantidad', 'Costo total', 'Responsable', 'Fecha']));
  for (const item of wastes) {
    lines.push(csvRow([
      item.id, item.productoNombre || '', item.numeroLote || item.loteId, item.razon, item.cantidad,
      Number(item.costoTotal || 0).toFixed(2), item.registradaPorNombre || '', item.created_at,
    ]));
  }
  lines.push('');
  lines.push(csvRow(['MOVIMIENTOS DE INVENTARIO']));
  lines.push(csvRow([
    'ID', 'Tipo', 'Producto', 'Código de barras', 'Lote', 'Cantidad', 'Disponible antes', 'Disponible después',
    'Ubicación origen', 'Ubicación destino', 'Costo unitario', 'PVP', 'Responsable', 'Fecha',
  ]));
  for (const item of movements) {
    lines.push(csvRow([
      item.id, MOVEMENT_LABEL[item.tipo] || item.tipo, item.productoNombre || '', item.codigoBarras || '',
      item.numeroLote || item.loteId, item.cantidad, item.disponibleAntes, item.disponibleDespues,
      item.ubicacionOrigen || '', item.ubicacionDestino || '', Number(item.costoUnitario || 0).toFixed(2),
      Number(item.precioVenta || 0).toFixed(2), item.actorNombre || '', item.created_at,
    ]));
  }
  // El BOM hace que Excel abra el archivo como UTF-8 (tildes y ñ).
  return `﻿${lines.join('\r\n')}`;
}

export function buildReportHtml({ totals, wastes, movements, issuedAt }: ReportData): string {
  const e = escapeHtml;
  const wasteRows = wastes.map(item => `
    <tr>
      <td><strong>${e(item.productoNombre || 'Sin nombre')}</strong></td>
      <td>${e(item.numeroLote || item.loteId.slice(0, 8))}</td>
      <td>${e(item.razon)}</td>
      <td class="alert">-${e(item.cantidad)}</td>
      <td>${e(money(item.costoTotal))}</td>
      <td>${e(formatDateTime(item.created_at))}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;">Sin bajas registradas</td></tr>';
  const movementRows = movements.map(item => `
    <tr>
      <td><strong>${e(MOVEMENT_LABEL[item.tipo] || item.tipo)}</strong></td>
      <td>${e(item.productoNombre || 'Sin nombre')}</td>
      <td>${e(item.numeroLote || item.loteId.slice(0, 8))}</td>
      <td>${e(item.cantidad)}</td>
      <td>${e(item.ubicacionOrigen || '—')} → ${e(item.ubicacionDestino || '—')}</td>
      <td>${e(formatDateTime(item.created_at))}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;">Sin movimientos</td></tr>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Reporte de movimientos y mermas - ${e(STORE_INFO.tradeName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #2A1D14; background: #FFF; margin: 0; }
    .header { border-bottom: 3px solid #2A1D14; padding-bottom: 14px; margin-bottom: 20px; }
    .brand { font-size: 26px; font-weight: 800; color: #C42418; margin: 0; }
    .sub { color: #6E5E50; font-size: 12px; margin-top: 4px; }
    .kpis { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
    .kpi { flex: 1 1 140px; background: #FBF6EC; border: 2px solid #2A1D14; border-radius: 12px; padding: 12px; }
    .kpi-val { font-size: 24px; font-weight: 900; margin-bottom: 4px; }
    .kpi-lbl { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #6E5E50; }
    .alert { color: #C42418; font-weight: bold; }
    .sec-title { font-size: 16px; font-weight: 800; margin: 24px 0 10px; border-left: 5px solid #FFD400; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    th { background: #FFD400; border: 1.5px solid #2A1D14; padding: 8px; text-align: left; font-weight: 800; }
    td { border: 1px solid #EADFCB; padding: 6px 8px; }
    tr:nth-child(even) { background: #FBF6EC; }
    .footer { margin-top: 32px; border-top: 1px solid #EADFCB; padding-top: 10px; font-size: 10px; color: #9A8A76; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="brand">${e(STORE_INFO.tradeName)}</h1>
    <div class="sub">Sistema de bodega · Reporte de movimientos y bajas</div>
    <div class="sub"><strong>Emitido:</strong> ${e(issuedAt.toLocaleDateString('es-EC'))} ${e(issuedAt.toLocaleTimeString('es-EC'))} · ${e(STORE_INFO.legalName)} · RUC ${e(STORE_INFO.ruc)} · ${e(STORE_INFO.address)}, ${e(STORE_INFO.city)}</div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-val">${e(totals.ingresos)}</div><div class="kpi-lbl">Unidades recibidas</div></div>
    <div class="kpi"><div class="kpi-val">${e(totals.ventas)}</div><div class="kpi-lbl">Unidades vendidas</div></div>
    <div class="kpi"><div class="kpi-val">${e(totals.mermas)}</div><div class="kpi-lbl">Unidades de merma</div></div>
    <div class="kpi"><div class="kpi-val alert">$${e(totals.costoMerma.toFixed(2))}</div><div class="kpi-lbl">Costo total de merma</div></div>
  </div>

  <div class="sec-title">Bajas registradas y mermas (${wastes.length})</div>
  <table>
    <thead><tr><th>Producto</th><th>Lote</th><th>Motivo</th><th>Cantidad</th><th>Costo total</th><th>Fecha y hora</th></tr></thead>
    <tbody>${wasteRows}</tbody>
  </table>

  <div class="sec-title">Últimos movimientos de inventario (${movements.length})</div>
  <table>
    <thead><tr><th>Tipo</th><th>Producto</th><th>Lote</th><th>Cantidad</th><th>Ubicación</th><th>Fecha y hora</th></tr></thead>
    <tbody>${movementRows}</tbody>
  </table>

  <div class="footer">Generado por el sistema de bodega de ${e(STORE_INFO.tradeName)}.</div>
</body>
</html>`;
}
