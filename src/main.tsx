import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig } from 'motion/react';
import { App } from './ui/App';
import { OrientationGuard } from './ui/OrientationGuard';
import { installAudioUnlock, soundManager } from './audio/soundManager';
import './ui/styles.css';
import './ui/sprites.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 2, refetchOnWindowFocus: true },
    mutations: { retry: 1 },
  },
});

const loadMotionFeatures = () => import('./ui/motionFeatures').then((module) => module.default);

async function enableApiMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

await enableApiMocking();

installAudioUnlock();
soundManager.preload(['uiClick', 'uiOpen', 'uiClose', 'uiBack', 'uiHover']);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user">
          <App />
          <OrientationGuard />
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  </StrictMode>,
);
