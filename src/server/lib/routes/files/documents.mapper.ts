import type { Document } from '../../db/schema';

export const toDocumentResponse = (doc: Document) => ({
  id: doc.id,
  packet_id: doc.packetId,
  filename: doc.filename,
  url: doc.url,
  download_url: doc.downloadUrl,
  bucket_path: doc.bucketPath,
  created_at: doc.createdAt,
  status: doc.status,
});
