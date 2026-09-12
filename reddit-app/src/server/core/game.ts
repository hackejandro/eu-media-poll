import { reddit, redis } from '@devvit/web/server';
import type { Answer, GameResponse, Question, SubmitResponse, Summary } from '../../shared/api';
import { brusselsDay, shiftDay } from './date';
import { rpc } from './supabase';

type RpcResult = { ok: boolean; error?: string; code?: string };

const identityKey = (userId: string) => `v1:identity:${userId}`;
const streakKey = (userId: string) => `v1:streak:${userId}`;
const lastDayKey = (userId: string) => `v1:last-day:${userId}`;
const dailyPlayersKey = (day: string) => `v2:daily-players:${day}`;

async function rememberDailyPlayer(userId: string, username: string | undefined, day: string, prediction: number): Promise<void> {
  if (!Number.isInteger(prediction) || prediction < 0 || prediction > 100) return;
  let resolvedUsername = username;
  if (!resolvedUsername) {
    try {
      resolvedUsername = (await reddit.getUserById(userId as `t2_${string}`))?.username;
    } catch (error) {
      console.error('Could not resolve Reddit username for leaderboard', error);
    }
  }
  const safeUsername = resolvedUsername?.replace(/[^A-Za-z0-9_-]/g, '');
  if (!safeUsername) return;
  const key = dailyPlayersKey(day);
  await redis.hSet(key, { [userId]: JSON.stringify({ username: safeUsername, prediction }) });
  await redis.expire(key, 45 * 24 * 60 * 60);
}

async function identityFor(userId: string): Promise<string> {
  const existing = await redis.get(identityKey(userId));
  if (existing) return existing;
  const created = await rpc<RpcResult>('tt_new_identity');
  if (!created.ok || !created.code) throw new Error(created.error ?? 'Could not create a Brussels identity.');
  await redis.set(identityKey(userId), created.code);
  return created.code;
}

export async function getGame(userId?: string, username?: string): Promise<GameResponse> {
  const day = brusselsDay();
  const question = await rpc<Question & RpcResult>('tt_question', { p_day: day });
  if (!question.ok || question.state !== 'open') {
    return { ok: true, authenticated: Boolean(userId), message: 'There is no published Think Tank question today.' };
  }
  if (!userId) return { ok: true, authenticated: false, question };
  const identity = await identityFor(userId);
  const [answer, yesterday, streakRaw] = await Promise.all([
    rpc<Answer & RpcResult>('tt_status', { p_day: day, p_identity: identity }),
    rpc<Summary & RpcResult>('tt_summary', { p_day: shiftDay(day, -1), p_identity: identity }),
    redis.get(streakKey(userId))
  ]);
  if (answer.answered && answer.prediction !== undefined) {
    await rememberDailyPlayer(userId, username, day, answer.prediction);
  }
  return {
    ok: true, authenticated: true, identity, question, answer,
    yesterday: yesterday.state === 'closed' ? yesterday : null,
    streak: Number(streakRaw ?? 0)
  };
}

export async function submitAnswer(userId: string, username: string | undefined, prediction: number, vote: 'A' | 'B'): Promise<SubmitResponse> {
  if (!Number.isInteger(prediction) || prediction < 0 || prediction > 100 || !['A', 'B'].includes(vote)) {
    throw new Error('Choose an answer and a prediction from 0 to 100.');
  }
  const day = brusselsDay();
  const identity = await identityFor(userId);
  const saved = await rpc<Answer & RpcResult & { duplicate?: boolean }>('tt_submit_answer', {
    p_day: day, p_identity: identity, p_prediction: prediction, p_vote: vote
  });
  if (!saved.ok) throw new Error(saved.error ?? 'Could not save your answer.');
  await rememberDailyPlayer(userId, username, day, saved.prediction ?? prediction);
  let streak = Number(await redis.get(streakKey(userId)) ?? 0);
  if (!saved.duplicate) {
    const lastDay = await redis.get(lastDayKey(userId));
    streak = lastDay === shiftDay(day, -1) ? streak + 1 : 1;
    await Promise.all([redis.set(streakKey(userId), String(streak)), redis.set(lastDayKey(userId), day)]);
  }
  return { ok: true, authenticated: true, identity, answer: saved, duplicate: saved.duplicate, streak };
}
