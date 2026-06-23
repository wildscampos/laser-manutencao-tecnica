"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DollarSign,
  History,
  LogOut,
  Moon,
  Play,
  Plus,
  Save,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { getFreeTimes } from "@/lib/client-appointments";
import {
  blockAvailability,
  calculateMetrics,
  completeAppointment,
  createCompletedManualAppointment,
  createManualAppointment,
  createStartedManualAppointment,
  formatServiceLabel,
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
  type AvailabilityBlockInput,
  type CompletedManualAppointmentInput,
  type CrmCustomer,
  type CrmAppointment,
  type CrmService,
  type CustomerInput,
  type ManualAppointmentInput,
  type PaymentStatus,
  type ServiceInput,
  type StartedManualAppointmentInput,
} from "@/lib/crm";
import { getAvailableTimesForDate } from "@/lib/schedule";

const crmLoginName = "Wilds Campos";
const crmLoginEmail = "wilds.campos@laserfix.app";
const crmThemeStorageKey = "laserfix-crm-theme";

const adminEmails = (process.env.NEXT_PUBLIC_CRM_ADMIN_EMAILS || "wilds.campos@laserfix.app,wilds.mc@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const performedServiceOptions = [
  "Manutenção preventiva",
  "Manutenção corretiva",
  "Limpeza técnica",
  "Alinhamento óptico",
  "Troca de espelhos",
  "Troca de lente",
  "Troca de tubo CO₂",
  "Troca de fonte",
  "Troca de driver",
  "Troca de painel",
  "Troca de controladora",
  "Troca de sensor de fim de curso",
  "Configuração de motor de passo",
  "Configuração RD Works",
  "Backup/restauração de parâmetros",
  "Criação de arte para corte e gravação",
  "Testes operacionais",
];

const defaultServiceCatalog: ServiceInput[] = performedServiceOptions.map((serviceName) => ({
  nome: serviceName,
  descricao: "Serviço técnico LaserFix para máquinas de corte e gravação laser CO₂.",
  valorBase: serviceName.includes("arte") || serviceName.includes("Arte") ? 40 : 100,
  duracaoMin: serviceName.includes("arte") || serviceName.includes("Arte") ? 60 : 60,
  ativo: true,
}));

const cityOptions = ["Aparecida", "Cachoeira Paulista", "Canas", "Guaratinguetá", "Lorena", "Potim"];

const emptyCustomer: CustomerInput = {
  nome: "",
  telefone: "",
  whatsapp: "",
  empresa: "",
  cpfCnpj: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "Guaratinguetá",
  modeloMaquina: "",
  etiquetas: "",
  preferenciasHorario: "",
  aniversario: "",
  camposCustomizados: "",
  observacoes: "",
};

function formatCurrency(value = 0) {
  return currencyFormatter.format(value);
}

function formatDuration(minutes = 0) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (!hours) return `${remainingMinutes} min`;
  return `${hours}h ${String(remainingMinutes).padStart(2, "0")}min`;
}

function formatDate(dateValue: string) {
  if (!dateValue) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${dateValue}T12:00:00`));
}

function formatDateTime(iso?: string) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

function formatChartMonth(month: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${month}-01T12:00:00`)).replace(".", "");
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getCurrentTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

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

function getStatusLabel(status: string) {
  if (status === "atendimento_iniciado") return "Iniciado";
  if (status === "concluido") return "Concluído";
  return "Agendado";
}

function getPaymentLabel(status?: PaymentStatus) {
  if (status === "recebido") return "Recebido";
  if (status === "agendado") return "Pagamento agendado";
  return "Pendente";
}

function formatChartValue(value: number, format: ChartFormat) {
  if (format === "currency") return formatCurrency(value);
  if (format === "duration") return formatDuration(value);
  return String(Math.round(value));
}

function getChartMetricValue(metrics: ReturnType<typeof calculateMetrics>, key: DashboardChartKey) {
  if (key === "scheduled") return metrics.scheduled;
  if (key === "appointments" || key === "totalAppointments") return metrics.appointments;
  if (key === "completed" || key === "totalCompleted") return metrics.completed;
  if (key === "totalValue" || key === "totalGeneralValue") return metrics.totalValue;
  if (key === "receivedValue") return metrics.receivedValue;
  if (key === "pendingValue") return metrics.pendingValue + metrics.scheduledPaymentValue;
  if (key === "averageValue") return metrics.averageValue;
  if (key === "totalMinutes" || key === "totalGeneralMinutes") return metrics.totalMinutes;
  if (key === "averageMinutes") return metrics.averageMinutes;
  return 0;
}

function getChartMonths(selectedMonth: string) {
  const year = selectedMonth.slice(0, 4);
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
}

