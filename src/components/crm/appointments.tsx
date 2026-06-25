"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Play, Plus, Save, WalletCards } from "lucide-react";
import { getFreeTimes } from "@/lib/client-appointments";
import { getAvailableTimesForDate } from "@/lib/schedule";
import {
  getMonthKey,
  normalizeServiceText,
  calculateAppointmentChargeExpensesTotal,
  normalizeAppointmentChargeExpenses,
  type AppointmentChargeExpense,
  type AppointmentEditInput,
  type CompletedManualAppointmentInput,
  type CrmAppointment,
  type CrmCustomer,
  type CustomerInput,
  type ManualAppointmentInput,
  type PaymentStatus,
  type ReturnAppointmentInput,
  type StartedManualAppointmentInput,
} from "@/lib/crm";
import { cityOptions, emptyCustomer, monthFormatter, performedServiceOptions } from "@/components/crm/constants";
import { CrmInput } from "@/components/crm/form-controls";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDuration,
  getCurrentTimeValue,
  getPaymentLabel,
  getStatusLabel,
} from "@/components/crm/formatters";
import { useAutoMonthSelection } from "@/components/crm/month-selection";
import {
  buildAppointmentConfirmationWhatsAppUrl,
  buildCustomerWhatsAppUrl,
  getCustomerPaymentDebts,
  normalizeWhatsAppNumber,
} from "@/components/crm/whatsapp";
import { AnimatePresence, motion, panelReveal } from "@/components/ui/motion";
function parsePerformedServices(value: string | string[] = "") {
  return normalizeServiceText(value)
    .split(",")
    .map((service) => service.trim())
    .filter(Boolean);
}

function formatPerformedServices(values: string[]) {
  return values.join(", ");
}

export function AppointmentsView({
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
  onSaveChargeExpenses,
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
  onSaveChargeExpenses: (appointment: CrmAppointment, expenses: AppointmentChargeExpense[]) => Promise<boolean>;
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
              onSaveChargeExpenses={(expenses) => onSaveChargeExpenses(appointment, expenses)}
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
                onSaveChargeExpenses={(expenses) => onSaveChargeExpenses(appointment, expenses)}
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
  onSaveChargeExpenses,
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
  onSaveChargeExpenses: (expenses: AppointmentChargeExpense[]) => Promise<boolean>;
  onSaveNotes: (values: { servicosRealizados?: string; crmObservacoes?: string }) => void;
  onStart: () => void;
  onToggle: () => void;
  serviceOptions: string[];
}) {
  const [paymentDate, setPaymentDate] = useState(appointment.pagamentoAgendadoPara || "");
  const [selectedServices, setSelectedServices] = useState<string[]>(() => parsePerformedServices(appointment.servicosRealizados));
  const [chargeExpenses, setChargeExpenses] = useState<AppointmentChargeExpense[]>(() =>
    normalizeAppointmentChargeExpenses(appointment.gastosAtendimento),
  );
  const [notes, setNotes] = useState(appointment.crmObservacoes || "");
  const [servicesOpen, setServicesOpen] = useState(false);
  const address = `${appointment.rua}, ${appointment.numero} - ${appointment.bairro}, ${appointment.cidade}`;
  const servicesDone = formatPerformedServices(selectedServices);
  const pendingPayments = getCustomerPaymentDebts(appointment, allAppointments);
  const appointmentConfirmationUrl = buildAppointmentConfirmationWhatsAppUrl(appointment);
  const customerPaymentUrl = buildCustomerWhatsAppUrl(appointment, servicesDone, pendingPayments);
  const isFreeReturn = appointment.retornoSemCobranca === true;
  const chargeExpensesTotal = calculateAppointmentChargeExpensesTotal(chargeExpenses);
  const savedChargeExpensesTotal = appointment.gastosAtendimentoTotal || calculateAppointmentChargeExpensesTotal(appointment.gastosAtendimento);
  const displayTotal = (appointment.valorServico || 0) + (appointment.deslocamentoValor || 0) + chargeExpensesTotal;

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
    <motion.article layout className={`crm-appointment-card crm-appointment-accordion ${isOpen ? "crm-appointment-open" : ""}`}>
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

      <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div {...panelReveal} className="crm-motion-panel">
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
              {!!chargeExpensesTotal && <span>Gastos do atendimento: {formatCurrency(chargeExpensesTotal)}</span>}
              <strong>Total: {formatCurrency(chargeExpensesTotal !== savedChargeExpensesTotal ? displayTotal : appointment.valorTotal || displayTotal || 0)}</strong>
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
            {!isFreeReturn && (
              <AppointmentChargeExpenses
                busy={busy}
                expenses={chargeExpenses}
                onChange={setChargeExpenses}
                onSave={() => onSaveChargeExpenses(chargeExpenses)}
              />
            )}
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
              <AnimatePresence initial={false}>
              {servicesOpen && (
                <motion.div {...panelReveal} className="crm-service-options">
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
                </motion.div>
              )}
              </AnimatePresence>
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
        </motion.div>
      )}
      </AnimatePresence>
    </motion.article>
  );
}

