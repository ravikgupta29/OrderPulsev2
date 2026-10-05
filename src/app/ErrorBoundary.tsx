import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Banner } from '../components/Banner';
import { toAppError } from '../shared/types/error';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Single app-level error boundary. Any uncaught render error is normalized
 * through `toAppError` and shown with the same `Banner` component used for
 * connection/rule-error feedback, so there is one consistent error UX.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled application error', error, info.componentStack);
  }

  private handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const appError = toAppError(this.state.error);
      return (
        <div style={{ padding: '2rem' }}>
          <Banner
            tone="danger"
            title="Something went wrong"
            description={appError.message}
            assertive
            action={
              <button type="button" onClick={this.handleReset}>
                Try again
              </button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