function buildDashboardCharts(appointments: CrmAppointment[], selectedMonth: string) {
  const yearMonths = getChartMonths(selectedMonth);
  const chartConfigs: Array<{ key: DashboardChartKey; title: string; format: ChartFormat; cumulative?: boolean }> = [
    { key: "scheduled", title: "Atendimentos pendentes por mês", format: "number" },
    { key: "appointments", title: "Atendimentos por mês", format: "number" },
    { key: "completed", title: "Concluídos por mês", format: "number" },
    { key: "totalValue", title: "Valor total por mês", format: "currency" },
    { key: "receivedValue", title: "Recebido por mês", format: "currency" },
    { key: "pendingValue", title: "A receber por mês", format: "currency" },
    { key: "averageValue", title: "Valor médio por mês", format: "currency" },
    { key: "totalMinutes", title: "Tempo total por mês", format: "duration" },
    { key: "averageMinutes", title: "Tempo médio por mês", format: "duration" },
    { key: "totalAppointments", title: "Atendimentos gerais acumulados", format: "number", cumulative: true },
    { key: "totalCompleted", title: "Concluídos gerais acumulados", format: "number", cumulative: true },
    { key: "totalGeneralValue", title: "Valor total geral acumulado", format: "currency", cumulative: true },
    { key: "totalGeneralMinutes", title: "Tempo total geral acumulado", format: "duration", cumulative: true },
  ];

  return chartConfigs.map<DashboardChart>((config) => {
    const points = yearMonths.map((month) => {
      const monthAppointments = appointments.filter((appointment) => getMonthKey(appointment.data) === month);
      const scopedAppointments = config.cumulative
        ? appointments.filter((appointment) => getMonthKey(appointment.data) <= month)
        : monthAppointments;
      return {
        label: formatChartMonth(month),
        value: config.cumulative && !monthAppointments.length ? 0 : getChartMetricValue(calculateMetrics(scopedAppointments), config.key),
      };
    });
    const pointsWithData = points.filter((point) => point.value > 0);
    const averageValue = pointsWithData.length
      ? pointsWithData.reduce((sum, point) => sum + point.value, 0) / pointsWithData.length
      : 0;

    return {
      averageValue,
      format: config.format,
      key: config.key,
      title: config.title,
      points,
    };
  });
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

function formatServiceListLabel(value: string | string[] = "") {
  return normalizeServiceText(value)
    .split(",")
    .map((service) => formatServiceLabel(service))
    .filter(Boolean)
    .join(", ");
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

function isFilled(value?: string) {
  if (!value) return false;
  const normalizedValue = value.trim().toLowerCase();
  return Boolean(normalizedValue) && !["não informado", "s/n", "-"].includes(normalizedValue);
}

function buildAddressLine(appointment: CrmAppointment) {
  const streetAndNumber = [appointment.rua, appointment.numero].filter(isFilled).join(", ");
  const neighborhoodAndCity = [appointment.bairro, appointment.cidade].filter(isFilled).join(", ");
  return [streetAndNumber, neighborhoodAndCity].filter(Boolean).join(" - ");
}

function getCustomerPaymentDebts(appointment: CrmAppointment, appointments: CrmAppointment[]) {
  return appointments
    .filter((currentAppointment) => currentAppointment.id !== appointment.id)
    .filter((currentAppointment) => currentAppointment.status === "concluido")
    .filter((currentAppointment) => currentAppointment.pagamentoStatus !== "recebido")
    .filter((currentAppointment) => {
      if (appointment.clienteId && currentAppointment.clienteId === appointment.clienteId) return true;
      const appointmentPhone = normalizeWhatsAppNumber(appointment.whatsapp || appointment.telefone);
      const currentPhone = normalizeWhatsAppNumber(currentAppointment.whatsapp || currentAppointment.telefone);
      if (appointmentPhone && currentPhone && appointmentPhone === currentPhone) return true;
      return currentAppointment.nome.trim().toLowerCase() === appointment.nome.trim().toLowerCase();
    })
    .sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));
}

function buildAppointmentConfirmationWhatsAppUrl(appointment: CrmAppointment) {
  const phone = normalizeWhatsAppNumber(appointment.whatsapp || appointment.telefone);
  const address = buildAddressLine(appointment);
  const lines: Array<string | undefined> = [
    `Olá, ${appointment.nome}.`,
    "",
    "Confirmando seu atendimento LaserFix:",
    "Técnico: Wilds Campos",
    `Data: ${formatDate(appointment.data)}`,
    `Horário: ${appointment.horario}`,
    isFilled(appointment.servico) ? `Serviço: ${appointment.servico}` : undefined,
    address ? `Endereço: ${address}` : undefined,
    "",
    "Qualquer alteração, me avise pelo WhatsApp.",
  ];
  const message = lines.filter((line): line is string => line !== undefined).join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function buildCustomerWhatsAppUrl(appointment: CrmAppointment, servicesDone: string, pendingAppointments: CrmAppointment[]) {
  const phone = normalizeWhatsAppNumber(appointment.whatsapp || appointment.telefone);
  const performedServices = servicesDone.trim() || normalizeServiceText(appointment.servicosRealizados) || appointment.servico;
  const currentTotal = appointment.valorTotal || 0;
  const pendingTotal = pendingAppointments.reduce((sum, pendingAppointment) => sum + (pendingAppointment.valorTotal || 0), 0);
  const grandTotal = currentTotal + pendingTotal;
  const pendingLines = pendingAppointments.length
    ? [
        "",
        "Também constam pagamentos anteriores ainda não confirmados:",
        ...pendingAppointments.map((pendingAppointment) =>
          `- ${formatDate(pendingAppointment.data)} · ${formatServiceListLabel(pendingAppointment.servicosRealizados || pendingAppointment.servico)}: ${formatCurrency(pendingAppointment.valorTotal || 0)} (${getPaymentLabel(pendingAppointment.pagamentoStatus)})`,
        ),
        `Total anterior pendente: ${formatCurrency(pendingTotal)}`,
        `Valor total dos atendimentos: ${formatCurrency(grandTotal)}`,
      ]
    : [];
  const lines: Array<string | undefined> = [
    `Olá, ${appointment.nome}.`,
    "",
    "Seu atendimento LaserFix foi concluído.",
    "",
    appointment.tempoAtendimentoMin ? `Tempo do serviço: ${formatDuration(appointment.tempoAtendimentoMin)}` : undefined,
    isFilled(performedServices) ? `Serviços realizados: ${performedServices}` : undefined,
    appointment.valorServico ? `Valor do atendimento: ${formatCurrency(appointment.valorServico)}` : undefined,
    appointment.deslocamentoValor ? `Deslocamento: ${formatCurrency(appointment.deslocamentoValor)}` : undefined,
    currentTotal ? `Valor total: ${formatCurrency(currentTotal)}` : undefined,
    ...pendingLines,
    "",
    "Dados para pagamento via Pix:",
    "Pix Celular: 12981823416",
    "Banco: C6",
    "Nome: Wilds M Campos",
  ];
  const message = lines.filter((line): line is string => line !== undefined).join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function getAppointmentStartTime(appointment: CrmAppointment) {
  return new Date(`${appointment.data}T${appointment.horario}:00`).getTime();
}

async function showCrmNotification(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const options: NotificationOptions = {
    body,
    icon: "/pwa-icon-laserfix-192.png",
    badge: "/pwa-icon-laserfix-192.png",
    tag,
    data: { url: "/crm" },
  };

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, options);
    return;
  }

  new Notification(title, options);
}

