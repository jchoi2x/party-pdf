import { createRoute } from '@hono/zod-openapi';

import {
	DownloadUrlErrorSchema,
	DownloadUrlParamsSchema,
	DownloadUrlResponseSchema,
} from './schemas';

export const downloadUrlConfig = createRoute({
	method: 'get',
	path: '/download-url/{uuid}',
	operationId: 'getDownloadUrlByUuid',
	summary: 'Generate a download URL for the given UUID',
	tags: ['File'],
	request: {
		params: DownloadUrlParamsSchema,
	},
	responses: {
		200: {
			description: 'Download URL',
			content: {
				'application/json': {
					schema: DownloadUrlResponseSchema,
				},
			},
		},
		400: {
			description: 'Error response',
			content: {
				'application/json': {
					schema: DownloadUrlErrorSchema,
				},
			},
		},
	},
});

export type DownloadUrlConfig = typeof downloadUrlConfig;

