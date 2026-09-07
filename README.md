# TRACE ID

TRACE ID is a high-precision, real-world image internet trace and provenance tool. It enables investigators, researchers, journalists, and visual artists to upload or capture any image, analyze its composition, and perform real reverse-visual web detection across publicly indexed internet sources to establish authentic online presence.

---

## Purpose

The purpose of TRACE ID is to trace where a visual asset or its visually related variants appear publicly on the internet.

```
USER UPLOADS OR CAPTURES AN IMAGE
                ↓
          IMAGE ANALYSIS
                ↓
    REVERSE IMAGE / VISUAL SEARCH
                ↓
 SEARCH PUBLICLY ACCESSIBLE WEB SOURCES
                ↓
FIND EXACT / NEAR-DUPLICATE / RELATED APPEARANCES
                ↓
       RETURN REAL ONLINE PRESENCE
                ↓
SHOW SOURCE URL + PLATFORM + PAGE TITLE + METADATA
```

**Zero Demo Corpus / Zero Fake Results**: TRACE ID operates exclusively on genuine external search provider results. It contains no artificial mock data, simulated similarity scores, or fictitious website hits. If a provider returns no matches or is unconfigured, the system reports the exact, factual provider status.

**Strict Privacy Guardrail**: This application traces **images**, not human identities. The system contains no facial recognition databases and never attempts to identify, name, or profile any individual depicted in an image.

---

## Architecture

```
IMAGE (Upload / Camera Capture)
  ↓
IMAGE NORMALIZATION (MIME & Sharp/PIL format validation, SHA-256 hash generation)
  ↓
IMAGE ANALYSIS (Gemini visual feature understanding: objects, text, landmarks)
  ↓
REAL VISUAL SEARCH PROVIDER (Google Cloud Vision Web Detection / TinEye / Multi-Provider)
  ↓
PUBLIC WEB RESULTS (Pages with matching images, exact files, visually similar)
  ↓
RESULT NORMALIZATION & DEDUPLICATION (Canonical URL normalization, tracking param removal)
  ↓
METADATA ENRICHMENT (Safe SSRF-protected Open Graph & HTML title discovery)
  ↓
TRACE RESULTS DISPLAY (Domain, Platform, Match Type, Direct Source URL)
```

---

## Features

- **Upload & Live Camera Capture**: Upload JPEG, PNG, or WebP images, or use the camera to snapshot an image in real time.
- **Cryptographic Image Integrity**: Generates deterministic SHA-256 hashes and secure random session UUIDs.
- **AI Visual Understanding**: Powered by Google Gemini (`gemini-3.8-flash`) to detect scene characteristics, visible text, signs, logos, and landmarks without facial profiling.
- **Pluggable Visual Search Provider Architecture**:
  - `GoogleVisualSearchProvider`: Connects to Google Cloud Vision Web Detection API (`WEB_DETECTION`).
  - `TinEyeSearchProvider`: Connects to TinEye Commercial Reverse Image Search API.
  - `SerpApiLensProvider`: Connects to Google Lens search via SerpApi.
  - `ConfiguredVisualSearchProvider` / Multi-Mode: Aggregates multiple providers in parallel with URL deduplication and relevance ranking.
- **Safe Metadata Enrichment**: Safely probes discovered public pages to retrieve Open Graph titles, descriptions, and site names with built-in SSRF protection (blocking localhost, private IP subnets, and metadata endpoints).
- **Audit-Ready Provider Telemetry**: Displays exact search duration, provider status, and verified match counts.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Motion (Framer Motion animations), Lucide React.
- **Production Server**: Node.js, Express, Sharp, tsx, esbuild, `@google/genai`.
- **Python Backend Engine** (standalone under `backend/`): Python 3.10+, FastAPI, Pillow, OpenCV, httpx, BeautifulSoup4.
- **AI Image Understanding**: Google Gemini API via `@google/genai`.

---

## Environment Variables

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for image understanding | `AIzaSy...` |
| `SEARCH_PROVIDER` | Optional | Provider mode: `"google"`, `"tineye"`, or `"multi"` | `google` |
| `GOOGLE_CLOUD_API_KEY` | Recommended | Google Cloud API key with Cloud Vision enabled | `AIzaSy...` |
| `GOOGLE_VISION_API_KEY`| Optional | Alternate variable name for Google Cloud Vision | `AIzaSy...` |
| `GOOGLE_ACCESS_TOKEN`  | Optional | Google OAuth 2.0 access token for Cloud Vision | `ya29...` |
| `TINEYE_API_KEY`       | Optional | TinEye Commercial Reverse Image Search API key | `64c1...` |
| `SERPAPI_API_KEY`      | Optional | SerpApi key for Google Lens reverse visual search | `abc123...` |
| `SEARCH_TIMEOUT_SECONDS`| Optional | Timeout in seconds for provider queries (default: `30`) | `30` |
| `MAX_RESULTS`          | Optional | Max results to return per search (default: `50`) | `50` |

---

## Installation

### 1. Node.js Full-Stack Application (Default runtime)

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Or build for production
npm run build
npm start
```

### 2. Standalone Python FastAPI Backend (Optional alternative)

```bash
# Navigate to backend directory
cd backend

# Install Python requirements
pip install -r requirements.txt

# Run FastAPI service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Search Provider Configuration

### 1. Google Cloud Vision Web Detection
1. Visit [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Cloud Vision API** for your project.
3. Generate an API Key under **APIs & Services > Credentials** or use a Service Account.
4. Set in your `.env`:
   ```env
   SEARCH_PROVIDER="google"
   GOOGLE_CLOUD_API_KEY="your-google-cloud-api-key"
   ```

### 2. TinEye Commercial API
1. Create an account at [services.tineye.com](https://services.tineye.com/).
2. Obtain your API key from the TinEye Developer Portal.
3. Set in your `.env`:
   ```env
   SEARCH_PROVIDER="tineye"
   TINEYE_API_KEY="your-tineye-api-key"
   ```

### 3. Multi-Provider Mode
Set `SEARCH_PROVIDER="multi"` and configure credentials for both Google and TinEye. TRACE ID will execute both in parallel, deduplicate matching URLs, and sort results by provenance fidelity (Exact > Near Match > Visually Related).

---

## Important Limitations

1. **Provider-Dependent Indexing**: No search engine possesses universal coverage of the entire world wide web. Results reflect what has been crawled and indexed by the configured search providers.
2. **Private & Authenticated Content**: Content behind paywalls, private social media profiles, login gates, and non-indexable web storage cannot and should not be discovered.
3. **Transient Web Content**: Web pages and images may be modified, moved, or deleted by their publishers after being indexed.
4. **No Identity Inference**: Visual similarity scores do not constitute legal proof of authorship or human identity. TRACE ID traces image distribution, not human individuals.
5. **Provider Rate Limits & Quotas**: Commercial search APIs enforce rate limits, timeouts, and request quotas as governed by their respective service tiers.
