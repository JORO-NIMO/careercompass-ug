import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLocale = "global" | "uganda";

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (next: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function resolveInitialLocale(): AppLocale {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem("appLocale") : null;
  if (stored === "uganda" || stored === "global") return stored;
  return "global";
}

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<AppLocale>(resolveInitialLocale());

  useEffect(() => {
    try {
      window.localStorage.setItem("appLocale", locale);
    } catch {}
  }, [locale]);

  const setLocale = (next: AppLocale) => setLocaleState(next);

  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
