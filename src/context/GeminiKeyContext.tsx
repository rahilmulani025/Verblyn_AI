import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { geminiApi } from '@/services/gemini/gemini.api';
import { GeminiConnectionResult } from '@/services/gemini/gemini.types';

export type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';

export interface GeminiKeyContextValue {
  geminiApiKey: string | null;
  hasGeminiKey: boolean;
  aiEnabled: boolean;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  setGeminiApiKey: (key: string) => void;
  clearGeminiApiKey: () => void;
  testGeminiConnection: (keyOverride?: string) => Promise<GeminiConnectionResult>;
}

const GeminiKeyContext = createContext<GeminiKeyContextValue | undefined>(undefined);

export const GeminiKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Maintained in React memory only for security
  const [geminiApiKey, setKey] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const hasGeminiKey = Boolean(geminiApiKey && geminiApiKey.trim().length > 10);
  const aiEnabled = hasGeminiKey && connectionStatus !== 'error';

  const setGeminiApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      setKey(trimmed);
      setConnectionStatus('idle');
      setConnectionError(null);
    }
  }, []);

  const clearGeminiApiKey = useCallback(() => {
    setKey(null);
    setConnectionStatus('idle');
    setConnectionError(null);
  }, []);

  const testGeminiConnection = useCallback(
    async (keyOverride?: string): Promise<GeminiConnectionResult> => {
      const activeKey = keyOverride || geminiApiKey;

      if (!activeKey) {
        const failure: GeminiConnectionResult = {
          success: false,
          model: 'none',
          latencyMs: 0,
          message: 'No Gemini API key provided.',
        };
        setConnectionStatus('error');
        setConnectionError(failure.message);
        return failure;
      }

      setConnectionStatus('testing');
      setConnectionError(null);

      try {
        const result = await geminiApi.testConnection(activeKey);
        if (result.success) {
          setConnectionStatus('connected');
          setConnectionError(null);
          if (keyOverride) {
            setKey(keyOverride.trim());
          }
        } else {
          setConnectionStatus('error');
          setConnectionError(result.message || 'Connection test failed.');
        }
        return result;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
        const failure: GeminiConnectionResult = {
          success: false,
          model: 'none',
          latencyMs: 0,
          message: errorMessage,
        };
        setConnectionStatus('error');
        setConnectionError(errorMessage);
        return failure;
      }
    },
    [geminiApiKey]
  );

  const value = useMemo(
    () => ({
      geminiApiKey,
      hasGeminiKey,
      aiEnabled,
      connectionStatus,
      connectionError,
      setGeminiApiKey,
      clearGeminiApiKey,
      testGeminiConnection,
    }),
    [
      geminiApiKey,
      hasGeminiKey,
      aiEnabled,
      connectionStatus,
      connectionError,
      setGeminiApiKey,
      clearGeminiApiKey,
      testGeminiConnection,
    ]
  );

  return <GeminiKeyContext.Provider value={value}>{children}</GeminiKeyContext.Provider>;
};

export const useGeminiKey = (): GeminiKeyContextValue => {
  const context = useContext(GeminiKeyContext);
  if (!context) {
    throw new Error('useGeminiKey must be used within a GeminiKeyProvider');
  }
  return context;
};
