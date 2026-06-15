-- 001_datasets.sql
-- Historial de datasets ingestados
-- Almacena metadata + schema inferido + stats de filas

CREATE TABLE IF NOT EXISTS datasets (
  id            VARCHAR(32)   PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  source_type   VARCHAR(16)   NOT NULL CHECK (source_type IN ('csv','excel','json','sql','parquet')),
  row_count     INTEGER       NOT NULL DEFAULT 0,
  column_count  INTEGER       NOT NULL DEFAULT 0,
  file_size     BIGINT        NOT NULL DEFAULT 0,
  schema_json   JSONB         NOT NULL DEFAULT '[]',
  preview_json  JSONB         NOT NULL DEFAULT '[]',
  ingest_status VARCHAR(16)   NOT NULL DEFAULT 'pending'
                CHECK (ingest_status IN ('pending','processing','ready','error')),
  error_msg     TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasets_status     ON datasets (ingest_status);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON datasets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_datasets_source     ON datasets (source_type);

-- Trigger: actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
