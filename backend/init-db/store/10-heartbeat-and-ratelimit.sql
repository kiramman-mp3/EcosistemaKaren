-- Tabla para sincronización de latido de tienda física entre réplicas del backend
CREATE TABLE IF NOT EXISTS tienda_heartbeat (
  id INT PRIMARY KEY DEFAULT 1,
  last_heartbeat_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para rate limiting distribuido entre réplicas
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  key VARCHAR(255) PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_reset ON rate_limit_hits(reset_at);
