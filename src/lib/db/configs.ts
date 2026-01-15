import { supabase } from './client';

export interface JiraConfig {
  id: string;
  user_id: string;
  jira_cloud_id: string;
  jira_base_url: string;
  board_id: number | null;
  board_name: string | null;
  project_key: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get Jira config for a user
 */
export async function getJiraConfig(userId: string): Promise<JiraConfig | null> {
  const { data, error } = await supabase
    .from('jira_configs')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return null;
  }

  return data as JiraConfig;
}

/**
 * Create or update Jira config for a user
 */
export async function upsertJiraConfig(
  userId: string,
  config: {
    jira_cloud_id: string;
    jira_base_url: string;
    board_id?: number;
    board_name?: string;
    project_key?: string;
  }
): Promise<JiraConfig> {
  const { data, error } = await supabase
    .from('jira_configs')
    .upsert(
      {
        user_id: userId,
        ...config,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save Jira config: ${error.message}`);
  }

  return data as JiraConfig;
}

/**
 * Update board selection for a user
 */
export async function updateBoardSelection(
  userId: string,
  boardId: number,
  boardName: string,
  projectKey: string
): Promise<JiraConfig> {
  const { data, error } = await supabase
    .from('jira_configs')
    .update({
      board_id: boardId,
      board_name: boardName,
      project_key: projectKey,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update board selection: ${error.message}`);
  }

  return data as JiraConfig;
}
