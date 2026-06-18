import { z } from "zod";
import { SERVICES, isValidSlot } from "./schedule";

const phoneRegex = /^[0-9+()\-\s]{8,20}$/;

export const appointmentSchema = z
  .object({
    nome: z.string().trim().min(3, "Informe seu nome completo.").max(100),
    telefone: z.string().trim().regex(phoneRegex, "Informe um telefone valido."),
    whatsapp: z.string().trim().regex(phoneRegex, "Informe um WhatsApp valido."),
    empresa: z.string().trim().max(120).optional().or(z.literal("")),
    cidade: z.string().trim().min(2, "Informe a cidade.").max(100),
    modeloMaquina: z.string().trim().max(120).optional().or(z.literal("")),
    servico: z.enum(SERVICES, { error: "Selecione o servico desejado." }),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha uma data valida."),
    horario: z.string().regex(/^\d{2}:\d{2}$/, "Escolha um horario valido."),
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
        message: "Horario indisponivel para a data selecionada.",
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
