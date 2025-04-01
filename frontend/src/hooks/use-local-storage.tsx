import { useState, useEffect } from 'react';

/**
 * Custom hook for using localStorage with React state.
 * @param key The key to store in localStorage.
 * @param initialValue The default value if none exists in localStorage.
 */
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Check if window is defined (so if in the browser or SSR)
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading localStorage key:', key, error);
      return initialValue;
    }
  });

  useEffect(() => {
    // Only run if window is defined (client-side)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.error('Error setting localStorage key:', key, error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}

export default useLocalStorage;
