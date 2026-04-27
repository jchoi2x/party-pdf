import type { HttpClient } from '@/services/http.client';

interface UploadUrlResponse {
  id: string;
  data: Array<{
    id: string;
    filename: string;
    url: string;
    bucketPath: string;
  }>;
}

export type TUploadFileArgs = {
  url: string;
  file: File;
  onProgress: (pct: number) => void;
};
export type TGetUploadUrlArgs = {
  filenames: string[];
  contentType: string;
};

export type TExecuteUploadFlowArgs = {
  file: File;
  contentType: string;
  filename: string;
  onProgress: (pct: number) => void;
};

export type TExecuteBatchUploadFlowArgs = {
  files: Array<{
    file: File;
    filename: string;
  }>;
  contentType: string;
  concurrency?: number;
  onFileProgress?: (args: { fileIndex: number; progress: number }) => void;
  onFileStatusChange?: (args: {
    fileIndex: number;
    status: 'uploading' | 'uploaded' | 'failed';
    error?: string;
  }) => void;
};

type UploadFlowResult = {
  sessionId: string;
  documentIds: string[];
};

export class DocumentUploadService {
  constructor(private readonly http: HttpClient) {}

  async getUploadUrl(args: TGetUploadUrlArgs) {
    const { filenames, contentType = 'application/pdf' } = args;

    const result = await this.http.get<UploadUrlResponse>(`/api/docs/upload-url`, {
      params: {
        filenames,
        contentType,
      },
    });

    if (!result.ok || typeof result.data === 'string') {
      throw new Error('Failed to get upload URL');
    }
    return result.data;
  }

  async uploadFile(args: TUploadFileArgs): Promise<void> {
    const { url, file, onProgress } = args;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload network error')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

      xhr.send(file);
    });
  }

  async executeUploadFlow(args: TExecuteUploadFlowArgs): Promise<UploadFlowResult> {
    const { filename, contentType, file, onProgress } = args;
    const { data, id: sessionId } = await this.getUploadUrl({ filenames: [filename], contentType });
    const fileUpload = data.find((item) => item.filename === filename) ?? data[0];

    if (!fileUpload) {
      throw new Error('Failed to resolve upload URL for file');
    }

    await this.uploadFile({ url: fileUpload.url, file, onProgress });
    return {
      sessionId,
      documentIds: data.map((item) => item.id),
    };
  }

  async executeBatchUploadFlow(args: TExecuteBatchUploadFlowArgs): Promise<UploadFlowResult> {
    const { files, contentType, concurrency = 4, onFileProgress, onFileStatusChange } = args;
    const { data, id: sessionId } = await this.getUploadUrl({
      filenames: files.map((item) => item.filename),
      contentType,
    });

    const uploadByFilename = new Map<string, UploadUrlResponse['data']>();
    for (const uploadMeta of data) {
      const existing = uploadByFilename.get(uploadMeta.filename) ?? [];
      existing.push(uploadMeta);
      uploadByFilename.set(uploadMeta.filename, existing);
    }

    const uploadJobs = files.map((item, fileIndex) => {
      const uploads = uploadByFilename.get(item.filename);
      const uploadMeta = uploads?.shift();
      if (!uploadMeta) {
        throw new Error(`Failed to resolve upload URL for file: ${item.filename}`);
      }
      return {
        fileIndex,
        file: item.file,
        url: uploadMeta.url,
      };
    });

    const failedUploads: Array<{ fileIndex: number; error: string }> = [];
    let nextIndex = 0;
    const workerCount = Math.max(1, Math.min(concurrency, uploadJobs.length));

    const uploadWorker = async () => {
      while (nextIndex < uploadJobs.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const job = uploadJobs[currentIndex];

        onFileStatusChange?.({ fileIndex: job.fileIndex, status: 'uploading' });

        try {
          await this.uploadFile({
            url: job.url,
            file: job.file,
            onProgress: (progress) => {
              onFileProgress?.({ fileIndex: job.fileIndex, progress });
            },
          });
          onFileStatusChange?.({ fileIndex: job.fileIndex, status: 'uploaded' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Upload failed';
          failedUploads.push({ fileIndex: job.fileIndex, error: message });
          onFileStatusChange?.({ fileIndex: job.fileIndex, status: 'failed', error: message });
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => uploadWorker()));

    if (failedUploads.length > 0) {
      throw new Error(`Failed to upload ${failedUploads.length} file(s)`);
    }

    return {
      sessionId,
      documentIds: data.map((item) => item.id),
    };
  }
}
