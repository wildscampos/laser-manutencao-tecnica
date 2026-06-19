import { z } from "zod";
import { SERVICES, isValidSlot } from "./schedule";
import { SERVICE_CITIES } from "./service-area";

const phoneRegex = /^[0-9+()\-\s]{8,20}$/;

export const appointmentSchema = z
  .object({
    nome: z.string().trim().min(3, "Informe seu nome completo.").max(100),
    telefone: z.string().trim().regex(phoneRegex, "Informe um telefone válido."),
    whatsapp: z.string().trim().regex(phoneRegex, "Informe um WhatsApp válido."),
    empresa: z.string().trim().max(120).optional().or(z.literal("")),
    rua: z.string().trim().min(3, "Informe a rua.").max(120),
    numero: z.string().trim().min(1, "Informe o número.").max(20),
    bairro: z.string().trim().min(2, "Informe o bairro.").max(80),
    cidade: z.enum(SERVICE_CITIES, { error: "Selecione a cidade." }),
    modeloMaquina: z.string().trim().max(120).optional().or(z.literal("")),
    servico: z.enum(SERVICES, { error: "Selecione o serviço desejado." }),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha uma data válida."),
    horario: z.string().regex(/^\d{2}:\d{2}$/, "Escolha um horário válido."),
    observacoes: z.string().trim().max(800).optional().or(z.literal("")),
    fotoNome: z.string().trim().max(180).optional().or(z.literal("")),
    website: z.string().max(0).optional().or(z.literal("")),
    formStartedAt: z.number().optional(),
  })
  .superRefine((value, ctx) => {
    if (!isValidSlot(value.data, value.horario)) {
      ctx.addIssue({
        code: "custom",
        path: ["horario"],
        message: "Horário indisponível para a data selecionada.",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(`${value.data}T12:00:00`);
    if (selected < today) {
      ctx.addIssue({
        code: "custom",
        path: ["data"],
        message: "Escolha uma data futura.",
      });
    }
  });

export type AppointmentInput = z.infer<typeof appointmentSchema>;
