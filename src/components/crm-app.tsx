"use client";

import Image from "next/image";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DollarSign,
  LogOut,
  Play,
  Save,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase-client";
import {
  calculateMetrics,
  completeAppointment,
  getMonthKey,
  listenToAppointments,
  startAppointment,
  updateCrmNotes,
  updatePaymentStatus,
  type CrmAppointment,
  type PaymentStatus,
} from "@/lib/crm";

const adminEmails = (process.env.NEXT_PUBLIC_CRM_ADMIN_EMAILS || "wilds.mc@gmail.com")
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

function parsePerformedServices(value = "") {
  return value
    .split(",")
    .map((service) => service.trim())
    .filter(Boolean);
}

function formatPerformedServices(values: string[]) {
  return values.join(", ");
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

function buildCustomerWhatsAppUrl(appointment: CrmAppointment, servicesDone: string) {
  const phone = normalizeWhatsAppNumber(appointment.whatsapp || appointment.telefone);
  const performedServices = servicesDone.trim() || appointment.servicosRealizados || appointment.servico;
  const message = [
    `Olá, ${appointment.nome}.`,
    "",
    "Seu atendimento LaserFix foi concluído.",
    "",
    `Tempo do serviço: ${formatDuration(appointment.tempoAtendimentoMin || 0)}`,
    `Serviços realizados: ${performedServices}`,
    `Valor do atendimento: ${formatCurrency(appointment.valorServico || 0)}`,
    `Deslocamento: ${formatCurrency(appointment.deslocamentoValor || 0)}`,
    `Valor total: ${formatCurrency(appointment.valorTotal || 0)}`,
    "",
    "Dados para pagamento via Pix:",
    "Pix Celular: 12981823416",
    "Banco: C6",
    "Nome: Wilds M Campos",
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function CrmApp() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<CrmAppointment[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const isAdmin = user?.email ? adminEmails.includes(user.email.toLowerCase()) : false;
  const months = useMemo(() => {
    const monthSet = new Set(appointments.map((appointment) => getMonthKey(appointment.data)).filter(Boolean));
    monthSet.add(new Date().toISOString().slice(0, 7));
    return Array.from(monthSet).sort().reverse();
  }, [appointments]);
  const monthAppointments = useMemo(
    () => appointments.filter((appointment) => getMonthKey(appointment.data) === selectedMonth),
    [appointments, selectedMonth],
  );
  const monthMetrics = useMemo(() => calculateMetrics(monthAppointments), [monthAppointments]);
  const totalMetrics = useMemo(() => calculateMetrics(appointments), [appointments]);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    return listenToAppointments(
      setAppointments,
      (snapshotError) => {
        setError(snapshotError.message);
      },
    );
  }, [isAdmin]);

  async function login() {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email?.toLowerCase();

      if (!email || !adminEmails.includes(email)) {
        await signOut(auth);
        setError("Este e-mail não tem acesso ao CRM.");
      }
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Não foi possível entrar no CRM.";
      setError(message.includes("operation-not-allowed") ? "Ative o login com Google no Firebase Authentication." : message);
    }
  }

  async function runAction(appointmentId: string, action: () => Promise<void>) {
    setBusyId(appointmentId);
    setError("");
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar o atendimento.");
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
          <div>
            <p className="crm-kicker">Área restrita</p>
            <h1>CRM LaserFix</h1>
            <p>Acesse com o e-mail autorizado para visualizar agendamentos, iniciar atendimentos e acompanhar métricas.</p>
          </div>
          {error && <p className="crm-error">{error}</p>}
          <button className="crm-primary-button" onClick={login} type="button">
            <ShieldCheck aria-hidden="true" />
            Entrar com Google
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="crm-shell">
      <header className="crm-header">
        <div>
          <p className="crm-kicker">CRM LaserFix</p>
          <h1>Atendimentos e métricas</h1>
          <p>Logado como {user.email}</p>
        </div>
        <button className="crm-secondary-button" onClick={() => signOut(auth)} type="button">
          <LogOut aria-hidden="true" />
          Sair
        </button>
      </header>

      {error && <p className="crm-error">{error}</p>}

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
        <MetricCard icon={CalendarClock} label="Atendimentos no mês" value={String(monthMetrics.appointments)} />
        <MetricCard icon={CheckCircle2} label="Concluídos no mês" value={String(monthMetrics.completed)} />
        <MetricCard icon={DollarSign} label="Valor total no mês" value={formatCurrency(monthMetrics.totalValue)} />
        <MetricCard icon={WalletCards} label="Valor médio" value={formatCurrency(monthMetrics.averageValue)} />
        <MetricCard icon={Clock3} label="Tempo total" value={formatDuration(monthMetrics.totalMinutes)} />
        <MetricCard icon={BarChart3} label="Tempo médio" value={formatDuration(monthMetrics.averageMinutes)} />
      </section>

      <section className="crm-dashboard crm-dashboard-total" aria-label="Métricas gerais">
        <MetricCard icon={CalendarClock} label="Atendimentos gerais" value={String(totalMetrics.appointments)} />
        <MetricCard icon={CheckCircle2} label="Concluídos gerais" value={String(totalMetrics.completed)} />
        <MetricCard icon={DollarSign} label="Valor total geral" value={formatCurrency(totalMetrics.totalValue)} />
        <MetricCard icon={Clock3} label="Tempo total geral" value={formatDuration(totalMetrics.totalMinutes)} />
      </section>

      <section className="crm-panels">
        <div className="crm-panel">
          <h2>Serviços realizados no mês</h2>
          {monthMetrics.serviceCounts.length ? (
            <div className="crm-service-list">
              {monthMetrics.serviceCounts.map((item) => (
                <div key={item.service}>
                  <span>{item.service}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="crm-muted">Nenhum serviço concluído neste mês.</p>
          )}
        </div>
      </section>

      <section className="crm-appointments">
        <div className="crm-section-title">
          <h2>Agendamentos</h2>
          <span>{monthAppointments.length} registro(s)</span>
        </div>

        <div className="crm-list">
          {monthAppointments.map((appointment) => (
            <AppointmentCard
              appointment={appointment}
              busy={busyId === appointment.id}
              key={appointment.id}
              onComplete={() => runAction(appointment.id, () => completeAppointment(appointment))}
              onPayment={(status, date) => runAction(appointment.id, () => updatePaymentStatus(appointment.id, status, date))}
              onSaveNotes={(values) => runAction(appointment.id, () => updateCrmNotes(appointment.id, values))}
              onStart={() => runAction(appointment.id, () => startAppointment(appointment))}
            />
          ))}
          {!monthAppointments.length && <p className="crm-empty">Nenhum agendamento para o mês selecionado.</p>}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <article className="crm-metric-card">
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AppointmentCard({
  appointment,
  busy,
  onComplete,
  onPayment,
  onSaveNotes,
  onStart,
}: {
  appointment: CrmAppointment;
  busy: boolean;
  onComplete: () => void;
  onPayment: (status: PaymentStatus, scheduledDate?: string) => void;
  onSaveNotes: (values: { servicosRealizados?: string; crmObservacoes?: string }) => void;
  onStart: () => void;
}) {
  const [paymentDate, setPaymentDate] = useState(appointment.pagamentoAgendadoPara || "");
  const [selectedServices, setSelectedServices] = useState<string[]>(() => parsePerformedServices(appointment.servicosRealizados));
  const [notes, setNotes] = useState(appointment.crmObservacoes || "");
  const [servicesOpen, setServicesOpen] = useState(false);
  const address = `${appointment.rua}, ${appointment.numero} - ${appointment.bairro}, ${appointment.cidade}`;
  const servicesDone = formatPerformedServices(selectedServices);
  const customerPaymentUrl = buildCustomerWhatsAppUrl(appointment, servicesDone);

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
    <article className="crm-appointment-card">
      <div className="crm-appointment-main">
        <div>
          <div className="crm-card-heading">
            <h3>{appointment.nome}</h3>
            <span className={`crm-status crm-status-${appointment.status}`}>{getStatusLabel(appointment.status)}</span>
          </div>
          <p className="crm-muted">{appointment.empresa || "Sem empresa informada"}</p>
          <p>{formatDate(appointment.data)} às {appointment.horario}</p>
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
              {performedServiceOptions.map((service) => (
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
          <button disabled={busy} onClick={onStart} type="button">
            <Play aria-hidden="true" />
            Iniciar atendimento
          </button>
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
    </article>
  );
}
