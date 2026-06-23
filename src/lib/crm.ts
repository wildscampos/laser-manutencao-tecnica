import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase-client";

export type AppointmentStatus = "agendado" | "atendimento_iniciado" | "concluido";
export type PaymentStatus = "pendente" | "recebido" | "agendado";

export type CrmAppointment = {
  id: string;
  nome: string;
  telefone: string;
  whatsapp: string;
  empresa?: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  modeloMaquina?: string;
  servico: string;
  data: string;
  horario: string;
  observacoes?: string;
  deslocamentoKm?: number;
  deslocamentoValor?: number;
  status: AppointmentStatus;
  createdAtIso?: string;
  atendimentoIniciadoAtIso?: string;
  atendimentoConcluidoAtIso?: string;
  tempoAtendimentoMin?: number;
  valorServico?: number;
  valorTotal?: number;
  gastosAtendimento?: AppointmentChargeExpense[];
  gastosAtendimentoTotal?: number;
  pagamentoStatus?: PaymentStatus;
  pagamentoAgendadoPara?: string;
  servicosRealizados?: string | string[];
  crmObservacoes?: string;
  updatedAtIso?: string;
  clienteId?: string;
  origem?: string;
  retornoDeId?: string;
  retornoSemCobranca?: boolean;
};

export type AppointmentChargeExpense = {
  id: string;
  nome: string;
  valor: number;
};

export type CrmCustomer = {
  id: string;
  nome: string;
  telefone: string;
  whatsapp: string;
  empresa?: string;
  cpfCnpj?: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  modeloMaquina?: string;
  etiquetas?: string;
  preferenciasHorario?: string;
  aniversario?: string;
  camposCustomizados?: string;
  observacoes?: string;
  createdAtIso?: string;
  updatedAtIso?: string;
};

export type CustomerInput = Omit<CrmCustomer, "id" | "createdAtIso" | "updatedAtIso">;

export type CrmService = {
  id: string;
  nome: string;
  descricao: string;
  valorBase: number;
  duracaoMin: number;
  ativo: boolean;
  createdAtIso?: string;
  updatedAtIso?: string;
};

export type ServiceInput = Omit<CrmService, "id" | "createdAtIso" | "updatedAtIso">;

export type ExpenseCategory =
  | "combustivel"
  | "alimentacao"
  | "pedagio"
  | "estacionamento"
  | "pecas"
  | "ferramentas"
  | "materiais"
  | "extras"
  | "outros";

export type CrmExpense = {
  id: string;
  data: string;
  categoria: ExpenseCategory;
  descricao: string;
  valor: number;
  clienteId?: string;
  atendimentoId?: string;
  observacoes?: string;
  createdAtIso?: string;
  updatedAtIso?: string;
};

export type ExpenseInput = Omit<CrmExpense, "id" | "createdAtIso" | "updatedAtIso">;

export type AvailabilityBlockInput = {
  data: string;
  horario: string;
  motivo: string;
};

export type ManualAppointmentInput = {
  clienteId?: string;
  cliente: CustomerInput;
  servico: string;
  data: string;
  horario: string;
  observacoes: string;
};

export type CompletedManualAppointmentInput = ManualAppointmentInput & {
  deslocamentoValor: number;
  pagamentoAgendadoPara?: string;
  pagamentoStatus: PaymentStatus;
  servicosRealizados: string;
  tempoAtendimentoMin: number;
  valorServico: number;
  valorTotal: number;
  gastosAtendimento?: AppointmentChargeExpense[];
};

export type StartedManualAppointmentInput = ManualAppointmentInput & {
  servicosRealizados: string;
};

export type ReturnAppointmentInput = {
  data: string;
  horario: string;
  observacoes: string;
};

export type AppointmentEditInput = {
  servico: string;
  observacoes?: string;
  deslocamentoValor: number;
  valorServico: number;
  valorTotal: number;
  gastosAtendimento?: AppointmentChargeExpense[];
  tempoAtendimentoMin: number;
  pagamentoStatus: PaymentStatus;
  pagamentoAgendadoPara?: string;
  servicosRealizados?: string;
  crmObservacoes?: string;
};

