import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, format: 'number' | 'currency' | 'percent' | 'decimal' = 'number'): string {
  switch (format) {
    case 'currency': return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value)
    case 'percent':  return `${value.toFixed(2)}%`
    case 'decimal':  return value.toFixed(2)
    default:         return new Intl.NumberFormat('es-SV').format(value)
  }
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key])
    acc[k]  = acc[k] ?? []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}
