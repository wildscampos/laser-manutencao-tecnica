import { promises as fs } from "node:fs";
import path from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { hasFirebaseAdminConfig, getAdminDb } from "./firebase-admin";
import { getAvailableTimesForDate } from "./schedule";
import type { AppointmentInput } from "./validation";

export type Appointment = Omit<AppointmentInput, "website" | "formStartedAt"> & {
  id: string;
  status: "agendado";
  createdAt: string;
};

const COLLECTION = "agendamentos";
const localDbPath = path.join(process.cwd(), ".local-data", "appointments.json");

export function slotId(data: string, horario: string) {
  return `${data}_${horario.replace(":", "-")}`;
}

async function readLocalAppointments(): Promise<Record<string, Appointment>> {
  try {
    return JSON.parse(await fs.readFile(localDbPath, "utf8")) as Record<string, Appointment>;
  } catch {
    return {};
  }
}

async function writeLocalAppointments(data: Record<string, Appointment>) {
  await fs.mkdir(path.dirname(localDbPath), { recursive: true });
  await fs.writeFile(localDbPath, JSON.stringify(data, null, 2));
}

export async function getBookedTimes(data: string) {
  if (hasFirebaseAdminConfig()) {
    const snapshot = await getAdminDb()
      .collection(COLLECTION)
      .where("data", "==", data)
      .where("status", "==", "agendado")
      .get();

    return snapshot.docs.map((doc) => doc.get("horario") as string);
  }

  const local = await readLocalAppointments();
  return Object.values(local)
    .filter((appointment) => appointment.data === data && appointment.status === "agendado")
    .map((appointment) => appointment.horario);
}

export async function getFreeTimes(data: string) {
  const allowedTimes = getAvailableTimesForDate(data);
  const bookedTimes = new Set(await getBookedTimes(data));
  return allowedTimes.filter((time) => !bookedTimes.has(time));
}

export async function createAppointment(input: AppointmentInput) {
  const id = slotId(input.data, input.horario);
  const createdAt = new Date().toISOString();
  const appointment: Appointment = {
    id,
    nome: input.nome,
    telefone: input.telefone,
    whatsapp: input.whatsapp,
    empresa: input.empresa || "",
    cidade: input.cidade,
    modeloMaquina: input.modeloMaquina || "",
    servico: input.servico,
    data: input.data,
    horario: input.horario,
    observacoes: input.observacoes || "",
    fotoNome: input.fotoNome || "",
    status: "agendado",
    createdAt,
  };

  if (hasFirebaseAdminConfig()) {
    const db = getAdminDb();
    const ref = db.collection(COLLECTION).doc(id);

    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) {
        throw new SlotAlreadyBookedError();
      }

      transaction.create(ref, {
        ...appointment,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: createdAt,
      });
    });

    return appointment;
  }

  const local = await readLocalAppointments();
  if (local[id]) {
    throw new SlotAlreadyBookedError();
  }

  local[id] = appointment;
  await writeLocalAppointments(local);
  return appointment;
}

export class SlotAlreadyBookedError extends Error {
  constructor() {
    super("Horario ja reservado.");
    this.name = "SlotAlreadyBookedError";
  }
}
