# FirmwareVault AI — Exact Firmware Finder

GitHub Pages frontend using the **user's own OpenRouter API key** and the live OpenRouter model catalog to find and strictly verify public firmware candidates.

## What changed from the previous build

- No embedded/shared OpenRouter key.
- User must enter an `sk-or-...` key before AI search.
- Live `/api/v1/models` discovery finds models with **zero prompt + zero completion pricing**.
- `openrouter/free` is used as the primary free router.
- Automatic rotation tries currently free models if the primary/fallback request fails.
- Candidate pre-filter rejects obvious non-firmware content.
- AI receives a strict JSON firmware-verification prompt.
- Results require `firmware=true` and confidence >= 72.
- AI is explicitly prohibited from inventing URLs, builds, hashes or model matches.
- Direct firmware button opens the original public source URL; large files are not proxied.

## OpenRouter key setup

1. Create your own OpenRouter API key at:
   https://openrouter.ai/settings/keys
2. Open the website.
3. Paste the key into **OpenRouter API key required**.
4. Press **Connect AI**.
5. The site queries OpenRouter's live model catalog.
6. Search a brand + exact model.

The key is kept in browser `sessionStorage` and is not put into GitHub files.

### Security warning
A static website cannot make a browser-side API key secret from the browser. Do not commit your key. Use a restricted/low-limit key and rotate it if exposed.

## Free-model behavior

OpenRouter's `openrouter/free` router selects from models currently available as free variants. Free availability, rate limits and model membership can change. This application therefore discovers the current catalog rather than hard-coding one supposedly-free model forever.

The application also supplies an ordered `models` fallback list to OpenRouter and rotates through the current free pool if a request fails.

## Search pipeline

```text
User model
   ↓
Public discovery
 ├─ GitHub public repository search
 ├─ Internet Archive Advanced Search
 └─ best-effort web-index discovery
   ↓
Firmware pre-filter
   ↓
Strict AI verifier
   ↓
confidence >= 72 + firmware=true
   ↓
Verified result
   ↓
Original source / direct file
```

The system cannot literally crawl every website on the internet from GitHub Pages. CORS, robots policies, source APIs and rate limits prevent that guarantee. It is intentionally a public-source discovery engine rather than a bypass crawler.

## Why AI is strict

The verifier is instructed to reject:

- news
- reviews
- specifications
- manuals
- drivers
- videos
- accessories
- generic repositories
- unrelated model variants
- generic pages that merely mention the device

It accepts either an actual firmware/download package or a source page that clearly contains one for the requested exact model.

## Community submissions

The UI contains a community submission panel. This static build captures the submission locally. To publish submissions into a shared Google Sheet, connect an Apps Script endpoint and extend the submission handler to call:

```text
?action=submit
```

Recommended production controls:

- moderation queue
- duplicate URL detection
- rate limiting
- abuse reports
- URL reachability checks
- SHA-256 verification
- approved/pending states

## No paid-file bypass

This tool is designed for firmware that is publicly accessible and lawfully shareable. It does not bypass logins, payment, DRM, CAPTCHA or private access controls.

## Files

```text
FirmwareVault_AI/
├── index.html
├── styles.css
├── app.js
└── README.md
```

No PNG. No assets folder. No build system. No package manager. No embedded API key.

## GitHub Pages

Upload these four files to the repository root and enable GitHub Pages. No build step is required.

## Branding

╰─➤ ⚡ **𝐁𝐔𝐈𝐋𝐓 𝐁𝐘 𝐅𝐀𝐈𝐙𝐀𝐍™**


## Fixed OpenRouter fallback error

This build fixes:

```text
'models' array must have 3 items or fewer
```

Every individual request now contains at most:

```text
1 primary model + 2 fallback models = 3 models
```

Automatic rotation still works by using separate bounded rounds:

```text
Round 1: A → B → C
Round 2: D → E → F
Round 3: G → H → I
```

So the website can rotate through a larger live free-model pool without ever sending more than three models in a single OpenRouter request.

OpenRouter documents model fallbacks as an ordered model list, with provider-level failover handled separately. citeturn0search0turn0search2
