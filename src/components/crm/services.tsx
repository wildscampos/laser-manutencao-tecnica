"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import type { CrmService, ServiceInput } from "@/lib/crm";
import { CrmInput } from "@/components/crm/form-controls";
import { formatCurrency, formatDuration } from "@/components/crm/formatters";

export function ServicesView({
  busy,
  services,
  onSaveService,
  onUpdateService,
}: {
  busy: boolean;
  services: CrmService[];
  onSaveService: (service: ServiceInput) => Promise<boolean>;
  onUpdateService: (serviceId: string, service: ServiceInput) => Promise<boolean>;
}) {
  const activeServices = services.filter((service) => service.ativo);
  const inactiveServices = services.filter((service) => !service.ativo);

  return (
    <section className="crm-page-grid">
      <details className="crm-panel crm-form-details">
        <summary>
          <div className="crm-section-title">
            <h2>Catálogo de serviços</h2>
            <span>{activeServices.length} ativo(s)</span>
          </div>
        </summary>
        <ServiceForm busy={busy} onSave={onSaveService} />
      </details>

      <div className="crm-panel">
        <h2>Serviços cadastrados</h2>
        <div className="crm-service-catalog crm-two-column-list">
          {services.map((service) => (
            <article key={service.id} className="crm-service-record">
              <div>
                <h3>{service.nome}</h3>
                <p>{service.descricao}</p>
              </div>
              <div className="crm-values">
                <span>Valor base: {formatCurrency(service.valorBase)}</span>
                <span>Duração: {formatDuration(service.duracaoMin)}</span>
                <strong>{service.ativo ? "Ativo" : "Inativo"}</strong>
              </div>
              <details className="crm-edit-details">
                <summary>Editar serviço</summary>
                <ServiceForm
                  busy={busy}
                  initialService={serviceToInput(service)}
                  onSave={(values) => onUpdateService(service.id, values)}
                  submitLabel="Salvar alterações"
                />
              </details>
            </article>
          ))}
          {!services.length && <p className="crm-empty">O catálogo será criado automaticamente com os serviços padrão.</p>}
          {!!inactiveServices.length && <p className="crm-muted">{inactiveServices.length} serviço(s) inativo(s) ficam fora das listas de seleção.</p>}
        </div>
      </div>
    </section>
  );
}

function serviceToInput(service: CrmService): ServiceInput {
  return {
    nome: service.nome,
    descricao: service.descricao,
    valorBase: service.valorBase,
    duracaoMin: service.duracaoMin,
    ativo: service.ativo,
  };
}

function ServiceForm({
  busy,
  initialService,
  onSave,
  submitLabel = "Salvar serviço",
}: {
  busy: boolean;
  initialService?: ServiceInput;
  onSave: (service: ServiceInput) => Promise<boolean>;
  submitLabel?: string;
}) {
  const blankService: ServiceInput = {
    nome: "",
    descricao: "",
    valorBase: 100,
    duracaoMin: 60,
    ativo: true,
  };
  const [service, setService] = useState<ServiceInput>(initialService || blankService);

  function updateField(field: keyof ServiceInput, value: string | boolean) {
    setService((current) => ({
      ...current,
      [field]: field === "valorBase" || field === "duracaoMin" ? Number(value) : value,
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSave(service);
    if (saved && !initialService) setService(blankService);
  }

  return (
    <form className="crm-form-grid" onSubmit={submit}>
      <CrmInput label="Nome do serviço" required value={service.nome} onChange={(value) => updateField("nome", value)} />
      <CrmInput label="Valor base" required type="number" value={String(service.valorBase)} onChange={(value) => updateField("valorBase", value)} />
      <CrmInput label="Duração estimada em minutos" required type="number" value={String(service.duracaoMin)} onChange={(value) => updateField("duracaoMin", value)} />
      <label>
        <span>Status</span>
        <select value={service.ativo ? "ativo" : "inativo"} onChange={(event) => updateField("ativo", event.target.value === "ativo")}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </label>
      <label className="crm-form-wide">
        <span>Descrição</span>
        <textarea value={service.descricao} onChange={(event) => updateField("descricao", event.target.value)} />
      </label>
      <button className="crm-primary-button crm-form-wide" disabled={busy} type="submit">
        <Save aria-hidden="true" />
        {submitLabel}
      </button>
    </form>
  );
}
