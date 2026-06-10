import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (url && key) ? createClient(url, key) : null;

export async function saveGame({ userId, gameMode, players, wins }) {
  if (!supabase || !userId) return;
  const winner = wins[0] > wins[1] ? 'gm1' : wins[1] > wins[0] ? 'gm2' : 'tie';
  const { error } = await supabase.from('games').insert({
    user_id: userId,
    game_mode: gameMode,
    gm1_name: players[0].name,
    gm2_name: players[1].name,
    gm1_wins: wins[0] ?? 0,
    gm2_wins: wins[1] ?? 0,
    gm1_lineup: players[0].lineup,
    gm2_lineup: players[1].lineup,
    winner,
  });
  return error;
}

export async function getRecentGames(userId, limit = 5) {
  if (!supabase || !userId) return [];
  const { data } = await supabase
    .from('games')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getProfile(userId) {
  if (!supabase || !userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

export async function getAllUsers() {
  if (!supabase) return [];
  const { data } = await supabase
    .from('profiles')
    .select('*, games(count)')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function setBanned(userId, banned) {
  if (!supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: banned })
    .eq('id', userId);
  return error;
}
