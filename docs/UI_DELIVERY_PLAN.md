# Waypost UI delivery plan

Design review draft · 25 November 2026 · Hospitality Project #14

## Design to review

Staff enter through a branded sign-in page and land on the platform overview. The overview establishes the current tenant and opens the modules available to the current user. The visual direction uses a navy navigation rail, a compact workspace header, a blue platform header and pale card surfaces. The PMS portfolio uses numeric inventory cards and a property table.

| Level | Default view | Personalization |
| --- | --- | --- |
| Platform | Module cards for the current tenant and user | Show or hide Quick access and pin permitted modules, properties or property tools |
| PMS portfolio | Accessible-property inventory, property table and today’s arrivals and departures | Choose all accessible properties or one property. Show or hide overview sections and pin property tools |
| Property | Single-property inventory, movements, Availability and Front desk | Reach this level through the portfolio or a pinned shortcut |

The portfolio selection filters the KPIs and movements. The property table retains all accessible properties so staff can compare and open them. The inventory selector still leads to a property when the property table is hidden. For the mockup, occupancy equals occupied rooms divided by rooms in service and is weighted by rooms in service across the portfolio. Confirm these definitions with the PMS owner before adopting them in an API.

### Access semantics

For the selected tenant, the module list is the intersection of its subscriptions and the user’s effective module grants. PMS property access also requires a property grant within that tenant. Evaluate the same conditions for navigation, pinned destinations, direct URLs and every server request once APIs are connected. Recompute permitted navigation after a tenant change or entitlement revocation. Keep user preferences scoped to profile, tenant and dashboard level. Stored preferences can refer only to views the user can reach.

The current browser evaluates these rules against synthetic fixtures. Real authorization belongs on the server. The current Auth0 session and property permission contract are the starting point for integration. The module subscription, tenant membership and property-access discovery contracts and their failure behavior require explicit backend review. Treat same-group property/permission semantics from the existing backend as authoritative where applicable.

## Delivery sequence

These are proposed slices for Project #14. Assign GitHub issue numbers when the work is entered into that Project. Dates follow scope and rehearsal readiness.

| Order | Issue outcome | Review evidence |
| --- | --- | --- |
| 1 | Bootstrap the UI repository and link it to Project #14. Establish the default branch, story and PR templates, local validator, PR CI and matching ruleset. Record the frontend stack decision and smoke-test issue intake. | Clean-clone validation, a passing and failing CI check, verified branch rules, Project intake and documented setup |
| 2 | Review the synthetic sign-in and platform overview, with tenant-aware and role-aware module discovery. | Three staff profiles, two tenants for one user, a subscribed module withheld by role, a grant withheld by subscription, and a denied deep link |
| 3 | Review PMS portfolio and property workflows, including inventory definitions and permitted quick access. | Portfolio totals, one-property scope, property drill-down, task shortcuts, stale or out-of-scope pins, keyboard and narrow Thai review |
| 4 | [Review the reservation workflow with synthetic data (#59)](https://github.com/chuxorg/chux-hosp-platform/issues/59). | Availability → review booking → reservation details → cancellation, with edge states and truthful preview labels |
| 5 | Connect the approved sign-in and access-discovery slice. Prepare disposable database fixtures with synthetic tenants, grants and properties. | Auth0 session lifecycle, revoked grants, other-tenant and other-property denial, empty and unavailable states, and clean reset on a dedicated sandbox |
| 6 | Connect the first approved PMS vertical slice. Add API-backed inventory only when a contract supplies the approved stock definitions. | Documented route coverage, reservation concurrency still enforced by Go/PostgreSQL, browser tests against the sandbox, and a Mac rehearsal for the rescheduled demo |

See [Auth0 and property authorization](https://github.com/chuxorg/chux-hosp-platform/blob/master/docs/AUTHENTICATION.md), [property authorization #51](https://github.com/chuxorg/chux-hosp-platform/issues/51), [reservation #24](https://github.com/chuxorg/chux-hosp-platform/issues/24), [cancellation #43](https://github.com/chuxorg/chux-hosp-platform/issues/43) and [demo scope #44](https://github.com/chuxorg/chux-hosp-platform/issues/44).

## Same lifecycle as the backend

Use the [Hospitality SDLC](https://github.com/chuxorg/chux-hosp-platform/blob/master/docs/SDLC.md) and [Project #14](https://github.com/orgs/chuxorg/projects/14) as the delivery authority for both repositories.

1. **Backlog.** Put one independent outcome in a GitHub issue. Link the exact approved Dropbox spec version and REQ IDs when available. Record unresolved design requirements as proposed and put discovery in an appropriate spike. Include owner, module, acceptance scenarios, dependencies, exclusions, contract changes and the task checklist.
2. **Ready.** The owner or prioritizer accepts the scope and evidence. Business and policy decisions are recorded in the approved Dropbox specification and decision log. Engineering stack and contract decisions get an ADR when appropriate.
3. **In Progress.** Branch from current `master` using `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `chore/<issue>-<slug>` or `docs/<issue>-<slug>`. Use one issue and usually one PR, Conventional Commits and `Refs #N` in commit bodies. Run `./scripts/validate.sh` before any commit. Update the GitHub task list and Project status.
4. **Review.** Open a draft PR early and use `Closes #N`. Map each acceptance criterion to evidence and include validation, deployment and rollback implications. Request human review when acceptance is demonstrated and CI passes. Keep the PR in draft when validation is blocked.
5. **Done.** The owner authorizes squash merge. Verify that the issue closes and reaches Done. Amend issues explicitly when scope shifts. Keep project status in GitHub and approved business decisions in Dropbox.

### Frontend validation

The repository template provides `./scripts/validate.sh` and a pull-request workflow named `bootstrap-validation`, matching the backend's gate name. Locally and in CI the UI runs formatting, access and inventory unit tests, a TypeScript check and production build, and Chromium flow checks. API integration stories add sandbox contract, denial, empty, stale and recovery cases. Use the existing Project rules for review, required PR and up-to-date CI, squash merges and force-push/deletion restrictions. Verify those controls in the UI repository when it is bootstrapped.

### Design decisions for review

- Confirm which shortcuts should be defaults for each staff role, with users able to override them.
- Validate vocabulary and KPI denominators with hotel staff, including how properties count out-of-service rooms.
- Confirm which permissions the server will expose for module entry and which it will evaluate only at individual operations.
- Decide through the reviewed preferences story whether signed-in user settings follow the user across devices.

The packaged design uses local synthetic fixtures and preference storage. Auth0, server authorization, database seeding and API integration are separate delivery slices. The public UI repository and Project #14 were inspected for this review package. Story intake, branch rules and hosted CI still need repository bootstrap.
