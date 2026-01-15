import { registerSetupHandler } from './setup';
import { registerStandupHandler } from './standup';

/**
 * Register all Slack command handlers
 */
export function registerAllHandlers() {
  registerSetupHandler();
  registerStandupHandler();
}
