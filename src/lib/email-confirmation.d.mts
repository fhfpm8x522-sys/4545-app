export function parseEmailConfirmation(search: string, hash: string): {token_hash: string; type: 'email' | 'recovery'} | null;
