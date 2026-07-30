import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { api } from '../lib/api.js'
import { useTheme } from '../lib/theme.js'

export function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <span
      className={
        large ? 'font-fell text-[44px] leading-none' : 'font-fell text-[26px] leading-none'
      }
    >
      Uchronia
    </span>
  )
}

/** Top bar: wordmark, breadcrumb slot, mock badge, theme toggle, settings. */
export function Shell({
  breadcrumb,
  actions,
  children,
}: {
  breadcrumb?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const { theme, toggle } = useTheme()
  const config = useQuery({ queryKey: ['config'], queryFn: api.config, staleTime: 60_000 })

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-2.5">
          <Link to="/" className="shrink-0 rounded-[2px] no-underline hover:opacity-80">
            <Wordmark />
          </Link>
          <nav
            aria-label="breadcrumb"
            className="min-w-0 flex-1 truncate font-data text-[13px] text-ink-faded"
          >
            {breadcrumb}
          </nav>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {actions}
            {config.data?.mode === 'demo' && (
              <Link
                to="/settings"
                data-testid="demo-pill"
                className="stamp rounded-[2px] border border-notice/60 bg-notice-wash px-2 py-0.5 font-medium tracking-[0.08em] text-notice no-underline hover:opacity-80"
                title="demo engine: canned, deterministic content - add an API key for real derivation"
              >
                DEMO
              </Link>
            )}
            <Link to="/settings" className="font-data text-[13px] text-ink-faded hover:text-ink">
              settings
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="font-data text-[13px] text-ink-faded hover:text-ink"
              aria-label={
                theme === 'survey'
                  ? 'switch to Nitrate (dark) theme'
                  : 'switch to Survey (light) theme'
              }
            >
              {theme === 'survey' ? 'nitrate' : 'survey'}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-5 pb-24">{children}</main>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="font-fell text-[28px] text-ink-faded">{title}</p>
      {children && <div className="mt-3 text-[15px] text-ink-faded">{children}</div>}
    </div>
  )
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="text-[17px] font-semibold">The ledger did not answer.</p>
      <p className="mt-2 font-data text-[13px] text-ink-faded">{message}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-[2px] border border-rule px-3 py-1 text-[14px] hover:bg-paper-raised"
        >
          Ask again
        </button>
      )}
    </div>
  )
}
