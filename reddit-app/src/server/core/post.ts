import { reddit, redis } from '@devvit/web/server';
import type { Question } from '../../shared/api';
import { brusselsDay } from './date';
import { rpc } from './supabase';

export async function createPost() {
  const day = brusselsDay();
  const postKey = `v1:post:${day}`;
  const lockKey = `v1:post-lock:${day}`;
  const existing = await redis.get(postKey);
  if (existing) return { id: existing, created: false };

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
    return { id: post.id, created: true };
  } finally {
    await redis.del(lockKey);
  }
}
