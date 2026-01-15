import { supabase } from './client';

/**
 * Get stored ticket names for a user
 * These are used for consistent naming across reports
 */
export async function getTicketNames(
  userId: string
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('ticket_names')
    .select('ticket_key, name')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching ticket names:', error);
    return {};
  }

  return (data || []).reduce(
    (acc, row) => {
      acc[row.ticket_key] = row.name;
      return acc;
    },
    {} as Record<string, string>
  );
}

/**
 * Save ticket names for a user
 * Upserts to handle both new and existing tickets
 */
export async function saveTicketNames(
  userId: string,
  names: Record<string, string>
): Promise<void> {
  const entries = Object.entries(names).map(([ticketKey, name]) => ({
    user_id: userId,
    ticket_key: ticketKey,
    name,
    updated_at: new Date().toISOString(),
  }));

  if (entries.length === 0) return;

  const { error } = await supabase
    .from('ticket_names')
    .upsert(entries, { onConflict: 'user_id,ticket_key' });

  if (error) {
    console.error('Error saving ticket names:', error);
  }
}
