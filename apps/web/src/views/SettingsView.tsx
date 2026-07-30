import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { EmptyState, ErrorState, Shell } from '../components/Shell.js'
import { api } from '../lib/api.js'
import { useTheme } from '../lib/theme.js'

/** V8 - Settings (F12): model config, key status, theme, import. */
export function SettingsView() {
  const config = useQuery({ queryKey: ['config'], queryFn: api.config })
  const { theme, toggle } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const liveCheck = useMutation({ mutationFn: () => api.liveCheck() })

  const importMutation = useMutation({
    mutationFn: (aggregate: unknown) => api.importAggregate(aggregate),
    onSuccess: () => {
      setImportError(null)
      void queryClient.invalidateQueries({ queryKey: ['timelines'] })
      navigate('/')
    },
    onError: (error) => setImportError((error as Error).message),
  })

  if (config.isError) {
    return (
      <Shell breadcrumb={<span className="text-ink">settings</span>}>
        <ErrorState
          message={config.error instanceof Error ? config.error.message : 'configuration failed'}
          retry={() => void config.refetch()}
        />
      </Shell>
    )
  }
  if (!config.data) {
    return (
      <Shell breadcrumb={<span className="text-ink">settings</span>}>
        <EmptyState title="Fetching the configuration…" />
      </Shell>
    )
  }
  const c = config.data

  return (
    <Shell breadcrumb={<span className="text-ink">settings</span>}>
      <div className="mx-auto max-w-[560px] pt-10">
        <h1 className="text-[22px] font-semibold">Settings</h1>

        <section className="mt-6" aria-label="engine">
          <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
            the engine
          </h2>
          <dl className="mt-2 space-y-1.5">
            <SettingRow k="mode">
              {c.mode === 'demo' ? (
                <span className="font-medium text-notice">
                  demo - canned, deterministic, keyless
                </span>
              ) : (
                'live - real derivation via the Anthropic API'
              )}
            </SettingRow>
            <SettingRow k="API key">
              {c.keyConfigured
                ? 'configured (value never shown, never sent to this page)'
                : 'not configured - set ANTHROPIC_API_KEY server-side'}
            </SettingRow>
            <SettingRow k="generation model">{c.models.generation}</SettingRow>
            <SettingRow k="critic model">{c.models.critic}</SettingRow>
            <SettingRow k="defaults">
              dial {c.defaults.dial} · horizon {c.defaults.horizonYears}y ·{' '}
              {c.defaults.lenses.length} lenses
            </SettingRow>
          </dl>

          {c.mode === 'demo' && (
            <div className="mt-3 rounded-[2px] border border-notice/60 bg-notice-wash px-3 py-2.5 text-[14px]">
              <p className="stamp font-medium tracking-[0.08em] text-notice">going live, locally</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 leading-snug">
                <li>
                  Create a file named <code className="font-data text-[12.5px]">.env</code> at the
                  repository root (it is gitignored; never commit it, never paste the key anywhere
                  else).
                </li>
                <li>
                  Add one line: <code className="font-data text-[12.5px]">ANTHROPIC_API_KEY=</code>
                  followed by your key from the Anthropic console.
                </li>
                <li>
                  Restart the server (<code className="font-data text-[12.5px]">pnpm dev</code>).
                  The DEMO pill disappears once the engine is live.
                </li>
              </ol>
              <p className="mt-1.5 text-[13px] text-ink-faded">
                If UCHRONIA_MOCK=1 is set, demo stays forced even with a key. The key stays
                server-side, always.
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => liveCheck.mutate()}
              disabled={liveCheck.isPending}
              className="rounded-[2px] border border-rule px-3 py-1 text-[14px] hover:bg-paper-raised disabled:opacity-40"
            >
              {liveCheck.isPending ? 'Checking…' : 'Test live connection'}
            </button>
            {liveCheck.data &&
              (liveCheck.data.ok ? (
                <span className="font-data text-[12px] text-ink-faded" role="status">
                  live: {liveCheck.data.model} answered in {liveCheck.data.latencyMs}ms
                </span>
              ) : (
                <span className="font-data text-[12px] text-notice" role="status">
                  {liveCheck.data.error}
                </span>
              ))}
            {liveCheck.isError && (
              <span className="font-data text-[12px] text-notice" role="status">
                the check did not reach the server
              </span>
            )}
          </div>
          <p className="mt-2 font-data text-[11.5px] text-ink-faded">
            the check spends one output token when a key is configured; models are configured with
            UCHRONIA_MODEL_GENERATION / UCHRONIA_MODEL_CRITIC
          </p>
        </section>

        <section className="mt-8" aria-label="appearance">
          <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
            the paper
          </h2>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[15px]">
              theme:{' '}
              <span className="font-medium">
                {theme === 'survey' ? 'Survey (light)' : 'Nitrate (dark)'}
              </span>
            </span>
            <button
              type="button"
              onClick={toggle}
              className="rounded-[2px] border border-rule px-3 py-1 text-[14px] hover:bg-paper-raised"
            >
              switch to {theme === 'survey' ? 'Nitrate' : 'Survey'}
            </button>
          </div>
        </section>

        <section className="mt-8" aria-label="import">
          <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
            import a ledger
          </h2>
          <p className="mt-2 text-[14px] text-ink-faded">
            Restore a timeline from an exported JSON file. Export lives on each timeline (or press{' '}
            <span className="font-data text-thread">e</span>).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                importMutation.mutate(JSON.parse(await file.text()))
              } catch {
                setImportError('that file is not valid JSON')
              }
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importMutation.isPending}
            className="mt-2 rounded-[2px] border border-rule px-3 py-1 text-[14px] hover:bg-paper-raised disabled:opacity-40"
          >
            {importMutation.isPending ? 'Importing…' : 'Choose a file'}
          </button>
          {importError && (
            <p className="mt-2 font-data text-[12px] text-thread">
              The import failed: {importError}
            </p>
          )}
        </section>
      </div>
    </Shell>
  )
}

function SettingRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule/50 py-1">
      <dt className="shrink-0 font-data text-[12.5px] text-ink-faded">{k}</dt>
      <dd className="text-right text-[14px]">{children}</dd>
    </div>
  )
}
