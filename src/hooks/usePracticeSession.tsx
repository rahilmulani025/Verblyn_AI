import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Topic {
  topic: string;
  description: string;
  keywords: string[];
  structure: {
    intro: string;
    main_points: string[];
    conclusion: string;
  };
  recommended_time: number;
  difficulty: string;
  category: string;
}

interface AnalysisResult {
  grammar_score: number;
  fluency_score: number;
  vocabulary_score: number;
  confidence_score: number;
  feedback: {
    overall: string;
    grammar: string[];
    fluency: string[];
    vocabulary: string[];
    confidence: string[];
    tips: string[];
  };
}

interface UsePracticeSessionReturn {
  topic: Topic | null;
  analysis: AnalysisResult | null;
  isLoadingTopic: boolean;
  isAnalyzing: boolean;
  generateTopic: (difficulty?: string, category?: string) => Promise<void>;
  analyzeTranscript: (transcript: string) => Promise<AnalysisResult | null>;
  saveSession: (transcript: string, durationSeconds: number, analysis: AnalysisResult) => Promise<void>;
  resetSession: () => void;
}

export const usePracticeSession = (): UsePracticeSessionReturn => {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const generateTopic = useCallback(async (difficulty = 'intermediate', category?: string) => {
    setIsLoadingTopic(true);
    try {
      // Get current session for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to generate topics.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ difficulty, category }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Session Expired",
            description: "Please sign in again.",
            variant: "destructive",
          });
          return;
        }
        if (response.status === 429) {
          toast({
            title: "Rate Limited",
            description: "Please wait a moment before generating another topic.",
            variant: "destructive",
          });
          return;
        }
        throw new Error('Failed to generate topic');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      setTopic(data);
      setAnalysis(null);
    } catch (error) {
      // Only log in development
      if (import.meta.env.DEV) {
        console.error('Generate topic error:', error);
      }
      toast({
        title: "Error",
        description: "Failed to generate topic. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTopic(false);
    }
  }, [toast]);

  const analyzeTranscript = useCallback(async (transcript: string): Promise<AnalysisResult | null> => {
    if (!transcript.trim()) {
      toast({
        title: "No Speech Detected",
        description: "Please record some speech before analyzing.",
        variant: "destructive",
      });
      return null;
    }

    // Client-side length validation
    if (transcript.length > 10000) {
      toast({
        title: "Transcript Too Long",
        description: "Please keep your speech under 10,000 characters.",
        variant: "destructive",
      });
      return null;
    }

    setIsAnalyzing(true);
    try {
      // Get current session for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to analyze speech.",
          variant: "destructive",
        });
        return null;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          transcript,
          topic: topic?.topic,
          keywords: topic?.keywords,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Session Expired",
            description: "Please sign in again.",
            variant: "destructive",
          });
          return null;
        }
        if (response.status === 429) {
          toast({
            title: "Rate Limited",
            description: "Please wait a moment before analyzing again.",
            variant: "destructive",
          });
          return null;
        }
        throw new Error('Failed to analyze speech');
      }

      const data = await response.json();
      if (data.error && !data.grammar_score) {
        throw new Error(data.error);
      }
      
      setAnalysis(data);
      return data;
    } catch (error) {
      // Only log in development
      if (import.meta.env.DEV) {
        console.error('Analyze speech error:', error);
      }
      toast({
        title: "Analysis Error",
        description: "Failed to analyze speech. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [topic, toast]);

  const saveSession = useCallback(async (
    transcript: string,
    durationSeconds: number,
    analysisData: AnalysisResult
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not Signed In",
          description: "Please sign in to save your practice sessions.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from('speaking_sessions').insert({
        user_id: user.id,
        topic: topic?.topic || 'Free Practice',
        keywords: topic?.keywords || [],
        transcript,
        grammar_score: analysisData.grammar_score,
        fluency_score: analysisData.fluency_score,
        vocabulary_score: analysisData.vocabulary_score,
        confidence_score: analysisData.confidence_score,
        feedback: analysisData.feedback,
        duration_seconds: durationSeconds,
      });

      if (error) throw error;

      toast({
        title: "Session Saved",
        description: "Your practice session has been saved to your dashboard.",
      });
    } catch (error) {
      // Only log in development
      if (import.meta.env.DEV) {
        console.error('Save session error:', error);
      }
      toast({
        title: "Save Failed",
        description: "Failed to save session. Please try again.",
        variant: "destructive",
      });
    }
  }, [topic, toast]);

  const resetSession = useCallback(() => {
    setAnalysis(null);
  }, []);

  return {
    topic,
    analysis,
    isLoadingTopic,
    isAnalyzing,
    generateTopic,
    analyzeTranscript,
    saveSession,
    resetSession,
  };
};
