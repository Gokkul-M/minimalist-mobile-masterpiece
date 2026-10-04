# Ledgerly

A private, mobile-first personal finance tracker. Data is entered manually and saved in browser storage on the device. It does not connect to a bank or synchronize with an online account.

## Run

```sh
bun install
bun run dev
```

Open http://localhost:8080. Create an on-device profile or continue as a guest; use **Load demo data** during onboarding to explore the screens. To create a production build, run `bun run build`.

## Architecture

- `src/store/ledger.ts`: typed reactive finance state, local persistence, demo entries, recurring generation, and calculations.
- `src/lib/auth.ts`: replaceable on-device credential hashing and verification interface. This is not server authentication and does not protect against someone with access to browser storage.
- `src/components/ledger-app.tsx`: app screens, entry forms, analytics, navigation, and local import/export.
- `src/styles.css`: shared semantic color tokens and app styling.
- `src/lib/pwa.ts`: guarded offline registration; offline app-shell caching is available in published production, not the editor preview.

JSON backups contain your manually entered data. Keep backup files private. Clearing browser storage deletes local data unless you have a backup.
