# Falcon ERP — Setup & Development

For **developers** and **operators** who deploy or extend the application.

---

## 1. Requirements

- **Node.js** (LTS recommended, e.g. 20.x)
- **npm** (comes with Node)
- A **Supabase project** (PostgreSQL + Auth) with schema and policies matching this app
- Optional: **Google Cloud Vision API** key for smart-camera / OCR features (see env vars)
- **Desktop `.exe` (optional):** [Rust](https://rustup.rs/) stable toolchain + Windows **Visual Studio Build Tools** (C++ workload) for Tauri builds

---

## 2. Clone & install

```bash
cd falcon-super-gold-erp
npm install
```

---

## 3. Environment variables

Copy `.env.example` to `.env` (or `.env.local`) and fill in:

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | **Yes** | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase anonymous/public key (browser-safe **only** with proper RLS) |
| `VITE_GOOGLE_VISION_API_KEY` | No | Google Vision API for OCR / smart camera features |
| `VITE_USE_MOCK_VISION` | No | Set `true` to avoid real Vision calls in dev |

**Security**

- Never commit `.env` with real secrets to public repos.
- Production **must** rely on **Row Level Security (RLS)** and policies in Supabase so the anon key cannot leak data across tenants or roles.

Optional app-specific variables may exist (e.g. seller state for GST); check `import.meta.env` usage in the codebase.

---

## 4. Run locally

```bash
npm run dev
```

Default dev server (from Vite config): **`http://localhost:3007`**

The browser may open automatically (`open: true` in `vite.config.ts`).

---

## 5. Build for production

```bash
npm run build
```

Output: **`dist/`** — static assets for hosting (Vercel, Netlify, S3+CloudFront, etc.).

```bash
npm run preview
```

Serves `dist/` locally to sanity-check the production build.

---

## 6. Lint & quality

```bash
npm run lint
```

The project uses ESLint with TypeScript; many `any` usages are **warnings** to allow gradual cleanup.

---

## 7. Project structure (short)

| Path | Role |
|------|------|
| `src/app/` | `App.tsx`, `Router.tsx`, `lazyPages.ts` (code-split routes) |
| `src/components/` | Shared UI (layout, buttons, modals, etc.) |
| `src/features/` | Feature modules (pages, feature-specific components) |
| `src/services/` | Supabase CRUD, business helpers, exports |
| `src/lib/` | Supabase client, utilities, offline helpers |
| `src/config/` | Permissions matrix, constants |
| `vite.config.ts` | Build, PWA, manual chunks, aliases |
| `context.md` | Team handoff / changelog |

---

## 8. Routing & performance

- **Lazy routes:** All authenticated pages are loaded via `React.lazy` in `src/app/lazyPages.ts` ( **`LoginPage` stays eager** ).
- **Suspense:** `AppShell` wraps `<Outlet />` with a loading fallback (`RouteLoadingFallback`).
- **Vendors:** `manualChunks` splits React, Supabase, Recharts, PDF stack to improve caching.

---

## 9. Desktop app — Tauri (`src-tauri/`)

The repo includes a **[Tauri v1](https://v1.tauri.app/)** shell so you can ship a **native Windows installer** (NSIS / MSI) instead of only the browser.

| Command | Purpose |
|---------|---------|
| `npm run tauri:dev` | Runs Vite on port **3007** and opens the app in a **desktop window** (needs Rust installed). |
| `npm run tauri:build` | Runs `npm run build`, then compiles Rust and produces **installers** under `src-tauri/target/release/bundle/`. |

**Requirements on Windows:** Rust (`rustup`), and **MSVC** build tools (Visual Studio installer → “Desktop development with C++” or Build Tools).

**“Offline” vs “online” (important):**

- The **`.exe` is not a full offline ERP** by itself. The UI is still the same React app; **data lives in Supabase**, so **most features need internet** to talk to your database.
- Tauri gives you: **installable app**, **no browser tab**, **stricter desktop window**, optional **file system / updater** APIs.
- **True offline** (full sales/inventory without network) would require a dedicated sync strategy (local DB + queue) beyond what the web app guarantees today. The PWA/service worker helps **cache assets** and can soften **flaky** connections; it does not replace Supabase for authoritative data.

**Config:** `src-tauri/tauri.conf.json` — `devPath` matches Vite **`http://localhost:3007`**, `distDir` is `../dist`, CSP allows `https://*.supabase.co`.

---

## 10. PWA (Progressive Web App)

- **vite-plugin-pwa** generates a service worker and precache list.
- After install, users may get **cached assets**; API calls to Supabase can use **runtime caching** rules defined in `vite.config.ts` (verify behaviour for your compliance needs).

---

## 11. Deployment (typical: Vercel)

1. Connect the Git repo to Vercel (or similar).
2. Set **environment variables** in the host dashboard (same names as `VITE_*`).
3. Build command: `npm run build`, output directory: `dist`.
4. **SPA routing:** ensure all routes fall back to `index.html` (Vercel rewrite / `vercel.json` if present).

---

## 12. Database & migrations

- Schema lives in **Supabase** (SQL migrations or dashboard). This repo does not ship a single SQL dump for all environments; use your team’s **migration process**.
- **RLS policies** must align with the app’s `users` table / role field and `auth.uid()`.

---

## 13. Troubleshooting

| Issue | What to check |
|-------|----------------|
| Blank screen on load | Browser console; missing `VITE_SUPABASE_*` throws in `src/lib/supabase.ts` |
| 401 / permission denied | User role, RLS policies, `permissions.ts` vs actual JWT claims |
| Wrong GST (IGST vs CGST/SGST) | `VITE_SELLER_STATE` and customer place of supply |
| Chunk load failed | Network/CDN; stale deploy — hard refresh or clear SW cache |

---

## 14. Documentation index

- **[README.md](README.md)** — Doc index  
- **[OVERVIEW_AND_REPORT.md](OVERVIEW_AND_REPORT.md)** — Product overview  
- **[USER_GUIDE.md](USER_GUIDE.md)** — End-user guide  

---

*Last aligned with Falcon ERP codebase: React 19 + Vite 7 + Supabase + TypeScript.*
