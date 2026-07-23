import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import './colors_and_type.css';
import './styles.css';
import App from './app.jsx';
import { handleBranchError } from './use-branches.js';

// The one central branch-access-403 recovery choke point (BERR-01, D-05): every branch-scoped
// query/mutation error passes through here via TanStack's global QueryCache/MutationCache
// onError, dispatching to handleBranchError. The onError closures capture this const queryClient
// binding — valid because they only invoke queryClient.invalidateQueries at actual error time,
// after construction completes.
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (err) => handleBranchError(err, queryClient) }),
  mutationCache: new MutationCache({ onError: (err) => handleBranchError(err, queryClient) }),
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
