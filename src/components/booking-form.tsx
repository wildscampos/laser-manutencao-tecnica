"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { createClientAppointment, getFreeTimes, SlotAlreadyBookedError } from "@/lib/client-appointments";
import { SERVICES } from "@/lib/schedule";
import { appointmentSchema, type AppointmentInput } from "@/lib/validation";

const today = new Date().toISOString().slice(0, 10);

export function BookingForm() {
  const [freeTimes, setFreeTimes] = useState<string[]>([]);
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [availabilityError, setAvailabilityError] = useState(false);
  const [confirmation, setConfirmation] = useState<string>("");
  const [formStartedAt] = useState(() => Date.now());

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      nome: "",
      telefone: "",
      whatsapp: "",
      empresa: "",
      cidade: "",
      modeloMaquina: "",
      servico: "Manutencao Preventiva",
      data: "",
      horario: "",
      observacoes: "",
      fotoNome: "",
      website: "",
      formStartedAt,
    },
  });

  const selectedDate = useWatch({ control, name: "data" });
  const availabilityStatus =
    availabilityError && selectedDate === availabilityDate
      ? "error"
      : selectedDate && availabilityDate !== selectedDate
        ? "loading"
        : "idle";

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    let active = true;

    getFreeTimes(selectedDate)
      .then((horarios) => {
        if (!active) return;
        setFreeTimes(horarios);
        setAvailabilityDate(selectedDate);
        setAvailabilityError(false);
      })
      .catch(() => {
        if (!active) return;
        setAvailabilityDate(selectedDate);
        setAvailabilityError(true);
        setFreeTimes([]);
      });

    return () => {
      active = false;
    };
  }, [selectedDate, setValue]);

  async function onSubmit(values: AppointmentInput) {
    setConfirmation("");

    try {
      const result = await createClientAppointment({ ...values, formStartedAt });
      setConfirmation(result.message);
      window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      setFreeTimes((times) => times.filter((time) => time !== values.horario));
    } catch (error) {
      if (error instanceof SlotAlreadyBookedError) {
        setError("horario", { type: "server", message: "Este horario acabou de ser reservado." });
        setFreeTimes((times) => times.filter((time) => time !== values.horario));
        return;
      }

      setError("root", {
        type: "server",
        message: "Nao foi possivel concluir o agendamento. Tente novamente.",
      });
    }
  }

  return (
    <form
      className="relative overflow-hidden rounded-[6px] border border-slate-700/80 bg-slate-950/88 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur md:p-7"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Agendamento online</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
            Escolha uma data e um horario livre. A reserva e gravada antes da abertura do WhatsApp.
          </p>
        </div>
        <CalendarDays className="mt-1 shrink-0 text-cyan-300" aria-hidden="true" />
      </div>

      <input type="text" tabIndex={-1} autoComplete="off" className="hidden" {...register("website")} />
      <input type="hidden" {...register("formStartedAt", { valueAsNumber: true })} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome" error={errors.nome?.message}>
          <input className="field" autoComplete="name" {...register("nome")} />
        </Field>
        <Field label="Telefone" error={errors.telefone?.message}>
          <input className="field" inputMode="tel" autoComplete="tel" {...register("telefone")} />
        </Field>
        <Field label="WhatsApp" error={errors.whatsapp?.message}>
          <input className="field" inputMode="tel" autoComplete="tel" {...register("whatsapp")} />
        </Field>
        <Field label="Empresa (opcional)" error={errors.empresa?.message}>
          <input className="field" autoComplete="organization" {...register("empresa")} />
        </Field>
        <Field label="Cidade" error={errors.cidade?.message}>
          <input className="field" autoComplete="address-level2" {...register("cidade")} />
        </Field>
        <Field label="Modelo da maquina (opcional)" error={errors.modeloMaquina?.message}>
          <input className="field" {...register("modeloMaquina")} />
        </Field>
        <Field label="Servico desejado" error={errors.servico?.message}>
          <select className="field" {...register("servico")}>
            {SERVICES.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data" error={errors.data?.message}>
          <input
            className="field"
            type="date"
            min={today}
            {...register("data", { onChange: () => setValue("horario", "") })}
          />
        </Field>
      </div>

      <div className="mt-5">
        <span className="text-sm font-medium text-slate-100">Horario</span>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {availabilityStatus === "loading" && (
            <div className="col-span-full flex items-center gap-2 text-sm text-slate-300">
              <Loader2 className="animate-spin" aria-hidden="true" />
              Consultando horarios...
            </div>
          )}
          {availabilityStatus === "error" && (
            <div className="col-span-full flex items-center gap-2 text-sm text-rose-200">
              <AlertCircle aria-hidden="true" />
              Falha ao consultar horarios.
            </div>
          )}
          {selectedDate && availabilityStatus === "idle" && freeTimes.length === 0 && (
            <p className="col-span-full text-sm text-slate-300">Nenhum horario disponivel para esta data.</p>
          )}
          {!selectedDate && <p className="col-span-full text-sm text-slate-300">Escolha uma data primeiro.</p>}
          {selectedDate && freeTimes.map((time) => (
            <label key={time} className="slot-option">
              <input className="peer sr-only" type="radio" value={time} {...register("horario")} />
              <span>{time}</span>
            </label>
          ))}
        </div>
        {errors.horario?.message && <p className="mt-2 text-sm text-rose-200">{errors.horario.message}</p>}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Observacoes" error={errors.observacoes?.message} wide>
          <textarea className="field min-h-28 resize-y" {...register("observacoes")} />
        </Field>
        <Field label="Upload de foto (opcional)" error={errors.fotoNome?.message}>
          <input
            className="field file:mr-4 file:rounded-[4px] file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
            type="file"
            accept="image/*"
            onChange={(event) => setValue("fotoNome", event.target.files?.[0]?.name || "")}
          />
        </Field>
      </div>

      {confirmation && (
        <div className="mt-5 flex items-center gap-2 rounded-[4px] border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle2 aria-hidden="true" />
          {confirmation}
        </div>
      )}

      {errors.root?.message && (
        <div className="mt-5 flex items-center gap-2 rounded-[4px] border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          <AlertCircle aria-hidden="true" />
          {errors.root.message}
        </div>
      )}

      <button className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-cyan-300 px-5 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
        Enviar agendamento pelo WhatsApp
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  wide,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="mb-2 block text-sm font-medium text-slate-100">{label}</span>
      {children}
      {error && <span className="mt-2 block text-sm text-rose-200">{error}</span>}
    </label>
  );
}
