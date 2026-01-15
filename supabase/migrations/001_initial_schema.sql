-- Weekly Standup Generator Database Schema
-- Run this migration in your Supabase SQL Editor

-- Users table
-- Stores basic user info linked to Slack
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_user_id TEXT NOT NULL UNIQUE,
  slack_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth tokens table
-- Stores encrypted OAuth tokens for each provider
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'jira', 'slack', etc.
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Jira configs table
-- Stores user's Jira configuration
CREATE TABLE IF NOT EXISTS jira_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  jira_cloud_id TEXT NOT NULL,
  jira_base_url TEXT NOT NULL,
  board_id INTEGER,
  board_name TEXT,
  project_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket names table
-- Stores consistent ticket names across reports
CREATE TABLE IF NOT EXISTS ticket_names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_key TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticket_key)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_provider ON oauth_tokens(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_jira_configs_user ON jira_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_names_user ON ticket_names(user_id);
CREATE INDEX IF NOT EXISTS idx_users_slack_id ON users(slack_user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_names ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for our API)
-- These policies allow the service key to access all data
CREATE POLICY "Service role full access" ON users
  FOR ALL USING (true);

CREATE POLICY "Service role full access" ON oauth_tokens
  FOR ALL USING (true);

CREATE POLICY "Service role full access" ON jira_configs
  FOR ALL USING (true);

CREATE POLICY "Service role full access" ON ticket_names
  FOR ALL USING (true);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_jira_configs_updated_at
  BEFORE UPDATE ON jira_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ticket_names_updated_at
  BEFORE UPDATE ON ticket_names
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
