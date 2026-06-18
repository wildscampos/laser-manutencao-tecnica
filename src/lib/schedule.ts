export const WEEKDAY_TIMES = ["18:00", "19:00", "20:00"] as const;
export const SATURDAY_TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00"] as const;

export const SERVICES = [
  "Manutenção Preventiva",
  "Manutenção Corretiva",
  "Alinhamento Óptico",
  "Substituição de Componentes",
  "Software RD Works",
] as const;

export function getAvailableTimesForDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return [];

  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const dayOfWeek = date.getUTCDay();

  if (dayOfWeek === 0) return [];
  if (dayOfWeek === 6) return [...SATURDAY_TIMES] as string[];
  return [...WEEKDAY_TIMES] as string[];
}

export function isValidSlot(dateValue: string, timeValue: string) {
  return getAvailableTimesForDate(dateValue).includes(timeValue);
}

export function toBrazilianDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
}
