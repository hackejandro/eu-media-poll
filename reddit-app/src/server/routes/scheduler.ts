import { Hono } from 'hono';
import { isBrusselsPublishHour } from '../core/date';
import { createPost } from '../core/post';

export const scheduler = new Hono();

scheduler.post('/daily-publish', async (c) => {
  if (!isBrusselsPublishHour()) {
    return c.json({ status: 'skipped', reason: 'Outside the 06:00 Brussels publishing hour.' });
  }

  try {
    const post = await createPost();
    return c.json({ status: 'ok', postId: post.id, created: post.created });
  } catch (error) {
    console.error('Daily Think Tank publication failed', error);
    return c.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Daily publication failed.'
    }, 500);
  }
});
