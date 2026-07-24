import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * Last-resort catch for render-time throws (schema drift, unexpected shapes).
 * React Query catches queryFn errors; anything that escapes into render would
 * otherwise white-screen the whole app with no way back.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md py-24 text-center">
          <p className="text-[17px] font-semibold">The ledger tore.</p>
          <p className="mt-2 font-data text-[13px] text-ink-faded">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null })
              window.location.assign('/')
            }}
            className="mt-4 rounded-[2px] border border-rule px-3 py-1 text-[14px] hover:bg-paper-raised"
          >
            Back to the atlas
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