export type CrmMetrics = {
  scheduled: number;
  appointments: number;
  completed: number;
  inProgress: number;
  pendingPayment: number;
  receivedValue: number;
  pendingValue: number;
  scheduledPaymentValue: number;
  totalValue: number;
  averageValue: number;
  totalMinutes: number;
  averageMinutes: number;
  serviceCounts: Array<{ service: string; count: number }>;
};

const firstHourValue = 100;
const additionalHourValue = 50;

function slotId(data: string, horario: string) {
  return `${data}_${horario.replace(":", "-")}`;
}

export function listenToAppointments(onChange: (appointments: CrmAppointment[]) => void, onError: (error: Error) => void): Unsubscribe {
  const appointmentsQuery = query(collection(db, "agendamentos"), orderBy("data", "desc"));

  return onSnapshot(
    appointmentsQuery,
    (snapshot) => {
      onChange(snapshot.docs.map((appointment) => ({ id: appointment.id, ...appointment.data() }) as CrmAppointment));
    },
    onError,
  );
}

export function listenToCustomers(onChange: (customers: CrmCustomer[]) => void, onError: (error: Error) => void): Unsubscribe {
  const customersQuery = query(collection(db, "clientes"), orderBy("nome", "asc"));

  return onSnapshot(
    customersQuery,
    (snapshot) => {
      onChange(snapshot.docs.map((customer) => ({ id: customer.id, ...customer.data() }) as CrmCustomer));
    },
    onError,
  );
}

export function listenToServices(onChange: (services: CrmService[]) => void, onError: (error: Error) => void): Unsubscribe {
  const servicesQuery = query(collection(db, "servicos"), orderBy("nome", "asc"));

  return onSnapshot(
    servicesQuery,
    (snapshot) => {
      onChange(snapshot.docs.map((service) => ({ id: service.id, ...service.data() }) as CrmService));
    },
    onError,
  );
}

export function listenToExpenses(onChange: (expenses: CrmExpense[]) => void, onError: (error: Error) => void): Unsubscribe {
  const expensesQuery = query(collection(db, "gastos"), orderBy("data", "desc"));

  return onSnapshot(
    expensesQuery,
    (snapshot) => {
      onChange(snapshot.docs.map((expense) => ({ id: expense.id, ...expense.data() }) as CrmExpense));
    },
    onError,
  );
}

