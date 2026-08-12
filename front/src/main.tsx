import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/base.css";
import App from "./App";

// TanStack Query — single client for the app lifetime. Default staleTime
// of 0 (always refetch on mount) is too aggressive for stats; tune per
// hook instead (each hook sets its own staleTime).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,            // Don't retry failed fetches by default — our ErrorState offers a retry button.
      refetchOnWindowFocus: false,  // Stats don't live-update; don't refetch on focus.
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);