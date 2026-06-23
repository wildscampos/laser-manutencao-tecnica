"use client";

import type { ElementType } from "react";
import { BarChart3, CalendarClock, CheckCircle2, Clock3, DollarSign, WalletCards } from "lucide-react";
import { calculateMetrics, getMonthKey, type CrmAppointment } from "@/lib/crm";
import { monthFormatter } from "@/components/crm/constants";
import {
  formatChartMonth,
  formatChartValue,
  formatCurrency,
  formatDate,
  formatDuration,
  formatServiceListLabel,
  getStatusLabel,
} from "@/components/crm/formatters";
import type { ChartFormat, DashboardChart, DashboardChartKey } from "@/components/crm/types";

function getChartMetricValue(metrics: ReturnType<typeof calculateMetrics>, key: DashboardChartKey) {
  if (key === "scheduled") return metrics.scheduled;
  if (key === "appointments" || key === "totalAppointments") return metrics.appointments;
  if (key === "completed" || key === "totalCompleted") return metrics.completed;
  if (key === "totalValue" || key === "totalGeneralValue") return metrics.totalValue;
  if (key === "receivedValue") return metrics.receivedValue;
  if (key === "pendingValue") return metrics.pendingValue + metrics.scheduledPaymentValue;
  if (key === "averageValue") return metrics.averageValue;
  if (key === "averageHourlyValue") return getAverageHourlyValue(metrics);
  if (key === "totalMinutes" || key === "totalGeneralMinutes") return metrics.totalMinutes;
  if (key === "averageMinutes") return metrics.averageMinutes;
  return 0;
}

function getAverageHourlyValue(metrics: ReturnType<typeof calculateMetrics>) {
  return metrics.totalMinutes > 0 ? metrics.totalValue / (metrics.totalMinutes / 60) : 0;
}

function getChartMonths(selectedMonth: string) {
  const year = selectedMonth.slice(0, 4);
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
}

function buildDashboardCharts(appointments: CrmAppointment[], selectedMonth: string) {
  const yearMonths = getChartMonths(selectedMonth);
  const chartConfigs: Array<{ key: DashboardChartKey; title: string; format: ChartFormat; cumulative?: boolean }> = [
    { key: "scheduled", title: "Atendimentos pendentes por mês", format: "number" },
    { key: "appointments", title: "Atendimentos por mês", format: "number" },
    { key: "completed", title: "Concluídos por mês", format: "number" },
    { key: "totalValue", title: "Valor total por mês", format: "currency" },
    { key: "receivedValue", title: "Recebido por mês", format: "currency" },
    { key: "pendingValue", title: "A receber por mês", format: "currency" },
    { key: "averageValue", title: "Valor médio por atendimento", format: "currency" },
    { key: "averageHourlyValue", title: "Valor médio por hora", format: "currency" },
    { key: "totalMinutes", title: "Tempo total por mês", format: "duration" },
    { key: "averageMinutes", title: "Tempo médio por mês", format: "duration" },
    { key: "totalAppointments", title: "Atendimentos gerais acumulados", format: "number", cumulative: true },
    { key: "totalCompleted", title: "Concluídos gerais acumulados", format: "number", cumulative: true },
    { key: "totalGeneralValue", title: "Valor total geral acumulado", format: "currency", cumulative: true },
    { key: "totalGeneralMinutes", title: "Tempo total geral acumulado", format: "duration", cumulative: true },
  ];

  return chartConfigs.map<DashboardChart>((config) => {
    const points = yearMonths.map((month) => {
      const monthAppointments = appointments.filter((appointment) => getMonthKey(appointment.data) === month);
      const scopedAppointments = config.cumulative
        ? appointments.filter((appointment) => getMonthKey(appointment.data) <= month)
        : monthAppointments;
      return {
        label: formatChartMonth(month),
        value: config.cumulative && !monthAppointments.length ? 0 : getChartMetricValue(calculateMetrics(scopedAppointments), config.key),
      };
    });
    const pointsWithData = points.filter((point) => point.value > 0);
    const averageValue = pointsWithData.length
      ? pointsWithData.reduce((sum, point) => sum + point.value, 0) / pointsWithData.length
      : 0;

    return {
      averageValue,
      format: config.format,
      key: config.key,
      title: config.title,
      points,
    };
  });
}

