import { useCallback, useEffect, useState } from 'react';

const THEME_KEY = 'rk.theme';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#eef2f8' : '#060a14');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, toggleTheme };
}
