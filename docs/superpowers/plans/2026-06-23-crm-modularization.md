# CRM Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `src/components/crm-app.tsx` into focused CRM modules without changing behavior, layout, routes, Firestore writes, WhatsApp messages, notifications, or tests.

**Architecture:** Keep `src/components/crm-app.tsx` as the stable authenticated shell imported by all `/crm` routes. Move pure helpers first, then low-risk views, then customer/history, and finally appointment workflows. Every task is a mechanical extraction plus validation.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript, Firebase Auth/Firestore client SDK, Lucide React, Playwright E2E.

## Global Constraints

- Do not redesign the CRM UI.
- Do not change any route URL.
- Do not change Firestore document shapes, collection names, or security rules.
- Do not change pricing, payment, return, availability, WhatsApp, dashboard, or notification behavior.
- Do not introduce new dependencies.
- Do not implement FCM, Cloud Functions, or WhatsApp API in this refactor.
- Keep `src/components/crm-app.tsx` exporting `CrmApp`.
- Keep all `/crm` pages importing `CrmApp` from `@/components/crm-app`.
- After each task, run `npm run lint`, `npm run build`, and `$env:CRM_TEST_PASSWORD='LaserFix#2026'; npm run test:e2e`.

---

## File Structure

Create a new module folder:

- `src/components/crm/types.ts`: shared CRM UI types.
- `src/components/crm/constants.ts`: constants and static option lists.
- `src/components/crm/formatters.ts`: formatting helpers.
- `src/components/crm/theme.ts`: theme persistence helpers.
- `src/components/crm/whatsapp.ts`: WhatsApp URL/message builders.
- `src/components/crm/notifications.ts`: local notification helpers.
- `src/components/crm/dashboard.tsx`: dashboard cards, charts, and chart builders.
- `src/components/crm/finance.tsx`: finance view.
- `src/components/crm/services.tsx`: services view and service form.
- `src/components/crm/availability.tsx`: availability blocking view.
- `src/components/crm/customers.tsx`: customers and history views.
- `src/components/crm/appointments.tsx`: appointments view and appointment forms/cards.

Keep:

- `src/components/crm-app.tsx`: authenticated shell, realtime listeners, action wrappers, header, module nav, view switch.
- `src/lib/crm.ts`: Firestore operations and CRM domain types.
- `src/app/crm/**/page.tsx`: unchanged route files.

---

### Task 1: Extract Shared Types And Constants

**Files:**
- Create: `src/components/crm/types.ts`
- Create: `src/components/crm/constants.ts`
- Modify: `src/components/crm-app.tsx`
- Test: `tests/e2e/crm.spec.ts`

**Interfaces:**
- Produces from `types.ts`:
  - `export type CrmView = "dashboard" | "appointments" | "customers" | "history" | "services" | "finance" | "availability";`
  - `export type DashboardChartKey = "scheduled" | "appointments" | "completed" | "totalValue" | "receivedValue" | "pendingValue" | "averageValue" | "totalMinutes" | "averageMinutes" | "totalAppointments" | "totalCompleted" | "totalGeneralValue" | "totalGeneralMinutes";`
  - `export type ChartFormat = "currency" | "duration" | "number";`
  - `export type DashboardChart = { averageValue: number; format: ChartFormat; key: DashboardChartKey; points: Array<{ label: string; value: number }>; title: string; };`
  - `export type CrmTheme = "light" | "dark";`
- Produces from `constants.ts`:
  - `crmLoginName`
  - `crmLoginEmail`
  - `crmThemeStorageKey`
  - `adminEmails`
  - `currencyFormatter`
  - `monthFormatter`
  - `performedServiceOptions`
  - `defaultServiceCatalog`
  - `cityOptions`
  - `emptyCustomer`

- [ ] **Step 1: Create `types.ts`**

