import { describe, it, expect } from 'vitest'
import { parseFindings, scoreOf, validateAuditUrl } from './audit'

const page = 'Run npm install. Then set the API_KEY variable before you start the server.'
const good = { kind: 'missing_prereq', severity: 3, quote: 'set the API_KEY variable', issue: 'Where do I get a key?', suggestion: 'Link to key creation.' }

describe('parseFindings', () => {
  it('keeps findings quoted from the page', () => {
    const r = parseFindings(JSON.stringify({ findings: [good] }), page)
    expect(r.findings).toHaveLength(1)
  })
  it('drops invented quotes', () => {
    const r = parseFindings(JSON.stringify({ findings: [{ ...good, quote: 'install the Rust toolchain first' }] }), page)
    expect(r.findings).toHaveLength(0)
    expect(r.dropped).toBe(1)
  })
  it('survives fenced or garbage output', () => {
    expect(parseFindings('```json\n' + JSON.stringify({ findings: [good] }) + '\n```', page).findings).toHaveLength(1)
    expect(parseFindings('nope', page).ok).toBe(false)
  })
})

describe('scoreOf', () => {
  it('never goes below 0', () => {
    expect(scoreOf(Array(20).fill({ ...good }))).toBe(0)
  })
})


describe('validateAuditUrl', () => {
  it('accepts a normal https docs URL', () => {
    expect(validateAuditUrl('https://docs.example.com/quickstart').ok).toBe(true)
  })
  it('rejects http, localhost, IPs and junk', () => {
    for (const bad of ['http://docs.example.com', 'https://localhost/x', 'https://10.0.0.1/', 'https://[::1]/', 'not a url', 42]) {
      expect(validateAuditUrl(bad).ok).toBe(false)
    }
  })
})