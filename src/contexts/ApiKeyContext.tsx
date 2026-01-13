
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface ApiKeyContextType {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  isApiKeySet: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export const ApiKeyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (storedKey) {
        setApiKeyState(storedKey);
      }
    } catch (error) {
      console.error("Failed to read API key from localStorage", error);
    }
    setLoading(false);
  }, []);

  const setApiKey = (key: string | null) => {
    try {
      if (key) {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
      setApiKeyState(key);
    } catch (error) {
      console.error("Failed to save API key to localStorage", error);
    }
  };

  const value = {
    apiKey,
    setApiKey,
    isApiKeySet: !!apiKey,
  };

  if (loading) {
      return null;
  }

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};
