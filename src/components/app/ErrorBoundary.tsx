import { chromeStatusSurfaceClass } from '@/components/ui/app-chrome'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  /** If provided, renders a minimal inline error instead of the fallback */
  inline?: boolean
  label?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    const { children, fallback, inline, label } = this.props

    if (!error) return children

    if (fallback) return fallback

    if (inline) {
      return (
        <div className={`flex items-center gap-2 px-3 py-2 text-xs border rounded-lg ${chromeStatusSurfaceClass('danger')}`}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>{label ?? 'Something went wrong'}</span>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-muted-foreground/40">
          <path d="M16 4L28 26H4L16 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M16 13v5M16 21v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div>
          <p className="text-sm font-medium text-foreground/70">{label ?? 'Something went wrong'}</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono max-w-xs break-words">{error.message}</p>
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    )
  }
}
