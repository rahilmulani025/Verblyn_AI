export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          contact_phone: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          institution: string | null;
          profession: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          institution?: string | null;
          profession?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          institution?: string | null;
          profession?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      skills: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          category?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_skills: {
        Row: {
          id: string;
          user_id: string;
          skill_name: string;
          baseline_score: number | null;
          current_score: number | null;
          best_score: number | null;
          trend: string | null;
          last_assessed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          skill_name: string;
          baseline_score?: number | null;
          current_score?: number | null;
          best_score?: number | null;
          trend?: string | null;
          last_assessed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          skill_name?: string;
          baseline_score?: number | null;
          current_score?: number | null;
          best_score?: number | null;
          trend?: string | null;
          last_assessed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_goals: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          target_date: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id: string;
          target_date?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_id?: string;
          target_date?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_weaknesses: {
        Row: {
          id: string;
          user_id: string;
          weakness_label: string;
          weakness_type: string | null;
          skill_name: string | null;
          status: string | null;
          occurrence_count: number | null;
          confidence_level: number | null;
          evidence_summary: string | null;
          resolved: boolean;
          first_detected_at: string | null;
          last_detected_at: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weakness_label: string;
          weakness_type?: string | null;
          skill_name?: string | null;
          status?: string | null;
          occurrence_count?: number | null;
          confidence_level?: number | null;
          evidence_summary?: string | null;
          resolved?: boolean;
          first_detected_at?: string | null;
          last_detected_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          weakness_label?: string;
          weakness_type?: string | null;
          skill_name?: string | null;
          status?: string | null;
          occurrence_count?: number | null;
          confidence_level?: number | null;
          evidence_summary?: string | null;
          resolved?: boolean;
          first_detected_at?: string | null;
          last_detected_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          title: string;
          short_description: string;
          why_it_matters: string;
          target_skill: string;
          challenge_type: string;
          difficulty_level: number;
          difficulty_label: string;
          duration_seconds: number;
          prompt: string;
          instructions: Json;
          expected_behavior: string;
          xp_reward: number;
          goal_tags: string[] | null;
          target_weakness: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          short_description: string;
          why_it_matters: string;
          target_skill: string;
          challenge_type: string;
          difficulty_level?: number;
          difficulty_label?: string;
          duration_seconds?: number;
          prompt: string;
          instructions?: Json;
          expected_behavior: string;
          xp_reward?: number;
          goal_tags?: string[] | null;
          target_weakness?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          short_description?: string;
          why_it_matters?: string;
          target_skill?: string;
          challenge_type?: string;
          difficulty_level?: number;
          difficulty_label?: string;
          duration_seconds?: number;
          prompt?: string;
          instructions?: Json;
          expected_behavior?: string;
          xp_reward?: number;
          goal_tags?: string[] | null;
          target_weakness?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      challenge_attempts: {
        Row: {
          id: string;
          user_id: string;
          challenge_id: string;
          status: string;
          duration_seconds: number | null;
          transcript: string | null;
          word_count: number | null;
          words_per_minute: number | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          challenge_id: string;
          status?: string;
          duration_seconds?: number | null;
          transcript?: string | null;
          word_count?: number | null;
          words_per_minute?: number | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          challenge_id?: string;
          status?: string;
          duration_seconds?: number | null;
          transcript?: string | null;
          word_count?: number | null;
          words_per_minute?: number | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      speech_metrics: {
        Row: {
          id: string;
          attempt_id: string;
          duration_seconds: number;
          word_count: number;
          words_per_minute: number;
          pause_count: number | null;
          average_pause_duration: number | null;
          filler_count: number;
          repetition_count: number;
          sentence_count: number;
          average_sentence_length: number;
          vocabulary_diversity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          duration_seconds: number;
          word_count: number;
          words_per_minute: number;
          pause_count?: number | null;
          average_pause_duration?: number | null;
          filler_count?: number;
          repetition_count?: number;
          sentence_count?: number;
          average_sentence_length?: number;
          vocabulary_diversity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          duration_seconds?: number;
          word_count?: number;
          words_per_minute?: number;
          pause_count?: number | null;
          average_pause_duration?: number | null;
          filler_count?: number;
          repetition_count?: number;
          sentence_count?: number;
          average_sentence_length?: number;
          vocabulary_diversity?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      attempt_analysis: {
        Row: {
          id: string;
          attempt_id: string;
          overall_score: number;
          fluency_score: number;
          clarity_score: number;
          vocabulary_score: number;
          grammar_score: number;
          confidence_score: number;
          strengths: Json;
          improvements: Json;
          coach_message: string | null;
          recommended_focus: string | null;
          weakness_candidates: Json | null;
          analysis_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          overall_score: number;
          fluency_score: number;
          clarity_score: number;
          vocabulary_score: number;
          grammar_score: number;
          confidence_score: number;
          strengths?: Json;
          improvements?: Json;
          coach_message?: string | null;
          recommended_focus?: string | null;
          weakness_candidates?: Json | null;
          analysis_version?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          overall_score?: number;
          fluency_score?: number;
          clarity_score?: number;
          vocabulary_score?: number;
          grammar_score?: number;
          confidence_score?: number;
          strengths?: Json;
          improvements?: Json;
          coach_message?: string | null;
          recommended_focus?: string | null;
          weakness_candidates?: Json | null;
          analysis_version?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_missions: {
        Row: {
          id: string;
          user_id: string;
          mission_date: string;
          challenge_id: string;
          focus_skill: string;
          reward_xp: number;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mission_date: string;
          challenge_id: string;
          focus_skill?: string;
          reward_xp?: number;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mission_date?: string;
          challenge_id?: string;
          focus_skill?: string;
          reward_xp?: number;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      xp_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          xp_amount: number;
          attempt_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          xp_amount: number;
          attempt_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          xp_amount?: number;
          attempt_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_streaks: {
        Row: {
          id: string;
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      levels: {
        Row: {
          level: number;
          min_xp: number;
          max_xp: number;
          title: string;
        };
        Insert: {
          level: number;
          min_xp: number;
          max_xp: number;
          title: string;
        };
        Update: {
          level?: number;
          min_xp?: number;
          max_xp?: number;
          title?: string;
        };
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          icon: string;
          target_value: number;
          xp_reward: number;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          category?: string;
          icon?: string;
          target_value?: number;
          xp_reward?: number;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          category?: string;
          icon?: string;
          target_value?: number;
          xp_reward?: number;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked: boolean;
          unlocked_at: string | null;
          progress: number;
          current_value: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          unlocked?: boolean;
          unlocked_at?: string | null;
          progress?: number;
          current_value?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          unlocked?: boolean;
          unlocked_at?: string | null;
          progress?: number;
          current_value?: number;
        };
        Relationships: [];
      };
      speaking_sessions: {
        Row: {
          confidence_score: number | null;
          created_at: string;
          duration_seconds: number | null;
          feedback: Json | null;
          fluency_score: number | null;
          grammar_score: number | null;
          id: string;
          keywords: string[] | null;
          topic: string;
          transcript: string | null;
          user_id: string;
          vocabulary_score: number | null;
        };
        Insert: {
          confidence_score?: number | null;
          created_at?: string;
          duration_seconds?: number | null;
          feedback?: Json | null;
          fluency_score?: number | null;
          grammar_score?: number | null;
          id?: string;
          keywords?: string[] | null;
          topic: string;
          transcript?: string | null;
          user_id: string;
          vocabulary_score?: number | null;
        };
        Update: {
          confidence_score?: number | null;
          created_at?: string;
          duration_seconds?: number | null;
          feedback?: Json | null;
          fluency_score?: number | null;
          grammar_score?: number | null;
          id?: string;
          keywords?: string[] | null;
          topic?: string;
          transcript?: string | null;
          user_id?: string;
          vocabulary_score?: number | null;
        };
        Relationships: [];
      };
      user_progress: {
        Row: {
          avg_confidence_score: number | null;
          avg_fluency_score: number | null;
          avg_grammar_score: number | null;
          avg_vocabulary_score: number | null;
          best_confidence_score: number | null;
          best_fluency_score: number | null;
          best_grammar_score: number | null;
          best_vocabulary_score: number | null;
          created_at: string;
          current_streak: number;
          id: string;
          last_practice_date: string | null;
          total_sessions: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avg_confidence_score?: number | null;
          avg_fluency_score?: number | null;
          avg_grammar_score?: number | null;
          avg_vocabulary_score?: number | null;
          best_confidence_score?: number | null;
          best_fluency_score?: number | null;
          best_grammar_score?: number | null;
          best_vocabulary_score?: number | null;
          created_at?: string;
          current_streak?: number;
          id?: string;
          last_practice_date?: string | null;
          total_sessions?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avg_confidence_score?: number | null;
          avg_fluency_score?: number | null;
          avg_grammar_score?: number | null;
          avg_vocabulary_score?: number | null;
          best_confidence_score?: number | null;
          best_fluency_score?: number | null;
          best_grammar_score?: number | null;
          best_vocabulary_score?: number | null;
          created_at?: string;
          current_streak?: number;
          id?: string;
          last_practice_date?: string | null;
          total_sessions?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      leaderboard: {
        Row: {
          avatar_url: string | null;
          avg_confidence_score: number | null;
          avg_fluency_score: number | null;
          avg_grammar_score: number | null;
          avg_vocabulary_score: number | null;
          current_streak: number | null;
          full_name: string | null;
          id: string | null;
          rank_score: number | null;
          total_sessions: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      calculate_rank_score: { Args: { p_user_id: string }; Returns: number };
      get_or_create_daily_mission: {
        Args: {
          p_mission_date: string;
          p_preferred_challenge_id?: string;
          p_focus_skill?: string;
        };
        Returns: Json;
      };
      complete_challenge_attempt: {
        Args: {
          p_attempt_id: string;
          p_scores: Json;
          p_metrics: Json;
          p_strengths?: Json;
          p_improvements?: Json;
          p_is_daily_mission?: boolean;
          p_is_weakness?: boolean;
          p_is_personal_best?: boolean;
        };
        Returns: Json;
      };
      persist_attempt_analysis_and_progression: {
        Args: {
          p_attempt_id: string;
          p_scores: Json;
          p_metrics: Json;
          p_strengths?: Json;
          p_improvements?: Json;
          p_weakness_candidates?: Json;
          p_coach_message?: string;
          p_recommended_focus?: string;
          p_analysis_version?: string;
          p_is_daily_mission?: boolean;
          p_is_weakness?: boolean;
          p_is_personal_best?: boolean;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;
