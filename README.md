# Falcon ERP

A **React + TypeScript + Vite** ERP for manufacturing and sales, with **India GST** workflows, **inventory & production**, and an **international export** module. Backend: **Supabase** (PostgreSQL + Auth).

## Documentation (start here)

| | |
|---|---|
| **Documentation index** | [`docs/README.md`](docs/README.md) |
| **Full overview & report** (capabilities, architecture, “why it matters”) | [`docs/OVERVIEW_AND_REPORT.md`](docs/OVERVIEW_AND_REPORT.md) |
| **User guide** (how to use every area) | [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) |
| **Setup & development** (install, env, build, deploy) | [`docs/SETUP_AND_DEVELOPMENT.md`](docs/SETUP_AND_DEVELOPMENT.md) |
| **Project context / changelog** | [`context.md`](context.md) |

## Quick start (developers)

```bash
npm install
cp .env.example .env   # then set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:3007
```

```bash
npm run build
npm run lint
```

## Tech stack (short)

- React `19`, Vite `7`, TypeScript `5.9`
- Tailwind CSS, Radix UI, Zustand, React Router
- Supabase JS client, PWA (Vite plugin)

---

*Falcon ERP — internal documentation is in `/docs`; keep `context.md` updated for team handoffs.*
