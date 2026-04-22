import { createRoute } from '@hono/zod-openapi';

import { PingErrorSchema, PingResponseSchema } from './schemas';

export const pingConfig = createRoute({
	method: 'get',
	path: '/ping',
	tags: ['Health'],
	responses: {
		200: {
			description: 'Pong message',
			content: {
				'application/json': {
					schema: PingResponseSchema,
				},
			},
		},
		400: {
			description: 'Error response',
			content: {
				'application/json': {
					schema: PingErrorSchema,
				},
			},
		},
	},
});

export type PingConfig = typeof pingConfig;

export type GetPingConfig = typeof pingConfig;