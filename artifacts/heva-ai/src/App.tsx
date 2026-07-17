import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Landing from '@/pages/Landing';
import Studio from '@/pages/Studio';
import Chat from '@/pages/Chat';
import ExpenseNew from '@/pages/expenses/New';
import ExpenseProcessing from '@/pages/expenses/Processing';
import ExpenseReview from '@/pages/expenses/Review';
import ExpenseHistory from '@/pages/expenses/History';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/studio" component={Studio} />
      <Route path="/chat" component={Chat} />
      <Route path="/expenses/new" component={ExpenseNew} />
      <Route path="/expenses/history" component={ExpenseHistory} />
      <Route path="/expenses/:id/review" component={ExpenseReview} />
      <Route path="/expenses/:id" component={ExpenseProcessing} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
