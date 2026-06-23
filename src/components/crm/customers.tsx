"use client";

import { useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import type { CrmAppointment, CrmCustomer, CustomerInput } from "@/lib/crm";
import { cityOptions, emptyCustomer } from "@/components/crm/constants";
import { CrmInput } from "@/components/crm/form-controls";
import { formatCurrency, formatDate, formatServiceListLabel, getPaymentLabel } from "@/components/crm/formatters";

export function CustomersView({
  appointments,
  busy,
  customers,
  onSaveCustomer,
  onUpdateCustomer,
}: {
  appointments: CrmAppointment[];
  busy: boolean;
  customers: CrmCustomer[];
  onSaveCustomer: (customer: CustomerInput) => Promise<boolean>;
  onUpdateCustomer: (customerId: string, customer: CustomerInput) => Promise<boolean>;
}) {
  return (
    <section className="crm-page-grid">
      <details className="crm-panel crm-form-details">
        <summary>
          <div className="crm-section-title">
            <h2>Cadastrar cliente</h2>
            <span>{customers.length} cliente(s)</span>
          </div>
        </summary>
        <CustomerForm busy={busy} onSave={onSaveCustomer} />
      </details>

      <div className="crm-panel crm-wide-panel">
        <h2>Clientes cadastrados</h2>
        <div className="crm-customer-list crm-two-column-list">
          {customers.map((customer) => {
            const customerAppointments = getCustomerAppointments(customer, appointments);
            return (
              <details className="crm-collapsible-card" key={customer.id}>
                <summary>
                  <div>
                    <h3>{customer.nome}</h3>
                    <p>{customer.empresa || "Sem empresa"} · {customer.cidade}</p>
                  </div>
                  <div className="crm-summary-count">
                    <strong>{customerAppointments.length}</strong>
                    <span>atendimento(s)</span>
                  </div>
                </summary>
                <div className="crm-collapsible-content">
                  <p>WhatsApp: {customer.whatsapp || "Não informado"}</p>
                  <p>Telefone: {customer.telefone || "Não informado"}</p>
                  {customer.cpfCnpj && <p>CPF/CNPJ: {customer.cpfCnpj}</p>}
                  {customer.etiquetas && <p>Etiquetas: {customer.etiquetas}</p>}
                  <p>Endereço: {customer.rua}, {customer.numero} - {customer.bairro}</p>
                  {customer.modeloMaquina && <p>Máquina: {customer.modeloMaquina}</p>}
                  {customer.preferenciasHorario && <p>Preferência de horário: {customer.preferenciasHorario}</p>}
                  {customer.aniversario && <p>Aniversário: {formatDate(customer.aniversario)}</p>}
                  {customer.camposCustomizados && <p>Campos específicos: {customer.camposCustomizados}</p>}
                  {customer.observacoes && <p>Observações: {customer.observacoes}</p>}
                  <details className="crm-edit-details">
                    <summary>Editar cliente</summary>
                    <CustomerForm
                      busy={busy}
                      customerId={customer.id}
                      initialCustomer={customerToInput(customer)}
                      onSave={(values) => onUpdateCustomer(customer.id, values)}
                      submitLabel="Salvar alterações"
                    />
                  </details>
                </div>
              </details>
            );
          })}
          {!customers.length && <p className="crm-empty">Nenhum cliente cadastrado.</p>}
        </div>
      </div>
    </section>
  );
}

export function HistoryView({ appointments, customers }: { appointments: CrmAppointment[]; customers: CrmCustomer[] }) {
  const sortedCustomers = [...customers].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <section className="crm-appointments">
      <div className="crm-section-title">
        <h2>Histórico por cliente</h2>
        <span>{sortedCustomers.length} cliente(s)</span>
      </div>
      <div className="crm-list crm-history-grid crm-two-column-list">
        {sortedCustomers.map((customer) => {
          const customerAppointments = getCustomerAppointments(customer, appointments);
          const totalValue = customerAppointments.reduce((sum, appointment) => sum + (appointment.valorTotal || 0), 0);

          return (
            <details className="crm-appointment-card crm-history-card" key={customer.id}>
              <summary>
                <div>
                  <div>
                    <h3>{customer.nome}</h3>
                    <p>{customer.empresa || "Sem empresa informada"} · {customer.cidade}</p>
                  </div>
                </div>
                <div className="crm-values">
                  <strong>Total: {formatCurrency(totalValue)}</strong>
                  <span>{customerAppointments.length} atendimento(s)</span>
                </div>
              </summary>
              <div className="crm-collapsible-content">
                <p>WhatsApp: {customer.whatsapp || "Não informado"}</p>
                <p>Último atendimento: {customerAppointments[0] ? formatDate(customerAppointments[0].data) : "-"}</p>
              </div>
              <div className="crm-history-list">
                {customerAppointments.map((appointment) => (
                  <div key={appointment.id}>
                    <strong>{formatDate(appointment.data)} · {appointment.horario}</strong>
                    <span>{formatServiceListLabel(appointment.servicosRealizados || appointment.servico)}</span>
                    <span>{formatCurrency(appointment.valorTotal || 0)} · {getPaymentLabel(appointment.pagamentoStatus)}</span>
                  </div>
                ))}
                {!customerAppointments.length && <p className="crm-muted">Ainda não há atendimentos registrados para este cliente.</p>}
              </div>
            </details>
          );
        })}
        {!sortedCustomers.length && <p className="crm-empty">Nenhum cliente para exibir histórico.</p>}
      </div>
    </section>
  );
}

