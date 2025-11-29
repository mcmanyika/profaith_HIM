'use client';

import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  // Debug: Log theme changes
  useEffect(() => {
    console.log('ThemeToggle: Current theme is', theme);
    console.log('ThemeToggle: HTML element classes', document.documentElement.className);
  }, [theme]);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('ThemeToggle: Button clicked, current theme:', theme);
    console.log('ThemeToggle: Before toggle, HTML classes:', document.documentElement.className);
    toggleTheme();
    // Check after a brief delay
    setTimeout(() => {
      console.log('ThemeToggle: After toggle, HTML classes:', document.documentElement.className);
      console.log('ThemeToggle: localStorage theme:', localStorage.getItem('theme'));
    }, 100);
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      type="button"
    >
      {theme === 'dark' ? (
        <SunIcon className="h-5 w-5 text-gray-700 dark:text-yellow-400" />
      ) : (
        <MoonIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
