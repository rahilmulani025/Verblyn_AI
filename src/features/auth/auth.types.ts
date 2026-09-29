import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '@/features/profile/profile.types';

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
}
