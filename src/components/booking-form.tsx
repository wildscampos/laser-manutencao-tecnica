"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Loader2, MessageCircle } from "lucide-react";
import { createClientAppointment, getBookedTimesByDate, getFreeTimes, SlotAlreadyBookedError } from "@/lib/client-appointments";
import { getAvailableTimesForDate, SERVICES, toBrazilianDate } from "@/lib/schedule";
import { appointmentSchema, type AppointmentInput } from "@/lib/validation";

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = toDateValue(new Date());

function getMonthRange(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  return { first: toDateValue(first), last: toDateValue(last) };
}

function getCalendarDays(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const days: Array<{ date: Date; value: string; inMonth: boolean }> = [];

  for (let index = first.getDay(); index > 0; index -= 1) {
    const date = new Date(first);
    date.setDate(first.getDate() - index);
    days.push({ date, value: toDateValue(date), inMonth: false });
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    days.push({ date, value: toDateValue(date), inMonth: true });
  }

  while (days.length % 7 !== 0) {
    const date = new Date(last);
    date.setDate(last.getDate() + (days.length % 7) + 1);
    days.push({ date, value: toDateValue(date), inMonth: false });
  }

  return days;
}

export function BookingForm() {
  const [freeTimes, setFreeTimes] = useState<string[]>([]);
  const [bookedTimesByDate, setBookedTimesByDate] = useState<Record<string, string[]>>({});
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [availabilityError, setAvailabilityError] = useState(false);
  const [confirmation, setConfirmation] = useState<string>("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [formStartedAt] = useState(() => Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      servico: "Manutenção Preventiva",
      data: "",
      horario: "",
      observacoes: "",
      fotoNome: "",
      website: "",
      formStartedAt,
    },
  });

  const selectedDate = useWatch({ control, name: "data" });
  const selectedAllowedTimes = useMemo(() => (selectedDate ? getAvailableTimesForDate(selectedDate) : []), [selectedDate]);
  const selectedBookedTimes = bookedTimesByDate[selectedDate] || [];
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const availabilityStatus =
    availabilityError && selectedDate === availabilityDate
      ? "error"
      : selectedDate && availabilityDate !== selectedDate
        ? "loading"
        : "idle";

  useEffect(() => {
    let active = true;
    const { first, last } = getMonthRange(calendarMonth);

    getBookedTimesByDate(first, last)
      .then((bookedTimes) => {
        if (!active) return;
        setBookedTimesByDate(bookedTimes);
      })
      .catch(() => {
        if (!active) return;
        setBookedTimesByDate({});
      })

    return () => {
      active = false;
    };
  }, [calendarMonth]);

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

  function selectDate(dateValue: string) {
    setValue("data", dateValue, { shouldDirty: true, shouldValidate: true });
    setValue("horario", "", { shouldDirty: true, shouldValidate: true });
    setCalendarOpen(false);
  }

  function changeMonth(offset: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  async function onSubmit(values: AppointmentInput) {
    setConfirmation("");

    try {
      const result = await createClientAppointment({ ...values, formStartedAt });
      setConfirmation(result.message);
      window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      setFreeTimes((times) => times.filter((time) => time !== values.horario));
    } catch (error) {
      if (error instanceof SlotAlreadyBookedError) {
        setError("horario", { type: "server", message: "Este horário acabou de ser reservado." });
        setFreeTimes((times) => times.filter((time) => time !== values.horario));
        return;
      }

      setError("root", {
        type: "server",
        message: "Não foi possível concluir o agendamento. Tente novamente.",
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
            Escolha uma data e um horário livre. A reserva é gravada antes da abertura do WhatsApp.
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
        <Field label="Modelo da máquina (opcional)" error={errors.modeloMaquina?.message}>
          <input className="field" {...register("modeloMaquina")} />
        </Field>
        <Field label="Serviço desejado" error={errors.servico?.message}>
          <select className="field" {...register("servico")}>
            {SERVICES.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data" error={errors.data?.message}>
          <div className="date-picker">
            <input type="hidden" {...register("data")} />
            <button className="field date-trigger" type="button" onClick={() => setCalendarOpen((open) => !open)}>
              <span className={selectedDate ? "text-white" : "text-slate-300"}>
                {selectedDate ? toBrazilianDate(selectedDate) : "dd/mm/aaaa"}
              </span>
              <CalendarDays aria-hidden="true" />
            </button>
            {calendarOpen && (
              <div className="calendar-popover" role="dialog" aria-label="Selecionar data">
                <div className="calendar-header">
                  <button type="button" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <strong>
                    {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </strong>
                  <button type="button" onClick={() => changeMonth(1)} aria-label="Próximo mês">
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
                <div className="calendar-weekdays" aria-hidden="true">
                  {weekDays.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar-grid">
                  {calendarDays.map((day) => {
                    const allowedTimes = getAvailableTimesForDate(day.value);
                    const bookedTimes = bookedTimesByDate[day.value] || [];
                    const isPast = day.value < today;
                    const isFullyBooked = allowedTimes.length > 0 && bookedTimes.length >= allowedTimes.length;
                    const unavailable = !day.inMonth || isPast || allowedTimes.length === 0 || isFullyBooked;
                    const className = [
                      "calendar-day",
                      day.inMonth ? "" : "calendar-day-muted",
                      unavailable ? "calendar-day-unavailable" : "",
                      selectedDate === day.value ? "calendar-day-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <button
                        className={className}
                        disabled={unavailable}
                        key={day.value}
                        onClick={() => selectDate(day.value)}
                        type="button"
                        title={unavailable ? "Data indisponível" : "Data disponível"}
                      >
                        {day.date.getDate()}
                      </button>
                    );
                  })}
                </div>
                <div className="calendar-legend">
                  <span><i className="available" /> Disponível</span>
                  <span><i className="unavailable" /> Indisponível</span>
                </div>
              </div>
            )}
          </div>
        </Field>
      </div>

      <div className="mt-5">
        <span className="text-sm font-medium text-slate-100">Horário</span>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {availabilityStatus === "loading" && (
            <div className="col-span-full flex items-center gap-2 text-sm text-slate-300">
              <Loader2 className="animate-spin" aria-hidden="true" />
              Consultando horários...
            </div>
          )}
          {availabilityStatus === "error" && (
            <div className="col-span-full flex items-center gap-2 text-sm text-rose-200">
              <AlertCircle aria-hidden="true" />
              Falha ao consultar horários.
            </div>
          )}
          {selectedDate && availabilityStatus === "idle" && freeTimes.length === 0 && (
            <p className="col-span-full text-sm text-slate-300">Nenhum horário disponível para esta data.</p>
          )}
          {!selectedDate && <p className="col-span-full text-sm text-slate-300">Escolha uma data primeiro.</p>}
          {selectedDate && availabilityStatus === "idle" && selectedAllowedTimes.map((time) => {
            const booked = selectedBookedTimes.includes(time) || !freeTimes.includes(time);

            return (
              <label key={time} className={booked ? "slot-option slot-option-unavailable" : "slot-option"}>
                <input className="peer sr-only" disabled={booked} type="radio" value={time} {...register("horario")} />
                <span>{time}</span>
              </label>
            );
          })}
          {selectedDate && availabilityStatus === "idle" && selectedAllowedTimes.length > freeTimes.length && (
            <p className="col-span-full text-xs text-rose-200">Horários em vermelho já estão reservados.</p>
          )}
        </div>
        {errors.horario?.message && <p className="mt-2 text-sm text-rose-200">{errors.horario.message}</p>}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Observações" error={errors.observacoes?.message} wide>
          <textarea className="field min-h-28 resize-y" {...register("observacoes")} />
        </Field>
        <Field label="Upload de foto (opcional)" error={errors.fotoNome?.message}>
          <div className="file-picker field">
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              Escolher arquivo
            </button>
            <span>{selectedFileName || "Nenhum arquivo selecionado"}</span>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const fileName = event.target.files?.[0]?.name || "";
                setSelectedFileName(fileName);
                setValue("fotoNome", fileName, { shouldDirty: true, shouldValidate: true });
              }}
            />
          </div>
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
