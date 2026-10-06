/**
 * Placeholder home page — replace this with the app's real home.
 *
 * This is intentionally unstyled scaffolding, not a design to build on.
 * Design the app's own look (layout, theme tokens, typography) from your
 * product's point of view instead of extending this page.
 */

import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold mb-2">DocsDryRun</h1>
      <p className="mb-4 opacity-80">
        Paste a docs URL. The app reads it like a first-time developer and lists where they would get stuck.
        Every finding quotes the page, and code drops any quote that is not really there.
      </p>
      <Link className="underline" to="/audits">Open Audits</Link>
    </main>
  )
}
