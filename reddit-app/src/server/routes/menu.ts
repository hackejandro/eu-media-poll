import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();
    return c.json<UiResponse>({ navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}` });
  } catch (error) {
    return c.json<UiResponse>({ showToast: error instanceof Error ? error.message : 'Failed to create post' }, 400);
  }
});