```ts
export type CrmView = "dashboard" | "appointments" | "customers" | "history" | "services" | "finance" | "availability";

export type DashboardChartKey =
  | "scheduled"
  | "appointments"
  | "completed"
  | "totalValue"
  | "receivedValue"
  | "pendingValue"
  | "averageValue"
  | "totalMinutes"
  | "averageMinutes"
  | "totalAppointments"
  | "totalCompleted"
  | "totalGeneralValue"
  | "totalGeneralMinutes";

export type ChartFormat = "currency" | "duration" | "number";

export type DashboardChart = {
  averageValue: number;
  format: ChartFormat;
  key: DashboardChartKey;
  points: Array<{ label: string; value: number }>;
  title: string;
};

export type CrmTheme = "light" | "dark";
```

- [ ] **Step 2: Create `constants.ts` by moving existing constants unchanged**

Move the current constant definitions from `crm-app.tsx` into `constants.ts`. Preserve exact string values. Import `type CustomerInput` and `type ServiceInput` from `@/lib/crm`.

```ts
import type { CustomerInput, ServiceInput } from "@/lib/crm";

export const crmLoginName = "Wilds Campos";
export const crmLoginEmail = "wilds.campos@laserfix.app";
export const crmThemeStorageKey = "laserfix-crm-theme";

export const adminEmails = (process.env.NEXT_PUBLIC_CRM_ADMIN_EMAILS || "wilds.campos@laserfix.app,wilds.mc@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});
```

Then move `performedServiceOptions`, `defaultServiceCatalog`, `cityOptions`, and `emptyCustomer` exactly as they exist.

- [ ] **Step 3: Update imports in `crm-app.tsx`**

Add:

```ts
import {
  adminEmails,
  cityOptions,
  crmLoginEmail,
  crmLoginName,
  defaultServiceCatalog,
  emptyCustomer,
  monthFormatter,
  performedServiceOptions,
} from "@/components/crm/constants";
import type { CrmView, DashboardChart, DashboardChartKey, CrmTheme } from "@/components/crm/types";
```

Remove the moved local constants and local type definitions from `crm-app.tsx`.

- [ ] **Step 4: Run validation**

Run:

```powershell
npm run lint
npm run build
$env:CRM_TEST_PASSWORD='LaserFix#2026'; npm run test:e2e
```

