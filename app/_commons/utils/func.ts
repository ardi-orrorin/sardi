export function getBackendBaseUrl() {
  const raw = process.env.SARDI_BACKEND_URL ?? process.env.NYAA_BACKEND_URL;
  if (!raw) {
    throw new Error("SARDI_BACKEND_URL이 설정되지 않았습니다.");
  }

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export class FetchBuilder {
  private static defaultHeaders = {
    "Content-Type": "application/json"
  };

  static get() {
    return new FetchRequest("GET");
  }

  static post() {
    return new FetchRequest("POST");
  }

  static delete() {
    return new FetchRequest("DELETE");
  }

  static patch() {
    return new FetchRequest("PATCH");
  }
}

class FetchRequest {
  private requestUrl = "";
  private requestBody: unknown;
  private requestHeaders: Record<string, string> = {};
  private cacheEnabled = false;

  constructor(private method: "GET" | "POST" | "DELETE" | "PATCH") {}

  url(value: string): this {
    this.requestUrl = value;
    return this;
  }

  body(value: unknown): this {
    this.requestBody = value;
    return this;
  }

  header(key: string, value: string): this {
    this.requestHeaders[key] = value;
    return this;
  }

  headers(headers: Record<string, string>): this {
    this.requestHeaders = { ...this.requestHeaders, ...headers };
    return this;
  }

  cache(enabled = true): this {
    this.cacheEnabled = enabled;
    return this;
  }

  private getCacheOptions(): { cache?: RequestCache; next?: { revalidate: number } } {
    if (this.cacheEnabled) {
      return { next: { revalidate: 600 } };
    }

    return {
      cache: "no-store",
      next: { revalidate: 0 }
    };
  }

  async execute<T = unknown>(): Promise<T> {
    const finalHeaders = {
      ...FetchBuilder["defaultHeaders"],
      ...this.requestHeaders
    };

    const response = await fetch(this.requestUrl, {
      method: this.method,
      headers: finalHeaders,
      body: this.requestBody ? JSON.stringify(this.requestBody) : undefined,
      ...this.getCacheOptions()
    });

    if (!response.ok) {
      throw new Error(`${this.method} request failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json() as Promise<T>;
    }

    return response.arrayBuffer() as Promise<T>;
  }

  async executeResponse(): Promise<Response> {
    const finalHeaders = {
      ...FetchBuilder["defaultHeaders"],
      ...this.requestHeaders
    };

    return fetch(this.requestUrl, {
      method: this.method,
      headers: finalHeaders,
      body: this.requestBody ? JSON.stringify(this.requestBody) : undefined,
      ...this.getCacheOptions()
    });
  }
}
