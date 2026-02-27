import { createClient as supabaseCreateClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = supabaseCreateClient(supabaseUrl, supabaseAnonKey);

export type Event = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  date: string;
  end_date: string | null;
  location: string | null;
  is_virtual: boolean;
  virtual_link: string | null;
  image_url: string | null;
  max_attendees: number | null;
  is_featured: boolean;
  status: 'draft' | 'published' | 'cancelled';
  slug: string;
  theme_style: string;
  theme_color: string;
  theme_font: string;
  theme_mode: string;
  require_approval: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffAllowlist = {
  id: string;
  email: string;
  created_at: string;
};