Expected: all commands pass, 34 E2E tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src\components\crm-app.tsx src\components\crm\types.ts src\components\crm\constants.ts
git commit -m "Extrai tipos e constantes do CRM"
```

---

### Task 2: Extract Formatters, Theme, WhatsApp, And Notifications

**Files:**
- Create: `src/components/crm/formatters.ts`
- Create: `src/components/crm/theme.ts`
- Create: `src/components/crm/whatsapp.ts`
- Create: `src/components/crm/notifications.ts`
- Modify: `src/components/crm-app.tsx`
- Test: `tests/e2e/crm.spec.ts`

**Interfaces:**
- Produces from `formatters.ts`: `formatCurrency`, `formatDate`, `formatDateTime`, `formatDuration`, `formatChartValue`, `formatChartMonth`, `formatServiceListLabel`, `getStatusLabel`, `getPaymentLabel`, `getCurrentMonthKey`, `getCurrentTimeValue`.
- Produces from `theme.ts`: `getStoredCrmTheme`, `applyCrmTheme`, `toggleStoredCrmTheme`.
- Produces from `whatsapp.ts`: `buildAppointmentConfirmationWhatsAppUrl`, `buildCustomerWhatsAppUrl`, `normalizeWhatsAppNumber`, `getCustomerPaymentDebts`.
- Produces from `notifications.ts`: `getAppointmentStartTime`, `showCrmNotificationOnce`, `requestCrmNotificationPermission`, `readNotificationKeys`.

- [ ] **Step 1: Move formatting helpers**

Move these functions from `crm-app.tsx` to `formatters.ts` unchanged:

```ts
formatCurrency
formatDate
formatDateTime
formatDuration
formatChartMonth
getCurrentMonthKey
getCurrentTimeValue
getStatusLabel
getPaymentLabel
formatChartValue
formatServiceListLabel
```

Import `currencyFormatter` from `./constants` and `type ChartFormat` from `./types`.

- [ ] **Step 2: Move theme helpers**

Move these functions from `crm-app.tsx` to `theme.ts` unchanged:

```ts
getStoredCrmTheme
applyCrmTheme
toggleStoredCrmTheme
```

Import `crmThemeStorageKey` from `./constants` and `type CrmTheme` from `./types`.

- [ ] **Step 3: Move WhatsApp helpers**

Move these functions from `crm-app.tsx` to `whatsapp.ts` unchanged:

```ts
normalizeWhatsAppNumber
isFilled
buildAddressLine
getCustomerPaymentDebts
buildAppointmentConfirmationWhatsAppUrl
buildCustomerWhatsAppUrl
```

Import `type CrmAppointment` from `@/lib/crm` and formatter helpers from `./formatters`.

- [ ] **Step 4: Move notification helpers**

Move these functions from `crm-app.tsx` to `notifications.ts` unchanged:

```ts
getAppointmentStartTime
showCrmNotification
readNotificationKeys
writeNotificationKeys
showCrmNotificationOnce
requestCrmNotificationPermission
```

Export only the functions used by `CrmApp`.

- [ ] **Step 5: Update imports and delete local copies**

Update `crm-app.tsx` imports so all moved helpers are imported from the new files. Delete the local definitions. Do not change call sites unless TypeScript requires an import rename.

- [ ] **Step 6: Run validation**

Run:

```powershell
npm run lint
npm run build
$env:CRM_TEST_PASSWORD='LaserFix#2026'; npm run test:e2e
```

Expected: all commands pass, 34 E2E tests pass.

- [ ] **Step 7: Commit**

```powershell
git add src\components\crm-app.tsx src\components\crm\formatters.ts src\components\crm\theme.ts src\components\crm\whatsapp.ts src\components\crm\notifications.ts
git commit -m "Extrai utilitarios compartilhados do CRM"
```

---

### Task 3: Extract Dashboard Module

**Files:**
- Create: `src/components/crm/dashboard.tsx`
- Modify: `src/components/crm-app.tsx`
- Test: `tests/e2e/crm.spec.ts`

**Interfaces:**
- Produces:

```ts
export function buildDashboardCharts(appointments: CrmAppointment[], selectedMonth: string): DashboardChart[];

export function DashboardView(props: {
  activeChartKey: DashboardChartKey | "";
  appointments: CrmAppointment[];
  monthAppointments: CrmAppointment[];
  monthMetrics: ReturnType<typeof calculateMetrics>;
  onToggleChart: (key: DashboardChartKey | "") => void;
  selectedMonth: string;
  totalMetrics: ReturnType<typeof calculateMetrics>;
}): React.ReactElement;

export function MetricCard(props: {
  active?: boolean;
  appointmentList?: CrmAppointment[];
  chart?: DashboardChart;
  chartKey?: DashboardChartKey;
  icon: React.ElementType;
  label: string;
  listTitle?: string;
  onToggle?: (key: DashboardChartKey | "") => void;
  value: string;
}): React.ReactElement;
```

- [ ] **Step 1: Move chart helpers**

Move `getChartMetricValue`, `getChartMonths`, and `buildDashboardCharts` into `dashboard.tsx`. Preserve logic exactly.

- [ ] **Step 2: Move dashboard components**

Move `MetricCard`, `MetricAppointmentList`, and `MetricChart` into `dashboard.tsx`. Preserve JSX exactly.

- [ ] **Step 3: Create `DashboardView`**

Move the current dashboard JSX from `crm-app.tsx` into `DashboardView`. Keep the same section order:

1. Month metrics cards.
2. General metrics cards.
3. Services performed panel.

Use the same labels:

- `Atendimentos Agendados`
- `Atendimentos Concluídos`
- `Total de Atendimentos no Mês`
- `Valor total no mês`
- `Recebido no mês`
- `A receber no mês`
- `Valor médio`
- `Tempo total`
- `Tempo médio`
- `Atendimentos gerais`
- `Concluídos gerais`
- `Valor total geral`
- `Tempo total geral`

- [ ] **Step 4: Update `crm-app.tsx`**

Import:

```ts
import { buildDashboardCharts, DashboardView } from "@/components/crm/dashboard";
```

Replace the inline dashboard block with:

```tsx
<DashboardView
  activeChartKey={activeChartKey}
  appointments={appointments}
  monthAppointments={monthAppointments}
  monthMetrics={monthMetrics}
  onToggleChart={setActiveChartKey}
  selectedMonth={selectedMonth}
  totalMetrics={totalMetrics}
