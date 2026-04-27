import { OpenAPIHono } from '@hono/zod-openapi';

import { docsByPacketIdConfig } from './docs-by-packet-id.config';
import { docsByPacketIdHandler } from './docs-by-packet-id.handler';

export const docsByPacketIdRouter = new OpenAPIHono<{ Bindings: Env }>();

docsByPacketIdRouter.openapi(docsByPacketIdConfig, docsByPacketIdHandler);
