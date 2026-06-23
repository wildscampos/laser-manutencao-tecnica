# CRM Modularization Design

## Goal

Split the LaserFix CRM frontend into focused modules without changing runtime behavior, public routes, Firestore writes, visual layout, copy, or operational flows.

## Current Context

The CRM is currently exposed through `src/components/crm-app.tsx`, which is imported by all CRM routes under `src/app/crm`. The file is responsible for authentication, realtime listeners, notifications, theme persistence, dashboard metrics, charts, customer management, services, finance, availability, appointment cards, manual appointments, walk-in appointments, returns, WhatsApp messages, and shared formatting.

This concentration made iteration fast, but the file is now large enough that unrelated changes can affect critical workflows. The refactor should reduce risk before adding larger features such as Firebase Cloud Messaging, Cloud Functions, or WhatsApp Cloud API.

## Non-Goals

- Do not redesign the CRM UI.
- Do not change any route URL.
- Do not change Firestore document shapes, collection names, or security rules.
- Do not change pricing, payment, return, availability, WhatsApp, dashboard, or notification behavior.
- Do not introduce new dependencies.
- Do not implement FCM, Cloud Functions, or WhatsApp API in this refactor.

## Recommended Approach

Use an incremental extraction strategy. Keep `CrmApp` as the stable entrypoint and move cohesive groups into files under `src/components/crm`. Each extraction must preserve exported behavior and pass the existing validation cycle before the next extraction.

The CRM routes should continue importing `CrmApp` from `src/components/crm-app.tsx`, so the App Router pages remain unchanged.

## Target File Structure

Create these files as implementation requires:

- `src/components/crm/types.ts`: CRM view names, chart types, theme types, and shared component prop types when useful.
- `src/components/crm/constants.ts`: login constants, admin email parsing, service options, default service catalog, city options, and reusable formatters that are constant instances.
- `src/components/crm/formatters.ts`: date, time, duration, currency, status, payment, and service label formatting.
- `src/components/crm/theme.ts`: CRM theme storage, reading, writing, applying, and toggling.
- `src/components/crm/whatsapp.ts`: appointment confirmation and customer payment WhatsApp URL builders.
- `src/components/crm/notifications.ts`: local browser/PWA notification helpers currently used by the CRM.
- `src/components/crm/dashboard.tsx`: metric cards, appointment metric lists, SVG chart rendering, and dashboard chart helpers.
- `src/components/crm/appointments.tsx`: appointments page, appointment card, manual appointment form, walk-in appointment form, return form, and appointment editing form.
- `src/components/crm/customers.tsx`: customers page, customer form, customer cards, and customer history helpers.
- `src/components/crm/services.tsx`: service catalog page and service form.
- `src/components/crm/finance.tsx`: finance page and financial history list.
- `src/components/crm/availability.tsx`: availability blocking page and available-time loading.

`src/components/crm-app.tsx` should become a thin authenticated shell responsible for:

- Firebase auth state.
- Loading realtime CRM data.
- Shared action wrappers for success/error toasts.
- Shared CRM header and module navigation.
- Passing data and actions to the selected module.

## Extraction Order

1. Extract pure utilities first: constants, formatters, theme, WhatsApp, and notifications.
2. Extract dashboard rendering and chart helpers.
3. Extract smaller views: finance, services, and availability.
4. Extract customers and history.
5. Extract appointments last because it contains the highest-risk workflows.

Each step must be independently testable and committed separately if possible.

## Behavioral Requirements

The following behavior must remain unchanged:

- Login remains by the existing configured CRM account.
- Theme choice persists across the whole CRM.
- All CRM routes keep their current URLs and page titles.
- Dashboard cards keep current labels, ordering, expansion behavior, values, charts, and lists.
- Manual appointments still block public site slots.
- Availability blocking still lists only free times.
- Completed appointments remain grouped and collapsed by default.
- Appointment cards still expand one at a time.
- Completed appointments still support payment, WhatsApp charge, editing, services, notes, and return scheduling.
- Returns remain zero-value appointments that block a slot and can be concluded without charge.
- Walk-in appointments can still be started or registered as completed.
- Toasts still appear centered and auto-close.
- Local notification behavior remains as currently implemented.
- Public site behavior must not change.

## Validation Requirements

After every extraction batch:

- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run test:e2e` with `CRM_TEST_PASSWORD` defined.
- Confirm no unplanned Firestore rules or Firebase config changes.

Before deploy:

- Run the full validation cycle again.
- Deploy hosting only after all tests pass.
- Push commits to GitHub.

## Risks And Mitigations

Risk: circular imports between modules.
Mitigation: keep shared types, constants, formatters, and helpers in dedicated files that do not import view components.

Risk: accidental behavior change while moving JSX.
Mitigation: move code mechanically first, without rewriting logic or changing copy.

Risk: appointments module is too large even after extraction.
Mitigation: split appointments internally after it is isolated, starting with forms and card components.

Risk: E2E tests miss a CRM state.
Mitigation: preserve existing tests and add focused tests only if an extraction exposes a fragile behavior.

## Approval

The approved strategy is incremental modularization with `CrmApp` preserved as the stable shell. No product behavior changes are included in this refactor.