function customerToInput(customer: CrmCustomer): CustomerInput {
  return {
    nome: customer.nome,
    telefone: customer.telefone || "",
    whatsapp: customer.whatsapp || "",
    empresa: customer.empresa || "",
    cpfCnpj: customer.cpfCnpj || "",
    rua: customer.rua || "",
    numero: customer.numero || "",
    bairro: customer.bairro || "",
    cidade: customer.cidade || "Guaratinguetá",
    modeloMaquina: customer.modeloMaquina || "",
    etiquetas: customer.etiquetas || "",
    preferenciasHorario: customer.preferenciasHorario || "",
    aniversario: customer.aniversario || "",
    camposCustomizados: customer.camposCustomizados || "",
    observacoes: customer.observacoes || "",
  };
}

function getCustomerAppointments(customer: CrmCustomer, appointments: CrmAppointment[]) {
  return appointments
    .filter((appointment) => appointment.clienteId === customer.id || appointment.nome.toLowerCase() === customer.nome.toLowerCase())
    .sort((a, b) => b.data.localeCompare(a.data) || b.horario.localeCompare(a.horario));
}

function CustomerForm({
  busy,
  initialCustomer = emptyCustomer,
  onSave,
  submitLabel = "Salvar cliente",
}: {
  busy: boolean;
  customerId?: string;
  initialCustomer?: CustomerInput;
  onSave: (customer: CustomerInput) => Promise<boolean>;
  submitLabel?: string;
}) {
  const [customer, setCustomer] = useState<CustomerInput>(initialCustomer);

  function updateField(field: keyof CustomerInput, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSave(customer);
    if (saved && initialCustomer === emptyCustomer) setCustomer(emptyCustomer);
  }

  return (
    <form className="crm-form-grid" onSubmit={submit}>
      <CrmInput label="Nome" value={customer.nome} onChange={(value) => updateField("nome", value)} />
      <CrmInput label="WhatsApp" value={customer.whatsapp} onChange={(value) => updateField("whatsapp", value)} />
      <CrmInput label="Telefone" value={customer.telefone} onChange={(value) => updateField("telefone", value)} />
      <CrmInput label="Empresa" value={customer.empresa || ""} onChange={(value) => updateField("empresa", value)} />
      <CrmInput label="CPF/CNPJ" value={customer.cpfCnpj || ""} onChange={(value) => updateField("cpfCnpj", value)} />
      <CrmInput label="Rua" value={customer.rua} onChange={(value) => updateField("rua", value)} />
      <CrmInput label="Número" value={customer.numero} onChange={(value) => updateField("numero", value)} />
      <CrmInput label="Bairro" value={customer.bairro} onChange={(value) => updateField("bairro", value)} />
      <label>
        <span>Cidade</span>
        <select value={customer.cidade} onChange={(event) => updateField("cidade", event.target.value)}>
          {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
        </select>
      </label>
      <CrmInput label="Modelo da máquina" value={customer.modeloMaquina || ""} onChange={(value) => updateField("modeloMaquina", value)} />
      <CrmInput label="Etiquetas" value={customer.etiquetas || ""} onChange={(value) => updateField("etiquetas", value)} />
      <CrmInput label="Preferência de horário" value={customer.preferenciasHorario || ""} onChange={(value) => updateField("preferenciasHorario", value)} />
      <CrmInput label="Data de aniversário" type="date" value={customer.aniversario || ""} onChange={(value) => updateField("aniversario", value)} />
      <label className="crm-form-wide">
        <span>Campos customizados</span>
        <textarea value={customer.camposCustomizados || ""} onChange={(event) => updateField("camposCustomizados", event.target.value)} placeholder="Informações específicas do cliente, máquina, operação ou contrato" />
      </label>
      <label className="crm-form-wide">
        <span>Observações</span>
        <textarea value={customer.observacoes || ""} onChange={(event) => updateField("observacoes", event.target.value)} />
      </label>
      <button className="crm-primary-button crm-form-wide" disabled={busy} type="submit">
        <UserPlus aria-hidden="true" />
        {submitLabel}
      </button>
    </form>
  );
}
