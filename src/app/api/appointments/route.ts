import { NextResponse } from "next/server";
import { createAppointment, SlotAlreadyBookedError } from "@/lib/appointments";
import { appointmentSchema } from "@/lib/validation";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/config/whatsapp";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = appointmentSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos.", issues: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    if (parsed.data.website) {
      return NextResponse.json({ error: "Solicitacao bloqueada." }, { status: 400 });
    }

    if (parsed.data.formStartedAt && Date.now() - parsed.data.formStartedAt < 2500) {
      return NextResponse.json({ error: "Envio muito rapido. Tente novamente." }, { status: 429 });
    }

    const appointment = await createAppointment(parsed.data);
    const message = buildWhatsAppMessage({
      nome: appointment.nome,
      telefone: appointment.telefone,
      empresa: appointment.empresa,
      cidade: appointment.cidade,
      modeloMaquina: appointment.modeloMaquina,
      servico: appointment.servico,
      data: appointment.data,
      horario: appointment.horario,
      observacoes: appointment.observacoes,
    });

    return NextResponse.json({
      appointment,
      whatsappUrl: buildWhatsAppUrl(message),
      message: "Agendamento confirmado com sucesso.",
    });
  } catch (error) {
    if (error instanceof SlotAlreadyBookedError) {
      return NextResponse.json({ error: "Este horario acabou de ser reservado." }, { status: 409 });
    }

    console.error("appointment_error", error);
    return NextResponse.json({ error: "Nao foi possivel salvar o agendamento." }, { status: 500 });
  }
}
