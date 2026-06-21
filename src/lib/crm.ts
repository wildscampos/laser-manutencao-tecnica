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
  pagamentoStatus?: PaymentStatus;
  pagamentoAgendadoPara?: string;
  servicosRealizados?: string;
  crmObservacoes?: string;
  updatedAtIso?: string;
  clienteId?: string;
  origem?: string;
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

export type AppointmentEditInput = {
  servico: string;
  observacoes?: string;
  deslocamentoValor: number;
  valorServico: number;
  valorTotal: number;
  tempoAtendimentoMin: number;
  pagamentoStatus: PaymentStatus;
  pagamentoAgendadoPara?: string;
  servicosRealizados?: string;
  crmObservacoes?: string;
};

export type CrmMetrics = {
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

function normalizeId(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function makeCustomerId(name: string, city: string) {
  const base = normalizeId(`${name}-${city}`) || `cliente-${Date.now()}`;
  return base;
}

export async function saveCustomer(customer: CustomerInput, customerId?: string) {
  const nowIso = new Date().toISOString();
  const id = customerId || makeCustomerId(customer.nome, customer.cidade);
  const customerRef = doc(db, "clientes", id);
  const existingCustomer = await getDoc(customerRef);

  await setDoc(
    customerRef,
    {
      id,
      ...customer,
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

export async function updateCustomer(customerId: string, customer: CustomerInput) {
  return saveCustomer(customer, customerId);
}

export async function updateService(serviceId: string, service: ServiceInput) {
  return saveService(service, serviceId);
}

export async function updateAppointmentDetails(appointmentId: string, values: AppointmentEditInput) {
  const nowIso = new Date().toISOString();
  const serviceValue = Number(values.valorServico) || 0;
  const travelValue = Number(values.deslocamentoValor) || 0;
  const totalValue = Number(values.valorTotal) || serviceValue + travelValue;

  await updateDoc(doc(db, "agendamentos", appointmentId), {
    servico: values.servico,
    observacoes: values.observacoes || "",
    deslocamentoValor: travelValue,
    valorServico: serviceValue,
    valorTotal: totalValue,
    tempoAtendimentoMin: Math.max(0, Number(values.tempoAtendimentoMin) || 0),
    pagamentoStatus: values.pagamentoStatus,
    pagamentoAgendadoPara: values.pagamentoStatus === "agendado" ? values.pagamentoAgendadoPara || "" : "",
    servicosRealizados: values.servicosRealizados || "",
    crmObservacoes: values.crmObservacoes || "",
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
  const customerId = input.clienteId || makeCustomerId(input.cliente.nome, input.cliente.cidade);
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
        ...input.cliente,
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
      nome: input.cliente.nome,
      telefone: input.cliente.telefone,
      whatsapp: input.cliente.whatsapp,
      empresa: input.cliente.empresa || "",
      rua: input.cliente.rua,
      numero: input.cliente.numero,
      bairro: input.cliente.bairro,
      cidade: input.cliente.cidade,
      modeloMaquina: input.cliente.modeloMaquina || "",
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
  const serviceValue = calculateServiceValue(durationMinutes);
  const travelValue = appointment.deslocamentoValor || 0;

  await updateDoc(doc(db, "agendamentos", appointment.id), {
    status: "concluido",
    atendimentoIniciadoAtIso: startedAt,
    atendimentoConcluidoAtIso: nowIso,
    tempoAtendimentoMin: durationMinutes,
    valorServico: serviceValue,
    valorTotal: serviceValue + travelValue,
    pagamentoStatus: appointment.pagamentoStatus || "pendente",
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
    const services = (appointment.servicosRealizados?.trim() || appointment.servico)
      .split(",")
      .map((service) => service.trim())
      .filter(Boolean);
    services.forEach((service) => {
      const serviceLabel = formatServiceLabel(service);
      serviceMap.set(serviceLabel, (serviceMap.get(serviceLabel) || 0) + 1);
    });
  });

  return {
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
