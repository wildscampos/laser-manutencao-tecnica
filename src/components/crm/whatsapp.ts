import { normalizeServiceText, type CrmAppointment } from "@/lib/crm";
import { formatCurrency, formatDate, formatDuration, formatServiceListLabel, getPaymentLabel } from "./formatters";

export function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

function isFilled(value?: string) {
  if (!value) return false;
  const normalizedValue = value.trim().toLowerCase();
  return Boolean(normalizedValue) && !["não informado", "s/n", "-"].includes(normalizedValue);
}

function buildAddressLine(appointment: CrmAppointment) {
  const streetAndNumber = [appointment.rua, appointment.numero].filter(isFilled).join(", ");
  const neighborhoodAndCity = [appointment.bairro, appointment.cidade].filter(isFilled).join(", ");
  return [streetAndNumber, neighborhoodAndCity].filter(Boolean).join(" - ");
}

export function getCustomerPaymentDebts(appointment: CrmAppointment, appointments: CrmAppointment[]) {
  return appointments
    .filter((currentAppointment) => currentAppointment.id !== appointment.id)
    .filter((currentAppointment) => currentAppointment.status === "concluido")
    .filter((currentAppointment) => currentAppointment.pagamentoStatus !== "recebido")
    .filter((currentAppointment) => {
      if (appointment.clienteId && currentAppointment.clienteId === appointment.clienteId) return true;
      const appointmentPhone = normalizeWhatsAppNumber(appointment.whatsapp || appointment.telefone);
      const currentPhone = normalizeWhatsAppNumber(currentAppointment.whatsapp || currentAppointment.telefone);
      if (appointmentPhone && currentPhone && appointmentPhone === currentPhone) return true;
      return currentAppointment.nome.trim().toLowerCase() === appointment.nome.trim().toLowerCase();
    })
    .sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));
}

export function buildAppointmentConfirmationWhatsAppUrl(appointment: CrmAppointment) {
  const phone = normalizeWhatsAppNumber(appointment.whatsapp || appointment.telefone);
  const address = buildAddressLine(appointment);
  const lines: Array<string | undefined> = [
    `Olá, ${appointment.nome}.`,
    "",
    "Confirmando seu atendimento LaserFix:",
    "Técnico: Wilds Campos",
    `Data: ${formatDate(appointment.data)}`,
    `Horário: ${appointment.horario}`,
    isFilled(appointment.servico) ? `Serviço: ${appointment.servico}` : undefined,
    address ? `Endereço: ${address}` : undefined,
    "",
    "Qualquer alteração, me avise pelo WhatsApp.",
  ];
  const message = lines.filter((line): line is string => line !== undefined).join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildCustomerWhatsAppUrl(appointment: CrmAppointment, servicesDone: string, pendingAppointments: CrmAppointment[]) {
  const phone = normalizeWhatsAppNumber(appointment.whatsapp || appointment.telefone);
  const performedServices = servicesDone.trim() || normalizeServiceText(appointment.servicosRealizados) || appointment.servico;
  const currentTotal = appointment.valorTotal || 0;
  const pendingTotal = pendingAppointments.reduce((sum, pendingAppointment) => sum + (pendingAppointment.valorTotal || 0), 0);
  const grandTotal = currentTotal + pendingTotal;
  const pendingLines = pendingAppointments.length
    ? [
        "",
        "Também constam pagamentos anteriores ainda não confirmados:",
        ...pendingAppointments.map((pendingAppointment) =>
          `- ${formatDate(pendingAppointment.data)} · ${formatServiceListLabel(pendingAppointment.servicosRealizados || pendingAppointment.servico)}: ${formatCurrency(pendingAppointment.valorTotal || 0)} (${getPaymentLabel(pendingAppointment.pagamentoStatus)})`,
        ),
        `Total anterior pendente: ${formatCurrency(pendingTotal)}`,
        `Valor total dos atendimentos: ${formatCurrency(grandTotal)}`,
      ]
    : [];
  const lines: Array<string | undefined> = [
    `Olá, ${appointment.nome}.`,
    "",
    "Seu atendimento LaserFix foi concluído.",
    "",
    appointment.tempoAtendimentoMin ? `Tempo do serviço: ${formatDuration(appointment.tempoAtendimentoMin)}` : undefined,
    isFilled(performedServices) ? `Serviços realizados: ${performedServices}` : undefined,
    appointment.valorServico ? `Valor do atendimento: ${formatCurrency(appointment.valorServico)}` : undefined,
    appointment.deslocamentoValor ? `Deslocamento: ${formatCurrency(appointment.deslocamentoValor)}` : undefined,
    currentTotal ? `Valor total: ${formatCurrency(currentTotal)}` : undefined,
    ...pendingLines,
    "",
    "Dados para pagamento via Pix:",
    "Pix Celular: 12981823416",
    "Banco: C6",
    "Nome: Wilds M Campos",
  ];
  const message = lines.filter((line): line is string => line !== undefined).join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
