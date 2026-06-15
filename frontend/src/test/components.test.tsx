import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import KPICard          from '@/components/KPICard'
import DataTable        from '@/components/DataTable'
import InsightsPanel    from '@/components/InsightsPanel'

describe('KPICard', () => {
  it('renders label and value', () => {
    render(<KPICard label="Incidentes" value={1234} />)
    expect(screen.getByText('Incidentes')).toBeTruthy()
    // formatted number contains digits
    expect(screen.getByText(/1[.,]234|1234/)).toBeTruthy()
  })

  it('renders currency format', () => {
    render(<KPICard label="Revenue" value={5000} format="currency" />)
    expect(screen.getByText(/\$|5[.,]000/)).toBeTruthy()
  })

  it('renders percent format', () => {
    render(<KPICard label="Rate" value={42.5} format="percent" />)
    expect(screen.getByText(/42\.5%/)).toBeTruthy()
  })

  it('renders upward trend arrow', () => {
    render(<KPICard label="Sales" value={100} trend={12.5} />)
    expect(screen.getByText(/▲/)).toBeTruthy()
    expect(screen.getByText(/12\.5%/)).toBeTruthy()
  })

  it('renders downward trend arrow', () => {
    render(<KPICard label="Sales" value={100} trend={-5.3} />)
    expect(screen.getByText(/▼/)).toBeTruthy()
  })
})

describe('DataTable', () => {
  const mockData = [
    { name: 'Jorge', age: 30, ciudad: 'San Salvador' },
    { name: 'Ana',   age: 25, ciudad: 'Santa Ana'    },
    { name: 'Luis',  age: 28, ciudad: 'San Miguel'   },
  ]

  it('renders all rows', () => {
    render(<DataTable data={mockData} />)
    expect(screen.getByText('Jorge')).toBeTruthy()
    expect(screen.getByText('Ana')).toBeTruthy()
    expect(screen.getByText('Luis')).toBeTruthy()
  })

  it('renders column headers auto-generated', () => {
    render(<DataTable data={mockData} />)
    expect(screen.getByText('name')).toBeTruthy()
    expect(screen.getByText('age')).toBeTruthy()
    expect(screen.getByText('ciudad')).toBeTruthy()
  })

  it('renders empty state gracefully', () => {
    render(<DataTable data={[]} />)
    // Should not throw
    expect(screen.queryByRole('table')).toBeTruthy()
  })

  it('shows pagination controls', () => {
    render(<DataTable data={mockData} pageSize={2} />)
    expect(screen.getByText(/Anterior/)).toBeTruthy()
    expect(screen.getByText(/Siguiente/)).toBeTruthy()
  })

  it('next page button is disabled when on last page with few rows', () => {
    render(<DataTable data={mockData.slice(0, 1)} pageSize={5} />)
    const btn = screen.getByText('Siguiente')
    expect(btn).toBeDisabled()
  })
})

describe('InsightsPanel', () => {
  it('renders nothing when empty', () => {
    const { container } = render(
      <InsightsPanel insights={[]} warnings={[]} questions={[]} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders insight text', () => {
    render(
      <InsightsPanel
        insights={[{ type: 'trend', text: 'Los incidentes aumentaron 15% esta semana.' }]}
      />
    )
    expect(screen.getByText(/aumentaron 15%/)).toBeTruthy()
  })

  it('renders question for user and fires onAnswer', () => {
    const onAnswer = vi.fn()
    render(
      <InsightsPanel
        insights={[]}
        questions={[{ field: 'zona', question: '¿Cómo clasificar zona?', options: ['dimension', 'metric'] }]}
        onAnswer={onAnswer}
      />
    )
    expect(screen.getByText(/Cómo clasificar zona/)).toBeTruthy()
    fireEvent.click(screen.getByText('dimension'))
    expect(onAnswer).toHaveBeenCalledWith('zona', 'dimension')
  })

  it('renders warnings in collapsible details', () => {
    render(
      <InsightsPanel
        insights={[]}
        warnings={[
          { code: 'high_null_rate', detail: 'Campo X tiene 45% nulos', field: 'x' },
        ]}
      />
    )
    expect(screen.getByText(/advertencia/)).toBeTruthy()
  })
})
