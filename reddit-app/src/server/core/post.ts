import { reddit, redis } from '@devvit/web/server';
import type { Question } from '../../shared/api';
import { brusselsDay } from './date';
import { rpc } from './supabase';

export async function createPost() {
  const day = brusselsDay();
  const question = await rpc<Question & { ok: boolean; error?: string }>('tt_question', { p_day: day });
  if (!question.ok || question.state !== 'open') throw new Error('Publish today’s question in Supabase first.');
  const existing = await redis.get(`v1:post:${day}`);
  if (existing) throw new Error('Today’s Think Tank post already exists.');
  const post = await reddit.submitCustomPost({
    title: `Think Tank: ${question.question}`,
    postData: { day },
    textFallback: { text: `Predict how r/euobserver will answer: ${question.question}` }
  });
  await redis.set(`v1:post:${day}`, post.id);
  return post;
}
