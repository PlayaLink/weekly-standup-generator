import { app, sendDirectMessage } from '../app';
import { getOrCreateUser } from '../../db/users';
import { getJiraConfig } from '../../db/configs';
import { hasValidToken } from '../../db/tokens';
import { fetchTickets } from '../../jira/client';
import { generateStandupReport } from '../../claude/generate';
import { getTicketNames, saveTicketNames } from '../../db/ticket-names';

/**
 * Handle /weekly-standup command
 * Generates and posts a standup report to the user
 */
export function registerStandupHandler() {
  app.command('/weekly-standup', async ({ command, ack, respond }) => {
    // Acknowledge immediately to avoid timeout
    await ack();

    const slackUserId = command.user_id;
    const slackUserName = command.user_name;

    // Let user know we're working on it
    await respond({
      response_type: 'ephemeral',
      text: '⏳ Generating your weekly standup report...',
    });

    try {
      // Get user from database
      const user = await getOrCreateUser(slackUserId, slackUserName);

      // Check if user has Jira connected
      const hasJira = await hasValidToken(user.id, 'jira');
      if (!hasJira) {
        await respond({
          response_type: 'ephemeral',
          replace_original: true,
          text: '❌ Jira not connected. Run `/standup-setup` first to connect your account.',
        });
        return;
      }

      // Check if user has selected a board
      const jiraConfig = await getJiraConfig(user.id);
      if (!jiraConfig?.board_id) {
        await respond({
          response_type: 'ephemeral',
          replace_original: true,
          text: '❌ No board selected. Run `/standup-setup` to select your Jira board.',
        });
        return;
      }

      // Fetch tickets from Jira
      const tickets = await fetchTickets(user.id);

      if (tickets.length === 0) {
        await respond({
          response_type: 'ephemeral',
          replace_original: true,
          text: '📭 No tickets found with recent activity. Nothing to report!',
        });
        return;
      }

      // Get existing ticket names for consistency
      const existingNames = await getTicketNames(user.id);

      // Generate report using Claude
      const { report, newTicketNames } = await generateStandupReport(
        tickets,
        jiraConfig.jira_base_url,
        existingNames
      );

      // Save updated ticket names
      await saveTicketNames(user.id, newTicketNames);

      // Send report as DM
      await sendDirectMessage(slackUserId, formatReportForSlack(report));

      // Confirm to user
      await respond({
        response_type: 'ephemeral',
        replace_original: true,
        text: '✅ Your weekly standup has been sent to your DMs!',
      });
    } catch (error) {
      console.error('Error generating standup:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await respond({
        response_type: 'ephemeral',
        replace_original: true,
        text: `❌ Error generating standup: ${errorMessage}\n\nTry again or contact support if this persists.`,
      });
    }
  });
}

/**
 * Format markdown report for Slack's mrkdwn format
 */
function formatReportForSlack(report: string): string {
  // Slack uses slightly different markdown
  // - Headers use *bold* instead of ##
  // - Links are <url|text> format (already correct from Claude)

  return report
    .replace(/^## (.+)$/gm, '*$1*') // Convert ## headers to bold
    .replace(/^### (.+)$/gm, '*$1*') // Convert ### headers to bold
    .replace(/^- /gm, '• '); // Use bullet points
}
