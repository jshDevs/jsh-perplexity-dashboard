-- 002_dashboard_configs.sql
-- Configuraciones de dashboards (layout + items)
-- Complementa Redis: PG es el registro histórico persistente,
-- Redis es el cache rápido con TTL 7 días.

CREATE TABLE IF NOT EXISTS dashboard_configs (
  id           VARCHAR(32)   PRIMARY KEY,
  name         VARCHAR(255)  NOT NULL,
  owner_id     VARCHAR(32),
  items_json   JSONB         NOT NULL DEFAULT '[]',
  item_count   INTEGER       NOT NULL DEFAULT 0,
  is_public    BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboards_owner      ON dashboard_configs (owner_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_created_at ON dashboard_configs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboards_public     ON dashboard_configs (is_public) WHERE is_public = TRUE;

CREATE TRIGGER trg_dashboards_updated_at
  BEFORE UPDATE ON dashboard_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
