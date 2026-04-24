import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { requireAuth0Jwt } from '../middleware/auth';
import { filesRouter } from './files';
import { healthRouter } from './health';
import { meRouter } from './me';
import { videosRouter } from './video';

export const apiApp = new OpenAPIHono<{ Bindings: Env }>();

apiApp.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

// Swagger UI endpoint
apiApp.get('/swagger-ui', swaggerUI({ url: '/api/swagger-ui/openapi.json' }));

// OpenAPI JSON endpoint
apiApp.doc('/swagger-ui/openapi.json', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Party PDF API',
    description: 'API endpoints for the Party PDF',
  },
  servers: [
    {
      url: '/api',
      description: 'Local API Base URL',
    },
  ],
});


apiApp.use(requireAuth0Jwt);
apiApp.route('', healthRouter);
apiApp.route('', meRouter);
apiApp.route('', filesRouter);
apiApp.route('/videos', videosRouter);