function readNotificationKeys(storageKey: string) {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(storageKey) || "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function writeNotificationKeys(storageKey: string, keys: Set<string>) {
  window.localStorage.setItem(storageKey, JSON.stringify(Array.from(keys)));
}

async function showCrmNotificationOnce(storageKey: string, uniqueKey: string, title: string, body: string, tag: string) {
  const notifiedKeys = readNotificationKeys(storageKey);
  if (notifiedKeys.has(uniqueKey)) return;

  notifiedKeys.add(uniqueKey);
  writeNotificationKeys(storageKey, notifiedKeys);
  await showCrmNotification(title, body, tag);
}

type CrmView = "dashboard" | "appointments" | "customers" | "history" | "services" | "finance" | "availability";
type DashboardChartKey =
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
type ChartFormat = "currency" | "duration" | "number";

type DashboardChart = {
  averageValue: number;
  format: ChartFormat;
  key: DashboardChartKey;
  points: Array<{ label: string; value: number }>;
  title: string;
};
type CrmTheme = "light" | "dark";

function getStoredCrmTheme(): CrmTheme {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem(crmThemeStorageKey) === "dark" ? "dark" : "light";
}

function applyCrmTheme(theme: CrmTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.crmTheme = theme;
}

function toggleStoredCrmTheme() {
  if (typeof window === "undefined") return;
  const currentTheme = document.documentElement.dataset.crmTheme === "dark" ? "dark" : "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  window.localStorage.setItem(crmThemeStorageKey, nextTheme);
  applyCrmTheme(nextTheme);
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
  const [notificationPermission] = useState<NotificationPermission>(() =>
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
  const dashboardCharts = useMemo(() => buildDashboardCharts(appointments, selectedMonth), [appointments, selectedMonth]);
  const dashboardChartByKey = useMemo(() => new Map(dashboardCharts.map((chart) => [chart.key, chart])), [dashboardCharts]);
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
        const delay = reminderTime - now;

        if (delay < 0 || delay > 2147483647) return;

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

          <section className="crm-dashboard" aria-label="Métricas do mês">
            <MetricCard
              active={activeChartKey === "scheduled"}
              appointmentList={monthAppointments.filter((appointment) => appointment.status !== "concluido")}
              chartKey="scheduled"
              icon={CalendarClock}
              label="Atendimentos Agendados"
              listTitle="Atendimentos Agendados"
              onToggle={setActiveChartKey}
              value={String(monthMetrics.scheduled)}
            />
            <MetricCard
              active={activeChartKey === "completed"}
              appointmentList={monthAppointments.filter((appointment) => appointment.status === "concluido")}
              chartKey="completed"
              icon={CheckCircle2}
              label="Atendimentos Concluídos"
              listTitle="Atendimentos Concluídos"
              onToggle={setActiveChartKey}
              value={String(monthMetrics.completed)}
            />
            <MetricCard
              active={activeChartKey === "appointments"}
              chart={dashboardChartByKey.get("appointments")}
              chartKey="appointments"
              icon={CalendarClock}
              label="Total de Atendimentos no Mês"
              onToggle={setActiveChartKey}
              value={String(monthMetrics.appointments)}
            />
            <MetricCard active={activeChartKey === "totalValue"} chart={dashboardChartByKey.get("totalValue")} chartKey="totalValue" icon={DollarSign} label="Valor total no mês" onToggle={setActiveChartKey} value={formatCurrency(monthMetrics.totalValue)} />
            <MetricCard active={activeChartKey === "receivedValue"} chart={dashboardChartByKey.get("receivedValue")} chartKey="receivedValue" icon={WalletCards} label="Recebido no mês" onToggle={setActiveChartKey} value={formatCurrency(monthMetrics.receivedValue)} />
            <MetricCard active={activeChartKey === "pendingValue"} chart={dashboardChartByKey.get("pendingValue")} chartKey="pendingValue" icon={DollarSign} label="A receber no mês" onToggle={setActiveChartKey} value={formatCurrency(monthMetrics.pendingValue + monthMetrics.scheduledPaymentValue)} />
            <MetricCard active={activeChartKey === "averageValue"} chart={dashboardChartByKey.get("averageValue")} chartKey="averageValue" icon={WalletCards} label="Valor médio" onToggle={setActiveChartKey} value={formatCurrency(monthMetrics.averageValue)} />
            <MetricCard active={activeChartKey === "totalMinutes"} chart={dashboardChartByKey.get("totalMinutes")} chartKey="totalMinutes" icon={Clock3} label="Tempo total" onToggle={setActiveChartKey} value={formatDuration(monthMetrics.totalMinutes)} />
            <MetricCard active={activeChartKey === "averageMinutes"} chart={dashboardChartByKey.get("averageMinutes")} chartKey="averageMinutes" icon={BarChart3} label="Tempo médio" onToggle={setActiveChartKey} value={formatDuration(monthMetrics.averageMinutes)} />
          </section>

          <section className="crm-dashboard crm-dashboard-total" aria-label="Métricas gerais">
            <MetricCard active={activeChartKey === "totalAppointments"} chart={dashboardChartByKey.get("totalAppointments")} chartKey="totalAppointments" icon={CalendarClock} label="Atendimentos gerais" onToggle={setActiveChartKey} value={String(totalMetrics.appointments)} />
            <MetricCard active={activeChartKey === "totalCompleted"} chart={dashboardChartByKey.get("totalCompleted")} chartKey="totalCompleted" icon={CheckCircle2} label="Concluídos gerais" onToggle={setActiveChartKey} value={String(totalMetrics.completed)} />
            <MetricCard active={activeChartKey === "totalGeneralValue"} chart={dashboardChartByKey.get("totalGeneralValue")} chartKey="totalGeneralValue" icon={DollarSign} label="Valor total geral" onToggle={setActiveChartKey} value={formatCurrency(totalMetrics.totalValue)} />
            <MetricCard active={activeChartKey === "totalGeneralMinutes"} chart={dashboardChartByKey.get("totalGeneralMinutes")} chartKey="totalGeneralMinutes" icon={Clock3} label="Tempo total geral" onToggle={setActiveChartKey} value={formatDuration(totalMetrics.totalMinutes)} />
          </section>

          <section className="crm-panels">
            <div className="crm-panel">
              <h2>Serviços realizados no mês</h2>
              {monthMetrics.serviceCounts.length ? (
                <div className="crm-service-list">
                  {monthMetrics.serviceCounts.map((item) => (
                    <div key={item.service}>
                      <span>{formatServiceListLabel(item.service)}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="crm-muted">Nenhum serviço concluído neste mês.</p>
              )}
            </div>
          </section>

        </>
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

function MetricCard({
  active,
  appointmentList,
  chart,
  chartKey,
  icon: Icon,
  label,
  listTitle,
  onToggle,
  value,
}: {
  active?: boolean;
  appointmentList?: CrmAppointment[];
  chart?: DashboardChart;
  chartKey?: DashboardChartKey;
  icon: React.ElementType;
  label: string;
  listTitle?: string;
  onToggle?: (key: DashboardChartKey | "") => void;
  value: string;
}) {
  const canExpand = Boolean((chart || appointmentList) && chartKey && onToggle);

  function toggleChart() {
    if (!canExpand || !chartKey || !onToggle) return;
    onToggle(active ? "" : chartKey);
  }

  return (
    <article className={`crm-metric-card ${active ? "crm-metric-card-expanded" : ""}`}>
      <button
        aria-expanded={canExpand ? active : undefined}
        className="crm-metric-button"
        disabled={!canExpand}
        onClick={toggleChart}
        type="button"
      >
        <Icon aria-hidden="true" />
        <span>{label}</span>
        <strong>{value}</strong>
      </button>
      {active && appointmentList && <MetricAppointmentList appointments={appointmentList} title={listTitle || label} />}
      {active && chart && <MetricChart chart={chart} />}
    </article>
  );
}

function MetricAppointmentList({ appointments, title }: { appointments: CrmAppointment[]; title: string }) {
  const sortedAppointments = [...appointments].sort((a, b) => b.data.localeCompare(a.data) || b.horario.localeCompare(a.horario));

  return (
    <div className="crm-metric-appointment-list" aria-label={title}>
      <div className="crm-metric-chart-heading">
        <h3>{title}</h3>
        <span>{appointments.length} atendimento(s)</span>
      </div>
      {sortedAppointments.length ? (
        <div className="crm-metric-appointment-items">
          {sortedAppointments.map((appointment) => (
            <article key={appointment.id}>
              <div>
                <strong>{appointment.nome}</strong>
                <span className={`crm-status crm-status-${appointment.status}`}>{getStatusLabel(appointment.status)}</span>
              </div>
              <p>{formatDate(appointment.data)} às {appointment.horario}</p>
              <p>{appointment.cidade} · {formatServiceListLabel(appointment.servicosRealizados || appointment.servico)}</p>
              <strong className="crm-metric-appointment-value">{formatCurrency(appointment.valorTotal || 0)}</strong>
            </article>
          ))}
        </div>
      ) : (
        <p className="crm-muted">Nenhum atendimento para exibir.</p>
      )}
    </div>
  );
}

function MetricChart({ chart }: { chart: DashboardChart }) {
  const maxValue = Math.max(...chart.points.map((point) => point.value), chart.averageValue, 1);
  const chartWidth = 360;
  const chartHeight = 190;
  const axisLeft = 44;
  const axisRight = 10;
  const axisTop = 18;
  const axisBottom = 34;
  const plotWidth = chartWidth - axisLeft - axisRight;
  const plotHeight = chartHeight - axisTop - axisBottom;
  const barGap = 5;
  const barWidth = (plotWidth - barGap * Math.max(0, chart.points.length - 1)) / Math.max(1, chart.points.length);
  const averageY = axisTop + plotHeight - (chart.averageValue / maxValue) * plotHeight;
  const gridValues = [maxValue, maxValue / 2, 0];

  return (
    <div className="crm-metric-chart" aria-label={chart.title}>
      <div className="crm-metric-chart-heading">
        <h3>{chart.title}</h3>
        <span>Média: {formatChartValue(chart.averageValue, chart.format)}</span>
      </div>
      <svg role="img" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
        {gridValues.map((gridValue) => {
          const y = axisTop + plotHeight - (gridValue / maxValue) * plotHeight;
          return (
            <g key={gridValue}>
              <line className="crm-chart-grid" x1={axisLeft} x2={chartWidth - axisRight} y1={y} y2={y} />
              <text className="crm-chart-axis" x="2" y={y + 3}>
                {formatChartValue(gridValue, chart.format)}
              </text>
            </g>
          );
        })}
        {chart.averageValue > 0 && (
          <>
            <line className="crm-chart-average-line" x1={axisLeft} x2={chartWidth - axisRight} y1={averageY} y2={averageY} />
            <text className="crm-chart-average-label" x={chartWidth - axisRight} y={Math.max(10, averageY - 5)} textAnchor="end">
              Média
            </text>
          </>
        )}
        {chart.points.map((point, index) => {
          const barHeight = point.value ? Math.max(3, (point.value / maxValue) * plotHeight) : 0;
          const x = axisLeft + index * (barWidth + barGap);
          const y = axisTop + plotHeight - barHeight;
          return (
            <g key={`${point.label}-${index}`}>
              {point.value > 0 && (
                <>
                  <rect className="crm-chart-bar" x={x} y={y} width={barWidth} height={barHeight} rx="3" />
                  <text className="crm-chart-value" x={x + barWidth / 2} y={Math.max(12, y - 5)} textAnchor="middle">
                    {formatChartValue(point.value, chart.format)}
                  </text>
                </>
              )}
              <text className="crm-chart-label" x={x + barWidth / 2} y={chartHeight - 8} textAnchor="middle">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AppointmentsView({
  appointments,
  busyId,
  customers,
  onCreateAppointment,
  onCreateCompletedAppointment,
  onCreateStartedAppointment,
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

function CustomersView({
  appointments,
  busy,
  customers,
  onSaveCustomer,
  onUpdateCustomer,
}: {
  appointments: CrmAppointment[];
  busy: boolean;
  customers: CrmCustomer[];
  onSaveCustomer: (customer: CustomerInput) => Promise<boolean>;
  onUpdateCustomer: (customerId: string, customer: CustomerInput) => Promise<boolean>;
}) {
  return (
    <section className="crm-page-grid">
      <details className="crm-panel crm-form-details">
        <summary>
          <div className="crm-section-title">
            <h2>Cadastrar cliente</h2>
            <span>{customers.length} cliente(s)</span>
          </div>
        </summary>
        <CustomerForm busy={busy} onSave={onSaveCustomer} />
      </details>

      <div className="crm-panel crm-wide-panel">
        <h2>Clientes cadastrados</h2>
        <div className="crm-customer-list crm-two-column-list">
          {customers.map((customer) => {
            const customerAppointments = getCustomerAppointments(customer, appointments);
            return (
              <details className="crm-collapsible-card" key={customer.id}>
                <summary>
                  <div>
                    <h3>{customer.nome}</h3>
                    <p>{customer.empresa || "Sem empresa"} · {customer.cidade}</p>
                  </div>
                  <div className="crm-summary-count">
                    <strong>{customerAppointments.length}</strong>
                    <span>atendimento(s)</span>
                  </div>
                </summary>
                <div className="crm-collapsible-content">
                  <p>WhatsApp: {customer.whatsapp || "Não informado"}</p>
                  <p>Telefone: {customer.telefone || "Não informado"}</p>
                  {customer.cpfCnpj && <p>CPF/CNPJ: {customer.cpfCnpj}</p>}
                  {customer.etiquetas && <p>Etiquetas: {customer.etiquetas}</p>}
                  <p>Endereço: {customer.rua}, {customer.numero} - {customer.bairro}</p>
                  {customer.modeloMaquina && <p>Máquina: {customer.modeloMaquina}</p>}
                  {customer.preferenciasHorario && <p>Preferência de horário: {customer.preferenciasHorario}</p>}
                  {customer.aniversario && <p>Aniversário: {formatDate(customer.aniversario)}</p>}
                  {customer.camposCustomizados && <p>Campos específicos: {customer.camposCustomizados}</p>}
                  {customer.observacoes && <p>Observações: {customer.observacoes}</p>}
                  <details className="crm-edit-details">
                    <summary>Editar cliente</summary>
                    <CustomerForm
                      busy={busy}
                      customerId={customer.id}
                      initialCustomer={customerToInput(customer)}
                      onSave={(values) => onUpdateCustomer(customer.id, values)}
                      submitLabel="Salvar alterações"
                    />
                  </details>
                </div>
              </details>
            );
          })}
          {!customers.length && <p className="crm-empty">Nenhum cliente cadastrado.</p>}
        </div>
      </div>
    </section>
  );
}

function HistoryView({ appointments, customers }: { appointments: CrmAppointment[]; customers: CrmCustomer[] }) {
  const sortedCustomers = [...customers].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <section className="crm-appointments">
      <div className="crm-section-title">
        <h2>Histórico por cliente</h2>
        <span>{sortedCustomers.length} cliente(s)</span>
      </div>
      <div className="crm-list crm-history-grid crm-two-column-list">
        {sortedCustomers.map((customer) => {
          const customerAppointments = getCustomerAppointments(customer, appointments);
          const totalValue = customerAppointments.reduce((sum, appointment) => sum + (appointment.valorTotal || 0), 0);

          return (
            <details className="crm-appointment-card crm-history-card" key={customer.id}>
              <summary>
                <div>
                  <div>
                    <h3>{customer.nome}</h3>
                    <p>{customer.empresa || "Sem empresa informada"} · {customer.cidade}</p>
                  </div>
                </div>
                <div className="crm-values">
                  <strong>Total: {formatCurrency(totalValue)}</strong>
                  <span>{customerAppointments.length} atendimento(s)</span>
                </div>
              </summary>
              <div className="crm-collapsible-content">
                <p>WhatsApp: {customer.whatsapp || "Não informado"}</p>
                <p>Último atendimento: {customerAppointments[0] ? formatDate(customerAppointments[0].data) : "-"}</p>
              </div>
              <div className="crm-history-list">
                {customerAppointments.map((appointment) => (
                  <div key={appointment.id}>
                    <strong>{formatDate(appointment.data)} · {appointment.horario}</strong>
                    <span>{formatServiceListLabel(appointment.servicosRealizados || appointment.servico)}</span>
                    <span>{formatCurrency(appointment.valorTotal || 0)} · {getPaymentLabel(appointment.pagamentoStatus)}</span>
                  </div>
                ))}
                {!customerAppointments.length && <p className="crm-muted">Ainda não há atendimentos registrados para este cliente.</p>}
              </div>
            </details>
          );
        })}
        {!sortedCustomers.length && <p className="crm-empty">Nenhum cliente para exibir histórico.</p>}
      </div>
    </section>
  );
}

function ServicesView({
  busy,
  services,
  onSaveService,
  onUpdateService,
}: {
  busy: boolean;
  services: CrmService[];
  onSaveService: (service: ServiceInput) => Promise<boolean>;
  onUpdateService: (serviceId: string, service: ServiceInput) => Promise<boolean>;
}) {
  const activeServices = services.filter((service) => service.ativo);
  const inactiveServices = services.filter((service) => !service.ativo);

  return (
    <section className="crm-page-grid">
      <details className="crm-panel crm-form-details">
        <summary>
          <div className="crm-section-title">
            <h2>Catálogo de serviços</h2>
            <span>{activeServices.length} ativo(s)</span>
          </div>
        </summary>
        <ServiceForm busy={busy} onSave={onSaveService} />
      </details>

      <div className="crm-panel">
        <h2>Serviços cadastrados</h2>
        <div className="crm-service-catalog crm-two-column-list">
          {services.map((service) => (
            <article key={service.id} className="crm-service-record">
              <div>
                <h3>{service.nome}</h3>
                <p>{service.descricao}</p>
              </div>
              <div className="crm-values">
                <span>Valor base: {formatCurrency(service.valorBase)}</span>
                <span>Duração: {formatDuration(service.duracaoMin)}</span>
                <strong>{service.ativo ? "Ativo" : "Inativo"}</strong>
              </div>
              <details className="crm-edit-details">
                <summary>Editar serviço</summary>
                <ServiceForm
                  busy={busy}
                  initialService={serviceToInput(service)}
                  onSave={(values) => onUpdateService(service.id, values)}
                  submitLabel="Salvar alterações"
                />
              </details>
            </article>
          ))}
          {!services.length && <p className="crm-empty">O catálogo será criado automaticamente com os serviços padrão.</p>}
          {!!inactiveServices.length && <p className="crm-muted">{inactiveServices.length} serviço(s) inativo(s) ficam fora das listas de seleção.</p>}
        </div>
      </div>
    </section>
  );
}

function FinanceView({
  appointments,
  months,
  onMonthChange,
  selectedMonth,
}: {
  appointments: CrmAppointment[];
  months: string[];
  onMonthChange: (month: string) => void;
  selectedMonth: string;
}) {
  const monthAppointments = appointments.filter((appointment) => getMonthKey(appointment.data) === selectedMonth);
  const monthMetrics = calculateMetrics(monthAppointments);
  const totalMetrics = calculateMetrics(appointments);
  const financialAppointments = monthAppointments
    .filter((appointment) => appointment.status === "concluido")
    .sort((a, b) => b.data.localeCompare(a.data) || b.horario.localeCompare(a.horario));

  return (
    <>
      <section className="crm-toolbar">
        <label>
          <span>Mês financeiro</span>
          <select value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)}>
            {months.map((month) => (
              <option key={month} value={month}>
                {monthFormatter.format(new Date(`${month}-01T12:00:00`))}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="crm-dashboard" aria-label="Financeiro do mês">
        <MetricCard icon={DollarSign} label="Faturamento do mês" value={formatCurrency(monthMetrics.totalValue)} />
        <MetricCard icon={WalletCards} label="Recebido" value={formatCurrency(monthMetrics.receivedValue)} />
        <MetricCard icon={CalendarClock} label="Pagamentos agendados" value={formatCurrency(monthMetrics.scheduledPaymentValue)} />
        <MetricCard icon={Clock3} label="Pendente" value={formatCurrency(monthMetrics.pendingValue)} />
      </section>

      <section className="crm-dashboard crm-dashboard-total" aria-label="Financeiro geral">
        <MetricCard icon={DollarSign} label="Faturamento geral" value={formatCurrency(totalMetrics.totalValue)} />
        <MetricCard icon={WalletCards} label="Recebido geral" value={formatCurrency(totalMetrics.receivedValue)} />
        <MetricCard icon={CalendarClock} label="Agendado geral" value={formatCurrency(totalMetrics.scheduledPaymentValue)} />
        <MetricCard icon={Clock3} label="Pendente geral" value={formatCurrency(totalMetrics.pendingValue)} />
      </section>

      <details className="crm-appointments crm-finance-history-details">
        <summary>
          <div className="crm-section-title">
            <h2>Histórico financeiro</h2>
            <span>{financialAppointments.length} atendimento(s)</span>
          </div>
        </summary>
        <div className="crm-list crm-finance-list">
          {financialAppointments.map((appointment) => (
            <article className="crm-appointment-card crm-finance-card" key={appointment.id}>
              <div className="crm-appointment-main">
                <div>
                  <h3>{appointment.nome}</h3>
                  <p>{formatDate(appointment.data)} às {appointment.horario} · {appointment.cidade}</p>
                  <p>{formatServiceListLabel(appointment.servicosRealizados || appointment.servico)}</p>
                </div>
                <div className="crm-values">
                  <strong>{formatCurrency(appointment.valorTotal || 0)}</strong>
                  <span>{getPaymentLabel(appointment.pagamentoStatus)}</span>
                  {appointment.pagamentoAgendadoPara && <span>Receber em {formatDate(appointment.pagamentoAgendadoPara)}</span>}
                </div>
              </div>
            </article>
          ))}
          {!financialAppointments.length && <p className="crm-empty">Nenhum atendimento concluído no mês selecionado.</p>}
        </div>
      </details>
    </>
  );
}

function AvailabilityView({
  appointments,
  busy,
  onBlock,
}: {
  appointments: CrmAppointment[];
  busy: boolean;
  onBlock: (input: AvailabilityBlockInput) => Promise<boolean>;
}) {
  const [block, setBlock] = useState<AvailabilityBlockInput>({
    data: new Date().toISOString().slice(0, 10),
    horario: "",
    motivo: "Agenda externa",
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const data = block.data;

    async function loadAvailableTimes() {
      try {
        const freeTimes = await getFreeTimes(data);
        if (!active) return;
        setAvailableTimes(freeTimes);
        setBlock((current) => ({
          ...current,
          horario: freeTimes.includes(current.horario) ? current.horario : freeTimes[0] || "",
        }));
      } catch {
        const occupiedTimes = new Set(
          appointments
            .filter((appointment) => appointment.data === data && appointment.status !== "concluido")
            .map((appointment) => appointment.horario),
        );
        const fallbackTimes = getAvailableTimesForDate(data).filter((time) => !occupiedTimes.has(time));
        if (!active) return;
        setAvailableTimes(fallbackTimes);
        setBlock((current) => ({
          ...current,
          horario: fallbackTimes.includes(current.horario) ? current.horario : fallbackTimes[0] || "",
        }));
      }
    }

    void loadAvailableTimes();

    return () => {
      active = false;
    };
  }, [appointments, block.data]);

  function updateField(field: keyof AvailabilityBlockInput, value: string) {
    setBlock((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!block.horario) return;
    const blocked = await onBlock(block);
    if (!blocked) return;
    setAvailableTimes((currentTimes) => currentTimes.filter((time) => time !== block.horario));
    setBlock((current) => {
      const nextTimes = availableTimes.filter((time) => time !== current.horario);
      return { ...current, horario: nextTimes[0] || "" };
    });
  }

  return (
    <section className="crm-page-grid">
      <details className="crm-panel crm-wide-panel crm-form-details">
        <summary>
          <div className="crm-section-title">
            <h2>Bloquear horário</h2>
          </div>
        </summary>
        <form className="crm-form-grid" onSubmit={submit}>
          <CrmInput label="Data" required type="date" value={block.data} onChange={(value) => updateField("data", value)} />
          <label>
            <span>Horário</span>
            <select value={block.horario} onChange={(event) => updateField("horario", event.target.value)}>
              {!availableTimes.length && <option value="">Nenhum horário livre</option>}
              {availableTimes.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </label>
          <CrmInput label="Motivo" value={block.motivo} onChange={(value) => updateField("motivo", value)} />
          <button className="crm-primary-button crm-form-wide" disabled={busy || !block.horario} type="submit">
            <ShieldCheck aria-hidden="true" />
            Bloquear horário
          </button>
        </form>
      </details>
    </section>
  );
}

function serviceToInput(service: CrmService): ServiceInput {
  return {
    nome: service.nome,
    descricao: service.descricao,
    valorBase: service.valorBase,
    duracaoMin: service.duracaoMin,
    ativo: service.ativo,
  };
}

function ServiceForm({
  busy,
  initialService,
  onSave,
  submitLabel = "Salvar serviço",
}: {
  busy: boolean;
  initialService?: ServiceInput;
  onSave: (service: ServiceInput) => Promise<boolean>;
  submitLabel?: string;
}) {
  const blankService: ServiceInput = {
    nome: "",
    descricao: "",
    valorBase: 100,
    duracaoMin: 60,
    ativo: true,
  };
  const [service, setService] = useState<ServiceInput>(initialService || blankService);

  function updateField(field: keyof ServiceInput, value: string | boolean) {
    setService((current) => ({
      ...current,
      [field]: field === "valorBase" || field === "duracaoMin" ? Number(value) : value,
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSave(service);
    if (saved && !initialService) setService(blankService);
  }

  return (
    <form className="crm-form-grid" onSubmit={submit}>
      <CrmInput label="Nome do serviço" required value={service.nome} onChange={(value) => updateField("nome", value)} />
      <CrmInput label="Valor base" required type="number" value={String(service.valorBase)} onChange={(value) => updateField("valorBase", value)} />
      <CrmInput label="Duração estimada em minutos" required type="number" value={String(service.duracaoMin)} onChange={(value) => updateField("duracaoMin", value)} />
      <label>
        <span>Status</span>
        <select value={service.ativo ? "ativo" : "inativo"} onChange={(event) => updateField("ativo", event.target.value === "ativo")}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </label>
      <label className="crm-form-wide">
        <span>Descrição</span>
        <textarea value={service.descricao} onChange={(event) => updateField("descricao", event.target.value)} />
      </label>
      <button className="crm-primary-button crm-form-wide" disabled={busy} type="submit">
        <Save aria-hidden="true" />
        {submitLabel}
      </button>
    </form>
  );
}

function customerToInput(customer: CrmCustomer): CustomerInput {
  return {
    nome: customer.nome,
    telefone: customer.telefone || "",
    whatsapp: customer.whatsapp || "",
    empresa: customer.empresa || "",
    cpfCnpj: customer.cpfCnpj || "",
    rua: customer.rua || "",
    numero: customer.numero || "",
    bairro: customer.bairro || "",
    cidade: customer.cidade || "Guaratinguetá",
    modeloMaquina: customer.modeloMaquina || "",
    etiquetas: customer.etiquetas || "",
    preferenciasHorario: customer.preferenciasHorario || "",
    aniversario: customer.aniversario || "",
    camposCustomizados: customer.camposCustomizados || "",
    observacoes: customer.observacoes || "",
  };
}

function getCustomerAppointments(customer: CrmCustomer, appointments: CrmAppointment[]) {
  return appointments
    .filter((appointment) => appointment.clienteId === customer.id || appointment.nome.toLowerCase() === customer.nome.toLowerCase())
    .sort((a, b) => b.data.localeCompare(a.data) || b.horario.localeCompare(a.horario));
}

function CustomerForm({
  busy,
  initialCustomer = emptyCustomer,
  onSave,
  submitLabel = "Salvar cliente",
}: {
  busy: boolean;
  customerId?: string;
  initialCustomer?: CustomerInput;
  onSave: (customer: CustomerInput) => Promise<boolean>;
  submitLabel?: string;
}) {
  const [customer, setCustomer] = useState<CustomerInput>(initialCustomer);

  function updateField(field: keyof CustomerInput, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSave(customer);
    if (saved && initialCustomer === emptyCustomer) setCustomer(emptyCustomer);
  }

  return (
    <form className="crm-form-grid" onSubmit={submit}>
      <CrmInput label="Nome" value={customer.nome} onChange={(value) => updateField("nome", value)} />
      <CrmInput label="WhatsApp" value={customer.whatsapp} onChange={(value) => updateField("whatsapp", value)} />
      <CrmInput label="Telefone" value={customer.telefone} onChange={(value) => updateField("telefone", value)} />
      <CrmInput label="Empresa" value={customer.empresa || ""} onChange={(value) => updateField("empresa", value)} />
      <CrmInput label="CPF/CNPJ" value={customer.cpfCnpj || ""} onChange={(value) => updateField("cpfCnpj", value)} />
      <CrmInput label="Rua" value={customer.rua} onChange={(value) => updateField("rua", value)} />
      <CrmInput label="Número" value={customer.numero} onChange={(value) => updateField("numero", value)} />
      <CrmInput label="Bairro" value={customer.bairro} onChange={(value) => updateField("bairro", value)} />
      <label>
        <span>Cidade</span>
        <select value={customer.cidade} onChange={(event) => updateField("cidade", event.target.value)}>
          {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
        </select>
      </label>
      <CrmInput label="Modelo da máquina" value={customer.modeloMaquina || ""} onChange={(value) => updateField("modeloMaquina", value)} />
      <CrmInput label="Etiquetas" value={customer.etiquetas || ""} onChange={(value) => updateField("etiquetas", value)} />
      <CrmInput label="Preferência de horário" value={customer.preferenciasHorario || ""} onChange={(value) => updateField("preferenciasHorario", value)} />
      <CrmInput label="Data de aniversário" type="date" value={customer.aniversario || ""} onChange={(value) => updateField("aniversario", value)} />
      <label className="crm-form-wide">
        <span>Campos customizados</span>
        <textarea value={customer.camposCustomizados || ""} onChange={(event) => updateField("camposCustomizados", event.target.value)} placeholder="Informações específicas do cliente, máquina, operação ou contrato" />
      </label>
      <label className="crm-form-wide">
        <span>Observações</span>
        <textarea value={customer.observacoes || ""} onChange={(event) => updateField("observacoes", event.target.value)} />
      </label>
      <button className="crm-primary-button crm-form-wide" disabled={busy} type="submit">
        <UserPlus aria-hidden="true" />
        {submitLabel}
      </button>
    </form>
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

function CrmInput({
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

function AppointmentCard({
  allAppointments,
  appointment,
  busy,
  isOpen,
  onComplete,
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
