# BHW Care: Known Limitations (end of Day 1)

This is a week-one MVP foundation. It is **not** production-ready and must not hold real
patient data yet. Each item below is either scheduled for a later day or needs a decision
from the clinical owner or the Data Protection Officer (DPO).

## Must be done before any pilot with real users

- **Remove the demo accounts and the demo barangay.** `demo.superadmin@example.com`,
  `demo.bhw@example.com` and "Demo Barangay A" exist only for development
  (`supabase/demo/demo_seed.sql`, which is deliberately not a migration).
- **Encrypt the local database.** The local store is in memory today and holds nothing.
  When PowerSync and SQLite arrive, cached health data needs an encrypted database and a
  documented key-management and recovery plan.
- **Record the hosting-region decision.** The pilot project runs in Southeast Asia
  (Singapore). The final region for real patient data is a DPO decision.
- **Clinical governance.** No DOH risk rule, threshold or vaccine schedule has been coded.
  Rules and schedules must come from the exact official source copy approved by the
  clinical owner. Tagalog wording in the app is a working draft and needs review by a
  Tagalog speaker.
- **Security review.** `npm audit` reports 14 moderate findings that have not been
  reviewed. A full security pass is planned for Day 7.

## Security and privacy

- **MFA is modeled, not enforced.** The policy (Super Admin requires it) and the Profile
  status row exist. Authenticator enrollment and enforcement at privileged actions are
  Day 2. The demo Super Admin has no authenticator.
- **Publishing export templates is not built.** The table is append-only and readable by
  signed-in users, and the app cannot write to it. The publish function must require a
  Super Admin with a verified MFA session (Day 2).
- **Database owners can bypass immutability.** The append-only trigger on export template
  versions can be removed by someone with full database ownership. That is the
  break-glass case that needs a governed procedure.
- **QR links fail closed.** `resolveRecordReference` always answers "not available" until
  server-side resolution exists (Day 3), which must check role, barangay, purok or
  assignment, and relationship, and write an audit event. A reference opened while signed
  out is kept in memory only and has no expiry yet. Universal links need a real HTTPS domain.
- **Push token registration** always attaches a token to the signed-in caller. Anyone who
  learned another device's Expo token could re-register it under their own account. Tokens
  are not public, and this needs the token itself.
- **Audit events are not implemented.** The audit table and service come after Day 1.
- **The publishable Supabase key is public by design.** Data is protected by Row Level
  Security. Server secrets (service key, database password, PhilSMS token) must never be
  placed in the app or in a `.env` file inside this repository.

## Notifications

- **No notification is sent by anything yet.** Tables, a delivery-status rule set, an SMS
  provider boundary and a Realtime channel wrapper exist.
- **PhilSMS is untested against the live service.** The adapter follows the public API
  page. The shape of the success response's data field is not documented there, so message
  id extraction is best-effort until one real test send confirms it. The server Edge
  Function that reads the token from Supabase secrets is not built.
- **Push needs a development build.** Expo Go on Android no longer supports remote push.
  Token registration currently finds no token and does nothing.
- **Realtime access** is limited to each user's own `user:<id>` topic for receiving.
  Conversation topics need their own policies with membership and scope checks (Day 5).

## Offline and data

- **PowerSync and SQLite are not installed.** The repository boundary exists so they can
  be added behind it.
- **Sign-out wipes the local store** and revokes the device push token, but nothing is
  cached yet.
- **Supabase and PowerSync free tiers** pause after about a week of inactivity and have
  usage limits. They are pilot infrastructure, not nationwide production infrastructure.

## App and interface

- **Phone testing only.** The web tab layout from the Expo template was removed. Responsive
  web is not supported yet.
- **Placeholder screens and icons.** The role home is a temporary screen. Tab icons are
  template images. The top bar with sync state and notifications is not built.
- **Theme tokens are fixed** Tailwind values. Super Admin theme configuration comes later.
- **No screen or component tests.** Domain, storage and server logic are unit tested. Smoke
  and screen tests are scheduled for Day 7.
- **The system default language** is stored in `system_settings` (seeded `en`), but no
  Super Admin screen changes it yet. The sign-in screen always uses the default because no
  user is known before sign-in.

## Tooling and CI

- **ESLint 9.39.5** is reported as no longer supported, but it is the version the current
  Expo lint configuration works with.
- **GitHub Actions** notices: the checkout and setup-node actions target Node 20 and are
  forced onto Node 24, and the `ubuntu-latest` label moves to Ubuntu 26 on 19 October 2026.
  Actions are pinned to major versions, not exact commit hashes.
- **Typed routes** are checked strictly on a developer machine but not in CI, because the
  generated route types are not committed.
- **Leftover template files** such as `scripts/reset-project.js` and the splash overlay
  assets should be reviewed and removed or replaced.
