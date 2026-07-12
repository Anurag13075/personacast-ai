import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Landing from '@/pages/Landing';
import Studio from '@/pages/Studio';
import Chat from '@/pages/Chat';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/studio" component={Studio} />
      <Route path="/chat" component={Chat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
