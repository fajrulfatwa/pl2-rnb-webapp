import {createClient} from '@supabase/supabase-js';
export const isConfigured=Boolean(import.meta.env.VITE_SUPABASE_URL&&import.meta.env.VITE_SUPABASE_ANON_KEY&&!import.meta.env.VITE_SUPABASE_URL.includes('YOUR-PROJECT'));
export const supabase=isConfigured?createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY,{
 auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
}):null;
