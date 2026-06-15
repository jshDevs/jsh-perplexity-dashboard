import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TimeIntelligenceBar from '@/components/TimeIntelligenceBar'

describe('TimeIntelligenceBar', () => {
  it('renders all presets', () => {
    const handler = vi.fn()
    render(<TimeIntelligenceBar onPresetChange={handler} onCompareChange={vi.fn()} />)
    expect(screen.getByText('Últ. 7d')).toBeTruthy()
    expect(screen.getByText('YTD')).toBeTruthy()
    expect(screen.getByText('Todo')).toBeTruthy()
  })

  it('calls onPresetChange with preset id on click', () => {
    const handler = vi.fn()
    render(<TimeIntelligenceBar onPresetChange={handler} onCompareChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Últ. 30d'))
    expect(handler).toHaveBeenCalledWith('last_30_days')
  })

  it('calls onCompareChange when compare mode selected', () => {
    const handler = vi.fn()
    render(<TimeIntelligenceBar onPresetChange={vi.fn()} onCompareChange={handler} />)
    fireEvent.click(screen.getByText('vs Período anterior'))
    expect(handler).toHaveBeenCalledWith('previous')
  })

  it('highlights active preset', () => {
    render(
      <TimeIntelligenceBar
        onPresetChange={vi.fn()}
        onCompareChange={vi.fn()}
        activePreset="year_to_date"
      />
    )
    const btn = screen.getByText('YTD')
    expect(btn.className).toContain('bg-indigo-600')
  })
})
