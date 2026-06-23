"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Save } from "lucide-react";
import { expenseCategoryOptions, monthFormatter } from "@/components/crm/constants";
import { CrmInput } from "@/components/crm/form-controls";
import { formatCurrency, formatDate } from "@/components/crm/formatters";
import { getMonthKey, type CrmAppointment, type CrmCustomer, type CrmExpense, type ExpenseCategory, type ExpenseInput } from "@/lib/crm";

const blankExpense: ExpenseInput = {
  data: new Date().toISOString().slice(0, 10),
  categoria: "combustivel",
  descricao: "",
  valor: 0,
  clienteId: "",
  atendimentoId: "",
  observacoes: "",
};

export function ExpensesView({
  appointments,
  busy,
  customers,
  expenses,
  months,
  onMonthChange,
  onSaveExpense,
  onUpdateExpense,
  selectedMonth,
}: {
  appointments: CrmAppointment[];
  busy: boolean;
  customers: CrmCustomer[];
  expenses: CrmExpense[];
  months: string[];
  onMonthChange: (month: string) => void;
  onSaveExpense: (expense: ExpenseInput) => Promise<boolean>;
  onUpdateExpense: (expenseId: string, expense: ExpenseInput) => Promise<boolean>;
  selectedMonth: string;
}) {
  const [openExpenseId, setOpenExpenseId] = useState("");
  const monthExpenses = useMemo(
    () => expenses.filter((expense) => getMonthKey(expense.data) === selectedMonth),
    [expenses, selectedMonth],
  );
  const totalMonth = monthExpenses.reduce((sum, expense) => sum + (Number(expense.valor) || 0), 0);

  return (
    <>
      <section className="crm-toolbar">
        <label>
          <span>Mês dos gastos</span>
          <select value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)}>
            {months.map((month) => (
              <option key={month} value={month}>
                {monthFormatter.format(new Date(`${month}-01T12:00:00`))}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="crm-page-grid">
        <details className="crm-panel crm-form-details">
          <summary>
            <div className="crm-section-title">
              <h2>Novo gasto</h2>
              <span>{formatCurrency(totalMonth)} no mês</span>
            </div>
          </summary>
          <ExpenseForm
            appointments={appointments}
            busy={busy}
            customers={customers}
            onSave={onSaveExpense}
          />
        </details>

        <div className="crm-panel">
          <div className="crm-section-title">
            <h2>Gastos cadastrados</h2>
            <span>{monthExpenses.length} registro(s)</span>
          </div>
          <div className="crm-list crm-two-column-list">
            {monthExpenses.map((expense) => (
              <ExpenseCard
                appointments={appointments}
                busy={busy}
                customers={customers}
                expense={expense}
                isOpen={openExpenseId === expense.id}
                key={expense.id}
                onToggle={() => setOpenExpenseId(openExpenseId === expense.id ? "" : expense.id)}
                onUpdate={(values) => onUpdateExpense(expense.id, values)}
              />
            ))}
            {!monthExpenses.length && <p className="crm-empty">Nenhum gasto cadastrado no mês selecionado.</p>}
          </div>
        </div>
      </section>
    </>
  );
}

function ExpenseCard({
  appointments,
  busy,
  customers,
  expense,
  isOpen,
  onToggle,
  onUpdate,
}: {
  appointments: CrmAppointment[];
  busy: boolean;
  customers: CrmCustomer[];
  expense: CrmExpense;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (expense: ExpenseInput) => Promise<boolean>;
}) {
  const categoryLabel = expenseCategoryOptions.find((category) => category.value === expense.categoria)?.label || "Outros";
  const relatedCustomer = customers.find((customer) => customer.id === expense.clienteId);
  const relatedAppointment = appointments.find((appointment) => appointment.id === expense.atendimentoId);

  return (
    <article className={`crm-appointment-card crm-expense-card ${isOpen ? "crm-appointment-open" : ""}`}>
      <button className="crm-collapsible-summary" onClick={onToggle} type="button">
        <div>
          <h3>{expense.descricao}</h3>
          <p>{categoryLabel} · {formatDate(expense.data)}</p>
          {relatedCustomer && <p>{relatedCustomer.nome}</p>}
        </div>
        <strong>{formatCurrency(expense.valor)}</strong>
      </button>

      {isOpen && (
        <div className="crm-collapsible-content">
          {relatedAppointment && <p>Atendimento: {relatedAppointment.nome} · {formatDate(relatedAppointment.data)} às {relatedAppointment.horario}</p>}
          {expense.observacoes && <p>Observações: {expense.observacoes}</p>}
          <details className="crm-edit-details">
            <summary>
              <Pencil aria-hidden="true" />
              Editar gasto
            </summary>
            <ExpenseForm
              appointments={appointments}
              busy={busy}
              customers={customers}
              initialExpense={expenseToInput(expense)}
              onSave={onUpdate}
              submitLabel="Salvar alterações"
            />
          </details>
        </div>
      )}
    </article>
  );
}

function expenseToInput(expense: CrmExpense): ExpenseInput {
  return {
    data: expense.data,
    categoria: expense.categoria,
    descricao: expense.descricao,
    valor: expense.valor,
    clienteId: expense.clienteId || "",
    atendimentoId: expense.atendimentoId || "",
    observacoes: expense.observacoes || "",
  };
}

function ExpenseForm({
  appointments,
  busy,
  customers,
  initialExpense,
  onSave,
  submitLabel = "Salvar gasto",
}: {
  appointments: CrmAppointment[];
  busy: boolean;
  customers: CrmCustomer[];
  initialExpense?: ExpenseInput;
  onSave: (expense: ExpenseInput) => Promise<boolean>;
  submitLabel?: string;
}) {
  const [expense, setExpense] = useState<ExpenseInput>(initialExpense || blankExpense);

  function updateField(field: keyof ExpenseInput, value: string | ExpenseCategory) {
    setExpense((current) => ({
      ...current,
      [field]: field === "valor" ? Number(value) : value,
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSave(expense);
    if (saved && !initialExpense) setExpense({ ...blankExpense, data: new Date().toISOString().slice(0, 10) });
  }

  return (
    <form className="crm-form-grid" onSubmit={submit}>
      <CrmInput label="Data" required type="date" value={expense.data} onChange={(value) => updateField("data", value)} />
      <label>
        <span>Categoria</span>
        <select value={expense.categoria} onChange={(event) => updateField("categoria", event.target.value as ExpenseCategory)}>
          {expenseCategoryOptions.map((category) => (
            <option key={category.value} value={category.value}>{category.label}</option>
          ))}
        </select>
      </label>
      <CrmInput label="Descrição" required value={expense.descricao} onChange={(value) => updateField("descricao", value)} />
      <CrmInput label="Valor" required type="number" value={String(expense.valor)} onChange={(value) => updateField("valor", value)} />
      <label>
        <span>Cliente relacionado</span>
        <select value={expense.clienteId || ""} onChange={(event) => updateField("clienteId", event.target.value)}>
          <option value="">Sem cliente relacionado</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.nome} · {customer.cidade}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Atendimento relacionado</span>
        <select value={expense.atendimentoId || ""} onChange={(event) => updateField("atendimentoId", event.target.value)}>
          <option value="">Sem atendimento relacionado</option>
          {appointments.map((appointment) => (
            <option key={appointment.id} value={appointment.id}>
              {appointment.nome} · {formatDate(appointment.data)} às {appointment.horario}
            </option>
          ))}
        </select>
      </label>
      <label className="crm-form-wide">
        <span>Observações</span>
        <textarea value={expense.observacoes || ""} onChange={(event) => updateField("observacoes", event.target.value)} />
      </label>
      <button className="crm-primary-button crm-form-wide" disabled={busy} type="submit">
        {submitLabel === "Salvar gasto" ? <Plus aria-hidden="true" /> : <Save aria-hidden="true" />}
        {submitLabel}
      </button>
    </form>
  );
}