function normalizeId(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeAppointmentChargeExpenses(expenses: AppointmentChargeExpense[] = []) {
  return expenses
    .map((expense) => ({
      id: expense.id || normalizeId(`${expense.nome}-${Date.now()}`) || `gasto-${Date.now()}`,
      nome: expense.nome.trim(),
      valor: Number(expense.valor) || 0,
    }))
    .filter((expense) => expense.nome && expense.valor > 0);
}

export function calculateAppointmentChargeExpensesTotal(expenses: AppointmentChargeExpense[] = []) {
  return normalizeAppointmentChargeExpenses(expenses).reduce((sum, expense) => sum + expense.valor, 0);
}

export function makeCustomerId(name: string, city: string) {
  const base = normalizeId(`${name || "cliente"}-${city || "sem-cidade"}`) || `cliente-${Date.now()}`;
  return base;
}

export async function saveCustomer(customer: CustomerInput, customerId?: string) {
  const nowIso = new Date().toISOString();
  const normalizedCustomer = {
    ...customer,
    nome: customer.nome.trim() || "Cliente sem nome",
    cidade: customer.cidade || "Guaratinguetá",
  };
  const id = customerId || makeCustomerId(normalizedCustomer.nome, normalizedCustomer.cidade);
  const customerRef = doc(db, "clientes", id);
  const existingCustomer = await getDoc(customerRef);

  await setDoc(
    customerRef,
    {
      id,
      ...normalizedCustomer,
      createdAtIso: existingCustomer.exists() ? existingCustomer.data().createdAtIso || nowIso : nowIso,
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso,
    },
    { merge: true },
  );

  return id;
}

export async function saveService(service: ServiceInput, serviceId?: string) {
  const nowIso = new Date().toISOString();
  const id = serviceId || normalizeId(service.nome) || `servico-${Date.now()}`;
  const serviceRef = doc(db, "servicos", id);
  const existingService = await getDoc(serviceRef);

  await setDoc(
    serviceRef,
    {
      id,
      ...service,
      valorBase: Number(service.valorBase) || 0,
      duracaoMin: Number(service.duracaoMin) || 60,
      ativo: service.ativo !== false,
      createdAtIso: existingService.exists() ? existingService.data().createdAtIso || nowIso : nowIso,
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso,
    },
    { merge: true },
  );

  return id;
}

export async function saveExpense(expense: ExpenseInput, expenseId?: string) {
  const nowIso = new Date().toISOString();
  const expenseRef = expenseId ? doc(db, "gastos", expenseId) : doc(collection(db, "gastos"));
  const existingExpense = expenseId ? await getDoc(expenseRef) : null;

  await setDoc(
    expenseRef,
    {
      id: expenseRef.id,
      ...expense,
      descricao: expense.descricao.trim() || "Gasto sem descrição",
      valor: Number(expense.valor) || 0,
      clienteId: expense.clienteId || "",
      atendimentoId: expense.atendimentoId || "",
      observacoes: expense.observacoes || "",
      createdAtIso: existingExpense?.exists() ? existingExpense.data().createdAtIso || nowIso : nowIso,
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso,
    },
    { merge: true },
  );

  return expenseRef.id;
}

export async function updateCustomer(customerId: string, customer: CustomerInput) {
  return saveCustomer(customer, customerId);
}

export async function updateService(serviceId: string, service: ServiceInput) {
  return saveService(service, serviceId);
}

export async function updateExpense(expenseId: string, expense: ExpenseInput) {
  return saveExpense(expense, expenseId);
}

export async function updateAppointmentDetails(appointmentId: string, values: AppointmentEditInput) {
  const nowIso = new Date().toISOString();
  const serviceValue = Number(values.valorServico) || 0;
  const travelValue = Number(values.deslocamentoValor) || 0;
  const chargeExpenses = normalizeAppointmentChargeExpenses(values.gastosAtendimento);
  const chargeExpensesTotal = calculateAppointmentChargeExpensesTotal(chargeExpenses);
  const totalValue = Number(values.valorTotal) || serviceValue + travelValue + chargeExpensesTotal;

  await updateDoc(doc(db, "agendamentos", appointmentId), {
    servico: values.servico,
    observacoes: values.observacoes || "",
    deslocamentoValor: travelValue,
    valorServico: serviceValue,
    valorTotal: totalValue,
    gastosAtendimento: chargeExpenses,
    gastosAtendimentoTotal: chargeExpensesTotal,
    tempoAtendimentoMin: Math.max(0, Number(values.tempoAtendimentoMin) || 0),
    pagamentoStatus: values.pagamentoStatus,
    pagamentoAgendadoPara: values.pagamentoStatus === "agendado" ? values.pagamentoAgendadoPara || "" : "",
    servicosRealizados: values.servicosRealizados || "",
    crmObservacoes: values.crmObservacoes || "",
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso,
  });
}

export async function updateAppointmentChargeExpenses(appointment: CrmAppointment, expenses: AppointmentChargeExpense[]) {
  const nowIso = new Date().toISOString();
  const chargeExpenses = normalizeAppointmentChargeExpenses(expenses);
  const chargeExpensesTotal = calculateAppointmentChargeExpensesTotal(chargeExpenses);
  const serviceValue = Number(appointment.valorServico) || 0;
  const travelValue = Number(appointment.deslocamentoValor) || 0;

  await updateDoc(doc(db, "agendamentos", appointment.id), {
    gastosAtendimento: chargeExpenses,
    gastosAtendimentoTotal: chargeExpensesTotal,
    valorTotal: serviceValue + travelValue + chargeExpensesTotal,
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso,
  });
}

export async function seedDefaultServices(services: ServiceInput[]) {
  const existingServices = await getDocs(collection(db, "servicos"));
  if (!existingServices.empty) return;
  await Promise.all(services.map((service) => saveService(service)));
}

export async function createManualAppointment(input: ManualAppointmentInput) {
  const nowIso = new Date().toISOString();
  const customer = {
    ...input.cliente,
    nome: input.cliente.nome.trim() || "Cliente sem nome",
    cidade: input.cliente.cidade || "Guaratinguetá",
  };
  const customerId = input.clienteId || makeCustomerId(customer.nome, customer.cidade);
  const appointmentId = slotId(input.data, input.horario);
  const customerRef = doc(db, "clientes", customerId);
  const appointmentRef = doc(db, "agendamentos", appointmentId);
  const slotRef = doc(db, "slots", appointmentId);

  await runTransaction(db, async (transaction) => {
    const slotSnapshot = await transaction.get(slotRef);
    const appointmentSnapshot = await transaction.get(appointmentRef);
    if (slotSnapshot.exists() || appointmentSnapshot.exists()) {
      throw new Error("Este horário já está reservado.");
    }

    const customerSnapshot = await transaction.get(customerRef);
    transaction.set(
      customerRef,
        {
          id: customerId,
          ...customer,
          createdAtIso: customerSnapshot.exists() ? customerSnapshot.data().createdAtIso || nowIso : nowIso,
          updatedAt: serverTimestamp(),
          updatedAtIso: nowIso,
      },
      { merge: true },
    );

    transaction.set(slotRef, {
      id: appointmentId,
      data: input.data,
      horario: input.horario,
      status: "agendado",
      createdAt: serverTimestamp(),
      createdAtIso: nowIso,
      origem: "crm-manual",
    });

    transaction.set(appointmentRef, {
      id: appointmentId,
      clienteId: customerId,
      nome: customer.nome,
      telefone: customer.telefone,
      whatsapp: customer.whatsapp,
      empresa: customer.empresa || "",
      rua: customer.rua,
      numero: customer.numero,
      bairro: customer.bairro,
      cidade: customer.cidade,
      modeloMaquina: customer.modeloMaquina || "",
      servico: input.servico,
      data: input.data,
      horario: input.horario,
      observacoes: input.observacoes,
      deslocamentoKm: 0,
      deslocamentoValor: 0,
      status: "agendado",
      createdAt: serverTimestamp(),
      createdAtIso: nowIso,
      origem: "crm-manual",
    });
  });
}

export async function createCompletedManualAppointment(input: CompletedManualAppointmentInput) {
  const nowIso = new Date().toISOString();
  const customer = {
    ...input.cliente,
    nome: input.cliente.nome.trim() || "Cliente sem nome",
    cidade: input.cliente.cidade || "Guaratinguetá",
  };
  const customerId = input.clienteId || makeCustomerId(customer.nome, customer.cidade);
  const appointmentRef = doc(collection(db, "agendamentos"));
  const customerRef = doc(db, "clientes", customerId);
  const customerSnapshot = await getDoc(customerRef);
  const durationMinutes = Math.max(1, Number(input.tempoAtendimentoMin) || 1);
  const startedAt = new Date(`${input.data}T${input.horario || "12:00"}:00`);
  const safeStartedAt = Number.isFinite(startedAt.getTime()) ? startedAt : new Date();
  const completedAt = new Date(safeStartedAt.getTime() + durationMinutes * 60000);
  const serviceValue = Number(input.valorServico) || 0;
  const travelValue = Number(input.deslocamentoValor) || 0;
  const chargeExpenses = normalizeAppointmentChargeExpenses(input.gastosAtendimento);
  const chargeExpensesTotal = calculateAppointmentChargeExpensesTotal(chargeExpenses);
  const totalValue = Number(input.valorTotal) || serviceValue + travelValue + chargeExpensesTotal;

  await setDoc(
    customerRef,
    {
      id: customerId,
      ...customer,
      createdAtIso: customerSnapshot.exists() ? customerSnapshot.data().createdAtIso || nowIso : nowIso,
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso,
    },
    { merge: true },
  );

  await setDoc(appointmentRef, {
    id: appointmentRef.id,
    clienteId: customerId,
    nome: customer.nome,
    telefone: customer.telefone,
    whatsapp: customer.whatsapp,
    empresa: customer.empresa || "",
    rua: customer.rua || "Não informado",
    numero: customer.numero || "S/N",
    bairro: customer.bairro || "Não informado",
    cidade: customer.cidade,
    modeloMaquina: customer.modeloMaquina || "",
    servico: input.servico,
    data: input.data,
    horario: input.horario || "12:00",
    observacoes: input.observacoes,
    deslocamentoKm: 0,
    deslocamentoValor: travelValue,
    status: "concluido",
    atendimentoIniciadoAtIso: safeStartedAt.toISOString(),
    atendimentoConcluidoAtIso: completedAt.toISOString(),
    tempoAtendimentoMin: durationMinutes,
    valorServico: serviceValue,
    valorTotal: totalValue,
    gastosAtendimento: chargeExpenses,
    gastosAtendimentoTotal: chargeExpensesTotal,
    pagamentoStatus: input.pagamentoStatus,
    pagamentoAgendadoPara: input.pagamentoStatus === "agendado" ? input.pagamentoAgendadoPara || "" : "",
    servicosRealizados: input.servicosRealizados || input.servico,
    crmObservacoes: "Atendimento registrado fora da agenda.",
    createdAt: serverTimestamp(),
    createdAtIso: nowIso,
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso,
    origem: "crm-atendimento-avulso",
  });
}

export async function createStartedManualAppointment(input: StartedManualAppointmentInput) {
  const nowIso = new Date().toISOString();
  const customer = {
    ...input.cliente,
    nome: input.cliente.nome.trim() || "Cliente sem nome",
    cidade: input.cliente.cidade || "Guaratinguetá",
  };
  const customerId = input.clienteId || makeCustomerId(customer.nome, customer.cidade);
  const appointmentRef = doc(collection(db, "agendamentos"));
  const customerRef = doc(db, "clientes", customerId);
  const customerSnapshot = await getDoc(customerRef);

  await setDoc(
    customerRef,
    {
      id: customerId,
      ...customer,
      createdAtIso: customerSnapshot.exists() ? customerSnapshot.data().createdAtIso || nowIso : nowIso,
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso,
    },
    { merge: true },
  );

  await setDoc(appointmentRef, {
    id: appointmentRef.id,
    clienteId: customerId,
    nome: customer.nome,
    telefone: customer.telefone,
    whatsapp: customer.whatsapp,
    empresa: customer.empresa || "",
    rua: customer.rua || "Não informado",
    numero: customer.numero || "S/N",
    bairro: customer.bairro || "Não informado",
    cidade: customer.cidade,
    modeloMaquina: customer.modeloMaquina || "",
    servico: input.servico,
    data: input.data,
    horario: input.horario || "12:00",
    observacoes: input.observacoes,
    deslocamentoKm: 0,
    deslocamentoValor: 0,
    status: "atendimento_iniciado",
    atendimentoIniciadoAtIso: nowIso,
    pagamentoStatus: "pendente",
    servicosRealizados: input.servicosRealizados || input.servico,
    crmObservacoes: "Atendimento avulso iniciado fora da agenda.",
    createdAt: serverTimestamp(),
    createdAtIso: nowIso,
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso,
    origem: "crm-atendimento-avulso",
  });
}

export async function createReturnAppointment(original: CrmAppointment, input: ReturnAppointmentInput) {
  const nowIso = new Date().toISOString();
  const appointmentId = slotId(input.data, input.horario);
  const appointmentRef = doc(db, "agendamentos", appointmentId);
  const slotRef = doc(db, "slots", appointmentId);
  const returnNotes =
    input.observacoes ||
    `Retorno técnico sem cobrança vinculado ao atendimento de ${original.data} às ${original.horario}.`;

  await runTransaction(db, async (transaction) => {
    const slotSnapshot = await transaction.get(slotRef);
    const appointmentSnapshot = await transaction.get(appointmentRef);
    if (slotSnapshot.exists() || appointmentSnapshot.exists()) {
      throw new Error("Este horário já está reservado.");
    }

    transaction.set(slotRef, {
      id: appointmentId,
      data: input.data,
      horario: input.horario,
      status: "agendado",
      createdAt: serverTimestamp(),
      createdAtIso: nowIso,
      origem: "crm-retorno",
      retornoDeId: original.id,
    });

    transaction.set(appointmentRef, {
      id: appointmentId,
      clienteId: original.clienteId || "",
      nome: original.nome,
      telefone: original.telefone || "",
      whatsapp: original.whatsapp || "",
      empresa: original.empresa || "",
      rua: original.rua || "Não informado",
      numero: original.numero || "S/N",
      bairro: original.bairro || "Não informado",
      cidade: original.cidade || "Guaratinguetá",
      modeloMaquina: original.modeloMaquina || "",
      servico: "Retorno técnico sem cobrança",
      data: input.data,
      horario: input.horario,
      observacoes: returnNotes,
      deslocamentoKm: 0,
      deslocamentoValor: 0,
      status: "agendado",
      valorServico: 0,
      valorTotal: 0,
      pagamentoStatus: "recebido",
      servicosRealizados: "Retorno técnico sem cobrança",
      crmObservacoes: `Retorno vinculado ao atendimento ${original.id}.`,
      retornoDeId: original.id,
      retornoSemCobranca: true,
      createdAt: serverTimestamp(),
      createdAtIso: nowIso,
      updatedAt: serverTimestamp(),
      updatedAtIso: nowIso,
      origem: "crm-retorno",
    });
  });
}

export async function blockAvailability(input: AvailabilityBlockInput) {
  const id = slotId(input.data, input.horario);
  const slotRef = doc(db, "slots", id);
  const appointmentRef = doc(db, "agendamentos", id);
  const nowIso = new Date().toISOString();

  await runTransaction(db, async (transaction) => {
    const slotSnapshot = await transaction.get(slotRef);
    const appointmentSnapshot = await transaction.get(appointmentRef);
    if (slotSnapshot.exists() || appointmentSnapshot.exists()) {
      throw new Error("Este horário já está ocupado.");
    }

    transaction.set(slotRef, {
      id,
      data: input.data,
      horario: input.horario,
      status: "bloqueado",
      motivo: input.motivo || "Bloqueio manual",
      createdAt: serverTimestamp(),
      createdAtIso: nowIso,
      origem: "crm-bloqueio",
    });
  });
}

export function calculateServiceValue(durationMinutes: number) {
  const safeDuration = Math.max(1, Math.ceil(durationMinutes));
  const additionalHours = Math.max(0, Math.ceil((safeDuration - 60) / 60));
  return firstHourValue + additionalHours * additionalHourValue;
}

export function calculateDurationMinutes(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / 60000));
}

