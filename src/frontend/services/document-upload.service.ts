import type { HttpClient } from '@/services/http.client';

interface UploadUrlResponse {
  url: string;
  id: string;
}

interface DownloadUrlResponse {
  id: string;
  url: string;
  filename: string;
  contentType: string;
}

export type TUploadFileArgs = {
  url: string;
  file: File;
  onProgress: (pct: number) => void;
};
export type TGetUploadUrlArgs = {
  filename: string;
  contentType: string;
};

export type TExecuteUploadFlowArgs = {
  file: File;
  contentType: string;
  filename: string;
  onProgress: (pct: number) => void;
};

export class DocumentUploadService {
  constructor(private readonly http: HttpClient) {}

  async getUploadUrl(args: TGetUploadUrlArgs) {
    const { filename, contentType = 'application/pdf' } = args;

    const result = await this.http.get<UploadUrlResponse>(`/upload-url`, {
      params: {
        filename,
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

  async getDownloadUrl(id: string) {
    const result = await this.http.get<DownloadUrlResponse>(`/download-url/${id}`);
    if (!result.ok || typeof result.data === 'string') {
      throw new Error('Failed to get download URL');
    }
    return result.data;
  }

  async executeUploadFlow(args: TExecuteUploadFlowArgs): Promise<DownloadUrlResponse> {
    const { filename, contentType, file, onProgress } = args;
    const { url: uploadUrl, id } = await this.getUploadUrl({ filename, contentType });
    await this.uploadFile({ url: uploadUrl, file, onProgress });
    const { url: downloadUrl } = await this.getDownloadUrl(id);
    return {
      id,
      filename,
      contentType,
      url: downloadUrl,
    };
  }
}
