# Deployment & Hosting Guide — Visual Automata Studio

> **Visual Automata Studio** is an installable Progressive Web Application (PWA) and zero-dependency standalone HTML bundle designed for **FCIS '26 Compiler Theory**.

---

## 📋 Table of Contents

1. [Architecture & Packaging Strategy](#-architecture--packaging-strategy)
2. [Option 1: GitHub Pages (Automated CI/CD)](#-option-1-github-pages-automated-cicd)
3. [Option 2: Vercel](#-option-2-vercel)
4. [Option 3: Netlify](#-option-3-netlify)
5. [Option 4: Cloudflare Pages](#-option-4-cloudflare-pages)
6. [Option 5: Offline & Standalone Local Execution](#-option-5-offline--standalone-local-execution)
7. [PWA Installation & Offline Caching](#-pwa-installation--offline-caching)
8. [Verification & Sanity Testing](#-verification--sanity-testing)

---

## 🏗 Architecture & Packaging Strategy

Visual Automata Studio uses [`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile) to produce an ultra-portable production bundle:

- **Single HTML Distribution**: `dist/index.html` (~300 KB) contains all compiled Preact markup, Tailwind styles, SVG icons, and JavaScript logic completely inlined.
- **Relative Path Routing**: Configured with `base: './'` in [`vite.config.ts`](../vite.config.ts), allowing deployment to root domains (`example.com`), sub-paths (`example.com/automata/`), or offline local file paths (`file:///D:/.../dist/index.html`).
- **Offline & Standalone**: Zero external CDN runtime dependencies. Functions identically with or without an active internet connection.
- **PWA Assets**: `public/manifest.webmanifest` and `public/sw.js` provide installability and cache-first offline persistence when accessed over HTTPS.

---

## 🚀 Option 1: GitHub Pages (Automated CI/CD)

The repository includes a ready-to-use GitHub Actions workflow located at [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

### Step-by-Step Setup:

1. **Enable GitHub Pages via Actions**:
   - Navigate to your repository on GitHub.
   - Go to **Settings** → **Pages** (under the "Code and automation" section).
   - Under **Build and deployment** → **Source**, change from _Deploy from a branch_ to **GitHub Actions**.

2. **Triggering the Deployment**:
   - Pushing any commit to `master` (or `main`) automatically triggers the build and deploy pipeline.
   - Pushing release tags (e.g. `v1.0.0`) triggers the pipeline.
   - You can also manually trigger the pipeline anytime under **Actions** → **Deploy to GitHub Pages** → **Run workflow**.

3. **Workflow Steps Executed**:

   ```mermaid
   flowchart LR
       A["git push"] --> B["Checkout Code"]
       B --> C["Node.js 20 Setup"]
       C --> D["npm test<br/>(Unit & Pipeline Tests)"]
       D --> E["npm run build<br/>(SingleFile Compilation)"]
       E --> F["Upload dist/ Artifact"]
       F --> G["Deploy to GitHub Pages"]
   ```

4. **Accessing the Live Site**:
   - Your site will be published at:
     ```
     https://<github-username>.github.io/<repository-name>/
     ```

---

## ▲ Option 2: Vercel

Vercel offers zero-configuration instant global hosting.

### Method A: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new).
2. Connect your GitHub account and import `Lexical_Analysis_Program`.
3. Configure project settings:
   - **Framework Preset**: `Vite` (or `Other`)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**.

### Method B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally (if not installed)
npm install -g vercel

# Deploy production build
vercel --prod
```

---

## 🌐 Option 3: Netlify

### Method A: Deploy via Netlify Dashboard

1. Log in to [app.netlify.com](https://app.netlify.com) and click **Add new site** → **Import an existing project**.
2. Select your GitHub repository.
3. Configure build settings:
   - **Base directory**: (leave blank)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Click **Deploy site**.

### Method B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run build
npm run build

# Deploy dist directory to production
netlify deploy --prod --dir=dist
```

---

## ⚡ Option 4: Cloudflare Pages

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Compute (Workers) & Pages**.
2. Select **Create application** → **Pages** → **Connect to Git**.
3. Choose the repository and enter:
   - **Framework preset**: `None` or `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Click **Save and Deploy**.

---

## 💾 Option 5: Offline & Standalone Local Execution

Visual Automata Studio requires no web server to run locally.

### Method A: Direct Double-Click (`file:///`)

1. Run `npm run build` (or take an existing `dist/index.html`).
2. Double-click `dist/index.html` directly, or right-click → **Open with** (Google Chrome, Microsoft Edge, Brave, Firefox, or Safari).
3. On Windows, you can also double-click [`open-app.bat`](../open-app.bat) in the project root.

> [!NOTE]
> All SVG generation, canvas rendering, simulation, and export functions (including PNG rendering via Data URIs) are immune to browser CORS / local origin restrictions.

### Method B: Local Static HTTP Server

If you wish to test Service Worker registration and PWA installation locally:

```bash
# Option 1: Using npx serve
npx serve dist

# Option 2: Using Python built-in server
python -m http.server 8080 -d dist

# Option 3: Using Vite preview
npm run preview
```

Visit `http://localhost:8080` or `http://localhost:4173`.

---

## 📱 PWA Installation & Offline Caching

When served over HTTPS (or on `http://localhost`), Visual Automata Studio is installable as a native app:

### Desktop (Google Chrome / Microsoft Edge / Brave)

1. Look for the **Install App** icon in the browser address bar (right side).
2. Click **Install**.
3. The app opens in its own standalone window without browser chrome, and adds an icon to your desktop / taskbar.

### Android (Google Chrome)

1. Navigate to the deployed site.
2. An automatic banner "Add Visual Automata Studio to Home screen" will appear, or tap the triple-dot menu (⋮) → **Install app**.

### iOS / iPadOS (Apple Safari)

1. Navigate to the deployed site in Safari.
2. Tap the **Share** button (box with upward arrow).
3. Scroll down and tap **Add to Home Screen**.

### Cache-First Service Worker Lifecycle

- The service worker (`sw.js`) intercepts all fetch requests and responds from cache (`automata-studio-v1.0.0`).
- If an asset is not in cache, it falls back to the network.
- When an updated service worker is detected, it automatically purges old cache versions during the `activate` event.

---

## 🧪 Verification & Sanity Testing

Before deploying, verify that all automated checks pass:

```bash
# 1. Run full test suite (59 passing tests)
npm test

# 2. Build production bundle
npm run build

# 3. Check dist file size
ls -lh dist/index.html
```

Expected output:

- `dist/index.html` size: ~**307 KB** (single standalone file)
- `tests`: **59 passed**, 0 failed.
