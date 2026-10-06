import type { CollectionSchema } from 'deepspace/schema'

// Clients cannot create or edit audits, or edit a finding's content.
// Only the server action does (it bypasses RBAC by design).
export const auditsSchema: CollectionSchema = {
  name: 'audits',
  columns: [
    { name: 'url', storage: 'text', interpretation: { kind: 'url' }, required: true, immutable: true },
    { name: 'title', storage: 'text', interpretation: 'plain' },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['queued', 'running', 'done', 'failed'] } },
    { name: 'score', storage: 'number', interpretation: 'plain' },
    { name: 'summary', storage: 'text', interpretation: 'plain' },
    { name: 'error', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

export const findingsSchema: CollectionSchema = {
  name: 'findings',
  columns: [
    { name: 'auditId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'kind', storage: 'text', interpretation: { kind: 'select', options: ['missing_prereq', 'undefined_term', 'unclear_step', 'broken_flow'] }, immutable: true },
    { name: 'severity', storage: 'number', interpretation: 'plain', immutable: true },
    { name: 'quote', storage: 'text', interpretation: 'plain', immutable: true },
    { name: 'issue', storage: 'text', interpretation: 'plain', immutable: true },
    { name: 'suggestion', storage: 'text', interpretation: 'plain', immutable: true },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['open', 'claimed', 'fixed', 'dismissed'] } },
    { name: 'claimedBy', storage: 'text', interpretation: 'plain' },
    { name: 'ownerId', storage: 'text', interpretation: 'plain', immutable: true },
  ],
  permissions: {
    // Members may only change triage state; content columns are immutable.
    member: { read: true, create: false, update: true, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}