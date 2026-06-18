import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Cable,
  Check,
  ChevronRight,
  CircleDollarSign,
  Cpu,
  Crosshair,
  Gauge,
  Headphones,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { BookingForm } from "@/components/booking-form";
import { WHATSAPP_NUMBER, buildWhatsAppMessage, buildWhatsAppUrl } from "@/config/whatsapp";

const whatsappIntroUrl = buildWhatsAppUrl(
  buildWhatsAppMessage({
    nome: "",
    telefone: "",
    empresa: "",
    cidade: "",
    modeloMaquina: "",
    servico: "Atendimento tecnico",
    data: "",
    horario: "",
    observacoes: "Quero falar sobre manutencao de maquina laser CO2.",
  }),
);

const services = [
  {
    title: "Manutencao Preventiva",
    icon: ShieldCheck,
    items: ["Limpeza tecnica completa", "Verificacao de componentes", "Ajustes de desempenho"],
  },
  {
    title: "Manutencao Corretiva",
    icon: Wrench,
    items: ["Diagnostico tecnico", "Correcao de falhas", "Testes operacionais"],
  },
  {
    title: "Alinhamento Optico",
    icon: Crosshair,
    items: ["Alinhamento dos espelhos", "Ajuste de percurso do feixe", "Calibracao de precisao"],
  },
  {
    title: "Substituicao de Componentes",
    icon: Cable,
    items: ["Tubos laser CO2", "Fontes, paineis e controladoras", "Drivers, lentes, espelhos e conexoes"],
  },
  {
    title: "Software",
    icon: Cpu,
    items: ["Instalacao do RD Works", "Configuracao do RD Works", "Backup e restauracao de parametros"],
  },
];

const benefits = [
  "Atendimento especializado",
  "Diagnostico rapido",
  "Agendamento online",
  "Atendimento programado",
  "Solucoes para maquinas CO2",
  "Configuracao profissional RD Works",
];