function AppointmentChargeExpenses({
  busy,
  expenses,
  onChange,
  onSave,
}: {
  busy: boolean;
  expenses: AppointmentChargeExpense[];
  onChange: (expenses: AppointmentChargeExpense[]) => void;
  onSave: () => Promise<boolean>;
}) {
  const [newExpense, setNewExpense] = useState({ nome: "", valor: "" });
  const expensesTotal = calculateAppointmentChargeExpensesTotal(expenses);

  function addExpense() {
    const normalizedValue = Number(newExpense.valor) || 0;
    if (!newExpense.nome.trim() || normalizedValue <= 0) return;
    onChange([
      ...expenses,
      {
        id: `gasto-${Date.now()}`,
        nome: newExpense.nome.trim(),
        valor: normalizedValue,
      },
    ]);
    setNewExpense({ nome: "", valor: "" });
  }

  function removeExpense(expenseId: string) {
    onChange(expenses.filter((expense) => expense.id !== expenseId));
  }

  return (
    <div className="crm-service-picker crm-charge-expenses">
      <div className="crm-service-toggle">
        <span>Gastos do atendimento</span>
        <strong>{formatCurrency(expensesTotal)}</strong>
      </div>
      <div className="crm-charge-expense-form">
        <input
          aria-label="Nome do gasto"
          placeholder="Nome do gasto"
          value={newExpense.nome}
          onChange={(event) => setNewExpense((current) => ({ ...current, nome: event.target.value }))}
        />
        <input
          aria-label="Valor do gasto"
          inputMode="decimal"
          placeholder="Valor"
          type="number"
          value={newExpense.valor}
          onChange={(event) => setNewExpense((current) => ({ ...current, valor: event.target.value }))}
        />
        <button className="crm-secondary-button" onClick={addExpense} type="button">
          <Plus aria-hidden="true" />
          Adicionar
        </button>
      </div>
      {expenses.length > 0 && (
        <div className="crm-charge-expense-list">
          {expenses.map((expense) => (
            <div key={expense.id}>
              <span>{expense.nome}</span>
              <strong>{formatCurrency(expense.valor)}</strong>
              <button aria-label={`Remover ${expense.nome}`} onClick={() => removeExpense(expense.id)} type="button">
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
      <button className="crm-save-services" disabled={busy} onClick={onSave} type="button">
        <Save aria-hidden="true" />
        Salvar gastos
      </button>
    </div>
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
    gastosAtendimento: normalizeAppointmentChargeExpenses(appointment.gastosAtendimento),
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
      valorTotal:
        (Number(current.valorServico) || 0) +
        (Number(current.deslocamentoValor) || 0) +
        calculateAppointmentChargeExpensesTotal(current.gastosAtendimento),
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
      <label>
        <span>Gastos do atendimento</span>
        <input readOnly value={String(calculateAppointmentChargeExpensesTotal(values.gastosAtendimento))} />
      </label>
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
