# 45:45 Build notes

This package was merged from the Lovable `club-centric-hub` UI and the existing 45:45 Supabase/GOAL backend contract.

## Validation completed

- All TypeScript/TSX source files were syntax-transpiled with TypeScript 5.8.3 with no syntax errors.
- Supabase client code uses only the public client key in the browser.
- `GOAL_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are referenced only from the server-side Edge Function environment.
- The legacy full Admin CMS is preserved under `/admin-full/` while the newer React Admin is available under `/admin`.

## Build limitation in the preparation environment

Package installation timed out in the preparation environment, so a complete `npm run build` could not be executed there. Run the normal install/build after replacing the project files.
