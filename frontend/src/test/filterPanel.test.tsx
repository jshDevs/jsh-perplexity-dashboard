import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterPanel from '@/components/FilterPanel'
import type { DashboardConfig } from '@/types/dashboard'

const mockConfig: DashboardConfig = {
  version:    '1.0',
  title:      'Test Dashboard',
  datasource: { type: 'csv', path: 'test.csv' },
  time_dimension: { column: 'fecha', granularities: ['day', 'week', 'month'] },
  dimensions: [
    { name: 'distrito', column: 'distrito', label: 'Distrito', filter_type: 'multiselect' },
  ],
}

describe('FilterPanel', () => {
  it('renders time period inputs when time_dimension present', () => {
    render(<FilterPanel config={mockConfig} />)
    expect(screen.getByText(/Periodo/i)).toBeTruthy()
  })

  it('renders granularity buttons', () => {
    render(<FilterPanel config={mockConfig} />)
    expect(screen.getByText('day')).toBeTruthy()
    expect(screen.getByText('week')).toBeTruthy()
    expect(screen.getByText('month')).toBeTruthy()
  })

  it('renders dimension filter inputs', () => {
    render(<FilterPanel config={mockConfig} />)
    expect(screen.getByPlaceholderText(/Filtrar Distrito/i)).toBeTruthy()
  })

  it('no time inputs when no time_dimension', () => {
    const noTimeConfig = { ...mockConfig, time_dimension: undefined }
    render(<FilterPanel config={noTimeConfig} />)
    expect(screen.queryByText(/Periodo/i)).toBeNull()
  })
})
