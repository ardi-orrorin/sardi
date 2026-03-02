const CONSOLE_GUARD_KEY = "__sardi_console_disabled__";

type GuardedGlobal = typeof globalThis & {
  [CONSOLE_GUARD_KEY]?: boolean;
};

type GuardedMethod =
  | "assert"
  | "clear"
  | "count"
  | "countReset"
  | "debug"
  | "dir"
  | "dirxml"
  | "error"
  | "group"
  | "groupCollapsed"
  | "groupEnd"
  | "info"
  | "log"
  | "table"
  | "time"
  | "timeEnd"
  | "timeLog"
  | "trace"
  | "warn";

const GUARDED_METHODS: GuardedMethod[] = [
  "assert",
  "clear",
  "count",
  "countReset",
  "debug",
  "dir",
  "dirxml",
  "error",
  "group",
  "groupCollapsed",
  "groupEnd",
  "info",
  "log",
  "table",
  "time",
  "timeEnd",
  "timeLog",
  "trace",
  "warn"
];

const noop = () => undefined;

export function disableConsoleInProduction() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const guardedGlobal = globalThis as GuardedGlobal;
  if (guardedGlobal[CONSOLE_GUARD_KEY]) {
    return;
  }

  guardedGlobal[CONSOLE_GUARD_KEY] = true;

  const consoleRef = guardedGlobal.console;
  const consoleMutable = consoleRef as unknown as Record<GuardedMethod, (...args: unknown[]) => void>;
  for (const method of GUARDED_METHODS) {
    if (typeof consoleMutable[method] === "function") {
      consoleMutable[method] = noop;
    }
  }
}
