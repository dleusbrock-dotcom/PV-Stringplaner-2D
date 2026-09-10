import { describe, it, expect } from 'vitest'
import {
  cn,
  formatDate,
  formatDateTime,
  formatPower,
  generateProjectNumber,
  truncate,
} from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('resolves tailwind conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('ignores falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c')
  })
})

describe('formatDate', () => {
  it('formats a date in German locale', () => {
    const result = formatDate(new Date('2024-03-15'))
    expect(result).toBe('15.03.2024')
  })

  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('–')
  })

  it('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('–')
  })

  it('handles ISO string input', () => {
    const result = formatDate('2024-01-01')
    expect(result).toBe('01.01.2024')
  })
})

describe('formatDateTime', () => {
  it('returns dash for null', () => {
    expect(formatDateTime(null)).toBe('–')
  })

  it('includes time in output', () => {
    const result = formatDateTime(new Date('2024-06-15T10:30:00'))
    // Should contain date and time
    expect(result).toMatch(/15\.06\.2024/)
    expect(result).toMatch(/\d{2}:\d{2}/)
  })
})

describe('formatPower', () => {
  it('formats Watts', () => {
    expect(formatPower(400)).toBe('400 Wp')
  })

  it('formats kWp for values >= 1000', () => {
    expect(formatPower(5000)).toBe('5.00 kWp')
    expect(formatPower(10000)).toBe('10.00 kWp')
  })

  it('returns dash for null', () => {
    expect(formatPower(null)).toBe('–')
  })

  it('returns dash for undefined', () => {
    expect(formatPower(undefined)).toBe('–')
  })

  it('returns dash for zero', () => {
    expect(formatPower(0)).toBe('–')
  })
})

describe('generateProjectNumber', () => {
  it('matches PV-YYYYMM-XXXX format', () => {
    const num = generateProjectNumber()
    expect(num).toMatch(/^PV-\d{6}-\d{4}$/)
  })

  it('generates unique numbers', () => {
    const numbers = Array.from({ length: 10 }, generateProjectNumber)
    const unique = new Set(numbers)
    // With 10000 possible random suffixes, collision probability is extremely low
    expect(unique.size).toBeGreaterThan(8)
  })

  it('uses current year and month', () => {
    const now = new Date()
    const year = now.getFullYear().toString()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const num = generateProjectNumber()
    expect(num).toContain(`PV-${year}${month}-`)
  })
})

describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates long strings with ellipsis', () => {
    const result = truncate('Hello World', 8)
    expect(result).toHaveLength(8)
    expect(result.endsWith('…')).toBe(true)
  })

  it('does not truncate exactly at limit', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })
})
