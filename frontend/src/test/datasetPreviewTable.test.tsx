import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DatasetPreviewTable from '@/components/DatasetPreviewTable'

const rows = [
  { fecha: '2024-01', ventas: 1200, zona: 'Norte' },
  { fecha: '2024-02', ventas: 1500, zona: 'Sur' },
  { fecha: '2024-03', ventas: 900,  zona: 'Este' },
]

describe('DatasetPreviewTable', () => {
  it('renderiza headers de columnas', () => {
    render(<DatasetPreviewTable rows={rows} columns={['fecha','ventas','zona']} />)
    expect(screen.getAllByText('fecha').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ventas').length).toBeGreaterThan(0)
  })

  it('renderiza valores de celdas', () => {
    render(<DatasetPreviewTable rows={rows} columns={['fecha','ventas','zona']} />)
    expect(screen.getByText('Norte')).toBeTruthy()
    expect(screen.getByText('1200')).toBeTruthy()
  })

  it('muestra paginación', () => {
    render(<DatasetPreviewTable rows={rows} columns={['fecha','ventas','zona']} />)
    expect(screen.getByText(/Pág/)).toBeTruthy()
  })

  it('trunca texto largo en celdas', () => {
    const longRows = [{ texto: 'A'.repeat(100) }]
    render(<DatasetPreviewTable rows={longRows} columns={['texto']} />)
    // El valor debe estar truncado con …
    expect(screen.getByText(/A+…/)).toBeTruthy()
  })
})
