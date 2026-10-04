export interface AuthService { hash(value: string): Promise<string>; verify(value: string, digest: string): Promise<boolean> }
export const localAuth: AuthService = {
  async hash(value) { const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join(''); },
  async verify(value, digest) { return (await this.hash(value)) === digest; }
};
