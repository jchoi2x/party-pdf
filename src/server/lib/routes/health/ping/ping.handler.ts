import type { RouteHandler } from '@hono/zod-openapi';

import type { GetPingConfig } from './ping.config';

export const pingHandler: RouteHandler<
	GetPingConfig,
	{ Bindings: Env }
> = async (c) => {
	return c.json({ message: 'pong' }, 200);
};

