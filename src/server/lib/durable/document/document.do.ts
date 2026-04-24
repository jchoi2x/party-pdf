import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { requireAuth0Jwt } from '../../middleware/auth';
import { initS3Client } from '../../utils/s3';

export type DocumentRecord = {
  id: string;
  packet_id: string;
  filename: string;
  url: string;
  download_url: string;
  bucket_path: string;
  created_at: string;
  status: 'pending' | 'ready';
};

export class Document extends DurableObject<Env> {
  app = new Hono<{ Bindings: Env }>().basePath('/api');

  doSql: SqlStorage;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.app.use(requireAuth0Jwt);
    this.doSql = state.storage.sql;
    this.initRoutes();
    this.initTable();
  }

  private initTable(): void {
    this.doSql.exec("DROP TABLE IF EXISTS documents");
    this.doSql.exec(
      "CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, packet_id TEXT NOT NULL, filename TEXT NOT NULL, url TEXT NOT NULL, download_url TEXT NOT NULL, bucket_path TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'ready')))",
    );
  }

  private initRoutes(){

    // get s3 upload urls
    this.app.get('/docs/upload-url', async (c) => {
      const filenames = c.req.queries('filenames') ?? [];
      const contentType = c.req.query('contentType') ?? 'application/pdf';
      console.log('upload-url', { filenames, contentType });
      const jwtPayload = c.get('jwtPayload');
    
      const { generateUploadUrl } = initS3Client();
    
      const packet_id = crypto.randomUUID();

      const data = await Promise.all(filenames.map((filename) => {
        const prefix = `${jwtPayload.sub as string}/${packet_id}`;
        return generateUploadUrl({
          prefix,
          contentType,
          name: filename,
        })
      }));

      this.createDocumentRecords(packet_id, data);
    
      return c.json({ data, id: packet_id }, 200);
    });

    // get documents by packet id
    this.app.get('/docs/by-packet-id/:packet_id', async (c) => {
      const docs = await this.getDocumentsByPacketId(c.req.param('packet_id'));
      return c.json({ data: docs }, 200);
    });

    // get all the users documents
    this.app.get('/docs', async (c) => {
      const { limit = 10, page = 1 } = c.req.query() as unknown as { limit: number, page: number };
      const offset = (page - 1) * limit;

      const total = this.doSql.exec('SELECT COUNT(*) FROM documents');
      const totalPages = Math.ceil(parseInt(total as any, 10) / limit);

      const data = this.doSql.exec('SELECT * FROM documents ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
      const docs = data.toArray().map((d) => this.toDocumentRecord(d as any))

    
      return c.json({ data: docs, total, totalPages, page, limit }, 200);
    });
  }

  private createDocumentRecords(packet_id: string, data: { id: string, filename: string, url: string, downloadUrl: string, bucketPath: string }[] ) {
    console.log('data', data);
    const docs = data.map((doc) => {
      return {
        id: doc.id,
        packet_id,
        filename: doc.filename,
        url: doc.url,
        download_url: doc.downloadUrl,
        created_at: Date.now().toString(),
        status: 'pending',
        bucket_path: doc.bucketPath,
      }
    });

    console.log('docs', docs);
    docs.forEach((doc) => {
      this.doSql.exec('INSERT INTO documents (id, packet_id, filename, url, download_url, created_at, status, bucket_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        doc.id, doc.packet_id, doc.filename, doc.url, doc.download_url, doc.created_at, doc.status, doc.bucket_path 
      );
    });
  }


  private async getDocumentsByPacketId(packet_id: string) {
    const documents = await this.doSql.exec('SELECT * FROM documents WHERE packet_id = ?', packet_id);
    const docs = documents.toArray().map((d) => this.toDocumentRecord(d as any));
    return docs;
  }

  private toDocumentRecord(doc: {
    id: string;
    packet_id: string;
    filename: string;
    url: string;
    download_url: string;
    bucket_path: string;
    created_at: string;
    status: 'pending' | 'ready';
  }): DocumentRecord {
    return {
      id: doc.id,
      packet_id: doc.packet_id,
      filename: doc.filename,
      url: doc.url,
      download_url: doc.download_url,
      bucket_path: doc.bucket_path,
      created_at: doc.created_at,
      status: doc.status,
    };
  }

  async fetch(request: Request) {
    return this.app.fetch(request, this.env);
  }
}
