import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { Hono } from 'hono';
import { api } from './routes/api';
import { menu } from './routes/menu';
import { scheduler } from './routes/scheduler';

const app = new Hono();
app.route('/api', api);
app.route('/internal/menu', menu);
app.route('/internal/scheduler', scheduler);

serve({ fetch: app.fetch, createServer, port: getServerPort() });
