const SUPABASE_URL = 'https://czvyukhxfdvjgljgxrke.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PnnP9MVCQOFJ3mSGJgDgeA_q9QxuE5y';

export async function rpc<T>(name: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json() as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(data.message ?? data.error ?? `Think Tank backend returned ${response.status}`);
  return data;
}
