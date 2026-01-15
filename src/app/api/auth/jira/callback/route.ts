import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  getAccessibleResources,
  storeJiraTokens,
} from '@/lib/jira/auth';
import { upsertJiraConfig } from '@/lib/db/configs';

/**
 * Handle Jira OAuth callback
 * Exchanges the authorization code for tokens and stores user's Jira config
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    const errorDescription = searchParams.get('error_description') || error;
    return createErrorResponse(`Jira authorization failed: ${errorDescription}`);
  }

  // Validate required parameters
  if (!code || !state) {
    return createErrorResponse('Missing required OAuth parameters');
  }

  // Extract user ID from state
  // State format: "randomToken:userId"
  const stateParts = state.split(':');
  if (stateParts.length < 2) {
    return createErrorResponse('Invalid state parameter');
  }
  const userId = stateParts[1];

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens
    await storeJiraTokens(userId, tokens);

    // Get accessible Jira resources to find the cloud ID and URL
    const resources = await getAccessibleResources(tokens.access_token);

    if (resources.length === 0) {
      return createErrorResponse(
        'No Jira sites found. Make sure you have access to at least one Jira Cloud site.'
      );
    }

    // Use the first accessible resource
    // In a more complex app, you might let users choose which site
    const site = resources[0];

    // Store Jira config
    await upsertJiraConfig(userId, {
      jira_cloud_id: site.id,
      jira_base_url: site.url,
    });

    // Success! Show a nice page
    return createSuccessResponse(site.name);
  } catch (err) {
    console.error('Jira OAuth error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return createErrorResponse(`Failed to complete Jira authorization: ${message}`);
  }
}

/**
 * Create a success response page
 */
function createSuccessResponse(siteName: string): NextResponse {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Jira Connected!</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .card {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 400px;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #1a1a2e; margin: 0 0 8px 0; font-size: 24px; }
    p { color: #666; margin: 0; line-height: 1.6; }
    .site { color: #667eea; font-weight: 600; }
    .instructions {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #eee;
      font-size: 14px;
    }
    code {
      background: #f5f5f5;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Jira Connected!</h1>
    <p>Successfully connected to <span class="site">${escapeHtml(siteName)}</span></p>
    <div class="instructions">
      <p>Return to Slack and run <code>/standup-setup</code> again to select your board.</p>
    </div>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Create an error response page
 */
function createErrorResponse(message: string): NextResponse {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Connection Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #eb4034 0%, #c92a1f 100%);
    }
    .card {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 400px;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #1a1a2e; margin: 0 0 8px 0; font-size: 24px; }
    p { color: #666; margin: 0; line-height: 1.6; }
    .error { color: #eb4034; font-size: 14px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>Connection Failed</h1>
    <p class="error">${escapeHtml(message)}</p>
    <p style="margin-top: 16px;">Please try again by running <code>/standup-setup</code> in Slack.</p>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    status: 400,
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
