"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { getFreeTimes } from "@/lib/client-appointments";
import { getAvailableTimesForDate } from "@/lib/schedule";
import type { AvailabilityBlockInput, CrmAppointment } from "@/lib/crm";
import { CrmInput } from "@/components/crm/form-controls";

export function AvailabilityView({
  appointments,
  busy,
  onBlock,
}: {
  appointments: CrmAppointment[];
  busy: boolean;
  onBlock: (input: AvailabilityBlockInput) => Promise<boolean>;
}) {
  const [block, setBlock] = useState<AvailabilityBlockInput>({
    data: new Date().toISOString().slice(0, 10),
    horario: "",
    motivo: "Agenda externa",
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const data = block.data;

    async function loadAvailableTimes() {
      try {
        const freeTimes = await getFreeTimes(data);
        if (!active) return;
        setAvailableTimes(freeTimes);
        setBlock((current) => ({
          ...current,
          horario: freeTimes.includes(current.horario) ? current.horario : freeTimes[0] || "",
        }));
      } catch {
        const occupiedTimes = new Set(
          appointments
            .filter((appointment) => appointment.data === data && appointment.status !== "concluido")
            .map((appointment) => appointment.horario),
        );
        const fallbackTimes = getAvailableTimesForDate(data).filter((time) => !occupiedTimes.has(time));
        if (!active) return;
        setAvailableTimes(fallbackTimes);
        setBlock((current) => ({
          ...current,
          horario: fallbackTimes.includes(current.horario) ? current.horario : fallbackTimes[0] || "",
        }));
      }
    }

    void loadAvailableTimes();

    return () => {
      active = false;
    };
  }, [appointments, block.data]);

  function updateField(field: keyof AvailabilityBlockInput, value: string) {
    setBlock((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!block.horario) return;
    const blocked = await onBlock(block);
    if (!blocked) return;
    setAvailableTimes((currentTimes) => currentTimes.filter((time) => time !== block.horario));
    setBlock((current) => {
      const nextTimes = availableTimes.filter((time) => time !== current.horario);
      return { ...current, horario: nextTimes[0] || "" };
    });
  }

  return (
    <section className="crm-page-grid">
      <details className="crm-panel crm-wide-panel crm-form-details">
        <summary>
          <div className="crm-section-title">
            <h2>Bloquear horário</h2>
          </div>
        </summary>
        <form className="crm-form-grid" onSubmit={submit}>
          <CrmInput label="Data" required type="date" value={block.data} onChange={(value) => updateField("data", value)} />
          <label>
            <span>Horário</span>
            <select value={block.horario} onChange={(event) => updateField("horario", event.target.value)}>
              {!availableTimes.length && <option value="">Nenhum horário livre</option>}
              {availableTimes.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </label>
          <CrmInput label="Motivo" value={block.motivo} onChange={(value) => updateField("motivo", value)} />
          <button className="crm-primary-button crm-form-wide" disabled={busy || !block.horario} type="submit">
            <ShieldCheck aria-hidden="true" />
            Bloquear horário
          </button>
        </form>
      </details>
    </section>
  );
}
