"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  History,
  LogOut,
  Moon,
  Play,
  Plus,
  Save,
  ShieldCheck,
  Sun,
  Users,
  WalletCards,
} from "lucide-react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { getFreeTimes } from "@/lib/client-appointments";
import { AvailabilityView } from "@/components/crm/availability";
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
import { CustomersView, HistoryView } from "@/components/crm/customers";
import { DashboardView } from "@/components/crm/dashboard";
import { CrmInput } from "@/components/crm/form-controls";
import { FinanceView } from "@/components/crm/finance";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDuration,
  getCurrentMonthKey,
  getCurrentTimeValue,
  getPaymentLabel,
  getStatusLabel,
} from "@/components/crm/formatters";
import {
  getAppointmentStartTime,
  readNotificationKeys,
  requestCrmNotificationPermission,
  showCrmNotificationOnce,
} from "@/components/crm/notifications";
import { ServicesView } from "@/components/crm/services";
import { applyCrmTheme, getStoredCrmTheme, toggleStoredCrmTheme } from "@/components/crm/theme";
import type { CrmView, DashboardChartKey } from "@/components/crm/types";
import {
  buildAppointmentConfirmationWhatsAppUrl,
  buildCustomerWhatsAppUrl,
  getCustomerPaymentDebts,
  normalizeWhatsAppNumber,
} from "@/components/crm/whatsapp";
import {
  blockAvailability,
  calculateMetrics,
  completeAppointment,
  createCompletedManualAppointment,
  createManualAppointment,
  createReturnAppointment,
  createStartedManualAppointment,
  getMonthKey,
  listenToAppointments,
  listenToCustomers,
  listenToServices,
  normalizeServiceText,
  saveService,
  saveCustomer,
  seedDefaultServices,
  startAppointment,
  updateAppointmentDetails,
  updateCrmNotes,
  updateCustomer,
  updatePaymentStatus,
  updateService,
  type AppointmentEditInput,
  type CompletedManualAppointmentInput,
  type CrmCustomer,
  type CrmAppointment,
  type CrmService,
  type CustomerInput,
  type ManualAppointmentInput,
  type PaymentStatus,
  type ReturnAppointmentInput,
  type StartedManualAppointmentInput,
} from "@/lib/crm";
import { getAvailableTimesForDate } from "@/lib/schedule";

function useAutoMonthSelection() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthKey);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);

  useEffect(() => {
    function refreshCurrentMonth() {
      const nextMonth = getCurrentMonthKey();
      setCurrentMonth((previousMonth) => {
        if (previousMonth === nextMonth) return previousMonth;
        setSelectedMonth((selected) => (selected === previousMonth ? nextMonth : selected));
        return nextMonth;
      });
    }

    refreshCurrentMonth();
    const timerId = window.setInterval(refreshCurrentMonth, 60_000);
    return () => window.clearInterval(timerId);
  }, []);

  return { currentMonth, selectedMonth, setSelectedMonth };
}

function parsePerformedServices(value: string | string[] = "") {
  return normalizeServiceText(value)
    .split(",")
    .map((service) => service.trim())
    .filter(Boolean);
}

function formatPerformedServices(values: string[]) {
  return values.join(", ");
}