export async function startAppointment(appointment: CrmAppointment) {
  const nowIso = new Date().toISOString();

  await updateDoc(doc(db, "agendamentos", appointment.id), {
    status: "atendimento_iniciado",
    atendimentoIniciadoAtIso: appointment.atendimentoIniciadoAtIso || nowIso,
    pagamentoStatus: appointment.pagamentoStatus || "pendente",
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso,
  });
}

export async function completeAppointment(appointment: CrmAppointment) {
  const nowIso = new Date().toISOString();
  const startedAt = appointment.atendimentoIniciadoAtIso || nowIso;
  const durationMinutes = calculateDurationMinutes(startedAt, nowIso);
  const isFreeReturn = appointment.retornoSemCobranca === true;
  const serviceValue = isFreeReturn ? 0 : calculateServiceValue(durationMinutes);
  const travelValue = isFreeReturn ? 0 : appointment.deslocamentoValor || 0;
  const chargeExpenses = isFreeReturn ? [] : normalizeAppointmentChargeExpenses(appointment.gastosAtendimento);
  const chargeExpensesTotal = isFreeReturn ? 0 : calculateAppointmentChargeExpensesTotal(chargeExpenses);

  await updateDoc(doc(db, "agendamentos", appointment.id), {
    status: "concluido",
    atendimentoIniciadoAtIso: startedAt,
    atendimentoConcluidoAtIso: nowIso,
    tempoAtendimentoMin: durationMinutes,
    valorServico: serviceValue,
    valorTotal: serviceValue + travelValue + chargeExpensesTotal,
    deslocamentoValor: travelValue,
    gastosAtendimento: chargeExpenses,
    gastosAtendimentoTotal: chargeExpensesTotal,
    pagamentoStatus: isFreeReturn ? "recebido" : appointment.pagamentoStatus || "pendente",
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso,
  });
}

