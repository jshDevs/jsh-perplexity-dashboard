import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DynamicChart from '@/components/DynamicChart'

// Stub ChartRenderer — no real canvas in jsdom
vi.mock('@/charts/ChartRenderer', () => ({
  default: ({ chartType }: { chartType: string }) => (
    <div data-testid="chart-renderer" data-type={chartType}>chart:{chartType}</div>
  ),
}))

// Stub Zustand store
vi.mock('@/store/dashboardStore', () => ({
  useDashboardStore: vi.fn().mockReturnValue(() => {}),
}))

const mockData = [
  { fecha: '2024-01', incidentes: 10, zona: 'Norte' },
  { fecha: '2024-02', incidentes: 15, zona: 'Sur' },
]

describe('DynamicChart', () => {
  it('renders chart title', () => {
    render(
      <DynamicChart
        chart={{ type: 'bar', title: 'Incidentes por zona', x_key: 'zona', y_key: 'incidentes' }}
        data={mockData}
        datasetId="ds-1"
      />
    )
    expect(screen.getByText('Incidentes por zona')).toBeTruthy()
  })

  it('shows engine badge', () => {
    render(
      <DynamicChart
        chart={{ type: 'bar' }}
        data={mockData}
        datasetId="ds-1"
      />
    )
    expect(screen.getByText('echarts')).toBeTruthy()
  })

  it('shows plotly badge for violin', () => {
    render(
      <DynamicChart
        chart={{ type: 'violin' }}
        data={mockData}
        datasetId="ds-1"
      />
    )
    expect(screen.getByText('plotly')).toBeTruthy()
  })

  it('opens chart picker when settings icon clicked', () => {
    render(
      <DynamicChart
        chart={{ type: 'bar' }}
        data={mockData}
        datasetId="ds-1"
      />
    )
    const settingsBtn = screen.getByTitle('Cambiar tipo de gráfica')
    fireEvent.click(settingsBtn)
    // ChartTypePicker renders group headers
    expect(screen.getByText(/ECharts — básicos/i)).toBeTruthy()
  })

  it('switches chart type via picker', () => {
    render(
      <DynamicChart
        chart={{ type: 'bar' }}
        data={mockData}
        datasetId="ds-1"
      />
    )
    fireEvent.click(screen.getByTitle('Cambiar tipo de gráfica'))
    fireEvent.click(screen.getByText('line'))
    expect(screen.getByTestId('chart-renderer').dataset.type).toBe('line')
  })

  it('shows 3D badge for 3D chart types', () => {
    render(
      <DynamicChart
        chart={{ type: 'bar3d' }}
        data={mockData}
        datasetId="ds-1"
      />
    )
    expect(screen.getByText('3D')).toBeTruthy()
  })
})
