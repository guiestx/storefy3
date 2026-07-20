import type { UserInfo } from '@vben/types';

import { supabase } from '#/lib/supabase';

export async function getUserInfoApi(): Promise<UserInfo> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error('Sessão expirada.');

  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select(
      'organization_id, role, display_name, job_title, organizations(id, name, slug)',
    )
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;

  const organization = Array.isArray(membership?.organizations)
    ? membership?.organizations[0]
    : membership?.organizations;
  const email = session.user.email ?? '';
  const metadata = session.user.user_metadata ?? {};
  const realName =
    membership?.display_name ||
    metadata.full_name ||
    metadata.name ||
    email.split('@')[0] ||
    'Usuário Storefy';

  return {
    avatar: metadata.avatar_url || '',
    desc: [membership?.job_title, organization?.name]
      .filter(Boolean)
      .join(' · '),
    homePath: '/dashboard/overview',
    realName,
    roles: membership?.role ? [membership.role] : [],
    token: session.access_token,
    userId: session.user.id,
    username: email,
    organizationId: organization?.id ?? membership?.organization_id,
    organizationName: organization?.name ?? 'Storefy',
  };
}
