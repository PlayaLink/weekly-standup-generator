import { supabase } from './client';
import { encryptToken, decryptToken } from '../encryption';

export interface OAuthToken {
  id: string;
  user_id: string;
  provider: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: string;
  scopes: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Store OAuth tokens for a user (encrypted)
 */
export async function storeTokens(
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number,
  scopes?: string[]
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const { error } = await supabase.from('oauth_tokens').upsert(
    {
      user_id: userId,
      provider,
      access_token_encrypted: encryptToken(accessToken),
      refresh_token_encrypted: encryptToken(refreshToken),
      expires_at: expiresAt,
      scopes: scopes || null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,provider',
    }
  );

  if (error) {
    throw new Error(`Failed to store tokens: ${error.message}`);
  }
}

/**
 * Get stored tokens for a user
 */
export async function getTokens(
  userId: string,
  provider: string
): Promise<OAuthToken | null> {
  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error) {
    return null;
  }

  return data as OAuthToken;
}

/**
 * Get decrypted access token, refreshing if needed
 */
export async function getValidAccessToken(
  userId: string,
  provider: string,
  refreshFn: (refreshToken: string) => Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>
): Promise<string> {
  const tokenRecord = await getTokens(userId, provider);

  if (!tokenRecord) {
    throw new Error(`No ${provider} connection found for user`);
  }

  const expiresAt = new Date(tokenRecord.expires_at);
  const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

  // Check if token needs refresh
  if (expiresAt.getTime() - Date.now() < bufferMs) {
    const refreshToken = decryptToken(tokenRecord.refresh_token_encrypted);
    const newTokens = await refreshFn(refreshToken);

    await storeTokens(
      userId,
      provider,
      newTokens.access_token,
      newTokens.refresh_token,
      newTokens.expires_in,
      tokenRecord.scopes || undefined
    );

    return newTokens.access_token;
  }

  return decryptToken(tokenRecord.access_token_encrypted);
}

/**
 * Check if a user has valid tokens for a provider
 */
export async function hasValidToken(
  userId: string,
  provider: string
): Promise<boolean> {
  const tokenRecord = await getTokens(userId, provider);
  return tokenRecord !== null;
}

/**
 * Delete tokens for a user
 */
export async function deleteTokens(
  userId: string,
  provider: string
): Promise<void> {
  const { error } = await supabase
    .from('oauth_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) {
    throw new Error(`Failed to delete tokens: ${error.message}`);
  }
}
