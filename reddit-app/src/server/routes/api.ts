import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type { SubmitRequest } from '../../shared/api';
import { getGame, submitAnswer } from '../core/game';

export const api = new Hono();

api.get('/game', async (c) => {
  try { return c.json(await getGame(context.userId, context.username)); }
  catch (error) { return c.json({ ok: false, authenticated: Boolean(context.userId), message: error instanceof Error ? error.message : 'Could not load the game.' }, 500); }
});

api.post('/answer', async (c) => {
  if (!context.userId) return c.json({ ok: false, authenticated: false, message: 'Sign in to lock in your answer.' }, 401);
  try {
    const input = await c.req.json<SubmitRequest>();
    return c.json(await submitAnswer(context.userId, context.username, input.prediction, input.vote));
  } catch (error) {
    return c.json({ ok: false, authenticated: true, message: error instanceof Error ? error.message : 'Could not save your answer.' }, 400);
  }
});
