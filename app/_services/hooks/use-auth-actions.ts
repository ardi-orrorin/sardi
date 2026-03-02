"use client";

import { FetchBuilder } from "@/app/_commons/utils/func";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useAuthActions() {
  const router = useRouter();

  const logout = useCallback(
    async (redirectTo = "/login") => {
      await FetchBuilder.post().url("/api/auth/logout").execute();
      router.replace(redirectTo);
    },
    [router]
  );

  return {
    logout
  };
}
