import { getValidAccessToken, storeTokens } from '../db/tokens';

const JIRA_AUTH_URL = 'https://auth.atlassian.com/authorize';
const JIRA_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const JIRA_ACCESSIBLE_RESOURCES_URL =
  'https://api.atlassian.com/oauth/token/accessible-resources';

interface JiraTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

interface JiraAccessibleResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
}

/**
 * Build the Jira OAuth authorization URL
 */
export function buildJiraAuthUrl(state: string): string {
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: process.env.JIRA_CLIENT_ID!,
    scope: 'read:jira-work read:jira-user offline_access',
    redirect_uri: process.env.JIRA_REDIRECT_URI!,
    state,
    response_type: 'code',
    prompt: 'consent',
  });

  return `${JIRA_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<JiraTokenResponse> {
  const response = await fetch(JIRA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: process.env.JIRA_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshJiraToken(
  refreshToken: string
): Promise<JiraTokenResponse> {
  const response = await fetch(JIRA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

/**
 * Get accessible Jira cloud instances for a user
 */
export async function getAccessibleResources(
  accessToken: string
): Promise<JiraAccessibleResource[]> {
  const response = await fetch(JIRA_ACCESSIBLE_RESOURCES_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get accessible resources: ${error}`);
  }

  return response.json();
}

/**
 * Get a valid Jira access token for a user, refreshing if needed
 */
export async function getJiraAccessToken(userId: string): Promise<string> {
  return getValidAccessToken(userId, 'jira', refreshJiraToken);
}

/**
 * Store Jira tokens for a user after OAuth
 */
export async function storeJiraTokens(
  userId: string,
  tokens: JiraTokenResponse
): Promise<void> {
  const scopes = tokens.scope.split(' ');
  await storeTokens(
    userId,
    'jira',
    tokens.access_token,
    tokens.refresh_token,
    tokens.expires_in,
    scopes
  );
}
