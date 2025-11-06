import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Lang = 'en' | 'ar';

interface LanguageContextValue {
  lang: Lang;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const root = document.documentElement;
    if (lang === 'ar') {
      root.classList.add('rtl');
    } else {
      root.classList.remove('rtl');
    }
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    toggle: () => setLang(l => (l === 'en' ? 'ar' : 'en')),
  }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}


