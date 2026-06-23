import type { CustomerInput, ExpenseCategory, ServiceInput } from "@/lib/crm";

export const crmLoginName = "Wilds Campos";
export const crmLoginEmail = "wilds.campos@laserfix.app";
export const crmThemeStorageKey = "laserfix-crm-theme";

export const adminEmails = (process.env.NEXT_PUBLIC_CRM_ADMIN_EMAILS || "wilds.campos@laserfix.app,wilds.mc@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

export const performedServiceOptions = [
  "Manutenção preventiva",
  "Manutenção corretiva",
  "Limpeza técnica",
  "Alinhamento óptico",
  "Troca de espelhos",
  "Troca de lente",
  "Troca de tubo CO₂",
  "Troca de fonte",
  "Troca de driver",
  "Troca de painel",
  "Troca de controladora",
  "Troca de sensor de fim de curso",
  "Configuração de motor de passo",
  "Configuração RD Works",
  "Backup/restauração de parâmetros",
  "Criação de arte para corte e gravação",
  "Testes operacionais",
];

export const defaultServiceCatalog: ServiceInput[] = performedServiceOptions.map((serviceName) => ({
  nome: serviceName,
  descricao: "Serviço técnico LaserFix para máquinas de corte e gravação laser CO₂.",
  valorBase: serviceName.includes("arte") || serviceName.includes("Arte") ? 40 : 100,
  duracaoMin: serviceName.includes("arte") || serviceName.includes("Arte") ? 60 : 60,
  ativo: true,
}));

export const cityOptions = ["Aparecida", "Cachoeira Paulista", "Canas", "Guaratinguetá", "Lorena", "Potim"];

export const expenseCategoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "combustivel", label: "Combustível" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "pedagio", label: "Pedágio" },
  { value: "estacionamento", label: "Estacionamento" },
  { value: "pecas", label: "Peças" },
  { value: "ferramentas", label: "Ferramentas" },
  { value: "materiais", label: "Materiais" },
  { value: "extras", label: "Gastos extras" },
  { value: "outros", label: "Outros" },
];

export const emptyCustomer: CustomerInput = {
  nome: "",
  telefone: "",
  whatsapp: "",
  empresa: "",
  cpfCnpj: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "Guaratinguetá",
  modeloMaquina: "",
  etiquetas: "",
  preferenciasHorario: "",
  aniversario: "",
  camposCustomizados: "",
  observacoes: "",
};