export async function updatePaymentStatus(appointmentId: string, status: PaymentStatus, scheduledDate = "") {
  const nowIso = new Date().toISOString();

  await updateDoc(doc(db, "agendamentos", appointmentId), {
    pagamentoStatus: status,
    pagamentoAgendadoPara: status === "agendado" ? scheduledDate : "",
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso,
  });
}

export async function updateCrmNotes(appointmentId: string, values: { servicosRealizados?: string; crmObservacoes?: string }) {
  const nowIso = new Date().toISOString();

  await updateDoc(doc(db, "agendamentos", appointmentId), {
    servicosRealizados: values.servicosRealizados || "",
    crmObservacoes: values.crmObservacoes || "",
    updatedAt: serverTimestamp(),
    updatedAtIso: nowIso,
  });
}

export function getMonthKey(dateValue: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue.slice(0, 7) : "";
}

export function formatServiceLabel(service: string) {
  const trimmedService = service.trim();
  if (!trimmedService) return "";
  return trimmedService.charAt(0).toLocaleUpperCase("pt-BR") + trimmedService.slice(1);
}

export function normalizeServiceText(value?: string | string[]) {
  if (Array.isArray(value)) return value.map((service) => String(service).trim()).filter(Boolean).join(", ");
  return String(value || "").trim();
}

