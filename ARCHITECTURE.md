# Frontend architecture

The dashboard uses a one-way dependency flow:

```text
app -> features -> modules -> shared
  \        \          \         \
   +--------+----------+------> components/lib
```

## Source ownership

- `app/`: thin Next.js routes and layouts. Routes compose screens; business
  logic stays outside this directory.
- `features/`: page-level workflows and admin screen orchestration.
- `modules/`: reusable domain modules, services, domain types, and domain UI.
- `shared/`: domain-neutral utilities, API infrastructure, shared types, hooks,
  and components.
- `components/`: application shell and low-level UI primitives. These must not
  depend on a feature or domain module.
- `config/`: canonical navigation, route, and permission metadata.

`features` may import `modules`, but `modules` must never import `features`.
`shared` and `components` must never import `features` or `modules`. Circular
imports are prohibited. `pnpm architecture:check` enforces these rules.

## File conventions

- Keep route files declarative and small.
- Keep tests beside the code they verify.
- Prefer named exports for reusable modules.
- Put API calls in a domain service rather than a React component.
- Put pure mapping and validation logic in testable `.ts` modules.
- Split screen components when state, server effects, and rendering can be
  separated without creating pass-through abstractions.

## Required validation

Run `pnpm validate` before merging. It checks formatting, architecture,
linting, TypeScript, tests, and unused files/dependencies.

## Commodity catalog integration

- Commodity Type and Commodity are fetched and mutated as independent catalogs
  for the selected Service. UI state for one catalog must not filter, clear, or
  invalidate the other catalog.
- Gallery, EPDA, and Booking controls submit independent catalog IDs while also
  preserving text snapshots used by historical documents.
- Commodity Type client contracts use only ID, Service and name. Type create
  and edit UI must never add a code field or infer identity from a mutable name.
- EPDA Type options use the numeric Type ID as their value and the Type name as
  their label. Parameter writes canonicalize every cargo agency rate to
  `{ commodityTypeId, typeNameSnapshot, label, rate }` and never resend a
  legacy `code` key. Existing nonblank snapshots and labels remain stable when
  a Type is renamed.
- BL/AN/DO Package Type options come from the backend Package Type catalog.
  A stored inactive or legacy text value remains renderable when reopening an
  existing document.
- Runtime components must not restore the legacy Commodity Group membership or
  per-Commodity required-image quota.
