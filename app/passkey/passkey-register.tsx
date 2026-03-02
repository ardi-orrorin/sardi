"use client";

import { FetchBuilder } from "@/app/_commons/utils/func";
import { useEffect, useState } from "react";
import { CredentialItem, CredentialListResponse } from "./_service/types/credential";
import { PublicKeyCreationPayload } from "./_service/types/public-key";
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

const normalizeCreationOptions = (options: unknown): PublicKeyCredentialCreationOptions => {
  const normalized =
    typeof options === "object" && options !== null && "publicKey" in options
      ? (options as { publicKey?: PublicKeyCreationPayload }).publicKey
      : (options as PublicKeyCreationPayload | undefined);

  const rawChallenge = normalized?.challenge;
  const rawUser = normalized?.user ?? {};

  if (!rawChallenge || typeof rawChallenge !== "string") {
    throw new Error("challenge 정보가 없습니다.");
  }
  if (!rawUser.id || typeof rawUser.id !== "string") {
    throw new Error("user id 정보가 없습니다.");
  }

  const excludes = Array.isArray(normalized?.excludeCredentials)
    ? normalized.excludeCredentials
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
    user: {
      ...rawUser,
      id: decodeBase64Url(rawUser.id),
      name: rawUser.name ?? "user",
      displayName: rawUser.displayName ?? rawUser.name ?? "user"
    },
    excludeCredentials: excludes
  } as PublicKeyCredentialCreationOptions;
};

const credentialToJson = (credential: PublicKeyCredential) => {
  const response = credential.response as AuthenticatorAttestationResponse;
  const transports = typeof response.getTransports === "function" ? response.getTransports() : undefined;

  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: encodeBase64Url(response.attestationObject),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      transports
    },
    clientExtensionResults: credential.getClientExtensionResults()
  };
};

export default function PasskeyRegister() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [aliasMap, setAliasMap] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadCredentials = async () => {
    const payload = await FetchBuilder.get().url("/api/webauthn/credentials").execute<CredentialListResponse>();
    setCredentials(payload.items);

    const nextAlias: Record<string, string> = {};
    payload.items.forEach((item) => {
      nextAlias[item.id] = item.alias ?? "";
    });
    setAliasMap(nextAlias);
  };

  const handleRegister = async () => {
    if (!("PublicKeyCredential" in window) || !navigator.credentials) {
      setMessage("이 브라우저는 패스키를 지원하지 않습니다.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const optionsBody = await FetchBuilder.post().url("/api/webauthn/register/options").execute<WebauthnOptionsResponse>();
      if (!optionsBody?.public_key || !optionsBody.challenge_id) {
        throw new Error("등록 옵션을 가져오지 못했습니다.");
      }

      const publicKey = normalizeCreationOptions(optionsBody.public_key);
      const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
      if (!credential) {
        throw new Error("패스키 등록이 취소되었습니다.");
      }

      await FetchBuilder.post()
        .url("/api/webauthn/register/finish")
        .body({
          challenge_id: optionsBody.challenge_id,
          credential: credentialToJson(credential)
        })
        .execute();

      setMessage("패스키 등록 완료");
      await loadCredentials();
    } catch (error) {
      const text = error instanceof Error ? error.message : "패스키 등록 실패";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAlias = async (id: string) => {
    setSavingId(id);
    try {
      const payload = await FetchBuilder.patch()
        .url(`/api/webauthn/credentials/${encodeURIComponent(id)}`)
        .body({ alias: aliasMap[id] ?? "" })
        .execute<CredentialItem | { error?: string }>();

      if ("error" in payload) {
        throw new Error(payload.error ?? "저장 실패");
      }

      setMessage("별칭 저장 완료");
      await loadCredentials();
    } catch (error) {
      const text = error instanceof Error ? error.message : "별칭 저장 실패";
      setMessage(text);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 패스키를 삭제할까요?")) {
      return;
    }

    setSavingId(id);
    try {
      await FetchBuilder.delete().url(`/api/webauthn/credentials/${encodeURIComponent(id)}`).execute();
      setMessage("패스키 삭제 완료");
      await loadCredentials();
    } catch (error) {
      const text = error instanceof Error ? error.message : "패스키 삭제 실패";
      setMessage(text);
    } finally {
      setSavingId(null);
    }
  };

  useEffect(() => {
    void loadCredentials();
  }, []);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleRegister}
        disabled={loading}
        className="w-full rounded-xl bg-teal-300 px-4 py-2 text-sm font-bold text-teal-950 hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "패스키 등록 중..." : "패스키 등록"}
      </button>

      {credentials.length === 0 ? (
        <p className="text-xs text-teal-100/70">등록된 패스키가 없습니다.</p>
      ) : (
        credentials.map((item) => (
          <div key={item.id} className="space-y-2 border-b border-teal-200/15 py-2 last:border-b-0">
            <p className="text-xs text-teal-100/60">생성일: {item.created_at}</p>
            <input
              value={aliasMap[item.id] ?? ""}
              onChange={(event) =>
                setAliasMap((prev) => ({
                  ...prev,
                  [item.id]: event.target.value
                }))
              }
              placeholder="별칭"
              className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm focus:border-teal-300 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSaveAlias(item.id)}
                disabled={savingId === item.id}
                className="flex-1 rounded-lg border border-teal-300/40 px-3 py-2 text-xs"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={savingId === item.id}
                className="flex-1 rounded-lg border border-rose-300/40 px-3 py-2 text-xs text-rose-200"
              >
                삭제
              </button>
            </div>
          </div>
        ))
      )}

      {message ? (
        <div className="rounded-lg border border-blue-300/45 bg-blue-950/20 px-3 py-2 text-xs text-blue-100">{message}</div>
      ) : null}
    </div>
  );
}
