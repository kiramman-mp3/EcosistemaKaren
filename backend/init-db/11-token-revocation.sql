-- Tabla para revocación de tokens JWT (Blacklist / Cierre de sesión)
CREATE TABLE IF NOT EXISTS tokens_revocados (
  jti VARCHAR(100) PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_en TIMESTAMPTZ NOT NULL,
  revocado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_revocados_expira ON tokens_revocados(expira_en);
