import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  isLight: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kashpal_theme') as Theme | null;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('kashpal_theme', theme);
    const root = document.documentElement;

    if (theme === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('theme-dark', 'dark');
      root.style.colorScheme = 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#F8FAFC');
    } else {
      root.classList.add('theme-dark', 'dark');
      root.classList.remove('theme-light');
      root.style.colorScheme = 'dark';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0B132B');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isLight: theme === 'light' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
