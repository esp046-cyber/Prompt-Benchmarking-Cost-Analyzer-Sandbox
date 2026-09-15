# AI Prompt Benchmarking & Cost Analyzer Sandbox

A single-file, zero-build Progressive Web App for racing prompts across multiple LLMs side by side — comparing quality, latency, throughput, and cost in one view — then acting on the winner.

Built for static hosting (GitHub Pages, Netlify, S3, etc.). No Node.js, no bundler, no backend. Everything runs in the browser.

## What it does

You write a system prompt and a test payload once, pick three models, and hit **Run Benchmark**. All three race concurrently. When they finish, you get:

- **Live model catalog** — pulled from the OpenRouter `/models` endpoint on load (cached 24h in `localStorage`), so pricing and available models are never hardcoded or stale.
- **Streaming responses** — Server-Sent Events render each model's output token-by-token instead of blocking on the full completion.
- **Hyperparameter control** — temperature and max tokens are configurable per run and forwarded into the request payload.
- **Live cost & latency tracking** — cost is computed from each model's real per-token OpenRouter pricing (not a flat estimate), alongside latency and tokens/sec.
- **LLM-as-a-judge** — an optional auto-evaluation pass sends every output to a judge model with a grading rubric and returns a 1–10 score plus a one-line critique.
- **Decision Engine dashboard** — a winner hero card (highest judge score, tie-broken by cost then latency), a side-by-side comparison matrix, and a Quality-vs-Cost scatter chart.
- **Run history** — the last 5 runs persist in `localStorage` and can be reloaded without calling any API again.
- **Export** — CSV, JSON, or a direct POST to an n8n webhook.
- **Installable PWA** — add-to-home-screen support via `manifest.json` and an offline app-shell `sw.js`.

## Getting started

1. Clone or download this repo.
2. Push it to a GitHub repository and enable **Settings → Pages** (serve from the repo root or `/docs`, your choice).
3. Open the deployed URL, tap the gear icon, and add your API key(s):
   - **OpenRouter** — required. This is the default route for every model and the source of the live model catalog.
   - **OpenAI** / **Google Gemini** — optional. If set, models from that provider are called directly (skipping OpenRouter's markup) and silently fall back to OpenRouter if the direct call errors.

No build step. No `npm install`. Editing `index.html` and refreshing is the whole dev loop.

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire app — markup, styling, and logic in one file |
| `manifest.json` | PWA install metadata |
| `sw.js` | Offline app-shell service worker |
| `chart.umd.min.js` | Vendored Chart.js (v4.5.1, MIT) — powers the scatter chart; kept local so the PWA still renders it offline |
| `chart.umd.min.js.LICENSE.txt` | Chart.js's MIT license text |
| `icons/` | Home-screen icon assets (drop your own PNGs in here — see `icons/README.txt`) |

## Connecting to n8n

The **Export → Export to n8n Webhook** action POSTs the finished run to a URL you configure once in Settings.

**Setup:**

1. In your n8n workflow, add a **Webhook** node (Production URL, method `POST`).
2. Copy the Production webhook URL into this app's **Settings → n8n webhook URL** field. It's stored only in `localStorage`.
3. Add a **Respond to Webhook** node and set a response header:
   ```
   Access-Control-Allow-Origin: https://your-username.github.io
   ```
   Browsers block cross-origin POSTs without this — n8n does not send it by default. Point it at your exact Pages origin, not `*`, if the webhook does anything sensitive downstream.

**Payload shape:**

```json
{
  "source": "prompt-benchmarking-sandbox",
  "timestamp": "2026-09-15T04:00:00.000Z",
  "systemPrompt": "...",
  "testDataset": "...",
  "hyperparameters": { "temperature": 1, "maxTokens": 1024, "stream": true },
  "winner": {
    "modelId": "anthropic/claude-3.5-sonnet",
    "label": "Claude 3.5 Sonnet",
    "selectedBy": "judge_score",
    "judgeScore": 9,
    "latencyMs": 1830,
    "tokensPerSecond": 47.2,
    "estimatedCostUsd": 0.0091,
    "output": "..."
  },
  "allResults": [
    { "modelId": "...", "label": "...", "latencyMs": 0, "tokensPerSecond": 0,
      "estimatedCostUsd": 0, "judgeScore": null, "isFastest": true, "isCheapest": false, "error": null }
  ]
}
```

`winner` is chosen by highest judge score when auto-evaluate ran, otherwise lowest cost — `selectedBy` tells you which rule fired, so downstream automations don't have to guess.

## Privacy & data handling

- All API keys and the n8n webhook URL live in `localStorage` only. Nothing is sent anywhere except directly to the provider you configured (or OpenRouter, or your own n8n instance).
- Run history is local to the device/browser. Clearing site data clears it.
- `robots.txt` in this repo blocks search engine indexing by default, since a deployed instance can hold API keys in the browser it's running in. Don't rely on that alone — treat the deployed URL as unlisted, not private, and don't reuse it for keys you can't afford to leak.

## License

MIT — see `LICENSE`. Chart.js is bundled under its own MIT license (`chart.umd.min.js.LICENSE.txt`).
