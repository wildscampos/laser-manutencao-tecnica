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
    "Ola, gostaria de agendar uma manutencao laser.",
    "",
    `Nome: ${input.nome}`,
    `Telefone: ${input.telefone}`,
    `Empresa: ${input.empresa || "Nao informado"}`,
    `Cidade: ${input.cidade}`,
    `Modelo da Maquina: ${input.modeloMaquina || "Nao informado"}`,
    `Servico: ${input.servico}`,
    `Data: ${input.data}`,
    `Horario: ${input.horario}`,
    `Observacoes: ${input.observacoes || "Sem observacoes"}`,
    "",
    "Valor informado:",
    "Primeira hora R$ 100,00.",
    "Horas adicionais R$ 50,00 por hora.",
  ].join("\n");
}

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
