import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { buildPrompt, parseFindings, scoreOf, validateAuditUrl } from '../lib/audit'

const MAX_AUDITS_PER_USER = 10 // owner-pays integrations: cap spend per account
const MODEL = 'claude-haiku-4-5' // the integration's default is the expensive Opus, so always set this

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

// Response shapes were captured with `integrations invoke`; the proxy may wrap them,
// so check the likely paths. Confirm in the logs on the first run (see Part H).
const pageMarkdown = (r: any): string | null =>
  [r?.data?.data?.markdown, r?.data?.markdown, r?.markdown].find((x) => typeof x === 'string' && x.length > 0) ?? null
const replyText = (r: any): string | null =>
  [r?.data?.content?.[0]?.text, r?.content?.[0]?.text].find((x) => typeof x === 'string' && x.length > 0) ?? null

export const actions: Record<string, ActionHandler<Env>> = {
  startAudit: async ({ userId, params, tools }) => {
    const v = validateAuditUrl(params.url)
    if (!v.ok) return { success: false, error: v.error }

    // Per-account cap (the server, not the UI, is the trust boundary)
    const prior = await tools.query('audits', { where: { ownerId: userId }, limit: MAX_AUDITS_PER_USER + 1 })
    const rows = (prior as any)?.data?.records ?? (prior as any)?.data
    if (Array.isArray(rows) && rows.length >= MAX_AUDITS_PER_USER) {
      return { success: false, error: `Limit of ${MAX_AUDITS_PER_USER} audits per account reached.` }
    }

    const auditId = newId()
    const created = await tools.create('audits', { url: v.url, status: 'running', ownerId: userId }, auditId)
    if (!created.success) return created

    const fail = async (error: string) => {
      await tools.update('audits', auditId, { status: 'failed', error })
      return { success: false as const, error }
    }

    try {
      const scrape = await tools.integration('firecrawl/scrape', { url: v.url, formats: ['markdown'], onlyMainContent: true })
      console.info('[startAudit] scrape result keys:', Object.keys((scrape ?? {}) as object)) // remove once confirmed
      if (!scrape.success) return await fail('Could not fetch that page.')
      const page = pageMarkdown(scrape)
      if (!page || page.length < 200) return await fail('The page had too little readable text.')

      const prompt = buildPrompt(page)
      const ai = await tools.integration('anthropic/chat-completion', {
        model: MODEL,
        max_tokens: 3000,
        temperature: 0,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      })
      console.info('[startAudit] ai result keys:', Object.keys((ai ?? {}) as object)) // remove once confirmed
      if (!ai.success) return await fail('The analysis step failed.')
      const text = replyText(ai)
      if (!text) return await fail('The analysis returned no text.')

      const { findings, dropped, ok } = parseFindings(text, page)
      if (!ok) return await fail('Could not read the analysis output.')

      for (const f of findings) {
        await tools.create('findings', { auditId, ...f, status: 'open' })
      }
            const u = new URL(v.url)
      const title = `${u.hostname}${u.pathname === '/' ? '' : u.pathname}`.slice(0, 120)
      await tools.update('audits', auditId, {
        status: 'done',
        title,
        score: scoreOf(findings),
        summary: `${findings.length} verified findings. ${dropped} dropped because the quote was not on the page.`,
      })
      return { success: true, data: { auditId } }
    } catch (e) {
      console.error('[startAudit]', e)
      return await fail('Unexpected error. Please try again.')
    }
  },
}