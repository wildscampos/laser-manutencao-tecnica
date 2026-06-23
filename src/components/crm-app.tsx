"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  History,
  LogOut,
  Moon,
  Save,
  ShieldCheck,
  Sun,
  Users,
  WalletCards,
} from "lucide-react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { AppointmentsView } from "@/components/crm/appointments";
import { AvailabilityView } from "@/components/crm/availability";
import {
  adminEmails,
  crmLoginEmail,
  crmLoginName,
  defaultServiceCatalog,
  performedServiceOptions,
} from "@/components/crm/constants";
import { CustomersView, HistoryView } from "@/components/crm/customers";
import { DashboardView } from "@/components/crm/dashboard";
import { FinanceView } from "@/components/crm/finance";
import { formatDate } from "@/components/crm/formatters";
import { useAutoMonthSelection } from "@/components/crm/month-selection";
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
  saveService,
  saveCustomer,
  seedDefaultServices,
  startAppointment,
  updateAppointmentDetails,
  updateCrmNotes,
  updateCustomer,
  updatePaymentStatus,
  updateService,
  type CrmCustomer,
  type CrmAppointment,
  type CrmService,
} from "@/lib/crm";

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
