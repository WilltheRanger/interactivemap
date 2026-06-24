import { MotionConfig } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppRoutes } from './router';
import { Splash } from './Splash';
import { AppCrashScreen } from './ErrorFallbacks';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// '/' in dev, '/interactivemap/' on GitHub Pages — strip the trailing slash for the router basename.
const baseUrl = import.meta.env.BASE_URL;
const basename = baseUrl === '/' ? undefined : baseUrl.replace(/\/$/, '');

export default function App() {
  return (
    // reducedMotion="user" honors the OS "Reduce Motion" setting automatically.
    <ErrorBoundary fallback={() => <AppCrashScreen />}>
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={basename}>
            <AppRoutes />
          </BrowserRouter>
          <Splash />
        </QueryClientProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
