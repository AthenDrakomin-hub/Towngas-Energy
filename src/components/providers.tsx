"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "./ui/feedback/Toast";
import { ContentConfigProvider } from "./ContentConfigProvider";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 4000 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ContentConfigProvider>
        <ToastProvider>{children}</ToastProvider>
      </ContentConfigProvider>
    </QueryClientProvider>
  );
}
