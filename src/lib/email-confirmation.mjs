// Restrict email callbacks to the two flows supported by this page. Never use
// a caller-supplied redirect URL or include verification tokens in logs.
export function parseEmailConfirmation(search, hash) {
  const params = new URLSearchParams(hash?.replace(/^#/, '') || search?.replace(/^\?/, ''));
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (!tokenHash || !/^[a-zA-Z0-9_-]{20,256}$/.test(tokenHash) || !['email', 'recovery'].includes(type)) return null;
  return { token_hash: tokenHash, type };
}