const faq = [
  ["Voce troca tubo laser?", "Sim. A troca pode ser feita apos avaliacao do modelo, potencia e compatibilidade da maquina."],
  ["Voce troca fonte?", "Sim. Realizo diagnostico da fonte de alimentacao e substituicao quando necessario."],
  ["Voce configura RD Works?", "Sim. Faco instalacao, configuracao, ajustes de parametros, backup e restauracao."],
  ["Faz alinhamento dos espelhos?", "Sim. O alinhamento optico inclui ajustes no percurso do feixe e calibracao de precisao."],
  ["O valor inclui pecas?", "Nao. Pecas, componentes e materiais podem ser cobrados separadamente mediante aprovacao previa."],
  ["O atendimento e presencial?", "O atendimento tecnico e programado conforme cidade, disponibilidade e tipo de servico."],
  ["Quanto tempo dura uma manutencao?", "Depende do estado da maquina. A primeira hora cobre diagnostico e inicio do atendimento."],
  ["Posso enviar fotos antes do atendimento?", "Sim. O formulario permite informar foto e o WhatsApp fica aberto para envio de imagens."],
  ["Como funciona o agendamento?", "Voce escolhe uma data e horario livre; o sistema salva a reserva e abre o WhatsApp para confirmar."],
];

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "LASER Manutencao Tecnica",
    description: "Manutencao tecnica para maquinas laser CO2, alinhamento optico, limpeza, troca de componentes e configuracao RD Works.",
    telephone: `+${WHATSAPP_NUMBER}`,
    areaServed: "Brasil",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://laser-manutencao-tecnica.vercel.app",
    priceRange: "R$100 primeira hora; R$50 horas adicionais",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "18:00",
        closes: "21:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "08:00",
        closes: "13:00",
      },
    ],
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#070b12] text-slate-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Header />

      <section className="relative border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(34,211,238,0.18),transparent_30%),linear-gradient(135deg,rgba(14,165,233,0.12),transparent_42%)]" />
        <div className="laser-grid absolute inset-0 opacity-35" />
        <div className="relative mx-auto grid min-h-[86vh] max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:py-28">
          <div className="min-w-0">
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">
              Manutencao Tecnica para Maquinas Laser CO2
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Alinhamento, limpeza, troca de componentes e configuracao RD Works para manter sua maquina operando com maxima precisao.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a className="button-primary" href="#agendamento">
                Agendar Manutencao
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="button-secondary" href={whatsappIntroUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                Falar no WhatsApp
              </a>
            </div>
          </div>

          <div className="relative min-h-[420px] min-w-0 overflow-hidden rounded-[8px] border border-cyan-300/20 bg-slate-950/70 p-4 shadow-2xl shadow-cyan-950/40 sm:p-6">
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(34,211,238,0.10)_48%,transparent_52%)]" />
            <div className="relative flex h-full min-h-[380px] flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="font-mono text-sm text-cyan-200">LASER / CO2 SERVICE</span>
                <Gauge className="text-cyan-300" aria-hidden="true" />
              </div>
              <div className="my-8 grid gap-4">
                {["Feixe calibrado", "Optica alinhada", "RD Works configurado", "Teste operacional"].map((item, index) => (
                  <div className="flex items-center gap-4 border-l border-cyan-300/60 bg-white/[0.03] p-4" key={item}>
                    <span className="flex size-9 items-center justify-center rounded-[4px] bg-cyan-300 text-sm font-bold text-slate-950">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-100">{item}</span>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric value="18h-20h" label="Segunda a sexta" />
                <Metric value="08h-12h" label="Sabado" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section id="servicos" title="Servicos tecnicos" intro="Atendimento focado no desempenho real da maquina: optica, eletrica, software, componentes e teste operacional.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {services.map((service) => (
            <article className="service-card" key={service.title}>
              <service.icon className="text-cyan-300" aria-hidden="true" />
              <h3>{service.title}</h3>
              <ul>
                {service.items.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section id="beneficios" title="Beneficios" intro="Mais controle sobre paradas, manutencoes e ajustes criticos para corte e gravacao.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <div className="benefit-row" key={benefit}>
              <BadgeCheck aria-hidden="true" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="como-funciona" title="Como funciona" intro="Um fluxo simples, com reserva salva antes do contato via WhatsApp.">
        <div className="grid gap-4 md:grid-cols-5">
          {["Escolha uma data disponivel.", "Selecione um horario livre.", "Preencha o formulario.", "Envie o agendamento pelo WhatsApp.", "Receba a confirmacao."].map((step, index) => (
            <div className="step" key={step}>
              <span>Passo {index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="precos" title="Precos" intro="Tabela objetiva para atendimento tecnico.">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="price-panel">
            <CircleDollarSign aria-hidden="true" />
            <h3>Atendimento Tecnico</h3>
            <div className="mt-6 grid gap-4">
              <PriceLine label="Primeira hora" value="R$ 100,00" />
              <PriceLine label="Horas adicionais" value="R$ 50,00 por hora" />
            </div>
          </div>
          <div className="note-panel">
            <Sparkles className="text-cyan-300" aria-hidden="true" />
            <p>
              Pecas, componentes e materiais utilizados durante o reparo poderao ser cobrados separadamente mediante aprovacao previa do cliente.
            </p>
          </div>
        </div>
      </Section>

      <section id="agendamento" className="relative border-y border-cyan-300/15 bg-slate-950/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <h2 className="text-4xl font-semibold text-white">Reserve um horario tecnico</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Horarios disponiveis: segunda a sexta as 18:00, 19:00 e 20:00; sabado das 08:00 as 12:00. Domingo indisponivel.
            </p>
            <div className="mt-8 grid gap-3">
              {["Busca horarios livres no banco", "Bloqueia horarios reservados", "Impede reserva duplicada", "Abre o WhatsApp apos salvar"].map((item) => (
                <div className="flex items-center gap-3 text-sm text-slate-200" key={item}>
                  <Zap className="text-cyan-300" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <BookingForm />
        </div>
      </section>

      <Section id="sobre" title="Sobre o tecnico" intro="Atendimento transparente, eficiente e focado em devolver o maximo desempenho a sua maquina.">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <p className="text-lg leading-8 text-slate-300">
            Sou tecnico especializado em manutencao de maquinas laser CO2, atuando com diagnostico, alinhamento optico, limpeza tecnica, substituicao de componentes e configuracao de software. Meu objetivo e oferecer um atendimento transparente, eficiente e focado em devolver o maximo desempenho a sua maquina.
          </p>
          <div className="tech-panel">
            <Bot aria-hidden="true" />
            <span>Diagnostico tecnico, optica e software em um atendimento programado.</span>
          </div>
        </div>
      </Section>

      <Section id="faq" title="FAQ" intro="Respostas rapidas para as duvidas mais comuns antes do atendimento.">
        <div className="grid gap-3 md:grid-cols-2">
          {faq.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>
                {question}
                <ChevronRight aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section id="contato" title="Contato" intro="Fale pelo WhatsApp para alinhar cidade, maquina, sintomas e prioridade do atendimento.">
        <div className="contact-band">
          <Headphones aria-hidden="true" />
          <div>
            <p className="font-mono text-sm text-cyan-200">WhatsApp configurado</p>
            <p className="mt-1 text-2xl font-semibold text-white">+{WHATSAPP_NUMBER}</p>
          </div>
          <a className="button-primary ml-auto" href={whatsappIntroUrl} target="_blank" rel="noopener noreferrer">
            Falar no WhatsApp
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </Section>

      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-[8px] border border-cyan-300/25 bg-cyan-300 p-8 text-slate-950 md:p-12">
          <h2 className="max-w-3xl text-4xl font-semibold">Coloque sua laser CO2 de volta em operacao com atendimento tecnico programado.</h2>
          <a className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-[4px] bg-slate-950 px-5 text-sm font-bold uppercase tracking-[0.12em] text-white" href="#agendamento">
            Agendar Manutencao
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#070b12]/85 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Navegacao principal">
        <a className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-white" href="#">
          LASER Manutencao Tecnica
        </a>
        <div className="hidden items-center gap-6 text-sm text-slate-300 lg:flex">
          <a href="#servicos">Servicos</a>
          <a href="#precos">Precos</a>
          <a href="#agendamento">Agendamento</a>
          <a href="#faq">FAQ</a>
          <a href="#contato">Contato</a>
        </div>
        <a className="hidden rounded-[4px] border border-cyan-300/60 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950 sm:inline-flex" href="#agendamento">
          Agendar
        </a>
      </nav>
    </header>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="mb-10 max-w-3xl">
        <h2 className="text-4xl font-semibold tracking-normal text-white">{title}</h2>
        <p className="mt-4 text-lg leading-8 text-slate-300">{intro}</p>
      </div>
      {children}
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-slate-800 pb-4">
      <span className="text-slate-300">{label}</span>
      <strong className="text-right text-2xl text-white">{value}</strong>
    </div>
  );
}
