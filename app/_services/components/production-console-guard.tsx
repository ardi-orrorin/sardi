"use client";

import { disableConsoleInProduction } from "@/app/_commons/utils/console-guard";
import { useEffect } from "react";

export function ProductionConsoleGuard() {
  useEffect(() => {
    disableConsoleInProduction();
  }, []);

  return null;
}
