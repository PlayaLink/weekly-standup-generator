import { app, openModal, updateModal } from '../app';
import { getOrCreateUser } from '../../db/users';
import { getJiraConfig, updateBoardSelection } from '../../db/configs';
import { hasValidToken } from '../../db/tokens';
import { buildJiraAuthUrl } from '../../jira/auth';
import { fetchBoards, JiraBoard } from '../../jira/client';
import crypto from 'crypto';

/**
 * Handle /standup-setup command
 * Shows setup wizard for Jira connection and board selection
 */
export function registerSetupHandler() {
  app.command('/standup-setup', async ({ command, ack, client }) => {
    await ack();

    const slackUserId = command.user_id;
    const slackUserName = command.user_name;
    const triggerId = command.trigger_id;

    // Get or create user in our database
    const user = await getOrCreateUser(slackUserId, slackUserName);

    // Check if user has Jira connected
    const hasJira = await hasValidToken(user.id, 'jira');
    const jiraConfig = await getJiraConfig(user.id);

    if (!hasJira) {
      // Show connect Jira modal
      await showConnectJiraModal(triggerId, user.id);
    } else if (!jiraConfig?.board_id) {
      // Show board selection modal
      await showBoardSelectionModal(triggerId, user.id);
    } else {
      // Show current config with option to change
      await showCurrentConfigModal(triggerId, user.id, jiraConfig);
    }
  });

  // Handle OAuth button click
  app.action('connect_jira', async ({ ack, body }) => {
    await ack();

    if (body.type !== 'block_actions' || !body.user) return;

    const slackUserId = body.user.id;
    const user = await getOrCreateUser(slackUserId, body.user.name || 'unknown');

    // Generate state token for OAuth
    const state = crypto.randomBytes(16).toString('hex');
    // In production, store this state with user ID to verify callback
    // For now, encode user ID in state (simplified)
    const stateWithUser = `${state}:${user.id}`;

    const authUrl = buildJiraAuthUrl(stateWithUser);

    // Update modal with auth link
    if ('view' in body && body.view) {
      await updateModal(body.view.id, {
        type: 'modal',
        title: { type: 'plain_text', text: 'Connect Jira' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Click the link below to authorize Jira access:\n\n<${authUrl}|🔗 Connect Jira Account>\n\nThis will open in your browser. After authorizing, return here and run \`/standup-setup\` again.`,
            },
          },
        ],
      });
    }
  });

  // Handle board selection
  app.action('select_board', async ({ ack, body, client }) => {
    await ack();

    if (body.type !== 'block_actions') return;

    const action = body.actions[0];
    if (action.type !== 'static_select') return;

    const selectedValue = action.selected_option?.value;
    if (!selectedValue) return;

    const [boardId, projectKey] = selectedValue.split(':');
    const boardName = action.selected_option?.text?.text || 'Unknown Board';

    const slackUserId = body.user.id;
    const user = await getOrCreateUser(slackUserId, body.user.name || 'unknown');

    await updateBoardSelection(
      user.id,
      parseInt(boardId, 10),
      boardName,
      projectKey
    );

    // Update modal to show success
    if ('view' in body && body.view) {
      await updateModal(body.view.id, {
        type: 'modal',
        title: { type: 'plain_text', text: 'Setup Complete!' },
        close: { type: 'plain_text', text: 'Done' },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *You're all set!*\n\nBoard: *${boardName}*\nProject: *${projectKey}*\n\nRun \`/weekly-standup\` anytime to generate your report.`,
            },
          },
        ],
      });
    }
  });

  // Handle reconfigure button
  app.action('reconfigure', async ({ ack, body }) => {
    await ack();

    if (body.type !== 'block_actions' || !body.user) return;

    const slackUserId = body.user.id;
    const user = await getOrCreateUser(slackUserId, body.user.name || 'unknown');

    if ('view' in body && body.view) {
      await showBoardSelectionModal(body.view.id, user.id, true);
    }
  });
}

/**
 * Show modal prompting user to connect Jira
 */
async function showConnectJiraModal(triggerId: string, userId: string) {
  await openModal(triggerId, {
    type: 'modal',
    callback_id: 'setup_modal',
    title: { type: 'plain_text', text: 'Standup Setup' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Welcome to Weekly Standup!*\n\nFirst, let\'s connect your Jira account so we can fetch your tickets.',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '🔗 Connect Jira Account' },
            action_id: 'connect_jira',
            style: 'primary',
          },
        ],
      },
    ],
  });
}

/**
 * Show modal for board selection
 */
async function showBoardSelectionModal(
  triggerIdOrViewId: string,
  userId: string,
  isUpdate: boolean = false
) {
  // Fetch available boards
  let boards: JiraBoard[] = [];
  let error: string | null = null;

  try {
    boards = await fetchBoards(userId);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to fetch boards';
  }

  const view = {
    type: 'modal' as const,
    callback_id: 'board_selection_modal',
    title: { type: 'plain_text' as const, text: 'Select Board' },
    close: { type: 'plain_text' as const, text: 'Cancel' },
    blocks: error
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `❌ *Error fetching boards*\n\n${error}\n\nTry running \`/standup-setup\` again.`,
            },
          },
        ]
      : [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Select your Jira board*\n\nChoose the board you want to track for your weekly standups.',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'static_select',
                action_id: 'select_board',
                placeholder: {
                  type: 'plain_text',
                  text: 'Choose a board...',
                },
                options: boards.map((board) => ({
                  text: {
                    type: 'plain_text',
                    text: `${board.name} (${board.location.projectKey})`,
                  },
                  value: `${board.id}:${board.location.projectKey}`,
                })),
              },
            ],
          },
        ],
  };

  if (isUpdate) {
    await updateModal(triggerIdOrViewId, view);
  } else {
    await openModal(triggerIdOrViewId, view);
  }
}

/**
 * Show current configuration with option to change
 */
async function showCurrentConfigModal(
  triggerId: string,
  userId: string,
  config: { board_name: string | null; project_key: string | null }
) {
  await openModal(triggerId, {
    type: 'modal',
    callback_id: 'current_config_modal',
    title: { type: 'plain_text', text: 'Standup Setup' },
    close: { type: 'plain_text', text: 'Done' },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *You're already set up!*\n\nBoard: *${config.board_name || 'Unknown'}*\nProject: *${config.project_key || 'Unknown'}*`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Want to use a different board?',
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'Change Board' },
          action_id: 'reconfigure',
        },
      },
    ],
  });
}
