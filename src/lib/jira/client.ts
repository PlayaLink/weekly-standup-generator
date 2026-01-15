import { getJiraAccessToken } from './auth';
import { getJiraConfig } from '../db/configs';

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  assignee: string | null;
  description: string | null;
  dueDate: string | null;
  updated: string;
  comments: JiraComment[];
}

export interface JiraComment {
  author: string;
  body: string;
  created: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  location: {
    projectKey: string;
    projectName: string;
  };
}

/**
 * Create authenticated headers for Jira API requests
 */
async function getJiraHeaders(userId: string): Promise<HeadersInit> {
  const accessToken = await getJiraAccessToken(userId);
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

/**
 * Get the base URL for Jira API calls
 */
async function getJiraApiUrl(userId: string): Promise<string> {
  const config = await getJiraConfig(userId);
  if (!config) {
    throw new Error('Jira not configured for user');
  }
  return `https://api.atlassian.com/ex/jira/${config.jira_cloud_id}`;
}

/**
 * Fetch all boards the user has access to
 */
export async function fetchBoards(userId: string): Promise<JiraBoard[]> {
  const baseUrl = await getJiraApiUrl(userId);
  const headers = await getJiraHeaders(userId);

  const response = await fetch(
    `${baseUrl}/rest/agile/1.0/board?type=scrum&type=kanban`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch boards: ${error}`);
  }

  const data = await response.json();
  return data.values as JiraBoard[];
}

/**
 * Fetch tickets from a board with recent activity
 */
export async function fetchTickets(
  userId: string,
  daysBack: number = 7
): Promise<JiraTicket[]> {
  const config = await getJiraConfig(userId);
  if (!config || !config.board_id) {
    throw new Error('Jira board not configured for user');
  }

  const baseUrl = await getJiraApiUrl(userId);
  const headers = await getJiraHeaders(userId);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  // Phase 1: Get ticket metadata from board
  const jql = encodeURIComponent(
    `project = "${config.project_key}" AND (assignee = currentUser() OR updatedDate >= "${cutoffStr}")`
  );

  const response = await fetch(
    `${baseUrl}/rest/api/3/search?jql=${jql}&fields=key,summary,status,assignee,duedate,updated`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch tickets: ${error}`);
  }

  const data = await response.json();
  const issues = data.issues || [];

  // Phase 2: Filter tickets that need details
  const ticketsNeedingDetails = issues.filter((issue: any) => {
    const status = issue.fields.status?.name;
    const updated = new Date(issue.fields.updated);
    const isRecent = updated >= cutoffDate;
    const isActive = ['In Progress', 'To Do'].includes(status);
    return isRecent || isActive;
  });

  // Phase 3: Fetch details for filtered tickets
  const tickets: JiraTicket[] = await Promise.all(
    ticketsNeedingDetails.map(async (issue: any) => {
      const details = await fetchTicketDetails(userId, issue.key, cutoffDate);
      return details;
    })
  );

  return tickets;
}

/**
 * Fetch detailed ticket info including description and comments
 */
async function fetchTicketDetails(
  userId: string,
  ticketKey: string,
  cutoffDate: Date
): Promise<JiraTicket> {
  const baseUrl = await getJiraApiUrl(userId);
  const headers = await getJiraHeaders(userId);

  // Fetch ticket with rendered fields
  const response = await fetch(
    `${baseUrl}/rest/api/3/issue/${ticketKey}?expand=renderedFields&fields=summary,status,assignee,description,duedate,updated,comment`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch ticket ${ticketKey}: ${error}`);
  }

  const issue = await response.json();

  // Filter comments to only recent ones
  const comments: JiraComment[] = (issue.fields.comment?.comments || [])
    .filter((c: any) => new Date(c.created) >= cutoffDate)
    .map((c: any) => ({
      author: c.author?.displayName || 'Unknown',
      body: extractTextFromAdf(c.body),
      created: c.created,
    }));

  return {
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status?.name || 'Unknown',
    assignee: issue.fields.assignee?.displayName || null,
    description: issue.renderedFields?.description || null,
    dueDate: issue.fields.duedate || null,
    updated: issue.fields.updated,
    comments,
  };
}

/**
 * Extract plain text from Atlassian Document Format (ADF)
 */
function extractTextFromAdf(adf: any): string {
  if (!adf || typeof adf === 'string') return adf || '';

  if (adf.type === 'text') return adf.text || '';

  if (adf.content && Array.isArray(adf.content)) {
    return adf.content.map(extractTextFromAdf).join('');
  }

  return '';
}
