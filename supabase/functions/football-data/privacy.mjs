export function publicFootballPayload(value, secrets = []) {
  const forbidden = /^(api[_-]?key|authorization|password|secret|client[_-]?secret|access[_-]?token|refresh[_-]?token|token[_-]?hash)$/i;
  const redact = (input, depth = 0) => {
    if (depth > 30) return null;
    if (typeof input === 'string') return secrets.filter(s => typeof s === 'string' && s.length >= 8).reduce((text, secret) => text.replaceAll(secret, '[redacted]'), input);
    if (Array.isArray(input)) return input.map(item => redact(item, depth + 1));
    if (input && typeof input === 'object') return Object.fromEntries(Object.entries(input).filter(([key]) => !forbidden.test(key)).map(([key, item]) => [key, redact(item, depth + 1)]));
    return input;
  };
  return redact(value);
}
