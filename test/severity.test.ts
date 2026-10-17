import { describe, expect, it } from 'vitest'
import { FIBRE_SEVERITY_ALIASES, FIBRE_SEVERITY_TERMS, SEVERITY, SEVERITY_KEYS, STATE } from '../src/tokens'

describe('severity contract', () => {
  it('has the seven canonical keys, in palette order', () => {
    expect(SEVERITY_KEYS).toEqual(['critical', 'major', 'moderate', 'minor', 'warning', 'info', 'healthy'])
  })

  it('maps every Fibre term, and nothing else, onto a canonical key', () => {
    expect(Object.keys(FIBRE_SEVERITY_ALIASES).sort()).toEqual([...FIBRE_SEVERITY_TERMS].sort())
    for (const target of Object.values(FIBRE_SEVERITY_ALIASES)) expect(SEVERITY_KEYS).toContain(target)
  })

  it('keeps the shared terms as themselves', () => {
    for (const term of ['critical', 'major', 'minor', 'warning', 'info', 'healthy'] as const) expect(FIBRE_SEVERITY_ALIASES[term]).toBe(term)
  })

  it('never lets degraded collapse into critical', () => {
    expect(FIBRE_SEVERITY_ALIASES.degraded).toBe('major')
    expect(SEVERITY[FIBRE_SEVERITY_ALIASES.degraded]).not.toBe(SEVERITY.critical)
  })

  it('reads cleared as healthy, the product success state', () => {
    expect(FIBRE_SEVERITY_ALIASES.cleared).toBe('healthy')
    expect(SEVERITY[FIBRE_SEVERITY_ALIASES.cleared]).toBe(STATE.validated)
  })

  it('critical shares the degraded state colour, so a critical cell and a degraded agent read alike', () => {
    expect(SEVERITY.critical).toBe(STATE.degraded)
  })
})
