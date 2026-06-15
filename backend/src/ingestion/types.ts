export type IngestFormat = 'csv' | 'excel' | 'json'

export interface IngestJob {
  jobId:      string
  datasetId:  string
  filename:   string
  format:     IngestFormat
  filePath:   string
  uploadedAt: string
  status:     'pending' | 'processing' | 'done' | 'error'
  rowCount?:  number
  error?:     string
}

export interface ParsedDataset {
  datasetId: string
  filename:  string
  format:    IngestFormat
  rows:      Record<string, unknown>[]
  rowCount:  number
  columns:   string[]
  sheets?:   string[]   // Excel multi-hoja
  warnings:  string[]
}
