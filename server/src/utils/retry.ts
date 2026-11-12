const TRANSIENT = [
  "fetch failed",
  "econnreset",
  "etimedout",
  "enotfound",
  "eai_again",
  "socket hang up",
];

export async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const text = `${err instanceof Error ? err.message : err} ${(err as any)?.cause?.code ?? ""}`;
      const transient = TRANSIENT.some((t) => text.toLowerCase().includes(t));
      if (!transient || attempt >= tries) throw err;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}