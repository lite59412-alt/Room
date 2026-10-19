/**
 * localStorage / sessionStorage that can never throw.
 * Android WebViews (APK builds) with restricted or partitioned DOM storage throw on access, which would otherwise
 * crash React before the first paint (blank white page). If real storage is unavailable we fall back to memory,
 * so the app still runs (the Firebase session itself is persisted separately — see getFirebase()).
 */
function make(kind: 'localStorage' | 'sessionStorage') {
  const mem = new Map<string, string>();
  const real = (): Storage | null => {
    try {
      return window[kind];
    } catch {
      return null;
    }
  };
  return {
    getItem(k: string): string | null {
      try {
        const s = real();
        if (s) return s.getItem(k);
      } catch {
        /* fall through to memory */
      }
      return mem.get(k) ?? null;
    },
    setItem(k: string, v: string): void {
      mem.set(k, v);
      try {
        real()?.setItem(k, v);
      } catch {
        /* quota / blocked → memory only */
      }
    },
    removeItem(k: string): void {
      mem.delete(k);
      try {
        real()?.removeItem(k);
      } catch {
        /* ignore */
      }
    },
  };
}

export const safeLocal = make('localStorage');
export const safeSession = make('sessionStorage');
