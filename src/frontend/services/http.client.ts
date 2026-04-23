
export interface FetchV2RequestInit extends RequestInit {
  params?: Record<string, string>;
  /**
   * Called while uploading streaming request bodies (e.g. File/Blob uploads).
   */
  onUploadProgress?: (progress: { loaded: number; total: number; percent: number }) => void;
}

export type FetchV2Response<SuccessType = unknown, FailureType = unknown> =
  | { ok: true; status: number; headers: Headers; data: SuccessType | string }
  | { ok: false; status: number; headers: Headers; data: FailureType };


const getFullUrl = (baseUrl: string, url: string, params: Record<string, string>) => {
  if (url.startsWith('http')) {
    return url;
  }
  const urlStr = url.startsWith('http') ? url : `${baseUrl}${url}`;
  const _url = new URL(urlStr);
  // parse search to object
  const _currentSearch = _url.search ? new URLSearchParams(_url.search) : new URLSearchParams();
  const currentSearch = Object.fromEntries([..._currentSearch]);

  

  _url.search = new URLSearchParams({
    ...currentSearch,
    ...params
  }).toString();
  return _url.toString();
}


const buildClient = (baseUrl: string) => {
  /**
 * Using native fetch to make a request to the API.
 * In addition taking care of infrastructure headers like Authorization, AWS WAF Token.
 * Inferring the request type if not provided to be application/json.
 */
  async function fetchV2<SuccessType = unknown, FailureType = unknown>(
    url: string,
    _options: FetchV2RequestInit = {}
  ): Promise<FetchV2Response<SuccessType, FailureType>> {
    try {
      const { onUploadProgress, params = {}, ...options } = _options;
      const opts: FetchV2RequestInit = {
        method: 'GET',
        headers: {},
        ...options,
      };
      const headers = new Headers(opts.headers);
      const body = opts.body;


      const fullUrl = getFullUrl(baseUrl, url, params);

      // Set default headers when omitted
      // if (!headers.has('Accept')) {
      //   headers.set('Accept', 'application/json');
      // }

      const hasJsonBody =
        typeof body === 'string' &&
        !headers.has('Content-Type') &&
        opts.method !== 'GET' &&
        opts.method !== 'HEAD';
      if (hasJsonBody) {
        headers.set('Content-Type', 'application/json');
      }

      if (onUploadProgress && body instanceof Blob) {
        const total = body.size;
        let loaded = 0;
        const trackedBody = body.stream().pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              loaded += chunk.byteLength;
              opts.onUploadProgress?.({
                loaded,
                total,
                percent: total > 0 ? Math.round((loaded / total) * 100) : 100,
              });
              controller.enqueue(chunk);
            },
          }),
        );

        opts.body = trackedBody as unknown as BodyInit;
        (opts as RequestInit & { duplex?: 'half' }).duplex = 'half';
      }

      opts.headers = headers;

      const response = await fetch(fullUrl, opts);
      const ret = { 
        headers: response.headers, 
        ok: response.ok, 
        status: response.status, 
        data: {} as SuccessType | string
      };


      try {
        const isJson = response.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await response.json() : await response.text();

        ret.data = data;
        

        // eslint-disable-next-line no-empty
      } catch {
        // Uncomment for debugging
        // console.error('Failed to parse response as JSON', e, url);
      }

      return ret as FetchV2Response<SuccessType, FailureType>;
    } catch (error) {
      console.error(`Fetch error:`, error, url);
      throw error;
    }
  }
  return fetchV2;
};



export class HttpClient {
  baseUrl: string;
  client: ReturnType<typeof buildClient>;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.client = buildClient(baseUrl);
  }

  get<SuccessType = unknown, FailureType = unknown>(url: string, options: FetchV2RequestInit = {}): Promise<FetchV2Response<SuccessType, FailureType>> {
    return this.client<SuccessType, FailureType>(url, {
      method: 'GET',
      ...options,
    });
  }

  put<SuccessType = unknown, FailureType = unknown>(
    url: string,
    options: FetchV2RequestInit = {},
  ): Promise<FetchV2Response<SuccessType, FailureType>> {
    return this.client<SuccessType, FailureType>(url, {
      method: 'PUT',
      ...options,
    });
  }

  post<SuccessType = unknown, FailureType = unknown>(
    url: string,
    options: FetchV2RequestInit = {},
  ): Promise<FetchV2Response<SuccessType, FailureType>> {
    return this.client<SuccessType, FailureType>(url, {
      method: 'POST',
      ...options,
    });
  }

  patch<SuccessType = unknown, FailureType = unknown>(
    url: string,
    options: FetchV2RequestInit = {},
  ): Promise<FetchV2Response<SuccessType, FailureType>> {
    return this.client<SuccessType, FailureType>(url, {
      method: 'PATCH',
      ...options,
    });
  }

  delete<SuccessType = unknown, FailureType = unknown>(
    url: string,
    options: FetchV2RequestInit = {},
  ): Promise<FetchV2Response<SuccessType, FailureType>> {
    return this.client<SuccessType, FailureType>(url, {
      method: 'DELETE',
      ...options,
    });
  }

}