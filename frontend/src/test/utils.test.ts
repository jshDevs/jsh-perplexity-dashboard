import { describe, it, expect } from 'vitest'
import { cn, formatNumber, groupBy } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
  it('deduplicates tailwind classes', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })
})

describe('formatNumber', () => {
  it('formats currency', () => {
    const result = formatNumber(1234.5, 'currency')
    expect(result).toContain('1')
    expect(result).toContain('234')
  })
  it('formats percent', () => {
    expect(formatNumber(45.678, 'percent')).toBe('45.68%')
  })
  it('formats decimal', () => {
    expect(formatNumber(3.14159, 'decimal')).toBe('3.14')
  })
})

describe('groupBy', () => {
  it('groups objects by key', () => {
    const data = [
      { cat: 'A', v: 1 },
      { cat: 'B', v: 2 },
      { cat: 'A', v: 3 },
    ]
    const result = groupBy(data, 'cat')
    expect(result['A']).toHaveLength(2)
    expect(result['B']).toHaveLength(1)
  })
})
