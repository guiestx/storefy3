import { supabase } from '#/lib/supabase';

export namespace AuthApi {
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  export interface LoginResult {
    accessToken: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

export async function loginApi(data: AuthApi.LoginParams) {
  const email = data.username?.trim();
  const password = data.password;

  if (!email || !password) {
    throw new Error('Informe e-mail e senha.');
  }

  const { data: sessionData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!sessionData.session?.access_token) {
    throw new Error('O Supabase não retornou uma sessão válida.');
  }

  return {
    accessToken: sessionData.session.access_token,
  } satisfies AuthApi.LoginResult;
}

export async function refreshTokenApi() {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) throw error;

  return {
    data: data.session?.access_token ?? '',
    status: data.session ? 200 : 401,
  } satisfies AuthApi.RefreshTokenResult;
}

export async function logoutApi() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getAccessCodesApi() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return [];

  const { data, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) throw error;

  return [...new Set((data ?? []).map((item) => item.role).filter(Boolean))];
}
