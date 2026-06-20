import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
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
};

export type CrmMetrics = {
  appointments: number;
  completed: number;
  inProgress: number;
  pendingPayment: number;
  totalValue: number;
  averageValue: number;
  totalMinutes: number;
  averageMinutes: number;
  serviceCounts: Array<{ service: string; count: number }>;
};

const firstHourValue = 100;
const additionalHourValue = 50;

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

export function calculateMetrics(appointments: CrmAppointment[]): CrmMetrics {
  const completedAppointments = appointments.filter((appointment) => appointment.status === "concluido");
  const totalValue = completedAppointments.reduce((sum, appointment) => sum + (appointment.valorTotal || 0), 0);
  const totalMinutes = completedAppointments.reduce((sum, appointment) => sum + (appointment.tempoAtendimentoMin || 0), 0);
  const serviceMap = new Map<string, number>();

  completedAppointments.forEach((appointment) => {
    const service = appointment.servicosRealizados?.trim() || appointment.servico;
    serviceMap.set(service, (serviceMap.get(service) || 0) + 1);
  });

  return {
    appointments: appointments.length,
    completed: completedAppointments.length,
    inProgress: appointments.filter((appointment) => appointment.status === "atendimento_iniciado").length,
    pendingPayment: completedAppointments.filter((appointment) => appointment.pagamentoStatus !== "recebido").length,
    totalValue,
    averageValue: completedAppointments.length ? totalValue / completedAppointments.length : 0,
    totalMinutes,
    averageMinutes: completedAppointments.length ? totalMinutes / completedAppointments.length : 0,
    serviceCounts: Array.from(serviceMap, ([service, count]) => ({ service, count })).sort((a, b) => b.count - a.count),
  };
}
