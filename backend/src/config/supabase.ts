import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.warn('AVISO: SUPABASE_URL não foi configurada!');
}

// Cliente administrador (ignora RLS, útil para relatórios e tarefas de sistema no backend)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Helper para obter cliente Supabase com o JWT do usuário autenticado no frontend
export function getUserSupabaseClient(authHeader?: string) {
  if (!authHeader) {
    return createClient(supabaseUrl, supabaseServiceKey); // Fallback para Admin se não houver token
  }

  const token = authHeader.replace('Bearer ', '');
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}
