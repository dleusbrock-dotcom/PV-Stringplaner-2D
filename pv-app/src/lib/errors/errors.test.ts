import { describe, it, expect } from 'vitest'
import {
  AppError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
  handleError,
} from './index'

describe('AppError', () => {
  it('stores code and statusCode', () => {
    const err = new AppError('Fehler', 'TEST', 400)
    expect(err.code).toBe('TEST')
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('Fehler')
  })

  it('is an Error instance', () => {
    expect(new AppError('x', 'X')).toBeInstanceOf(Error)
  })
})

describe('UnauthorizedError', () => {
  it('has 401 statusCode', () => {
    const err = new UnauthorizedError()
    expect(err.statusCode).toBe(401)
    expect(err.code).toBe('UNAUTHORIZED')
  })

  it('accepts a custom message', () => {
    expect(new UnauthorizedError('Custom').message).toBe('Custom')
  })
})

describe('NotFoundError', () => {
  it('has 404 statusCode', () => {
    const err = new NotFoundError('Projekt')
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
  })

  it('includes resource and id in message', () => {
    const err = new NotFoundError('Projekt', 'abc123')
    expect(err.message).toContain('Projekt')
    expect(err.message).toContain('abc123')
  })

  it('works without id', () => {
    const err = new NotFoundError('Nutzer')
    expect(err.message).toContain('Nutzer')
  })
})

describe('ValidationError', () => {
  it('has 422 statusCode', () => {
    const err = new ValidationError('Ungültig')
    expect(err.statusCode).toBe(422)
    expect(err.code).toBe('VALIDATION_ERROR')
  })

  it('stores details', () => {
    const err = new ValidationError('Fehler', { field: 'email' })
    expect(err.details).toEqual({ field: 'email' })
  })
})

describe('ForbiddenError', () => {
  it('has 403 statusCode', () => {
    expect(new ForbiddenError().statusCode).toBe(403)
  })
})

describe('ConflictError', () => {
  it('has 409 statusCode', () => {
    expect(new ConflictError('Konflikt').statusCode).toBe(409)
  })
})

describe('handleError', () => {
  it('handles AppError correctly', () => {
    const result = handleError(new UnauthorizedError())
    expect(result.statusCode).toBe(401)
    expect(result.code).toBe('UNAUTHORIZED')
  })

  it('handles unknown errors with 500', () => {
    const result = handleError(new Error('boom'))
    expect(result.statusCode).toBe(500)
    expect(result.code).toBe('INTERNAL_ERROR')
  })

  it('handles non-Error values', () => {
    const result = handleError('string error')
    expect(result.statusCode).toBe(500)
  })
})
