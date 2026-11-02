export const normalizeInviteCode = value => String(value || '').trim().toUpperCase();
export const inviteFormatValid = value => /^[A-Z0-9][A-Z0-9-]{6,62}[A-Z0-9]$/.test(normalizeInviteCode(value));
const message = {
  invalid: 'That invite could not be verified. Check the code and try again.',
  unavailable: 'Invite redemption is not open on this preview yet. Registration remains closed.',
  rate: 'Too many attempts. Please wait a moment before trying again.',
};
// No accepted codes or invite secrets are stored in the browser bundle.
export function createInviteGate({ endpoint = '', fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 8000 } = {}) {
  if (endpoint) {
    const url = new URL(endpoint);
    if (url.username || url.password || url.search || url.hash || !(url.protocol === 'https:' || url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw Error('Invite API must use HTTPS without credentials or query parameters.');
  }
  let grant = null, controller, sequence = 0;
  const hasAccess = () => Boolean(grant && grant.expiresAt > now());
  const clear = () => { sequence++; controller?.abort(); grant = null; };
  async function verify(rawCode) {
    clear();
    const code = normalizeInviteCode(rawCode), request = sequence;
    if (!inviteFormatValid(code)) return { ok: false, message: message.invalid };
    if (!endpoint) return { ok: false, message: message.unavailable };
    controller = new AbortController();
    const current = controller, timer = setTimeout(() => current.abort(), timeoutMs);
    try {
      const response = await fetchImpl(endpoint.replace(/\/$/,'') + '/v1/beta/invites/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ code }), cache: 'no-store', credentials: 'omit', signal: current.signal,
      });
      if (request !== sequence || current.signal.aborted) return { ok: false, cancelled: true };
      if (response.status === 429) return { ok: false, message: message.rate };
      if (!response.ok) return { ok: false, message: response.status >= 500 ? message.unavailable : message.invalid };
      if (Number(response.headers.get('content-length')) > 8192) return { ok: false, message: message.invalid };
      const text = await response.text();
      if (text.length > 8192) return { ok: false, message: message.invalid };
      const data = JSON.parse(text), expiresAt = Date.parse(data.expiresAt);
      if (request !== sequence || current.signal.aborted) return { ok: false, cancelled: true };
      if (data.valid !== true || typeof data.ticket !== 'string' || !/^[A-Za-z0-9._~-]{20,2048}$/.test(data.ticket)
        || !Number.isFinite(expiresAt) || expiresAt <= now() || expiresAt > now() + 15 * 60 * 1000) return { ok: false, message: message.invalid };
      grant = { ticket: data.ticket, expiresAt };
      return { ok: true };
    } catch { return request !== sequence || current.signal.aborted ? { ok: false, cancelled: true } : { ok: false, message: message.unavailable }; }
    finally { clearTimeout(timer); }
  }
  return { verify, hasAccess, clear };
}
