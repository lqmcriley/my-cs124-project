// Web version of secure-storage.ts: in a browser, Supabase keeps your login in
// the browser's own storage (localStorage). Phones use the keychain version.

export class LargeSecureStore {
  // There's no `window` while the site is being built, only in a real browser.
  private get store(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }

  async getItem(key: string) {
    return this.store?.getItem(key) ?? null;
  }

  async setItem(key: string, value: string) {
    this.store?.setItem(key, value);
  }

  async removeItem(key: string) {
    this.store?.removeItem(key);
  }
}
