import { App, ExpressReceiver } from '@slack/bolt';

// Create a custom receiver for serverless environments
export const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  processBeforeResponse: true,
});

// Initialize Bolt app
export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

/**
 * Send a DM to a user
 */
export async function sendDirectMessage(
  userId: string,
  text: string,
  blocks?: any[]
): Promise<void> {
  await app.client.chat.postMessage({
    channel: userId,
    text,
    blocks,
  });
}

/**
 * Open a modal for user interaction
 */
export async function openModal(
  triggerId: string,
  view: any
): Promise<void> {
  await app.client.views.open({
    trigger_id: triggerId,
    view,
  });
}

/**
 * Update a modal view
 */
export async function updateModal(
  viewId: string,
  view: any
): Promise<void> {
  await app.client.views.update({
    view_id: viewId,
    view,
  });
}
