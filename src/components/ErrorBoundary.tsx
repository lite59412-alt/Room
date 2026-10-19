import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

interface State {
  error: Error | null;
}

/**
 * Last line of defence: if anything throws while rendering, show a readable screen with a Reload button
 * instead of a blank white page (which is what a crash looks like inside an Android WebView).
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('RoomieKhata crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-bg px-8 text-center text-ink">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-dangersoft text-danger">
          <TriangleAlert size={30} />
        </span>
        <h1 className="mt-5 text-[21px] font-bold">Something went wrong</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">The app hit an unexpected error. Reloading usually fixes it — your data is safe in the cloud.</p>
        <p className="mt-3 max-w-full break-words rounded-xl bg-surface2 px-3 py-2 text-left font-mono text-[11.5px] text-muted">
          {this.state.error.message || String(this.state.error)}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-[15px] font-bold text-white active:scale-[0.98]"
        >
          <RefreshCw size={18} /> Reload app
        </button>
      </div>
    );
  }
}
