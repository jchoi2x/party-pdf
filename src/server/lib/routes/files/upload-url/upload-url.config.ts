import { createRoute } from '@hono/zod-openapi';

import {
	UploadUrlErrorSchema,
	UploadUrlQuerySchema,
	UploadUrlResponseSchema,
} from './schemas';

export const uploadUrlConfig = createRoute({
	method: 'get',
	path: '/upload-url',
	tags: ['File'],
	request: {
		query: UploadUrlQuerySchema,
	},
	responses: {
		200: {
			description: 'Upload URL',
			content: {
				'application/json': {
					schema: UploadUrlResponseSchema,
				},
			},
		},
		400: {
			description: 'Error response',
			content: {
				'application/json': {
					schema: UploadUrlErrorSchema,
				},
			},
		},
	},
});

export type UploadUrlConfig = typeof uploadUrlConfig;

