import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // TODO: wire to Sentry when available
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center bg-surface px-4 py-16">
          <div className="card max-w-md w-full p-8 md:p-10 text-center">
            <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-gradient-hero text-white shadow-glow">
              <AlertTriangle className="h-10 w-10" strokeWidth={2.2} />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-accent-charcoal">
              Something went wrong
            </h1>
            <p className="mt-3 text-accent-charcoal/60 text-pretty">
              We hit an unexpected snag while loading this page. Reload to try again. Your cart and
              session are safe.
            </p>
            {this.state.error?.message && (
              <p className="mt-4 text-xs font-mono text-accent-charcoal/40 break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="btn btn-primary btn-size-lg mt-8"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
