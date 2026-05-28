import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import type { User, UserRole } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Server-only. This bypasses RLS and is limited to partner-verified exports.
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export interface AuthenticatedContext {
  client: SupabaseClient;
  authUser: SupabaseAuthUser;
  profile: User;
  token: string;
}

interface HeaderReader {
  headers: {
    get(name: string): string | null;
  };
}

export function getBearerToken(req: HeaderReader): string | null {
  const header = req.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice('bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export function createAuthenticatedClient(token: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function getAuthenticatedContext(req: HeaderReader): Promise<AuthenticatedContext | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const client = createAuthenticatedClient(token);
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) return null;

  const { data: profile, error: profileError } = await client
    .from('users')
    .select('id, name, email, role, sra_number, created_at')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile) return null;

  return {
    client,
    authUser: authData.user,
    profile: profile as User,
    token,
  };
}

export function requirePartner(profile: Pick<User, 'role'>): boolean {
  return profile.role === 'partner';
}

export function isUserRole(value: string): value is UserRole {
  return value === 'partner' || value === 'associate' || value === 'paralegal';
}
