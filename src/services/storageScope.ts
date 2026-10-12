/**
 * Per-user namespace for browser storage so that data saved by one account
 * (or by a guest) is never shown to another account on the same device.
 */
let scope = 'guest';

export function setStorageScope(uid: string | null | undefined): void {
  scope = uid ? uid : 'guest';
}

export function getStorageScope(): string {
  return scope;
}

export function scopedStorageKey(baseKey: string): string {
  return `${baseKey}::${scope}`;
}
