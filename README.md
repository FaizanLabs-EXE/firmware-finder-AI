# FirmwareVault AI — Exact Firmware Finder

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


## Branding

╰─➤ ⚡ **𝐁𝐔𝐈𝐋𝐓 𝐁𝐘 𝐅𝐀𝐈𝐙𝐀𝐍™**


So the website can rotate through a larger live free-model pool without ever sending more than three models in a single OpenRouter request.

OpenRouter documents model fallbacks as an ordered model list, with provider-level failover handled separately. citeturn0search0turn0search2
