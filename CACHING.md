# CACHING — why `vercel.json` says what it says

The reasoning lives here rather than inside `vercel.json` because **Vercel's config schema sets
`additionalProperties: false`** on header rules: the only permitted keys are `source`, `headers`,
`has` and `missing`. A `"//"` comment key is not ignored — it fails validation and **the deploy
does not happen**. That was caught by validating against
`https://openapi.vercel.sh/vercel.json` before the first push, and it is the reason there is not
a single comment in that file.

---

## `/assets/*` — immutable, one year

Vite writes a content hash into every asset filename, so `index-BiO-9i5B.js` *is* those exact
bytes and nothing else. The name changes when the content does. A file that can never go stale
should never be revalidated.

Vercel's default served these `max-age=0, must-revalidate`, which meant **every kiosk
re-validated ~515KB of JavaScript over shop WiFi before it could paint** — on every single load,
forever, to be told nothing had changed.

## `/` and `/index.html` — must-revalidate, never cached

**The HTML must never be immutable.** It is the only unhashed file in the deployment, which
makes it two things at once:

1. the pointer that tells a kiosk which hashed bundle to load, and
2. the file the update checker fetches to detect that a new build exists.

Cache it and the fleet stops updating — silently, and in a way no amount of deploying can fix,
because the mechanism that would notice is the mechanism you just disabled.

These two rules restate what Vercel already does by default. They are written down explicitly so
that a future change to platform defaults, or to this file, cannot quietly cache the one file the
entire update path depends on.

---

## If you edit `vercel.json`

Validate it before pushing. A malformed config fails the deployment, and on this project the
deployment *is* the fleet update:

```bash
python3 - <<'EOF'
import json, urllib.request
schema = json.load(urllib.request.urlopen('https://openapi.vercel.sh/vercel.json'))
cfg = json.load(open('vercel.json'))
allowed = set(schema['properties']['headers']['items']['properties'])
for i, rule in enumerate(cfg.get('headers', [])):
    extra = set(rule) - allowed
    print(f'headers[{i}]', 'ILLEGAL KEYS: ' + str(sorted(extra)) if extra else 'ok')
EOF
```
