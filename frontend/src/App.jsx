import './App.css';

import { HeroUIProvider } from '@heroui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Modals } from '@/components/organisms/Modals/Modals';
import { Toaster } from '@/components/ui/toaster';
import { AppContextProvider } from '@/context/AppContextProvider';
import { AppRoutes } from '@/Routes';

function App() {
  const queryClient = new QueryClient();
  return (
    <HeroUIProvider>
      <QueryClientProvider client={queryClient}>
        <AppContextProvider>
          <AppRoutes />
          <Modals />
          <Toaster />
        </AppContextProvider>
      </QueryClientProvider>
    </HeroUIProvider>
  );
}

export default App;