/>
```

- [ ] **Step 5: Run validation**

Run:

```powershell
npm run lint
npm run build
$env:CRM_TEST_PASSWORD='LaserFix#2026'; npm run test:e2e
```

Expected: all commands pass, including dashboard chart/list tests.

- [ ] **Step 6: Commit**

```powershell
git add src\components\crm-app.tsx src\components\crm\dashboard.tsx
git commit -m "Extrai dashboard do CRM"
```

---

### Task 4: Extract Finance, Services, And Availability Modules

**Files:**
- Create: `src/components/crm/finance.tsx`
- Create: `src/components/crm/services.tsx`
- Create: `src/components/crm/availability.tsx`
- Modify: `src/components/crm-app.tsx`
- Test: `tests/e2e/crm.spec.ts`

**Interfaces:**
- Produces:

```ts
export function FinanceView(props: {
  appointments: CrmAppointment[];
  months: string[];
  onMonthChange: (month: string) => void;
  selectedMonth: string;
}): React.ReactElement;

export function ServicesView(props: {
  busy: boolean;
  onSaveService: (service: ServiceInput) => Promise<boolean>;
  onUpdateService: (serviceId: string, service: ServiceInput) => Promise<boolean>;
  services: CrmService[];
}): React.ReactElement;

export function AvailabilityView(props: {
  appointments: CrmAppointment[];
  busy: boolean;
  onBlock: (input: AvailabilityBlockInput) => Promise<boolean>;
}): React.ReactElement;
```

- [ ] **Step 1: Move finance view**

Move `FinanceView` to `finance.tsx`. Import `MetricCard` from `./dashboard`, formatters from `./formatters`, and CRM types from `@/lib/crm`.

- [ ] **Step 2: Move services view**

Move `ServicesView`, `ServiceForm`, and `serviceToInput` to `services.tsx`. Import `CrmInput` only after it is shared. For this task, either keep a local copy of `CrmInput` in `services.tsx` or create `src/components/crm/form-controls.tsx` with:

```tsx
export function CrmInput({
  label,
  onChange,
  required,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
```

Prefer `form-controls.tsx` because later modules need it.

- [ ] **Step 3: Move availability view**

Move `AvailabilityView` to `availability.tsx`. Import `CrmInput` from `./form-controls`, `getFreeTimes` from `@/lib/client-appointments`, and `getAvailableTimesForDate` from `@/lib/schedule`.

- [ ] **Step 4: Update `crm-app.tsx`**

Import:

```ts
import { AvailabilityView } from "@/components/crm/availability";
import { FinanceView } from "@/components/crm/finance";
import { ServicesView } from "@/components/crm/services";
```

Remove the moved local component definitions from `crm-app.tsx`.

- [ ] **Step 5: Run validation**

Run:

```powershell
npm run lint
npm run build
$env:CRM_TEST_PASSWORD='LaserFix#2026'; npm run test:e2e
```

Expected: all commands pass, including services form, availability, and finance history tests.

- [ ] **Step 6: Commit**

```powershell
git add src\components\crm-app.tsx src\components\crm\finance.tsx src\components\crm\services.tsx src\components\crm\availability.tsx src\components\crm\form-controls.tsx
git commit -m "Extrai modulos de financeiro servicos e disponibilidade"
```

---

### Task 5: Extract Customers And History Modules

**Files:**
- Create: `src/components/crm/customers.tsx`
- Modify: `src/components/crm-app.tsx`
- Test: `tests/e2e/crm.spec.ts`

**Interfaces:**
- Produces:

```ts
export function CustomersView(props: {
  appointments: CrmAppointment[];
  busy: boolean;
  customers: CrmCustomer[];
  onSaveCustomer: (customer: CustomerInput) => Promise<boolean>;
  onUpdateCustomer: (customerId: string, customer: CustomerInput) => Promise<boolean>;
}): React.ReactElement;

export function HistoryView(props: {
  appointments: CrmAppointment[];
  customers: CrmCustomer[];
}): React.ReactElement;
```

- [ ] **Step 1: Move customer helpers and form**

Move `customerToInput`, `getCustomerAppointments`, and `CustomerForm` into `customers.tsx`. Import `CrmInput` from `./form-controls`, `cityOptions` and `emptyCustomer` from `./constants`, and formatters from `./formatters`.

- [ ] **Step 2: Move `CustomersView`**

Move `CustomersView` into `customers.tsx`. Preserve its collapsed card behavior and edit details unchanged.

- [ ] **Step 3: Move `HistoryView`**

Move `HistoryView` into `customers.tsx`. Preserve collapsed history behavior unchanged.

- [ ] **Step 4: Update `crm-app.tsx`**

Import:

```ts
import { CustomersView, HistoryView } from "@/components/crm/customers";
```

Remove moved local definitions.

- [ ] **Step 5: Run validation**

Run:

```powershell
npm run lint
npm run build
$env:CRM_TEST_PASSWORD='LaserFix#2026'; npm run test:e2e
```

Expected: all commands pass, including customer card expansion and edit tests.

- [ ] **Step 6: Commit**

```powershell
git add src\components\crm-app.tsx src\components\crm\customers.tsx
git commit -m "Extrai clientes e historico do CRM"
```

---

### Task 6: Extract Appointments Module

**Files:**
- Create: `src/components/crm/appointments.tsx`
- Modify: `src/components/crm-app.tsx`
- Test: `tests/e2e/crm.spec.ts`

**Interfaces:**
- Produces:

```ts
export function AppointmentsView(props: {
  appointments: CrmAppointment[];
  busyId: string;
  customers: CrmCustomer[];
  onCreateAppointment: (input: ManualAppointmentInput) => Promise<boolean>;
  onCreateCompletedAppointment: (input: CompletedManualAppointmentInput) => Promise<boolean>;
  onCreateStartedAppointment: (input: StartedManualAppointmentInput) => Promise<boolean>;
  onCreateReturn: (appointment: CrmAppointment, input: ReturnAppointmentInput) => Promise<boolean>;
  onComplete: (appointment: CrmAppointment) => void;
  onEditAppointment: (appointmentId: string, values: AppointmentEditInput) => Promise<boolean>;
  onPayment: (appointmentId: string, status: PaymentStatus, scheduledDate?: string) => void;
  onSaveNotes: (appointmentId: string, values: { servicosRealizados?: string; crmObservacoes?: string }) => void;
  onStart: (appointment: CrmAppointment) => void;
  serviceOptions: string[];
}): React.ReactElement;
```

- [ ] **Step 1: Move appointment view and forms**

Move these functions into `appointments.tsx` unchanged:

```ts
AppointmentsView
ManualAppointmentForm
CompletedManualAppointmentForm
AppointmentCard
ReturnAppointmentForm
AppointmentEditForm
parsePerformedServices
formatPerformedServices
```

If any helper names differ in the current source, move the current names exactly.

- [ ] **Step 2: Wire imports**

`appointments.tsx` should import:

```ts
import { getFreeTimes } from "@/lib/client-appointments";
import { getAvailableTimesForDate } from "@/lib/schedule";
import type {
  AppointmentEditInput,
  CompletedManualAppointmentInput,
  CrmAppointment,
  CrmCustomer,
  CustomerInput,
  ManualAppointmentInput,
  PaymentStatus,
  ReturnAppointmentInput,
  StartedManualAppointmentInput,
} from "@/lib/crm";
```

It should also import shared helpers from:

- `./constants`
- `./formatters`
- `./form-controls`
- `./whatsapp`

- [ ] **Step 3: Update `crm-app.tsx`**

Import:

```ts
import { AppointmentsView } from "@/components/crm/appointments";
```

Remove moved local definitions and unused imports from `crm-app.tsx`.

- [ ] **Step 4: Run validation**

Run:

```powershell
npm run lint
npm run build
$env:CRM_TEST_PASSWORD='LaserFix#2026'; npm run test:e2e
```

Expected: all commands pass, including manual appointment, availability, WhatsApp actions, completed grouping, return option, toast, and editable-card tests.

- [ ] **Step 5: Commit**

```powershell
git add src\components\crm-app.tsx src\components\crm\appointments.tsx
git commit -m "Extrai atendimentos do CRM"
```

---

### Task 7: Final Shell Cleanup And Deployment

**Files:**
- Modify: `src/components/crm-app.tsx`
- Modify: `README.md` only if the CRM structure documentation needs to mention the new module folder.
- Test: `tests/e2e/crm.spec.ts`, `tests/e2e/public-site.spec.ts`

**Interfaces:**
- `CrmApp` remains exported from `src/components/crm-app.tsx`.
- `/crm` pages remain unchanged.

- [ ] **Step 1: Remove unused imports and local dead code**

Run:

```powershell
npm run lint
```

For every unused import or variable reported in `crm-app.tsx`, remove it. Do not change behavior.

- [ ] **Step 2: Check shell responsibility**

Confirm `src/components/crm-app.tsx` contains only:

- auth state and login
- realtime listener setup
- seed default services
- notification effects
- toast state/action wrappers
- header/navigation
- view switch

- [ ] **Step 3: Run full validation**

Run:

```powershell
npm run lint
npm run build
$env:CRM_TEST_PASSWORD='LaserFix#2026'; Remove-Item Env:\PLAYWRIGHT_BASE_URL -ErrorAction SilentlyContinue; npm run test:e2e
```

Expected: all commands pass, 34 E2E tests pass.

- [ ] **Step 4: Deploy**

Run:

```powershell
firebase deploy --only hosting --project laser-manutencao-co2-20260618
```

Expected: deploy completes and hosting URL remains `https://laserfix.web.app`.

- [ ] **Step 5: Commit and push**

```powershell
git add src\components\crm-app.tsx src\components\crm README.md
git commit -m "Finaliza modularizacao do CRM"
git push
```

If `README.md` was not changed, omit it from `git add`.

---

## Self-Review

Spec coverage:

- Routes remain unchanged: covered by keeping all `/crm` pages importing `CrmApp`.
- No behavioral change: covered by mechanical extraction and validation after every task.
- Dashboard, appointments, returns, finance, services, customers, availability, notifications, theme, and WhatsApp: each has a dedicated extraction task.
- Public site behavior: covered by full E2E suite before deploy.

Placeholder scan:

- No `TBD`, `TODO`, or deferred implementation language is used.
- Each task has concrete file paths, imports, interfaces, commands, and expected validation.

Type consistency:

- `CrmView`, `DashboardChartKey`, `ChartFormat`, `DashboardChart`, and `CrmTheme` are defined once in Task 1 and reused in later tasks.
- View prop contracts match current `crm-app.tsx` call sites and current CRM domain types from `src/lib/crm.ts`.

