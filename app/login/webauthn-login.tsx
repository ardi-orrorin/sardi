"use client";

import { AUTH_SERVICE_NAME } from "@/app/_commons/constants/auth";
import { FetchBuilder } from "@/app/_commons/utils/func";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PublicKeyRequestPayload } from "./_service/types/public-key-request";
import { WebauthnOptionsResponse } from "./_service/types/webauthn-options";

const decodeBase64Url = (input: string) => {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return bytes.buffer;
};

const encodeBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const normalizeRequestOptions = (options: unknown): PublicKeyCredentialRequestOptions => {
  const normalized =
    typeof options === "object" && options !== null && "publicKey" in options
      ? (options as { publicKey?: PublicKeyRequestPayload }).publicKey
      : (options as PublicKeyRequestPayload | undefined);

  const rawChallenge = normalized?.challenge;
  if (!rawChallenge || typeof rawChallenge !== "string") {
    throw new Error("패스키 인증 옵션이 올바르지 않습니다.");
  }

  const allowCredentials = Array.isArray(normalized?.allowCredentials)
    ? normalized.allowCredentials
        .filter((item) => typeof item.id === "string")
        .map((item) => ({
          type: "public-key",
          id: decodeBase64Url(item.id as string),
          transports: item.transports
        }))
    : undefined;

  return {
    ...(normalized ?? {}),
    challenge: decodeBase64Url(rawChallenge),
    allowCredentials
  } as PublicKeyCredentialRequestOptions;
};

const credentialToJson = (credential: PublicKeyCredential) => {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: encodeBase64Url(response.authenticatorData),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      signature: encodeBase64Url(response.signature),
      userHandle: response.userHandle ? encodeBase64Url(response.userHandle) : null
    },
    clientExtensionResults: credential.getClientExtensionResults()
  };
};

export default function WebauthnLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handlePasskeyLogin = async () => {
    if (!("PublicKeyCredential" in window) || !navigator.credentials) {
      setMessage("이 브라우저는 패스키 로그인을 지원하지 않습니다.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const optionsBody = await FetchBuilder.post()
        .url("/api/webauthn/auth/options")
        .body({ service: AUTH_SERVICE_NAME })
        .execute<WebauthnOptionsResponse>();

      if (optionsBody.error_code === "webauthn_not_registered") {
        setMessage("등록된 패스키가 없습니다. 비밀번호로 로그인하세요.");
        return;
      }

      if (!optionsBody?.public_key || !optionsBody.challenge_id) {
        throw new Error("패스키 인증 옵션을 가져오지 못했습니다.");
      }

      const publicKey = normalizeRequestOptions(optionsBody.public_key);
      const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
      if (!credential) {
        throw new Error("패스키 인증이 취소되었습니다.");
      }

      const response = await FetchBuilder.post()
        .url("/api/webauthn/auth/finish")
        .body({
          service: AUTH_SERVICE_NAME,
          challenge_id: optionsBody.challenge_id,
          credential: credentialToJson(credential)
        })
        .executeResponse();

      const payload = (await response.json().catch(() => ({ error: "로그인 실패" }))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "패스키 로그인 실패");
      }

      router.replace("/");
    } catch (error) {
      const text = error instanceof Error ? error.message : "패스키 로그인 실패";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={loading}
        onClick={handlePasskeyLogin}
        className="w-full rounded-lg border border-cyan-600/60 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "패스키 로그인 중..." : "패스키로 로그인"}
      </button>
      {message ? <p className="text-xs text-cyan-100/80">{message}</p> : null}
    </div>
  );
}