export function CrmApp({ view = "dashboard" }: { view?: CrmView }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<CrmAppointment[]>([]);
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [services, setServices] = useState<CrmService[]>([]);
  const { currentMonth, selectedMonth, setSelectedMonth } = useAutoMonthSelection();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState("");
  const [password, setPassword] = useState("");
  const [activeChartKey, setActiveChartKey] = useState<DashboardChartKey | "">("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default",
  );
  const knownAppointmentIdsRef = useRef<Set<string> | null>(null);
  const reminderTimersRef = useRef<number[]>([]);

  const isAdmin = user?.email ? adminEmails.includes(user.email.toLowerCase()) : false;
  const months = useMemo(() => {
    const monthSet = new Set(appointments.map((appointment) => getMonthKey(appointment.data)).filter(Boolean));
    monthSet.add(currentMonth);
    return Array.from(monthSet).sort().reverse();
  }, [appointments, currentMonth]);
  const monthAppointments = useMemo(
    () => appointments.filter((appointment) => getMonthKey(appointment.data) === selectedMonth),
    [appointments, selectedMonth],
  );
  const monthMetrics = useMemo(() => calculateMetrics(monthAppointments), [monthAppointments]);
  const totalMetrics = useMemo(() => calculateMetrics(appointments), [appointments]);
  const serviceOptions = useMemo(
    () => (services.length ? services.filter((service) => service.ativo).map((service) => service.nome) : performedServiceOptions),
    [services],
  );

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    applyCrmTheme(getStoredCrmTheme());
  }, []);

  useEffect(() => {
    if (!error && !success) return;
    const timerId = window.setTimeout(() => {
      setError("");
      setSuccess("");
    }, 3000);
    return () => window.clearTimeout(timerId);
  }, [error, success]);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribeAppointments = listenToAppointments(
      setAppointments,
      (snapshotError) => {
        setError(snapshotError.message);
      },
    );
    const unsubscribeCustomers = listenToCustomers(
      setCustomers,
      (snapshotError) => {
        setError(snapshotError.message);
      },
    );
    const unsubscribeServices = listenToServices(
      setServices,
      (snapshotError) => {
        setError(snapshotError.message);
      },
    );

    return () => {
      unsubscribeAppointments();
      unsubscribeCustomers();
      unsubscribeServices();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || services.length) return;
    void seedDefaultServices(defaultServiceCatalog).catch((seedError) => {
      setError(seedError instanceof Error ? seedError.message : "Não foi possível preparar o catálogo de serviços.");
    });
  }, [isAdmin, services.length]);

  useEffect(() => {
    if (!isAdmin || notificationPermission !== "default") return;
    if (navigator.webdriver) return;

    async function requestOnNextInteraction() {
      const permission = await requestCrmNotificationPermission();
      setNotificationPermission(permission);
    }

    window.addEventListener("pointerdown", requestOnNextInteraction, { once: true });
    window.addEventListener("keydown", requestOnNextInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", requestOnNextInteraction);
      window.removeEventListener("keydown", requestOnNextInteraction);
    };
  }, [isAdmin, notificationPermission]);

  useEffect(() => {
    if (!isAdmin || notificationPermission !== "granted") {
      knownAppointmentIdsRef.current = null;
      return;
    }

    const currentIds = new Set(appointments.map((appointment) => appointment.id));

    if (!knownAppointmentIdsRef.current) {
      knownAppointmentIdsRef.current = currentIds;
      return;
    }

    const previousIds = knownAppointmentIdsRef.current;
    const newAppointments = appointments.filter((appointment) => !previousIds.has(appointment.id));
    knownAppointmentIdsRef.current = currentIds;

    newAppointments
      .filter((appointment) => appointment.status === "agendado")
      .forEach((appointment) => {
        void showCrmNotificationOnce(
          "laserfix-crm-new-notifications",
          appointment.id,
          "Novo agendamento LaserFix",
          `${appointment.nome} agendou ${formatDate(appointment.data)} às ${appointment.horario}.`,
          `new-appointment-${appointment.id}`,
        );
      });
  }, [appointments, isAdmin, notificationPermission]);

  useEffect(() => {
    reminderTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    reminderTimersRef.current = [];

    if (!isAdmin || notificationPermission !== "granted") return;

    const now = Date.now();
    const notifiedReminders = readNotificationKeys("laserfix-crm-reminders");

    appointments
      .filter((appointment) => appointment.status !== "concluido")
      .forEach((appointment) => {
        const reminderKey = `${appointment.id}-30`;
        if (notifiedReminders.has(reminderKey)) return;

        const reminderTime = getAppointmentStartTime(appointment) - 30 * 60 * 1000;
        const appointmentStartTime = getAppointmentStartTime(appointment);
        const delay = reminderTime - now;

        if (delay <= 0 && now <= appointmentStartTime) {
          void showCrmNotificationOnce(
            "laserfix-crm-reminders",
            reminderKey,
            "Atendimento em 30 minutos",
            `${appointment.nome} está agendado para ${appointment.horario} em ${appointment.cidade}.`,
            `appointment-reminder-${appointment.id}`,
          );
          return;
        }

        if (delay > 2147483647 || now > appointmentStartTime) return;

        const timerId = window.setTimeout(() => {
          void showCrmNotificationOnce(
            "laserfix-crm-reminders",
            reminderKey,
            "Atendimento em 30 minutos",
            `${appointment.nome} está agendado para ${appointment.horario} em ${appointment.cidade}.`,
            `appointment-reminder-${appointment.id}`,
          );
        }, delay);

        reminderTimersRef.current.push(timerId);
      });

    return () => {
      reminderTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      reminderTimersRef.current = [];
    };
  }, [appointments, isAdmin, notificationPermission]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, crmLoginEmail, password);
      const email = result.user.email?.toLowerCase();

      if (!email || !adminEmails.includes(email)) {
        await signOut(auth);
        setError("Este e-mail não tem acesso ao CRM.");
      }
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Não foi possível entrar no CRM.";
      setError(
        message.includes("operation-not-allowed") || message.includes("configuration-not-found")
          ? "Login por senha ainda não está ativo no Firebase Authentication."
          : "Nome ou senha inválidos.",
      );
    }
  }

  async function runAction(appointmentId: string, action: () => Promise<string | void>) {
    setBusyId(appointmentId);
    setError("");
    setSuccess("");
    try {
      const message = await action();
      if (message) setSuccess(message);
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar o atendimento.");
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function runGlobalAction(action: () => Promise<string | void>) {
    setBusyId("global");
    setError("");
    setSuccess("");
    try {
      const message = await action();
      if (message) setSuccess(message);
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível salvar os dados.");
      return false;
    } finally {
      setBusyId("");
    }
  }

  if (!authReady) {
    return <main className="crm-shell"><p className="crm-loading">Carregando CRM...</p></main>;
  }

  if (!user || !isAdmin) {
    return (
      <main className="crm-shell crm-login-shell">
        <section className="crm-login-card">
          <Image src="/logo-laserfix-light.jpg" alt="LaserFix" width={360} height={203} priority />
          <div className="crm-login-title">
            <h1>LaserFix</h1>
          </div>
          {error && <p className="crm-error">{error}</p>}
          <form className="crm-login-form" onSubmit={login}>
            <label>
              <span>Nome</span>
              <input autoComplete="username" readOnly value={crmLoginName} />
            </label>
            <label>
              <span>Senha</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                type="password"
                value={password}
              />
            </label>
            <button className="crm-primary-button" type="submit">
              <ShieldCheck aria-hidden="true" />
              Entrar
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="crm-shell">
      <header className="crm-header">
        <div className="crm-header-content">
          <div className="crm-topbar">
            <div className="crm-topbar-side">
              {view !== "dashboard" && (
                <Link aria-label="Voltar para o início" className="crm-secondary-button crm-icon-button" href="/crm">
                  <ArrowLeft aria-hidden="true" />
                </Link>
              )}
            </div>
            <p className="crm-kicker">LaserFix</p>
            <div className="crm-topbar-side crm-header-actions">
              {view === "dashboard" && (
                <button
                  aria-label="Alternar tema do CRM"
                  className="crm-secondary-button crm-icon-button crm-theme-button"
                  onClick={toggleStoredCrmTheme}
                  title="Alternar tema do CRM"
                  type="button"
                >
                  <Moon aria-hidden="true" className="crm-theme-icon-dark" />
                  <Sun aria-hidden="true" className="crm-theme-icon-light" />
                </button>
              )}
              <button
                aria-label="Sair"
                className="crm-secondary-button crm-icon-button crm-logout-button"
                onClick={() => signOut(auth)}
                type="button"
              >
                <LogOut aria-hidden="true" />
              </button>
            </div>
          </div>
            <h1>
              {view === "appointments"
                ? "Atendimentos"
              : view === "customers"
                ? "Clientes"
                : view === "history"
                  ? "Histórico"
                  : view === "services"
                    ? "Serviços"
                    : view === "finance"
                      ? "Financeiro"
                      : view === "availability"
                        ? "Disponibilidade"
                        : "Início"}
          </h1>
        </div>
      </header>

      <section className="crm-home-actions crm-module-nav" aria-label="Navegação principal do CRM">
        <Link aria-current={view === "appointments" ? "page" : undefined} href="/crm/agendamentos">
          <CalendarClock aria-hidden="true" />
          Atendimentos
        </Link>
        <Link aria-current={view === "customers" ? "page" : undefined} href="/crm/clientes">
          <Users aria-hidden="true" />
          Cadastro de clientes
        </Link>
        <Link aria-current={view === "history" ? "page" : undefined} href="/crm/historico">
          <History aria-hidden="true" />
          Histórico dos clientes
        </Link>
        <Link aria-current={view === "services" ? "page" : undefined} href="/crm/servicos">
          <Save aria-hidden="true" />
          Serviços e valores
        </Link>
        <Link aria-current={view === "finance" ? "page" : undefined} href="/crm/financeiro">
          <WalletCards aria-hidden="true" />
          Financeiro
        </Link>
        <Link aria-current={view === "availability" ? "page" : undefined} href="/crm/disponibilidade">
          <ShieldCheck aria-hidden="true" />
          Disponibilidade
        </Link>
      </section>

      {(error || success) && (
        <div className="crm-toast-layer">
          <div
            className={`crm-toast ${error ? "crm-toast-error" : "crm-toast-success"}`}
            role={error ? "alert" : "status"}
          >
            {error || success}
          </div>
        </div>
      )}

      {view === "customers" && (
        <CustomersView
          appointments={appointments}
          busy={busyId === "global"}
          customers={customers}
          onSaveCustomer={(customer) => runGlobalAction(async () => {
            await saveCustomer(customer);
            return "Cliente salvo no cadastro.";
          })}
          onUpdateCustomer={(customerId, customer) => runGlobalAction(async () => {
            await updateCustomer(customerId, customer);
            return "Cliente atualizado.";
          })}
        />
      )}

      {view === "history" && <HistoryView appointments={appointments} customers={customers} />}

      {view === "services" && (
        <ServicesView
          busy={busyId === "global"}
          services={services}
          onSaveService={(service) => runGlobalAction(async () => {
            await saveService(service);
            return "Serviço salvo no catálogo.";
          })}
          onUpdateService={(serviceId, service) => runGlobalAction(async () => {
            await updateService(serviceId, service);
            return "Serviço atualizado.";
          })}
        />
      )}

      {view === "finance" && <FinanceView appointments={appointments} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} months={months} />}

      {view === "availability" && (
        <AvailabilityView
          appointments={appointments}
          busy={busyId === "global"}
          onBlock={(input) => runGlobalAction(async () => {
            await blockAvailability(input);
            return "Horário bloqueado e indisponível no site.";
          })}
        />
      )}

      {view === "dashboard" && (
        <DashboardView
          activeChartKey={activeChartKey}
          appointments={appointments}
          monthAppointments={monthAppointments}
          monthMetrics={monthMetrics}
          months={months}
          onMonthChange={setSelectedMonth}
          onToggleChart={setActiveChartKey}
          selectedMonth={selectedMonth}
          totalMetrics={totalMetrics}
        />
      )}

      {view === "appointments" && (
        <AppointmentsView
          appointments={appointments}
          busyId={busyId}
          customers={customers}
          onCreateAppointment={(input) => runGlobalAction(async () => {
            await createManualAppointment(input);
            return "Agendamento manual criado e horário bloqueado.";
          })}
          onCreateCompletedAppointment={(input) => runGlobalAction(async () => {
            await createCompletedManualAppointment(input);
            return "Atendimento avulso registrado.";
          })}
          onCreateStartedAppointment={(input) => runGlobalAction(async () => {
            await createStartedManualAppointment(input);
            return "Atendimento avulso iniciado.";
          })}
          onCreateReturn={(appointment, input) => runAction(appointment.id, async () => {
            await createReturnAppointment(appointment, input);
            return "Retorno agendado sem cobrança.";
          })}
          onComplete={(appointment) => runAction(appointment.id, () => completeAppointment(appointment))}
          onEditAppointment={(appointmentId, values) => runAction(appointmentId, async () => {
            await updateAppointmentDetails(appointmentId, values);
            return "Atendimento atualizado.";
          })}
          onPayment={(appointmentId, status, date) => runAction(appointmentId, () => updatePaymentStatus(appointmentId, status, date))}
          onSaveNotes={(appointmentId, values) => runAction(appointmentId, async () => {
            await updateCrmNotes(appointmentId, values);
            return "Atendimento atualizado.";
          })}
          onStart={(appointment) => runAction(appointment.id, () => startAppointment(appointment))}
          serviceOptions={serviceOptions}
        />
      )}
    </main>
  );
}

function AppointmentsView({
  appointments,
  busyId,
  customers,
  onCreateAppointment,
  onCreateCompletedAppointment,
  onCreateStartedAppointment,
  onCreateReturn,
  onComplete,
  onEditAppointment,
  onPayment,
  onSaveNotes,
  onStart,
  serviceOptions,
}: {
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
}) {
  const [openAppointmentId, setOpenAppointmentId] = useState("");
  const { currentMonth, selectedMonth, setSelectedMonth } = useAutoMonthSelection();
  const months = useMemo(() => {
    const monthSet = new Set(appointments.map((appointment) => getMonthKey(appointment.data)).filter(Boolean));
    monthSet.add(currentMonth);
    return Array.from(monthSet).sort().reverse();
  }, [appointments, currentMonth]);
  const monthAppointments = useMemo(
    () => appointments.filter((appointment) => getMonthKey(appointment.data) === selectedMonth),
    [appointments, selectedMonth],
  );
  const scheduledAppointments = useMemo(
    () => monthAppointments.filter((appointment) => appointment.status !== "concluido"),
    [monthAppointments],
  );
  const completedAppointments = useMemo(
    () => monthAppointments.filter((appointment) => appointment.status === "concluido"),
    [monthAppointments],
  );

  return (
    <>
      <section className="crm-toolbar">
        <label>
          <span>Mês</span>
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {months.map((month) => (
              <option key={month} value={month}>
                {monthFormatter.format(new Date(`${month}-01T12:00:00`))}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="crm-page-grid">
        <details className="crm-panel crm-wide-panel crm-form-details">
          <summary>
            <div className="crm-section-title">
              <h2>Agendamento manual</h2>
              <span>Por fora do site</span>
            </div>
          </summary>
          <ManualAppointmentForm
            appointments={appointments}
            busy={busyId === "global"}
            customers={customers}
            onCreate={onCreateAppointment}
            serviceOptions={serviceOptions}
          />
        </details>
        <details className="crm-panel crm-wide-panel crm-form-details">
          <summary>
            <div className="crm-section-title">
              <h2>Atendimento avulso</h2>
              <span>Já realizado</span>
            </div>
          </summary>
          <CompletedManualAppointmentForm
            appointments={appointments}
            busy={busyId === "global"}
            customers={customers}
            onCreate={onCreateCompletedAppointment}
            onStart={onCreateStartedAppointment}
            serviceOptions={serviceOptions}
          />
        </details>
      </section>

      <section className="crm-appointments">
        <div className="crm-section-title">
          <h2>Atendimentos</h2>
          <span>{monthAppointments.length} registro(s)</span>
        </div>

        <div className="crm-section-title crm-subsection-title">
          <h2>Agendados</h2>
          <span>{scheduledAppointments.length} atendimento(s)</span>
        </div>
        <div className="crm-list crm-appointment-list">
          {scheduledAppointments.map((appointment) => (
            <AppointmentCard
              allAppointments={appointments}
              appointment={appointment}
              busy={busyId === appointment.id}
              isOpen={openAppointmentId === appointment.id}
              key={appointment.id}
              onComplete={() => onComplete(appointment)}
              onCreateReturn={(input) => onCreateReturn(appointment, input)}
              onEdit={(values) => onEditAppointment(appointment.id, values)}
              onPayment={(status, date) => onPayment(appointment.id, status, date)}
              onSaveNotes={(values) => onSaveNotes(appointment.id, values)}
              onStart={() => onStart(appointment)}
              onToggle={() => setOpenAppointmentId((currentId) => (currentId === appointment.id ? "" : appointment.id))}
              serviceOptions={serviceOptions}
            />
          ))}
          {!scheduledAppointments.length && <p className="crm-empty">Nenhum atendimento agendado para o mês selecionado.</p>}
        </div>

        <details className="crm-completed-details">
          <summary>
            <div className="crm-section-title crm-subsection-title">
              <h2>Concluídos</h2>
              <span>{completedAppointments.length} atendimento(s)</span>
            </div>
          </summary>
          <div className="crm-list crm-appointment-list">
            {completedAppointments.map((appointment) => (
              <AppointmentCard
                allAppointments={appointments}
                appointment={appointment}
                busy={busyId === appointment.id}
                isOpen={openAppointmentId === appointment.id}
                key={appointment.id}
                onComplete={() => onComplete(appointment)}
                onCreateReturn={(input) => onCreateReturn(appointment, input)}
                onEdit={(values) => onEditAppointment(appointment.id, values)}
                onPayment={(status, date) => onPayment(appointment.id, status, date)}
                onSaveNotes={(values) => onSaveNotes(appointment.id, values)}
                onStart={() => onStart(appointment)}
                onToggle={() => setOpenAppointmentId((currentId) => (currentId === appointment.id ? "" : appointment.id))}
                serviceOptions={serviceOptions}
              />
            ))}
            {!completedAppointments.length && <p className="crm-empty">Nenhum atendimento concluído para o mês selecionado.</p>}
          </div>
        </details>
      </section>
    </>
  );
}

function ManualAppointmentForm({
  appointments,
  busy,
  customers,
  onCreate,
  serviceOptions,
}: {
  appointments: CrmAppointment[];
  busy: boolean;
  customers: CrmCustomer[];
  onCreate: (input: ManualAppointmentInput) => Promise<boolean>;
  serviceOptions: string[];
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState<CustomerInput>(emptyCustomer);
  const [appointment, setAppointment] = useState({
    servico: serviceOptions[0] || performedServiceOptions[0],
    data: new Date().toISOString().slice(0, 10),
    horario: "",
    observacoes: "",
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || customers[0];
  const effectiveMode = customers.length ? mode : "new";

  useEffect(() => {
    let active = true;
    const data = appointment.data;

    async function loadAvailableTimes() {
      try {
        const freeTimes = await getFreeTimes(data);
        if (!active) return;
        setAvailableTimes(freeTimes);
        setAppointment((current) => ({
          ...current,
          horario: freeTimes.includes(current.horario) ? current.horario : freeTimes[0] || "",
        }));
      } catch {
        const occupiedTimes = new Set(
          appointments
            .filter((currentAppointment) => currentAppointment.data === data && currentAppointment.status !== "concluido")
            .map((currentAppointment) => currentAppointment.horario),
        );
        const fallbackTimes = getAvailableTimesForDate(data).filter((time) => !occupiedTimes.has(time));
        if (!active) return;
        setAvailableTimes(fallbackTimes);
        setAppointment((current) => ({
          ...current,
          horario: fallbackTimes.includes(current.horario) ? current.horario : fallbackTimes[0] || "",
        }));
      }
    }

    void loadAvailableTimes();

    return () => {
      active = false;
    };
  }, [appointment.data, appointments]);

  function updateNewCustomer(field: keyof CustomerInput, value: string) {
    setNewCustomer((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!appointment.horario) return;

    const customer = effectiveMode === "existing" && selectedCustomer ? selectedCustomer : newCustomer;
    const created = await onCreate({
      clienteId: effectiveMode === "existing" ? selectedCustomer?.id : undefined,
      cliente: {
        nome: customer.nome,
        telefone: customer.telefone || "",
        whatsapp: customer.whatsapp || customer.telefone || "",
        empresa: customer.empresa || "",
        rua: customer.rua || "Não informado",
        numero: customer.numero || "S/N",
        bairro: customer.bairro || "Não informado",
        cidade: customer.cidade || "Guaratinguetá",
        modeloMaquina: customer.modeloMaquina || "",
        observacoes: customer.observacoes || "",
      },
      ...appointment,
    });

    if (!created) return;

    setNewCustomer(emptyCustomer);
    setSelectedCustomerId("");
    setMode(customers.length ? "existing" : "new");
    setAppointment({
      servico: serviceOptions[0] || performedServiceOptions[0],
      data: new Date().toISOString().slice(0, 10),
      horario: "",
      observacoes: "",
    });
  }

  return (
    <form className="crm-form-grid" onSubmit={submit}>
      <label className="crm-form-wide">
        <span>Cliente</span>
        <select value={effectiveMode} onChange={(event) => setMode(event.target.value as "existing" | "new")}>
          <option value="existing" disabled={!customers.length}>Selecionar cliente cadastrado</option>
          <option value="new">Cadastrar cliente neste agendamento</option>
        </select>
      </label>

      {effectiveMode === "existing" && customers.length ? (
        <label className="crm-form-wide">
          <span>Cliente cadastrado</span>
          <select value={selectedCustomerId || customers[0]?.id || ""} onChange={(event) => setSelectedCustomerId(event.target.value)}>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.nome} · {customer.cidade}</option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <CrmInput label="Nome" value={newCustomer.nome} onChange={(value) => updateNewCustomer("nome", value)} />
          <CrmInput label="WhatsApp" value={newCustomer.whatsapp} onChange={(value) => updateNewCustomer("whatsapp", value)} />
          <CrmInput label="Telefone" value={newCustomer.telefone} onChange={(value) => updateNewCustomer("telefone", value)} />
          <CrmInput label="Empresa" value={newCustomer.empresa || ""} onChange={(value) => updateNewCustomer("empresa", value)} />
          <CrmInput label="Rua" value={newCustomer.rua} onChange={(value) => updateNewCustomer("rua", value)} />
          <CrmInput label="Número" value={newCustomer.numero} onChange={(value) => updateNewCustomer("numero", value)} />
          <CrmInput label="Bairro" value={newCustomer.bairro} onChange={(value) => updateNewCustomer("bairro", value)} />
          <label>
            <span>Cidade</span>
            <select value={newCustomer.cidade} onChange={(event) => updateNewCustomer("cidade", event.target.value)}>
              {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
        </>
      )}

      <label>
        <span>Serviço</span>
        <select value={appointment.servico} onChange={(event) => setAppointment((current) => ({ ...current, servico: event.target.value }))}>
          {serviceOptions.map((service) => <option key={service} value={service}>{service}</option>)}
        </select>
      </label>
      <CrmInput label="Data" required type="date" value={appointment.data} onChange={(value) => setAppointment((current) => ({ ...current, data: value }))} />
      <label>
        <span>Horário</span>
        <select value={appointment.horario} onChange={(event) => setAppointment((current) => ({ ...current, horario: event.target.value }))}>
          {!availableTimes.length && <option value="">Nenhum horário livre</option>}
          {availableTimes.map((time) => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
      </label>
      <label className="crm-form-wide">
        <span>Observações</span>
        <textarea value={appointment.observacoes} onChange={(event) => setAppointment((current) => ({ ...current, observacoes: event.target.value }))} />
      </label>
      <button className="crm-primary-button crm-form-wide" disabled={busy || !appointment.horario} type="submit">
        <Plus aria-hidden="true" />
        Criar agendamento
      </button>
    </form>
  );
}

function CompletedManualAppointmentForm({
  appointments,
  busy,
  customers,
  onCreate,
  onStart,
  serviceOptions,
}: {
  appointments: CrmAppointment[];
  busy: boolean;
  customers: CrmCustomer[];
  onCreate: (input: CompletedManualAppointmentInput) => Promise<boolean>;
  onStart: (input: StartedManualAppointmentInput) => Promise<boolean>;
  serviceOptions: string[];
}) {
  const defaultService = serviceOptions[0] || performedServiceOptions[0];
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState<CustomerInput>(emptyCustomer);
  const [selectedServices, setSelectedServices] = useState<string[]>([defaultService]);
  const [appointment, setAppointment] = useState({
    data: new Date().toISOString().slice(0, 10),
    horario: getCurrentTimeValue(),
    observacoes: "",
    deslocamentoValor: 0,
    pagamentoAgendadoPara: "",
    pagamentoStatus: "pendente" as PaymentStatus,
    tempoAtendimentoMin: 60,
    valorServico: 100,
    valorTotal: 100,
  });

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || customers[0];
  const effectiveMode = customers.length ? mode : "new";
  const serviceName = selectedServices[0] || defaultService;

  function updateNewCustomer(field: keyof CustomerInput, value: string) {
    setNewCustomer((current) => ({ ...current, [field]: value }));
  }

  function updateAppointment(field: keyof typeof appointment, value: string) {
    setAppointment((current) => {
      const next = {
        ...current,
        [field]:
          field === "deslocamentoValor" || field === "tempoAtendimentoMin" || field === "valorServico" || field === "valorTotal"
            ? Number(value)
            : value,
      };

      if (field === "deslocamentoValor" || field === "valorServico") {
        next.valorTotal = (Number(next.valorServico) || 0) + (Number(next.deslocamentoValor) || 0);
      }

      return next;
    });
  }

  function toggleService(service: string) {
    setSelectedServices((currentServices) =>
      currentServices.includes(service)
        ? currentServices.filter((currentService) => currentService !== service)
        : [...currentServices, service],
    );
  }

  function getNormalizedCustomer() {
    const customer = effectiveMode === "existing" && selectedCustomer ? selectedCustomer : newCustomer;
    return {
      nome: customer.nome,
      telefone: customer.telefone || "",
      whatsapp: customer.whatsapp || customer.telefone || "",
      empresa: customer.empresa || "",
      rua: customer.rua || "Não informado",
      numero: customer.numero || "S/N",
      bairro: customer.bairro || "Não informado",
      cidade: customer.cidade || "Guaratinguetá",
      modeloMaquina: customer.modeloMaquina || "",
      observacoes: customer.observacoes || "",
    };
  }

  function resetForm() {
    setNewCustomer(emptyCustomer);
    setSelectedCustomerId("");
    setMode(customers.length ? "existing" : "new");
    setSelectedServices([defaultService]);
    setAppointment({
      data: new Date().toISOString().slice(0, 10),
      horario: getCurrentTimeValue(),
      observacoes: "",
      deslocamentoValor: 0,
      pagamentoAgendadoPara: "",
      pagamentoStatus: "pendente",
      tempoAtendimentoMin: 60,
      valorServico: 100,
      valorTotal: 100,
    });
  }

  async function startWalkInAppointment() {
    const normalizedCustomer = getNormalizedCustomer();
    const servicesDone = formatPerformedServices(selectedServices) || serviceName;
    const started = await onStart({
      clienteId: effectiveMode === "existing" ? selectedCustomer?.id : undefined,
      cliente: normalizedCustomer,
      data: appointment.data,
      horario: appointment.horario,
      observacoes: appointment.observacoes,
      servico: serviceName,
      servicosRealizados: servicesDone,
    });

    if (started) resetForm();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCustomer = getNormalizedCustomer();
    const servicesDone = formatPerformedServices(selectedServices) || serviceName;
    const previewAppointment: CrmAppointment = {
      id: "atendimento-avulso-preview",
      clienteId: effectiveMode === "existing" ? selectedCustomer?.id : undefined,
      ...normalizedCustomer,
      data: appointment.data,
      deslocamentoValor: appointment.deslocamentoValor,
      horario: appointment.horario,
      observacoes: appointment.observacoes,
      pagamentoAgendadoPara: appointment.pagamentoAgendadoPara,
      pagamentoStatus: appointment.pagamentoStatus,
      servico: serviceName,
      servicosRealizados: servicesDone,
      status: "concluido",
      tempoAtendimentoMin: appointment.tempoAtendimentoMin,
      valorServico: appointment.valorServico,
      valorTotal: appointment.valorTotal,
    };
    const created = await onCreate({
      clienteId: effectiveMode === "existing" ? selectedCustomer?.id : undefined,
      cliente: normalizedCustomer,
      data: appointment.data,
      deslocamentoValor: appointment.deslocamentoValor,
      horario: appointment.horario,
      observacoes: appointment.observacoes,
      pagamentoAgendadoPara: appointment.pagamentoAgendadoPara,
      pagamentoStatus: appointment.pagamentoStatus,
      servico: serviceName,
      servicosRealizados: servicesDone,
      tempoAtendimentoMin: appointment.tempoAtendimentoMin,
      valorServico: appointment.valorServico,
      valorTotal: appointment.valorTotal,
    });

    if (!created) return;

    const pendingPayments = getCustomerPaymentDebts(previewAppointment, appointments);
    const whatsappUrl = buildCustomerWhatsAppUrl(previewAppointment, servicesDone, pendingPayments);
    if (normalizeWhatsAppNumber(normalizedCustomer.whatsapp)) {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }

    resetForm();
  }

  return (
    <form className="crm-form-grid" onSubmit={submit}>
      <label className="crm-form-wide">
        <span>Cliente</span>
        <select value={effectiveMode} onChange={(event) => setMode(event.target.value as "existing" | "new")}>
          <option value="existing" disabled={!customers.length}>Selecionar cliente cadastrado</option>
          <option value="new">Identificar novo cliente</option>
        </select>
      </label>

      {effectiveMode === "existing" && customers.length ? (
        <label className="crm-form-wide">
          <span>Cliente cadastrado</span>
          <select value={selectedCustomerId || customers[0]?.id || ""} onChange={(event) => setSelectedCustomerId(event.target.value)}>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.nome} · {customer.cidade}</option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <CrmInput label="Nome" value={newCustomer.nome} onChange={(value) => updateNewCustomer("nome", value)} />
          <CrmInput label="WhatsApp" value={newCustomer.whatsapp} onChange={(value) => updateNewCustomer("whatsapp", value)} />
          <CrmInput label="Telefone" value={newCustomer.telefone} onChange={(value) => updateNewCustomer("telefone", value)} />
          <CrmInput label="Empresa" value={newCustomer.empresa || ""} onChange={(value) => updateNewCustomer("empresa", value)} />
          <CrmInput label="Rua" value={newCustomer.rua} onChange={(value) => updateNewCustomer("rua", value)} />
          <CrmInput label="Número" value={newCustomer.numero} onChange={(value) => updateNewCustomer("numero", value)} />
          <CrmInput label="Bairro" value={newCustomer.bairro} onChange={(value) => updateNewCustomer("bairro", value)} />
          <label>
            <span>Cidade</span>
            <select value={newCustomer.cidade} onChange={(event) => updateNewCustomer("cidade", event.target.value)}>
              {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
        </>
      )}

      <CrmInput label="Data" required type="date" value={appointment.data} onChange={(value) => updateAppointment("data", value)} />
      <CrmInput label="Horário aproximado" required type="time" value={appointment.horario} onChange={(value) => updateAppointment("horario", value)} />
      <CrmInput label="Tempo em minutos" required type="number" value={String(appointment.tempoAtendimentoMin)} onChange={(value) => updateAppointment("tempoAtendimentoMin", value)} />
      <CrmInput label="Valor do serviço" required type="number" value={String(appointment.valorServico)} onChange={(value) => updateAppointment("valorServico", value)} />
      <CrmInput label="Deslocamento" type="number" value={String(appointment.deslocamentoValor)} onChange={(value) => updateAppointment("deslocamentoValor", value)} />
      <CrmInput label="Valor total" required type="number" value={String(appointment.valorTotal)} onChange={(value) => updateAppointment("valorTotal", value)} />
      <label>
        <span>Pagamento</span>
        <select value={appointment.pagamentoStatus} onChange={(event) => updateAppointment("pagamentoStatus", event.target.value)}>
          <option value="pendente">Pendente</option>
          <option value="recebido">Recebido</option>
          <option value="agendado">Pagamento agendado</option>
        </select>
      </label>
      {appointment.pagamentoStatus === "agendado" && (
        <CrmInput
          label="Data do pagamento"
          type="date"
          value={appointment.pagamentoAgendadoPara}
          onChange={(value) => updateAppointment("pagamentoAgendadoPara", value)}
        />
      )}

      <div className="crm-form-wide crm-service-options crm-inline-service-options">
        <span>Serviços realizados</span>
        {serviceOptions.map((service) => (
          <label key={service}>
            <input checked={selectedServices.includes(service)} onChange={() => toggleService(service)} type="checkbox" />
            <span>{service}</span>
          </label>
        ))}
      </div>

      <label className="crm-form-wide">
        <span>Observações</span>
        <textarea value={appointment.observacoes} onChange={(event) => updateAppointment("observacoes", event.target.value)} />
      </label>
      <button className="crm-secondary-button crm-form-wide" disabled={busy || !appointment.data || !appointment.horario} onClick={startWalkInAppointment} type="button">
        <Play aria-hidden="true" />
        Iniciar atendimento avulso
      </button>
      <button className="crm-primary-button crm-form-wide" disabled={busy || !appointment.data || !appointment.horario} type="submit">
        <CheckCircle2 aria-hidden="true" />
        Registrar atendimento concluído
      </button>
    </form>
  );
}

function AppointmentCard({
  allAppointments,
  appointment,
  busy,
  isOpen,
  onComplete,
  onCreateReturn,
  onEdit,
  onPayment,
  onSaveNotes,
  onStart,
  onToggle,
  serviceOptions,
}: {
  allAppointments: CrmAppointment[];
  appointment: CrmAppointment;
  busy: boolean;
  isOpen: boolean;
  onComplete: () => void;
  onCreateReturn: (input: ReturnAppointmentInput) => Promise<boolean>;
  onEdit: (values: AppointmentEditInput) => Promise<boolean>;
  onPayment: (status: PaymentStatus, scheduledDate?: string) => void;
  onSaveNotes: (values: { servicosRealizados?: string; crmObservacoes?: string }) => void;
  onStart: () => void;
  onToggle: () => void;
  serviceOptions: string[];
}) {
  const [paymentDate, setPaymentDate] = useState(appointment.pagamentoAgendadoPara || "");
  const [selectedServices, setSelectedServices] = useState<string[]>(() => parsePerformedServices(appointment.servicosRealizados));
  const [notes, setNotes] = useState(appointment.crmObservacoes || "");
  const [servicesOpen, setServicesOpen] = useState(false);
  const address = `${appointment.rua}, ${appointment.numero} - ${appointment.bairro}, ${appointment.cidade}`;
  const servicesDone = formatPerformedServices(selectedServices);
  const pendingPayments = getCustomerPaymentDebts(appointment, allAppointments);
  const appointmentConfirmationUrl = buildAppointmentConfirmationWhatsAppUrl(appointment);
  const customerPaymentUrl = buildCustomerWhatsAppUrl(appointment, servicesDone, pendingPayments);
  const isFreeReturn = appointment.retornoSemCobranca === true;

  function toggleService(service: string) {
    setSelectedServices((currentServices) =>
      currentServices.includes(service)
        ? currentServices.filter((currentService) => currentService !== service)
        : [...currentServices, service],
    );
  }

  function saveServicesAndClose() {
    onSaveNotes({ servicosRealizados: servicesDone, crmObservacoes: notes });
    setServicesOpen(false);
  }

  return (
    <article className={`crm-appointment-card crm-appointment-accordion ${isOpen ? "crm-appointment-open" : ""}`}>
      <button aria-expanded={isOpen} className="crm-appointment-summary" onClick={onToggle} type="button">
        <div>
          <div className="crm-card-heading">
            <h3>{appointment.nome}</h3>
            <span className={`crm-status crm-status-${appointment.status}`}>{getStatusLabel(appointment.status)}</span>
          </div>
          <p className="crm-muted">{appointment.empresa || "Sem empresa informada"}</p>
          <p>{formatDate(appointment.data)} às {appointment.horario}</p>
          <p>{appointment.cidade} · {appointment.servico}</p>
        </div>
        <strong>{isOpen ? "Recolher" : "Expandir"}</strong>
      </button>

      {isOpen && (
        <>
          <div className="crm-appointment-main">
            <div>
              <p>{address}</p>
              <p>WhatsApp: {appointment.whatsapp}</p>
              {appointment.modeloMaquina && <p>Máquina: {appointment.modeloMaquina}</p>}
              <p>Serviço solicitado: {appointment.servico}</p>
              {isFreeReturn && <p className="crm-return-note">Retorno técnico sem cobrança.</p>}
              {appointment.observacoes && <p>Observações do cliente: {appointment.observacoes}</p>}
            </div>

            <div className="crm-values">
              <span>Deslocamento: {formatCurrency(appointment.deslocamentoValor || 0)}</span>
              <span>Serviço: {formatCurrency(appointment.valorServico || 0)}</span>
              <strong>Total: {formatCurrency(appointment.valorTotal || 0)}</strong>
              <span>Tempo: {formatDuration(appointment.tempoAtendimentoMin || 0)}</span>
              <span>Pagamento: {getPaymentLabel(appointment.pagamentoStatus)}</span>
              {appointment.pagamentoAgendadoPara && <span>Data pagamento: {formatDate(appointment.pagamentoAgendadoPara)}</span>}
            </div>
          </div>

          <div className="crm-timeline">
            <span>Início: {formatDateTime(appointment.atendimentoIniciadoAtIso)}</span>
            <span>Conclusão: {formatDateTime(appointment.atendimentoConcluidoAtIso)}</span>
          </div>

          <details className="crm-edit-details">
            <summary>Editar atendimento</summary>
            <AppointmentEditForm appointment={appointment} busy={busy} onSave={onEdit} serviceOptions={serviceOptions} />
          </details>

          {appointment.status === "concluido" && (
            <details className="crm-edit-details">
              <summary>Retorno sem cobrança</summary>
              <ReturnAppointmentForm
                allAppointments={allAppointments}
                appointment={appointment}
                busy={busy}
                onCreate={onCreateReturn}
              />
            </details>
          )}

          <div className="crm-edit-grid">
            <div className="crm-service-picker">
              <button
                aria-expanded={servicesOpen}
                className="crm-service-toggle"
                onClick={() => setServicesOpen((open) => !open)}
                type="button"
              >
                <span>Serviços realizados</span>
                <strong>{selectedServices.length ? `${selectedServices.length} selecionado(s)` : "Selecionar"}</strong>
              </button>
              {servicesOpen && (
                <div className="crm-service-options">
                  {serviceOptions.map((service) => (
                    <label key={service}>
                      <input
                        checked={selectedServices.includes(service)}
                        onChange={() => toggleService(service)}
                        type="checkbox"
                      />
                      <span>{service}</span>
                    </label>
                  ))}
                  <button className="crm-save-services" disabled={busy} onClick={saveServicesAndClose} type="button">
                    <Save aria-hidden="true" />
                    Salvar serviços
                  </button>
                </div>
              )}
            </div>
            <label>
              <span>Observações internas</span>
              <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anotações do atendimento" />
            </label>
          </div>

          <div className="crm-actions">
            {appointment.status === "agendado" && (
              <>
                <a href={appointmentConfirmationUrl} rel="noopener noreferrer" target="_blank">
                  <span className="whatsapp-button-logo" aria-hidden="true" />
                  Confirmar agendamento
                </a>
                <button disabled={busy} onClick={onStart} type="button">
                  <Play aria-hidden="true" />
                  Iniciar atendimento
                </button>
              </>
            )}
            {appointment.status === "atendimento_iniciado" && (
              <button disabled={busy} onClick={onComplete} type="button">
                <CheckCircle2 aria-hidden="true" />
                Encerrar e calcular
              </button>
            )}
            <button disabled={busy} onClick={() => onSaveNotes({ servicosRealizados: servicesDone, crmObservacoes: notes })} type="button">
              <Save aria-hidden="true" />
              Salvar observações
            </button>
            {appointment.status === "concluido" && (
              <>
                <button disabled={busy} onClick={() => onPayment("recebido")} type="button">
                  <WalletCards aria-hidden="true" />
                  Marcar recebido
                </button>
                <label className="crm-payment-date">
                  <span>Agendar pagamento</span>
                  <input value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} type="date" />
                </label>
                <button disabled={busy || !paymentDate} onClick={() => onPayment("agendado", paymentDate)} type="button">
                  <CalendarClock aria-hidden="true" />
                  Salvar pagamento
                </button>
                <a href={customerPaymentUrl} rel="noopener noreferrer" target="_blank">
                  <span className="whatsapp-button-logo" aria-hidden="true" />
                  Enviar cobrança
                </a>
              </>
            )}
          </div>
        </>
      )}
    </article>
  );
}

function ReturnAppointmentForm({
  allAppointments,
  appointment,
  busy,
  onCreate,
}: {
  allAppointments: CrmAppointment[];
  appointment: CrmAppointment;
  busy: boolean;
  onCreate: (input: ReturnAppointmentInput) => Promise<boolean>;
}) {
  const [returnData, setReturnData] = useState<ReturnAppointmentInput>({
    data: new Date().toISOString().slice(0, 10),
    horario: "",
    observacoes: "Retorno sem cobrança: problema voltou ao cortar a segunda fileira.",
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const data = returnData.data;

    async function loadAvailableTimes() {
      try {
        const freeTimes = await getFreeTimes(data);
        if (!active) return;
        setAvailableTimes(freeTimes);
        setReturnData((current) => ({
          ...current,
          horario: freeTimes.includes(current.horario) ? current.horario : freeTimes[0] || "",
        }));
      } catch {
        const occupiedTimes = new Set(
          allAppointments
            .filter((currentAppointment) => currentAppointment.data === data && currentAppointment.status !== "concluido")
            .map((currentAppointment) => currentAppointment.horario),
        );
        const fallbackTimes = getAvailableTimesForDate(data).filter((time) => !occupiedTimes.has(time));
        if (!active) return;
        setAvailableTimes(fallbackTimes);
        setReturnData((current) => ({
          ...current,
          horario: fallbackTimes.includes(current.horario) ? current.horario : fallbackTimes[0] || "",
        }));
      }
    }

    void loadAvailableTimes();

    return () => {
      active = false;
    };
  }, [allAppointments, returnData.data]);

  function updateField(field: keyof ReturnAppointmentInput, value: string) {
    setReturnData((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!returnData.horario) return;
    const created = await onCreate(returnData);
    if (!created) return;
    setReturnData({
      data: new Date().toISOString().slice(0, 10),
      horario: "",
      observacoes: "Retorno sem cobrança: problema voltou ao cortar a segunda fileira.",
    });
  }

  return (
    <form className="crm-form-grid crm-compact-edit-form" onSubmit={submit}>
      <p className="crm-muted crm-form-wide">
        Cria um novo atendimento sem cobrança, vinculado ao atendimento de {appointment.nome}.
      </p>
      <CrmInput label="Data do retorno" required type="date" value={returnData.data} onChange={(value) => updateField("data", value)} />
      <label>
        <span>Horário</span>
        <select value={returnData.horario} onChange={(event) => updateField("horario", event.target.value)}>
          {!availableTimes.length && <option value="">Nenhum horário livre</option>}
          {availableTimes.map((time) => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
      </label>
      <label className="crm-form-wide">
        <span>Observações do retorno</span>
        <textarea value={returnData.observacoes} onChange={(event) => updateField("observacoes", event.target.value)} />
      </label>
      <button className="crm-primary-button crm-form-wide" disabled={busy || !returnData.horario} type="submit">
        <CalendarClock aria-hidden="true" />
        Agendar retorno sem cobrança
      </button>
    </form>
  );
}

function AppointmentEditForm({
  appointment,
  busy,
  onSave,
  serviceOptions,
}: {
  appointment: CrmAppointment;
  busy: boolean;
  onSave: (values: AppointmentEditInput) => Promise<boolean>;
  serviceOptions: string[];
}) {
  const [values, setValues] = useState<AppointmentEditInput>(() => ({
    servico: appointment.servico,
    observacoes: appointment.observacoes || "",
    deslocamentoValor: appointment.deslocamentoValor || 0,
    valorServico: appointment.valorServico || 0,
    valorTotal: appointment.valorTotal || (appointment.valorServico || 0) + (appointment.deslocamentoValor || 0),
    tempoAtendimentoMin: appointment.tempoAtendimentoMin || 0,
    pagamentoStatus: appointment.pagamentoStatus || "pendente",
    pagamentoAgendadoPara: appointment.pagamentoAgendadoPara || "",
    servicosRealizados: normalizeServiceText(appointment.servicosRealizados),
    crmObservacoes: appointment.crmObservacoes || "",
  }));

  function updateField(field: keyof AppointmentEditInput, value: string) {
    setValues((current) => ({
      ...current,
      [field]:
        field === "deslocamentoValor" || field === "valorServico" || field === "valorTotal" || field === "tempoAtendimentoMin"
          ? Number(value)
          : value,
    }));
  }

  function recalculateTotal() {
    setValues((current) => ({
      ...current,
      valorTotal: (Number(current.valorServico) || 0) + (Number(current.deslocamentoValor) || 0),
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(values);
  }

  return (
    <form className="crm-form-grid crm-compact-edit-form" onSubmit={submit}>
      <label>
        <span>Serviço solicitado</span>
        <select value={values.servico} onChange={(event) => updateField("servico", event.target.value)}>
          {serviceOptions.map((service) => <option key={service} value={service}>{service}</option>)}
        </select>
      </label>
      <CrmInput label="Valor do serviço" type="number" value={String(values.valorServico)} onChange={(value) => updateField("valorServico", value)} />
      <CrmInput label="Deslocamento" type="number" value={String(values.deslocamentoValor)} onChange={(value) => updateField("deslocamentoValor", value)} />
      <CrmInput label="Valor total" type="number" value={String(values.valorTotal)} onChange={(value) => updateField("valorTotal", value)} />
      <CrmInput label="Tempo em minutos" type="number" value={String(values.tempoAtendimentoMin)} onChange={(value) => updateField("tempoAtendimentoMin", value)} />
      <label>
        <span>Pagamento</span>
        <select value={values.pagamentoStatus} onChange={(event) => updateField("pagamentoStatus", event.target.value)}>
          <option value="pendente">Pendente</option>
          <option value="recebido">Recebido</option>
          <option value="agendado">Pagamento agendado</option>
        </select>
      </label>
      {values.pagamentoStatus === "agendado" && (
        <CrmInput
          label="Data do pagamento"
          type="date"
          value={values.pagamentoAgendadoPara || ""}
          onChange={(value) => updateField("pagamentoAgendadoPara", value)}
        />
      )}
      <label className="crm-form-wide">
        <span>Serviços realizados</span>
        <textarea value={values.servicosRealizados || ""} onChange={(event) => updateField("servicosRealizados", event.target.value)} />
      </label>
      <label className="crm-form-wide">
        <span>Observações do cliente</span>
        <textarea value={values.observacoes || ""} onChange={(event) => updateField("observacoes", event.target.value)} />
      </label>
      <label className="crm-form-wide">
        <span>Observações internas</span>
        <textarea value={values.crmObservacoes || ""} onChange={(event) => updateField("crmObservacoes", event.target.value)} />
      </label>
      <button className="crm-secondary-button crm-form-wide" onClick={recalculateTotal} type="button">
        Recalcular total
      </button>
      <button className="crm-primary-button crm-form-wide" disabled={busy} type="submit">
        <Save aria-hidden="true" />
        Salvar atendimento
      </button>
    </form>
  );
}
