"use client";

import { CalendarClock, Clock3, DollarSign, WalletCards } from "lucide-react";
import { calculateMetrics, getMonthKey, type CrmAppointment } from "@/lib/crm";
import { monthFormatter } from "@/components/crm/constants";
import { MetricCard } from "@/components/crm/dashboard";
import { formatCurrency, formatDate, formatServiceListLabel, getPaymentLabel } from "@/components/crm/formatters";

export function FinanceView({
  appointments,
  months,
  onMonthChange,
  selectedMonth,
}: {
  appointments: CrmAppointment[];
  months: string[];
  onMonthChange: (month: string) => void;
  selectedMonth: string;
}) {
  const monthAppointments = appointments.filter((appointment) => getMonthKey(appointment.data) === selectedMonth);
  const monthMetrics = calculateMetrics(monthAppointments);
  const totalMetrics = calculateMetrics(appointments);
  const financialAppointments = monthAppointments
    .filter((appointment) => appointment.status === "concluido")
    .sort((a, b) => b.data.localeCompare(a.data) || b.horario.localeCompare(a.horario));

  return (
    <>
      <section className="crm-toolbar">
        <label>
          <span>Mês financeiro</span>
          <select value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)}>
            {months.map((month) => (
              <option key={month} value={month}>
                {monthFormatter.format(new Date(`${month}-01T12:00:00`))}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="crm-dashboard" aria-label="Financeiro do mês">
        <MetricCard icon={DollarSign} label="Faturamento do mês" value={formatCurrency(monthMetrics.totalValue)} />
        <MetricCard icon={WalletCards} label="Recebido" value={formatCurrency(monthMetrics.receivedValue)} />
        <MetricCard icon={CalendarClock} label="Pagamentos agendados" value={formatCurrency(monthMetrics.scheduledPaymentValue)} />
        <MetricCard icon={Clock3} label="Pendente" value={formatCurrency(monthMetrics.pendingValue)} />
      </section>

      <section className="crm-dashboard crm-dashboard-total" aria-label="Financeiro geral">
        <MetricCard icon={DollarSign} label="Faturamento geral" value={formatCurrency(totalMetrics.totalValue)} />
        <MetricCard icon={WalletCards} label="Recebido geral" value={formatCurrency(totalMetrics.receivedValue)} />
        <MetricCard icon={CalendarClock} label="Agendado geral" value={formatCurrency(totalMetrics.scheduledPaymentValue)} />
        <MetricCard icon={Clock3} label="Pendente geral" value={formatCurrency(totalMetrics.pendingValue)} />
      </section>

      <details className="crm-appointments crm-finance-history-details">
        <summary>
          <div className="crm-section-title">
            <h2>Histórico financeiro</h2>
            <span>{financialAppointments.length} atendimento(s)</span>
          </div>
        </summary>
        <div className="crm-list crm-finance-list">
          {financialAppointments.map((appointment) => (
            <article className="crm-appointment-card crm-finance-card" key={appointment.id}>
              <div className="crm-appointment-main">
                <div>
                  <h3>{appointment.nome}</h3>
                  <p>{formatDate(appointment.data)} às {appointment.horario} · {appointment.cidade}</p>
                  <p>{formatServiceListLabel(appointment.servicosRealizados || appointment.servico)}</p>
                </div>
                <div className="crm-values">
                  <strong>{formatCurrency(appointment.valorTotal || 0)}</strong>
                  <span>{getPaymentLabel(appointment.pagamentoStatus)}</span>
                  {appointment.pagamentoAgendadoPara && <span>Receber em {formatDate(appointment.pagamentoAgendadoPara)}</span>}
                </div>
              </div>
            </article>
          ))}
          {!financialAppointments.length && <p className="crm-empty">Nenhum atendimento concluído no mês selecionado.</p>}
        </div>
      </details>
    </>
  );
}
