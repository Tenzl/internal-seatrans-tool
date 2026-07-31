# Dashboard Admin Architecture

## Dependency direction

```text
app routes
  -> features (dashboard workflows)
    -> modules (business domains)
      -> shared (UI primitives, API client, types, utilities)
```

- `src/app`: thin Next.js route composition only. Pages select a screen and wrap
  it with `AdminPageShell`; they do not own API or business rules.
- `src/features`: administrator workflows that coordinate one or more domains.
  Each large workflow has a domain folder under `features/admin/sections`.
- `src/modules`: reusable domain UI, services, models, and domain hooks.
- `src/shared`: framework-neutral configuration and utilities plus reusable UI.
  Shared code must not import a feature or module.

ESLint enforces the important dependency boundaries.

## Component responsibilities

A screen may coordinate queries, mutations, and dialogs. Extract these parts
when they develop independent state or rules:

- `*Service.ts`: HTTP requests and response mapping.
- `use*.ts`: stateful workflow or query coordination.
- `*.types.ts`: domain contracts shared by multiple files.
- `*Rules.ts` / `*Model.ts`: pure validation, mapping, and calculations.
- `*Dialog.tsx`, `*Table.tsx`, `*Toolbar.tsx`: focused presentation.

Keep comments short and use them for intent or a business rule that the code
cannot make obvious. Do not narrate JSX or simple assignments.

## Authentication and authorization

- The JWT is stored only in the backend-managed HttpOnly cookie.
- Browser storage contains an optional user profile for placeholder UI, never a
  token. `/auth/me` verifies it before a route is granted.
- `authSession.ts` owns the shared React Query session cache and clears every
  cached admin response on logout.
- `dashboard-catalog.ts` is the single source of navigation and section metadata.
- `section-catalog.ts` owns path authorization. The route guard is a UX layer;
  backend authorization remains mandatory.

To add a protected dashboard section:

1. Add its metadata once in `dashboard-catalog.ts`.
2. Add the matching backend section key.
3. Add or update the catalog contract tests.

## API boundaries

- Use `apiClient` for JSON and download requests so cookies, timeouts, and 401
  handling stay consistent.
- Use `unwrapApiResponse` for required response data and
  `unwrapNullableApiResponse` only when `data: null` is a valid lookup result.
- Direct Axios usage is reserved for upload progress, which Fetch does not
  expose consistently.

## Verification

Run before merging:

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm knip
pnpm audit --prod
```

Migration and production database work belongs to `backend2.0`; the dashboard
must never run schema migrations during startup.