export function calculateMetrics(appointments: CrmAppointment[]): CrmMetrics {
  const completedAppointments = appointments.filter((appointment) => appointment.status === "concluido");
  const totalValue = completedAppointments.reduce((sum, appointment) => sum + (appointment.valorTotal || 0), 0);
  const receivedValue = completedAppointments
    .filter((appointment) => appointment.pagamentoStatus === "recebido")
    .reduce((sum, appointment) => sum + (appointment.valorTotal || 0), 0);
  const scheduledPaymentValue = completedAppointments
    .filter((appointment) => appointment.pagamentoStatus === "agendado")
    .reduce((sum, appointment) => sum + (appointment.valorTotal || 0), 0);
  const pendingValue = completedAppointments
    .filter((appointment) => !appointment.pagamentoStatus || appointment.pagamentoStatus === "pendente")
    .reduce((sum, appointment) => sum + (appointment.valorTotal || 0), 0);
  const totalMinutes = completedAppointments.reduce((sum, appointment) => sum + (appointment.tempoAtendimentoMin || 0), 0);
  const serviceMap = new Map<string, number>();

  completedAppointments.forEach((appointment) => {
    const services = (normalizeServiceText(appointment.servicosRealizados) || appointment.servico)
      .split(",")
      .map((service) => service.trim())
      .filter(Boolean);
    services.forEach((service) => {
      const serviceLabel = formatServiceLabel(service);
      serviceMap.set(serviceLabel, (serviceMap.get(serviceLabel) || 0) + 1);
    });
  });

  return {
    scheduled: appointments.filter((appointment) => appointment.status !== "concluido").length,
    appointments: appointments.length,
    completed: completedAppointments.length,
    inProgress: appointments.filter((appointment) => appointment.status === "atendimento_iniciado").length,
    pendingPayment: completedAppointments.filter((appointment) => appointment.pagamentoStatus !== "recebido").length,
    receivedValue,
    pendingValue,
    scheduledPaymentValue,
    totalValue,
    averageValue: completedAppointments.length ? totalValue / completedAppointments.length : 0,
    totalMinutes,
    averageMinutes: completedAppointments.length ? totalMinutes / completedAppointments.length : 0,
    serviceCounts: Array.from(serviceMap, ([service, count]) => ({ service, count })).sort((a, b) => b.count - a.count),
  };
}

export function calculateExpenseTotal(expenses: CrmExpense[]) {
  return expenses.reduce((sum, expense) => sum + (Number(expense.valor) || 0), 0);
}
