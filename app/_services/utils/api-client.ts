"use client";

type ApiErrorPayload = {
  message?: string;
  error?: string;
};

function resolveErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null) {
    const candidate = payload as ApiErrorPayload;
    if (candidate.message?.trim()) {
      return candidate.message;
    }

    if (candidate.error?.trim()) {
      return candidate.error;
    }
  }

  return fallback;
}

export async function requestApiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, `${response.status} 요청 실패`));
  }

  return payload as T;
}
