/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  import.meta.env.VITE_SUPABASE_URL ||
  'https://qyzkvztmdxebgaknuvfl.supabase.co';

const SUPABASE_ANON_KEY =
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5emt2enRtZHhlYmdha251dmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDExNzMsImV4cCI6MjEwMDM3NzE3M30.I-kL30LBo9P5USOx0BiQ5d3BPSeI432VVQ7XSOtpCVk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
