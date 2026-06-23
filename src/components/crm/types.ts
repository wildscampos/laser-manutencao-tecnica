export type CrmView = "dashboard" | "appointments" | "customers" | "history" | "services" | "finance" | "availability";

export type DashboardChartKey =
  | "scheduled"
  | "appointments"
  | "completed"
  | "totalValue"
  | "receivedValue"
  | "pendingValue"
  | "averageValue"
  | "averageHourlyValue"
  | "totalMinutes"
  | "averageMinutes"
  | "totalAppointments"
  | "totalCompleted"
  | "totalGeneralValue"
  | "totalGeneralMinutes";

export type ChartFormat = "currency" | "duration" | "number";

export type DashboardChart = {
  averageValue: number;
  format: ChartFormat;
  key: DashboardChartKey;
  points: Array<{ label: string; value: number }>;
  title: string;
};

export type CrmTheme = "light" | "dark";
