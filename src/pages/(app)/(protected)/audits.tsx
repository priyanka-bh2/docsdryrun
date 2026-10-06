import { useState } from 'react'
import { useQuery, useMutations, useAuth, useUserLookup, getAuthToken } from 'deepspace'

type Audit = { url: string; title?: string; status: string; score?: number; summary?: string; error?: string }
type Finding = {
  auditId: string; kind: string; severity: number; quote: string; issue: string
  suggestion: string; status: 'open' | 'claimed' | 'fixed' | 'dismissed'; claimedBy?: string
}

export default function AuditsPage() {
  const { records: audits } = useQuery<Audit>('audits', { orderBy: 'createdAt', orderDir: 'desc', limit: 50 })
  const [selected, setSelected] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function start() {
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch('/api/actions/startAudit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getAuthToken()}` },
        body: JSON.stringify({ url }),
      })
            const body = (await res.json().catch(() => ({}))) as {
        success?: boolean
        error?: string | { message?: string }
      }
      if (!res.ok || body.success === false) {
        const e = body.error
        throw new Error(typeof e === 'string' ? e : e?.message ?? `Request failed (${res.status})`)
      }
      setUrl('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 grid gap-6 md:grid-cols-[320px_1fr]">
      <section>
        <h1 className="text-xl font-semibold mb-3">Docs dry-runs</h1>
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 border rounded px-2 py-1"
            placeholder="https://docs.example.com/quickstart"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="border rounded px-3 disabled:opacity-50" disabled={busy || !url} onClick={start}>
            {busy ? 'Running…' : 'Audit'}
          </button>
        </div>
        {err && <p role="alert" className="text-sm text-red-600 mb-2">{err}</p>}
        {audits.length === 0 && <p className="text-sm opacity-70">No audits yet. Paste a Getting Started URL.</p>}
        <ul className="space-y-1">
          {audits.map((a) => (
            <li key={a.recordId}>
              <button
                className={`w-full text-left border rounded px-2 py-1 ${selected === a.recordId ? 'bg-black/5' : ''}`}
                onClick={() => setSelected(a.recordId)}
              >
                <div className="truncate text-sm">{a.data.title || a.data.url}</div>
                <div className="text-xs opacity-70">
                  {a.data.status}
                  {a.data.score != null ? ` · score ${a.data.score}` : ''}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section>
        {selected ? (
          <Board auditId={selected} audit={audits.find((a) => a.recordId === selected)?.data} />
        ) : (
          <p className="opacity-70">Select an audit.</p>
        )}
      </section>
    </main>
  )
}

function Board({ auditId, audit }: { auditId: string; audit?: Audit }) {
  const { userId } = useAuth()
  const { getName } = useUserLookup()
  const { records, status } = useQuery<Finding>('findings', {
    where: { auditId },
    orderBy: 'severity',
    orderDir: 'desc',
  })
  const { putConfirmed, ready } = useMutations<Finding>('findings')
  const [err, setErr] = useState<string | null>(null)

  async function setState(id: string, patch: Partial<Finding>) {
    setErr(null)
    try {
      await putConfirmed(id, patch)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update rejected')
    }
  }

  if (audit?.status === 'failed') {
    return <p role="alert" className="text-red-600">Audit failed: {audit.error ?? 'unknown error'}</p>
  }
  if (status === 'loading') return <p>Loading…</p>
  if (records.length === 0) {
    return (
      <p className="opacity-70">
        {audit?.status === 'done'
          ? 'No verified findings. Good docs, or the model quoted nothing real.'
          : 'Working…'}
      </p>
    )
  }

  return (
    <div>
      {audit?.summary && <p className="mb-3 text-sm">{audit.summary}</p>}
      {err && <p role="alert" className="text-sm text-red-600 mb-2">{err}</p>}
      <ul className="space-y-3">
        {records.map((r) => (
          <li
            key={r.recordId}
            className={`border rounded p-3 ${r.data.status === 'fixed' || r.data.status === 'dismissed' ? 'opacity-60' : ''}`}
          >
            <div className="text-xs uppercase tracking-wide opacity-70">
              {r.data.kind.replace('_', ' ')} · severity {r.data.severity} · {r.data.status}
            </div>
            <blockquote className="border-l-2 pl-2 my-2 text-sm italic">{r.data.quote}</blockquote>
            <p className="text-sm">{r.data.issue}</p>
            <p className="text-sm mt-1"><b>Fix:</b> {r.data.suggestion}</p>
            {r.data.claimedBy && (
              <p className="text-xs mt-1 opacity-70">Claimed by {getName(r.data.claimedBy) ?? 'a teammate'}</p>
            )}
            <div className="mt-2 flex gap-2 text-sm">
              {r.data.status === 'open' && (
                <button
                  disabled={!ready}
                  onClick={() => setState(r.recordId, { status: 'claimed', claimedBy: userId ?? undefined })}
                >
                  Claim
                </button>
              )}
              {r.data.status !== 'fixed' && (
                <button disabled={!ready} onClick={() => setState(r.recordId, { status: 'fixed' })}>Mark fixed</button>
              )}
              {r.data.status !== 'dismissed' && (
                <button disabled={!ready} onClick={() => setState(r.recordId, { status: 'dismissed' })}>Dismiss</button>
              )}
              {r.data.status !== 'open' && (
                <button disabled={!ready} onClick={() => setState(r.recordId, { status: 'open', claimedBy: '' })}>
                  Reopen
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}