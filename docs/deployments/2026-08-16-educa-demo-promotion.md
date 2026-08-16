# EDUCA demo promotion receipt

## Result

- Status: **PASS**
- Target: `https://educa-demo.vercel.app`
- Promoted at: `2026-08-16T20:14:28Z`
- Vercel deployment: `dpl_EqLGeJpWjgYq6VoFKdZfz2FRyxpd`
- Production deployment URL: `https://educa-demo-a1fkpvs26-myke-matos-projects.vercel.app`
- Vercel state: `READY`

## Source and version proof

- Source commit: `01a4e5a4db3c40c3914068159b4d1e1a5b838829`
- Source commit message: `fix: patch dependency security vulnerabilities (#132)`
- Upload metadata: `edu_commit=01a4e5a4`, `edu_source=main`
- Vercel metadata `gitCommitSha` matches the full source commit above.
- Vercel metadata `gitCommitRef` is `fm/runtime-final-promotion`.
- The deployment metadata also records `gitCommitMessage` as the source commit message.

## Build receipt

- Local command: `cd app && pnpm build`
- Local result: **PASS**
- Build environment sourced `SUPABASE_DEMO_URL`, `SUPABASE_DEMO_SERVICE_KEY`, and `SUPABASE_DEMO_DB_URL` from `config/demo-sandbox.env` without recording their values.
- `PILOT_MODE=false` and `NEXT_PUBLIC_PILOT_MODE=false` were used for the demo build and runtime.
- The Vercel production build also completed successfully and reported `Build Completed in /vercel/output [2m]`.
- The successful upload used the repository root as the upload root. This keeps `app/vercel.json` as the application deployment input while including the contract modules under `supabase/` that the app scripts import.
- Non-blocking build warnings remained for the deprecated `middleware` convention, an Edge Runtime `process.cwd` import trace, and stale Browserslist data.

## Bundle size snapshot

Measured from the successful local production build before deployment:

| Artifact | Files | Bytes | MiB |
| --- | ---: | ---: | ---: |
| `.next` total, including cache | 829 | 943,314,002 | 899.61 |
| `.next/cache` | not separated from file count | 922,370,560 | 879.64 |
| `.next` excluding cache | 799 | 20,943,442 | 19.97 |
| `.next/static` | 185 | 5,541,080 | 5.28 |
| `.next/server` | 512 | 14,262,964 | 13.60 |

The cache dominates the total directory size. The non-cache snapshot is the useful deploy artifact comparison.

## Alias receipt

- `educa-demo.vercel.app` has `aliasAssigned=true`.
- `vercel inspect educa-demo.vercel.app --json` resolved to `dpl_EqLGeJpWjgYq6VoFKdZfz2FRyxpd`.
- The Vercel alias list maps `educa-demo.vercel.app` to the deployment URL above.
- Inspector: `https://vercel.com/myke-matos-projects/educa-demo/EqLGeJpWjgYq6VoFKdZfz2FRyxpd`

## Live browser receipt

Verified with `chrome-devtools-axi` against the production alias:

1. Opened `https://educa-demo.vercel.app`; the unauthenticated request reached the EDUCA login page.
2. Signed in with the fixed synthetic demo account from `DEMO.md`.
3. Reached `https://educa-demo.vercel.app/dashboard` successfully.
4. The dashboard showed the demo banner, synthetic counts of 50 students, 5 active classes, and 10 active teachers.
5. The dashboard showed the canonical attendance alert text, confirming the new dashboard data surface loaded from the live deployment.
6. Browser evaluation returned `hasDemoBanner=true`, `hasSyntheticCounts=true`, and `hasCanonicalAlert=true`.

The browser console reported one accessibility issue for a form field without an `id` or `name`; no JavaScript error blocked the verified flow.
