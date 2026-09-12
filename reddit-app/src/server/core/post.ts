import { reddit, redis } from '@devvit/web/server';
import type { Question, Summary } from '../../shared/api';
import { brusselsDay, shiftDay } from './date';
import { formatLeaderboardComment, rankPlayers, type DailyPlayer } from './leaderboard';
import { rpc } from './supabase';

const dailyPlayersKey = (day: string) => `v2:daily-players:${day}`;

function parsePlayers(values: Record<string, string>): DailyPlayer[] {
  return Object.values(values).flatMap((value) => {
    try {
      const player = JSON.parse(value) as Partial<DailyPlayer>;
      return typeof player.username === 'string' && typeof player.prediction === 'number'
        ? [{ username: player.username, prediction: player.prediction }]
        : [];
    } catch {
      return [];
    }
  });
}

async function ensurePreviousLeaderboard(postId: string, day: string): Promise<void> {
  const commentKey = `v2:leaderboard-comment:${day}`;
  if (await redis.get(commentKey)) return;

  const lockKey = `v2:leaderboard-comment-lock:${day}`;
  const lock = await redis.set(lockKey, 'commenting', {
    nx: true,
    expiration: new Date(Date.now() + 2 * 60 * 1000)
  });
  if (!lock) return;

  try {
    const previousDay = shiftDay(day, -1);
    const [summary, storedPlayers] = await Promise.all([
      rpc<Summary & { ok: boolean }>('tt_summary', { p_day: previousDay }),
      redis.hGetAll(dailyPlayersKey(previousDay))
    ]);
    if (!summary.ok || summary.state !== 'closed' || typeof summary.option_a_pct !== 'number') return;

    const leaders = rankPlayers(parsePlayers(storedPlayers), summary.option_a_pct);
    if (leaders.length === 0) return;

    const comment = await reddit.submitComment({
      id: postId as `t3_${string}`,
      text: formatLeaderboardComment(leaders, summary.option_a ?? 'Yes'),
      runAs: 'APP'
    });
    await redis.set(commentKey, comment.id);
  } finally {
    await redis.del(lockKey);
  }
}

async function addLeaderboardSafely(postId: string, day: string): Promise<void> {
  try {
    await ensurePreviousLeaderboard(postId, day);
  } catch (error) {
    console.error('Previous Think Tank leaderboard comment failed', error);
  }
}

export async function createPost() {
  const day = brusselsDay();
  const postKey = `v1:post:${day}`;
  const lockKey = `v1:post-lock:${day}`;
  const existing = await redis.get(postKey);
  if (existing) {
    await addLeaderboardSafely(existing, day);
    return { id: existing, created: false };
  }

  const lock = await redis.set(lockKey, 'publishing', {
    nx: true,
    expiration: new Date(Date.now() + 2 * 60 * 1000)
  });
  if (!lock) {
    const concurrentlyCreated = await redis.get(postKey);
    if (concurrentlyCreated) return { id: concurrentlyCreated, created: false };
    throw new Error('Today’s Think Tank post is already being published.');
  }

  try {
    const question = await rpc<Question & { ok: boolean; error?: string }>('tt_question', { p_day: day });
    if (!question.ok || question.state !== 'open') throw new Error('Publish today’s question in Supabase first.');
    const post = await reddit.submitCustomPost({
      title: `Think Tank: ${question.question}`,
      postData: { day },
      textFallback: { text: `Predict how r/euobserver will answer: ${question.question}` }
    });
    await redis.set(postKey, post.id);
    await addLeaderboardSafely(post.id, day);
    return { id: post.id, created: true };
  } finally {
    await redis.del(lockKey);
  }
}
