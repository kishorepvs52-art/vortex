import { useEffect } from 'react';
import { AppRouter } from './router';
import { Toaster } from './components/ui/Toast';
import { useAuthStore } from './store/authStore';

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}
