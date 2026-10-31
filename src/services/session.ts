export type SessionServices = typeof import('./sessionServices');

let pending: Promise<SessionServices> | null = null;

/** Loads Firebase-backed services once; later calls share the same promise. */
export function loadSessionServices(): Promise<SessionServices> {
  if (!pending) {
    pending = import('./sessionServices').catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}
