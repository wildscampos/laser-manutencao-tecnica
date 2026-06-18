export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5512981823416";

type WhatsAppMessageInput = {
  nome: string;
  telefone: string;
  empresa?: string;
  cidade: string;
  modeloMaquina?: string;
  servico: string;
  data: string;
  horario: string;
  observacoes?: string;
};

export function buildWhatsAppMessage(input: WhatsAppMessageInput) {
  return [
    "Olá, gostaria de agendar uma manutenção laser.",
    "",
    `Nome: ${input.nome}`,
    `Telefone: ${input.telefone}`,
    `Empresa: ${input.empresa || "Não informado"}`,
    `Cidade: ${input.cidade}`,
    `Modelo da Máquina: ${input.modeloMaquina || "Não informado"}`,
    `Serviço: ${input.servico}`,
    `Data: ${input.data}`,
    `Horário: ${input.horario}`,
    `Observações: ${input.observacoes || "Sem observações"}`,
    "",
    "Valor informado:",
    "Primeira hora R$ 100,00.",
    "Horas adicionais R$ 50,00 por hora.",
  ].join("\n");
}

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
