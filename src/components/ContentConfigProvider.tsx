"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ContentConfigMap = Record<string, string>;

const ContentConfigContext = createContext<{
  config: ContentConfigMap;
  t: (key: string, fallback?: string) => string;
  loading: boolean;
}>({
  config: {},
  t: (key: string, fallback?: string) => fallback ?? key,
  loading: true,
});

export function ContentConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ContentConfigMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content-config")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data?.data) {
          setConfig(data.data);
        }
      })
      .catch(() => {
        /* 忽略错误，使用fallback */
      })
      .finally(() => setLoading(false));
  }, []);

  const t = (key: string, fallback?: string) => {
    return config[key] ?? fallback ?? key;
  };

  return (
    <ContentConfigContext.Provider value={{ config, t, loading }}>
      {children}
    </ContentConfigContext.Provider>
  );
}

export function useContentConfig() {
  return useContext(ContentConfigContext);
}

export function useT() {
  const { t } = useContext(ContentConfigContext);
  return t;
}
