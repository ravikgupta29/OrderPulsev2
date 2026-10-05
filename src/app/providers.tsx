import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { type ReactNode, useState } from 'react';
import { AuthzProvider } from '../features/authz';
import { AppErrorBoundary } from './ErrorBoundary';

/**
 * Root composition of cross-cutting providers. Kept deliberately thin and
 * ordered outside-in: error boundary -> router -> query client -> authz.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <AppErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <QueryClientProvider client={queryClient}>
          <AuthzProvider>{children}</AuthzProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