export function DashboardView({
  activeChartKey,
  appointments,
  monthAppointments,
  monthMetrics,
  months,
  onMonthChange,
  onToggleChart,
  selectedMonth,
  totalMetrics,
}: {
  activeChartKey: DashboardChartKey | "";
  appointments: CrmAppointment[];
  monthAppointments: CrmAppointment[];
  monthMetrics: ReturnType<typeof calculateMetrics>;
  months: string[];
  onMonthChange: (month: string) => void;
  onToggleChart: (key: DashboardChartKey | "") => void;
  selectedMonth: string;
  totalMetrics: ReturnType<typeof calculateMetrics>;
}) {
  const dashboardCharts = buildDashboardCharts(appointments, selectedMonth);
  const dashboardChartByKey = new Map(dashboardCharts.map((chart) => [chart.key, chart]));

  return (
    <>
      <section className="crm-toolbar">
        <label>
          <span>Mês</span>
          <select value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)}>
            {months.map((month) => (
              <option key={month} value={month}>
                {monthFormatter.format(new Date(`${month}-01T12:00:00`))}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="crm-dashboard" aria-label="Métricas do mês">
        <MetricCard
          active={activeChartKey === "scheduled"}
          appointmentList={monthAppointments.filter((appointment) => appointment.status !== "concluido")}
          chartKey="scheduled"
          icon={CalendarClock}
          label="Atendimentos Agendados"
          listTitle="Atendimentos Agendados"
          onToggle={onToggleChart}
          value={String(monthMetrics.scheduled)}
        />
        <MetricCard
          active={activeChartKey === "completed"}
          appointmentList={monthAppointments.filter((appointment) => appointment.status === "concluido")}
          chartKey="completed"
          icon={CheckCircle2}
          label="Atendimentos Concluídos"
          listTitle="Atendimentos Concluídos"
          onToggle={onToggleChart}
          value={String(monthMetrics.completed)}
        />
        <MetricCard
          active={activeChartKey === "appointments"}
          chart={dashboardChartByKey.get("appointments")}
          chartKey="appointments"
          icon={CalendarClock}
          label="Total de Atendimentos no Mês"
          onToggle={onToggleChart}
          value={String(monthMetrics.appointments)}
        />
        <MetricCard active={activeChartKey === "totalValue"} chart={dashboardChartByKey.get("totalValue")} chartKey="totalValue" icon={DollarSign} label="Valor total no mês" onToggle={onToggleChart} value={formatCurrency(monthMetrics.totalValue)} />
        <MetricCard active={activeChartKey === "receivedValue"} chart={dashboardChartByKey.get("receivedValue")} chartKey="receivedValue" icon={WalletCards} label="Recebido no mês" onToggle={onToggleChart} value={formatCurrency(monthMetrics.receivedValue)} />
        <MetricCard active={activeChartKey === "pendingValue"} chart={dashboardChartByKey.get("pendingValue")} chartKey="pendingValue" icon={DollarSign} label="A receber no mês" onToggle={onToggleChart} value={formatCurrency(monthMetrics.pendingValue + monthMetrics.scheduledPaymentValue)} />
        <MetricCard active={activeChartKey === "averageValue"} chart={dashboardChartByKey.get("averageValue")} chartKey="averageValue" icon={WalletCards} label="Valor médio por atendimento" onToggle={onToggleChart} value={formatCurrency(monthMetrics.averageValue)} />
        <MetricCard active={activeChartKey === "totalMinutes"} chart={dashboardChartByKey.get("totalMinutes")} chartKey="totalMinutes" icon={Clock3} label="Tempo total" onToggle={onToggleChart} value={formatDuration(monthMetrics.totalMinutes)} />
        <MetricCard active={activeChartKey === "averageMinutes"} chart={dashboardChartByKey.get("averageMinutes")} chartKey="averageMinutes" icon={BarChart3} label="Tempo médio" onToggle={onToggleChart} value={formatDuration(monthMetrics.averageMinutes)} />
        <MetricCard active={activeChartKey === "averageHourlyValue"} chart={dashboardChartByKey.get("averageHourlyValue")} chartKey="averageHourlyValue" icon={DollarSign} label="Valor médio por hora" onToggle={onToggleChart} value={formatCurrency(getAverageHourlyValue(monthMetrics))} />
      </section>

      <section className="crm-dashboard crm-dashboard-total" aria-label="Métricas gerais">
        <MetricCard active={activeChartKey === "totalAppointments"} chart={dashboardChartByKey.get("totalAppointments")} chartKey="totalAppointments" icon={CalendarClock} label="Atendimentos gerais" onToggle={onToggleChart} value={String(totalMetrics.appointments)} />
        <MetricCard active={activeChartKey === "totalCompleted"} chart={dashboardChartByKey.get("totalCompleted")} chartKey="totalCompleted" icon={CheckCircle2} label="Concluídos gerais" onToggle={onToggleChart} value={String(totalMetrics.completed)} />
        <MetricCard active={activeChartKey === "totalGeneralValue"} chart={dashboardChartByKey.get("totalGeneralValue")} chartKey="totalGeneralValue" icon={DollarSign} label="Valor total geral" onToggle={onToggleChart} value={formatCurrency(totalMetrics.totalValue)} />
        <MetricCard active={activeChartKey === "totalGeneralMinutes"} chart={dashboardChartByKey.get("totalGeneralMinutes")} chartKey="totalGeneralMinutes" icon={Clock3} label="Tempo total geral" onToggle={onToggleChart} value={formatDuration(totalMetrics.totalMinutes)} />
      </section>

      <section className="crm-panels">
        <div className="crm-panel">
          <h2>Serviços realizados no mês</h2>
          {monthMetrics.serviceCounts.length ? (
            <div className="crm-service-list">
              {monthMetrics.serviceCounts.map((item) => (
                <div key={item.service}>
                  <span>{formatServiceListLabel(item.service)}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="crm-muted">Nenhum serviço concluído neste mês.</p>
          )}
        </div>
      </section>
    </>
  );
}

export function MetricCard({
  active,
  appointmentList,
  chart,
  chartKey,
  icon: Icon,
  label,
  listTitle,
  onToggle,
  value,
}: {
  active?: boolean;
  appointmentList?: CrmAppointment[];
  chart?: DashboardChart;
  chartKey?: DashboardChartKey;
  icon: ElementType;
  label: string;
  listTitle?: string;
  onToggle?: (key: DashboardChartKey | "") => void;
  value: string;
}) {
  const canExpand = Boolean((chart || appointmentList) && chartKey && onToggle);

  function toggleChart() {
    if (!canExpand || !chartKey || !onToggle) return;
    onToggle(active ? "" : chartKey);
  }

  return (
    <article className={`crm-metric-card ${active ? "crm-metric-card-expanded" : ""}`}>
      <button
        aria-expanded={canExpand ? active : undefined}
        className="crm-metric-button"
        disabled={!canExpand}
        onClick={toggleChart}
        type="button"
      >
        <Icon aria-hidden="true" />
        <span>{label}</span>
        <strong>{value}</strong>
      </button>
      {active && appointmentList && <MetricAppointmentList appointments={appointmentList} title={listTitle || label} />}
      {active && chart && <MetricChart chart={chart} />}
    </article>
  );
}

function MetricAppointmentList({ appointments, title }: { appointments: CrmAppointment[]; title: string }) {
  const sortedAppointments = [...appointments].sort((a, b) => b.data.localeCompare(a.data) || b.horario.localeCompare(a.horario));

  return (
    <div className="crm-metric-appointment-list" aria-label={title}>
      <div className="crm-metric-chart-heading">
        <h3>{title}</h3>
        <span>{appointments.length} atendimento(s)</span>
      </div>
      {sortedAppointments.length ? (
        <div className="crm-metric-appointment-items">
          {sortedAppointments.map((appointment) => (
            <article key={appointment.id}>
              <div>
                <strong>{appointment.nome}</strong>
                <span className={`crm-status crm-status-${appointment.status}`}>{getStatusLabel(appointment.status)}</span>
              </div>
              <p>{formatDate(appointment.data)} às {appointment.horario}</p>
              <p>{appointment.cidade} · {formatServiceListLabel(appointment.servicosRealizados || appointment.servico)}</p>
              <strong className="crm-metric-appointment-value">{formatCurrency(appointment.valorTotal || 0)}</strong>
            </article>
          ))}
        </div>
      ) : (
        <p className="crm-muted">Nenhum atendimento para exibir.</p>
      )}
    </div>
  );
}

function MetricChart({ chart }: { chart: DashboardChart }) {
  const maxValue = Math.max(...chart.points.map((point) => point.value), chart.averageValue, 1);
  const chartWidth = 360;
  const chartHeight = 190;
  const axisLeft = 44;
  const axisRight = 10;
  const axisTop = 18;
  const axisBottom = 34;
  const plotWidth = chartWidth - axisLeft - axisRight;
  const plotHeight = chartHeight - axisTop - axisBottom;
  const barGap = 5;
  const barWidth = (plotWidth - barGap * Math.max(0, chart.points.length - 1)) / Math.max(1, chart.points.length);
  const averageY = axisTop + plotHeight - (chart.averageValue / maxValue) * plotHeight;
  const gridValues = [maxValue, maxValue / 2, 0];

  return (
    <div className="crm-metric-chart" aria-label={chart.title}>
      <div className="crm-metric-chart-heading">
        <h3>{chart.title}</h3>
        <span>Média: {formatChartValue(chart.averageValue, chart.format)}</span>
      </div>
      <svg role="img" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
        {gridValues.map((gridValue) => {
          const y = axisTop + plotHeight - (gridValue / maxValue) * plotHeight;
          return (
            <g key={gridValue}>
              <line className="crm-chart-grid" x1={axisLeft} x2={chartWidth - axisRight} y1={y} y2={y} />
              <text className="crm-chart-axis" x="2" y={y + 3}>
                {formatChartValue(gridValue, chart.format)}
              </text>
            </g>
          );
        })}
        {chart.averageValue > 0 && (
          <>
            <line className="crm-chart-average-line" x1={axisLeft} x2={chartWidth - axisRight} y1={averageY} y2={averageY} />
            <text className="crm-chart-average-label" x={chartWidth - axisRight} y={Math.max(10, averageY - 5)} textAnchor="end">
              Média
            </text>
          </>
        )}
        {chart.points.map((point, index) => {
          const barHeight = point.value ? Math.max(3, (point.value / maxValue) * plotHeight) : 0;
          const x = axisLeft + index * (barWidth + barGap);
          const y = axisTop + plotHeight - barHeight;
          return (
            <g key={`${point.label}-${index}`}>
              {point.value > 0 && (
                <>
                  <rect className="crm-chart-bar" x={x} y={y} width={barWidth} height={barHeight} rx="3" />
                  <text className="crm-chart-value" x={x + barWidth / 2} y={Math.max(12, y - 5)} textAnchor="middle">
                    {formatChartValue(point.value, chart.format)}
                  </text>
                </>
              )}
              <text className="crm-chart-label" x={x + barWidth / 2} y={chartHeight - 8} textAnchor="middle">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
