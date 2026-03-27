"use client";

type Subscriber = () => void;

export function createRemoteCollectionStore<T>(
  fetchItems: () => Promise<T[]>,
  cloneItem: (item: T) => T
) {
  let snapshot: T[] = [];
  let loaded = false;
  let pending: Promise<T[]> | null = null;
  const listeners = new Set<Subscriber>();

  function cloneItems(items: T[]) {
    return items.map(cloneItem);
  }

  function notify() {
    listeners.forEach((listener) => listener());
  }

  async function refresh(force = false) {
    if (pending) {
      return pending;
    }

    if (loaded && !force) {
      return snapshot;
    }

    pending = (async () => {
      const items = cloneItems(await fetchItems());
      snapshot = items;
      loaded = true;
      notify();
      return snapshot;
    })();

    try {
      return await pending;
    } finally {
      pending = null;
    }
  }

  function replace(items: T[]) {
    snapshot = cloneItems(items);
    loaded = true;
    notify();
  }

  function getSnapshot() {
    return snapshot;
  }

  function subscribe(listener: Subscriber) {
    listeners.add(listener);

    if (typeof window !== "undefined") {
      const handleFocus = () => {
        void refresh(true).catch((error) => {
          console.error("remote store refresh error:", error);
        });
      };

      window.addEventListener("focus", handleFocus);
      void refresh(false).catch((error) => {
        console.error("remote store initial load error:", error);
      });

      return () => {
        listeners.delete(listener);
        window.removeEventListener("focus", handleFocus);
      };
    }

    return () => {
      listeners.delete(listener);
    };
  }

  return {
    getSnapshot,
    refresh,
    replace,
    subscribe
  };
}
