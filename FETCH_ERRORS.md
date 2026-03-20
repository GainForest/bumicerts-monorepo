# Fetch Errors in Local Development

Two distinct fetch-related bugs appear when running bumicerts locally on macOS. Both are silent in Vercel production.

---

## Bug 1 — Images don't load on `/explore`

**Symptom**

```
upstream image https://climateai.org/xrpc/com.atproto.sync.getBlob?... resolved to private ip ["64:ff9b::8872:a827"]
```

**Root cause**

macOS uses DNS64/NAT64 to map IPv4 addresses into the `64:ff9b::/96` IPv6 prefix when the system is on an IPv6-preferring network. The address `64:ff9b::8872:a827` is just `136.114.168.39` in disguise.

Next.js's image optimisation server fetches the blob server-side, resolves the hostname through the system DNS, gets the NAT64 address, and then its built-in SSRF guard (`ipaddr.js`) classifies `64:ff9b::/96` as `rfc6052` — not `unicast` — and blocks the request.

On Vercel the DNS resolver returns a real IPv4 address, so the guard never fires.

**Fix (already applied)**

```js
// next.config.js
images: {
  unoptimized: process.env.NODE_ENV === 'development',
}
```

`unoptimized: true` makes `<next/image>` emit a plain `<img>` tag in dev. The browser fetches the blob directly — no server-side hop, no SSRF check. Production is unaffected.

---

## Bug 2 — `putRecord` (and any DPoP POST) fails with "expected non-null body source"

**Symptom**

```
[PDS Put Record Error]: Error: expected non-null body source
  TypeError: fetch failed
    [cause]: Error: expected non-null body source
```

Thrown by `com.atproto.repo.putRecord` (and likely any DPoP-authenticated POST to the PDS).

**Root cause — layered**

### Layer 1: macOS NAT64 + `@atproto-labs/fetch-node` SSRF protection

The atproto SDK wraps all outbound fetch calls with `unicastFetchWrap` (`@atproto-labs/fetch-node`). This uses `node:dns`'s `lookup` function with a custom callback (`unicastLookup`) that checks every resolved IP with `ipaddr.js`. If the IP range is not `'unicast'`, it throws.

On macOS with NAT64, `dns.lookup('climateai.org')` returns `64:ff9b::8872:a827`. `ipaddr.js` classifies this as `rfc6052`, not `unicast`, so `unicastLookup` errors out.

**Workaround:** add an `/etc/hosts` entry pointing the PDS hostname to its real IPv4:

```
136.114.168.39  climateai.org
```

After this, `dns.lookup` returns the real IPv4 and the SSRF check passes.

> **Note:** `136.114.168.39` is derived by decoding the last 32 bits of the NAT64 address
> (`64:ff9b::8872:a827` → `0x8872a827` → `136.114.168.39`). Verify with
> `node -e "const dns=require('node:dns'); dns.lookup('climateai.org',{all:true},console.log)"`.

### Layer 2: Next.js patched fetch mangles the request body

Even with the `/etc/hosts` fix in place, the error persists. The cause is a different layer:

**Next.js patches `globalThis.fetch`** for its App Router caching system (`patch-fetch.js`). When the patched fetch receives a `Request` object as `input`, it does:

```js
// from Next.js internals — patch-fetch.js
const reqOptions = {
  body: reqInput._ogBody || reqInput.body,  // reads .body → ReadableStream
};
input = new Request(reqInput.url, reqOptions);
```

Here's the problem:

1. The atproto xrpc client encodes the record as `Uint8Array` and creates a `Request`.
2. `new Request(url, { body: Uint8Array }).body` returns a **ReadableStream**, but undici internally stores the original `Uint8Array` as `body.source`.
3. When Next.js reads `reqInput.body` (the ReadableStream) and creates `new Request(url, { body: ReadableStream })`, the new Request's `body.source` is **null** (ReadableStream bodies have a null source in undici).
4. When undici tries to send the request it reads `body.source` — `null` — and throws `"expected non-null body source"`.

This only happens locally because:
- The DPoP wrapper calls `fetch(requestObject)` — a Request object as `input` — which triggers the Next.js re-creation path.
- On Vercel, Node.js is typically v18 where the `SUPPORTS_REQUEST_INIT_DISPATCHER` check is `false`, so the `unicastFetchWrap` takes a different code path that doesn't create intermediate Request objects.
- On Vercel, even if Node.js >= 20, the DPoP nonce is already established from previous requests, so no DPoP retry occurs and the body is not re-read.

**Minimal reproduction (outside Next.js)**

```js
const body = new TextEncoder().encode(JSON.stringify({ repo: 'x', collection: 'y', rkey: 'z', record: {} }));

// Step 1 — atproto xrpc encodes body as Uint8Array, DPoP wrapper creates Request
const dpopReq = new Request('https://climateai.org/xrpc/com.atproto.repo.putRecord', {
  method: 'POST', body, headers: { 'content-type': 'application/json' }
});

// Step 2 — Next.js reads .body (ReadableStream) and re-creates the Request
const rs = dpopReq.body;  // ReadableStream, but source=Uint8Array internally
const nextReq = new Request(dpopReq.url, {
  body: rs,         // new Request from ReadableStream → source becomes null
  method: dpopReq.method,
  headers: dpopReq.headers,
  duplex: dpopReq.duplex,
});

// Step 3 — undici reads body.source === null → throws
await fetch(nextReq);
// → TypeError: fetch failed
//   → Error: expected non-null body source
```

**The fix (not yet applied)**

Provide a custom `fetch` to `NodeOAuthClient` that intercepts `Request`-object calls and pre-reads the body as `ArrayBuffer` before handing off to `globalThis.fetch`. This means Next.js receives a plain URL + init (not a Request object), so the re-creation path is never taken. GET requests and handle-resolution calls are passed through unchanged.

```ts
// packages/atproto-auth-next/src/oauth-client.ts

async function nextJsSafeFetch(input: any, init?: RequestInit): Promise<Response> {
  if (input instanceof Request && input.body !== null && !input.bodyUsed) {
    const body = await input.arrayBuffer();
    return globalThis.fetch(input.url, {
      method: input.method,
      headers: input.headers,
      body,
      signal: input.signal,
      cache: input.cache,
      credentials: input.credentials,
      mode: input.mode,
      redirect: input.redirect,
    });
  }
  return globalThis.fetch(input, init);
}

// Pass to NodeOAuthClient:
// fetch: nextJsSafeFetch as any,
```

> **Why not just use `undici.fetch` directly?**
> `NodeOAuthClient` passes the `fetch` option to its internal `handleResolver`
> (`AtprotoHandleResolverNode`) as well. Undici's raw fetch bypasses Next.js
> caching (acceptable) but also bypasses the atproto SDK's own SSRF wrapping for
> handle resolution — and on NAT64 networks without a complete `/etc/hosts`
> mapping, the handle resolver silently fails to resolve handles, breaking sign-in.

---

## Summary table

| Bug | Trigger | Only local? | Fix |
|-----|---------|------------|-----|
| Images blocked | Next.js image optimiser hits NAT64 SSRF guard | Yes | `unoptimized: true` in dev |
| POST body null | Next.js `patch-fetch` mangles DPoP `Request` body | Yes (Node ≥ 20) | `nextJsSafeFetch` wrapper in `createOAuthClient` |
