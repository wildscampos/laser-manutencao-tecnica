import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/config/whatsapp";
import { db } from "./firebase-client";
import { getAvailableTimesForDate } from "./schedule";
import { getTravelFee } from "./service-area";
import type { AppointmentInput } from "./validation";

export function slotId(data: string, horario: string) {
  return `${data}_${horario.replace(":", "-")}`;
}

export async function getFreeTimes(data: string) {
  const allowedTimes = getAvailableTimesForDate(data);
  const snapshot = await getDocs(query(collection(db, "slots"), where("data", "==", data)));
  const bookedTimes = new Set(
    snapshot.docs
      .filter((slot) => slot.data().status === "agendado")
      .map((slot) => slot.data().horario as string),
  );

  return allowedTimes.filter((time) => !bookedTimes.has(time));
}

export async function getBookedTimesByDate(startDate: string, endDate: string) {
  const snapshot = await getDocs(
    query(
      collection(db, "slots"),
      where("data", ">=", startDate),
      where("data", "<=", endDate),
    ),
  );

  return snapshot.docs.reduce<Record<string, string[]>>((bookedByDate, slot) => {
    const slotData = slot.data();
    if (slotData.status !== "agendado") return bookedByDate;

    const data = slotData.data as string;
    const horario = slotData.horario as string;
    bookedByDate[data] = [...(bookedByDate[data] || []), horario];
    return bookedByDate;
  }, {});
}

export async function createClientAppointment(input: AppointmentInput) {
  const id = slotId(input.data, input.horario);
  const slotRef = doc(db, "slots", id);
  const appointmentRef = doc(db, "agendamentos", id);
  const createdAtIso = new Date().toISOString();
  const travelFee = getTravelFee(input.cidade);

  await runTransaction(db, async (transaction) => {
    const slot = await transaction.get(slotRef);
    if (slot.exists()) {
      throw new SlotAlreadyBookedError();
    }

    transaction.set(slotRef, {
      id,
      data: input.data,
      horario: input.horario,
      status: "agendado",
      createdAt: serverTimestamp(),
      createdAtIso,
    });

    transaction.set(appointmentRef, {
      id,
      nome: input.nome,
      telefone: input.telefone,
      whatsapp: input.whatsapp,
      empresa: input.empresa || "",
      rua: input.rua,
      numero: input.numero,
      bairro: input.bairro,
      cidade: input.cidade,
      modeloMaquina: input.modeloMaquina || "",
      servico: input.servico,
      data: input.data,
      horario: input.horario,
      observacoes: input.observacoes || "",
      deslocamentoKm: travelFee.distanceKm,
      deslocamentoValor: travelFee.fee,
      status: "agendado",
      createdAt: serverTimestamp(),
      createdAtIso,
    });
  });

  const message = buildWhatsAppMessage({
    nome: input.nome,
    telefone: input.telefone,
    empresa: input.empresa,
    rua: input.rua,
    numero: input.numero,
    bairro: input.bairro,
    cidade: input.cidade,
    modeloMaquina: input.modeloMaquina,
    servico: input.servico,
    data: input.data,
    horario: input.horario,
    observacoes: input.observacoes,
    deslocamentoKm: travelFee.distanceKm,
    deslocamentoValor: travelFee.fee,
  });

  return {
    id,
    message: "Agendamento confirmado com sucesso.",
    whatsappUrl: buildWhatsAppUrl(message),
  };
}

export class SlotAlreadyBookedError extends Error {
  constructor() {
    super("Horário já reservado.");
    this.name = "SlotAlreadyBookedError";
  }
}
