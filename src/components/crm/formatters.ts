import { formatServiceLabel, normalizeServiceText, type PaymentStatus } from "@/lib/crm";
import { currencyFormatter } from "./constants";
import type { ChartFormat } from "./types";

export function formatCurrency(value = 0) {
  return currencyFormatter.format(value);
}

export function formatDuration(minutes = 0) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (!hours) return `${remainingMinutes} min`;
  return `${hours}h ${String(remainingMinutes).padStart(2, "0")}min`;
}

export function formatDate(dateValue: string) {
  if (!dateValue) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${dateValue}T12:00:00`));
}

export function formatDateTime(iso?: string) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function formatChartMonth(month: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${month}-01T12:00:00`)).replace(".", "");
}

export function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function getCurrentTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function getStatusLabel(status: string) {
  if (status === "atendimento_iniciado") return "Iniciado";
  if (status === "concluido") return "Concluído";
  return "Agendado";
}

export function getPaymentLabel(status?: PaymentStatus) {
  if (status === "recebido") return "Recebido";
  if (status === "agendado") return "Pagamento agendado";
  return "Pendente";
}

export function formatChartValue(value: number, format: ChartFormat) {
  if (format === "currency") return formatCurrency(value);
  if (format === "duration") return formatDuration(value);
  return String(Math.round(value));
}

export function formatServiceListLabel(value: string | string[] = "") {
  return normalizeServiceText(value)
    .split(",")
    .map((service) => formatServiceLabel(service))
    .filter(Boolean)
    .join(", ");
}
