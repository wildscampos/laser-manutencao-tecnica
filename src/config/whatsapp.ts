export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5512981823416";

type WhatsAppMessageInput = {
  nome: string;
  telefone: string;
  empresa?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade: string;
  modeloMaquina?: string;
  servico: string;
  data: string;
  horario: string;
  observacoes?: string;
  deslocamentoKm?: number;
  deslocamentoValor?: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}

export function buildWhatsAppMessage(input: WhatsAppMessageInput) {
  const hasTravelFee = Boolean(input.deslocamentoValor && input.deslocamentoValor > 0);

  return [
    "Olá, gostaria de agendar uma manutenção laser.",
    "",
    `Nome: ${input.nome}`,
    `Telefone: ${input.telefone}`,
    `Empresa: ${input.empresa || "Não informado"}`,
    `Endereço: ${input.rua || "Não informado"}, ${input.numero || "s/n"} - ${input.bairro || "Não informado"}`,
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
    hasTravelFee
      ? `Deslocamento: ${input.deslocamentoKm} km x R$ 2,00 = ${formatCurrency(input.deslocamentoValor || 0)}.`
      : "Deslocamento: sem cobrança para esta cidade.",
  ].join("\n");
}

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
