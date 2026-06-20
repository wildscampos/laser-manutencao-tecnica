import Image from "next/image";
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
} from "lucide-react";
import { BookingForm } from "@/components/booking-form";
import { SiteHeader } from "@/components/site-header";
import { WHATSAPP_NUMBER, buildWhatsAppMessage, buildWhatsAppUrl } from "@/config/whatsapp";

const whatsappIntroUrl = buildWhatsAppUrl(
  buildWhatsAppMessage({
    nome: "",
    telefone: "",
    empresa: "",
    cidade: "",
    modeloMaquina: "",
    servico: "Atendimento técnico",
    data: "",
    horario: "",
    observacoes: "Quero falar sobre manutenção de máquina laser CO₂.",
  }),
);

const services = [
  {
    title: "Manutenção Preventiva",
    icon: ShieldCheck,
    items: ["Limpeza técnica completa", "Verificação de componentes", "Ajustes de desempenho"],
  },
  {
    title: "Manutenção Corretiva",
    icon: Wrench,
    items: ["Diagnóstico técnico", "Correção de falhas", "Testes operacionais"],
  },
  {
    title: "Alinhamento Óptico",
    icon: Crosshair,
    items: ["Alinhamento dos espelhos", "Ajuste de percurso do feixe", "Calibração de precisão"],
  },
  {
    title: "Substituição de Componentes",
    icon: Cable,
    items: ["Tubos laser CO₂", "Fontes, painéis e controladoras", "Drivers, lentes, espelhos e conexões"],
  },
  {
    title: "Software",
    icon: Cpu,
    items: ["Instalação do RD Works", "Configuração do RD Works", "Backup e restauração de parâmetros"],
  },
  {
    title: "Artes para Corte e Gravação",
    icon: Sparkles,
    items: ["Criação de arquivos para produção", "Ajustes para corte e gravação", "Preparação com foco em aproveitamento"],
  },
];

const benefits = [
  "Precisão no corte",
  "Menos desperdício",
  "Menos retrabalho",
  "Mais produtividade",
  "Menos máquina parada",
  "Agendamento online",
];

const maintenancePoints = [
  {
    title: "Precisão de corte e gravação",
    text: "Ajustes e alinhamento óptico ajudam a manter o feixe estável, reduzindo perda de qualidade no acabamento.",
    icon: Crosshair,
  },
  {
    title: "Menos paradas inesperadas",
    text: "A verificação preventiva identifica desgaste em lentes, espelhos, tubo laser, fonte e conexões antes da falha.",
    icon: ShieldCheck,
  },
  {
    title: "Vida útil do equipamento",
    text: "Limpeza técnica e calibração reduzem esforço dos componentes e preservam o desempenho da máquina.",
    icon: Gauge,
  },
  {
    title: "Atendimento com método",
    text: "Diagnóstico, correção e testes operacionais deixam o serviço mais transparente e seguro para sua operação.",
    icon: Wrench,
  },
];

const testimonials = [
  {
    name: "Luciano",
    city: "Aparecida",
    text: "O atendimento foi completo nas quatro máquinas: preventiva, limpeza, alinhamento e troca de espelhos e lente. Também fez a montagem de uma máquina de dois tubos com bastante cuidado técnico.",
    service: "Preventiva, alinhamento, troca óptica e montagem",
  },
  {
    name: "Tanaka",
    city: "Potim",
    text: "A manutenção deixou a máquina pronta para trabalhar. Além da limpeza preventiva, ajustou motor de passo e preparou artes para corte e gravação.",
    service: "Preventiva, motor de passo e artes",
  },
  {
    name: "Luiz",
    city: "Aparecida",
    text: "Fez a manutenção preventiva, troca de espelhos, limpeza e configuração. O serviço foi claro e focado em colocar a máquina em funcionamento com precisão.",
    service: "Preventiva, espelhos e configuração",
  },
  {
    name: "Robson",
    city: "Guaratinguetá",
    text: "Precisava de manutenção preventiva e troca de componentes. O atendimento foi direto, com orientação sobre o que precisava ser substituído.",
    service: "Preventiva e componentes",
  },
  {
    name: "João",
    city: "Aparecida",
    text: "A manutenção preventiva foi feita de forma organizada, com verificação dos pontos principais para manter a máquina operando melhor.",
    service: "Manutenção preventiva",
  },
  {
    name: "Sandra",
    city: "Guaratinguetá",
    text: "O atendimento envolveu alinhamento, limpeza, troca de lentes, espelhos, tubos, fontes, drivers, painel, controladora e sensores. Também configurou motores de passo e criou artes para produção.",
    service: "Revisão completa, eletrônica, óptica e artes",
  },
];

const faq = [
  ["Você troca tubo laser?", "Sim. A troca pode ser feita após avaliação do modelo, potência e compatibilidade da máquina."],
  ["Você troca fonte?", "Sim. Realizo diagnóstico da fonte de alimentação e substituição quando necessário."],
  ["Você configura RD Works?", "Sim. Faço instalação, configuração, ajustes de parâmetros, backup e restauração."],
  ["Faz alinhamento dos espelhos?", "Sim. O alinhamento óptico inclui ajustes no percurso do feixe e calibração de precisão."],
  ["O valor inclui peças?", "Não. Peças, componentes e materiais podem ser cobrados separadamente mediante aprovação prévia."],
  ["O atendimento é presencial?", "O atendimento técnico é programado conforme cidade, disponibilidade e tipo de serviço."],
  ["Quanto tempo dura uma manutenção?", "Depende do estado da máquina. A primeira hora cobre diagnóstico e início do atendimento."],
  ["Posso enviar fotos antes do atendimento?", "Sim. O formulário permite informar foto e o WhatsApp fica aberto para envio de imagens."],
  ["Como funciona o agendamento?", "Você escolhe uma data e horário livre; o sistema salva a reserva e abre o WhatsApp para confirmar."],
];

const currentYear = new Date().getFullYear();

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "LaserFix",
    description: "Manutenção de máquinas de corte a laser CO₂, alinhamento óptico, limpeza, troca de componentes e configuração RD Works.",
    telephone: `+${WHATSAPP_NUMBER}`,
    areaServed: "Brasil",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://laserfix.web.app",
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
    <main className="min-h-screen overflow-hidden bg-[#111111] text-slate-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <section className="relative border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(0,168,255,0.18),transparent_30%),linear-gradient(135deg,rgba(0,168,255,0.12),transparent_42%)]" />
        <div className="laser-grid absolute inset-0 opacity-35" />
        <div className="relative mx-auto grid min-h-[86vh] max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:py-28">
          <div className="min-w-0">
            <div className="mb-8 flex justify-center sm:mb-10 lg:justify-start">
              <Image
                className="hero-logo"
                src="/logo-laserfix.jpg"
                alt="Logo LaserFix"
                width={1280}
                height={720}
                priority
              />
            </div>
            <h1 className="hero-title max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">
              Manutenção de Máquinas de Corte a Laser <span className="whitespace-nowrap">CO₂</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Seu laser sempre no ponto: alinhamento, limpeza, troca de componentes, configuração e ajustes para sua máquina voltar a produzir com qualidade.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a className="button-primary" href="#agendamento">
                Agendar Manutenção
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="button-secondary" href={whatsappIntroUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                Falar no WhatsApp
              </a>
            </div>
          </div>

          <div className="relative min-h-[420px] min-w-0 overflow-hidden rounded-[8px] border border-[#00A8FF]/20 bg-slate-950/70 p-4 shadow-2xl shadow-black/40 sm:p-6">
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(0,168,255,0.10)_48%,transparent_52%)]" />
            <div className="relative flex h-full min-h-[380px] flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="font-mono text-sm text-[#00A8FF]">LaserFix</span>
                <Gauge className="text-[#00A8FF]" aria-hidden="true" />
              </div>
              <div className="my-8 grid gap-4">
                {[
                  "Alinhamento de lentes, espelhos e tubos CO₂",
                  "Configuração de motores de passo e sensores",
                  "Ajustes para máxima precisão de corte",
                  "Criação de artes para corte e gravação",
                  "Guaratinguetá e região",
                  "(12) 98182-3416",
                ].map((item, index) => (
                  <div className="flex items-center gap-4 border-l border-[#00A8FF]/60 bg-white/[0.03] p-4" key={item}>
                    <span className="flex size-9 items-center justify-center rounded-[4px] bg-[#00A8FF] text-sm font-bold text-slate-950">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-100">{item}</span>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric value="18h-20h" label="Segunda a sexta" />
                <Metric value="08h-12h" label="Sábado" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section id="servicos" title="Serviços técnicos" intro="A LaserFix atua no que realmente importa: precisão, menos retrabalho, mais produtividade e menos máquina parada.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article className="service-card" key={service.title}>
              <service.icon className="text-[#00A8FF]" aria-hidden="true" />
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

      <Section
        id="importancia"
        title="Importância da manutenção"
        intro="Máquinas laser CO₂ exigem limpeza, calibração e inspeção periódica para manter precisão, produtividade e segurança no uso diário."
      >
        <div className="importance-panel">
          <div className="importance-copy">
            <p>
              A manutenção de máquinas de corte e gravação a laser evita que pequenos desgastes se transformem em paradas de produção. O serviço técnico envolve ajustes, limpeza, verificação de componentes e testes que preservam a qualidade dos cortes, a estabilidade do feixe e a confiabilidade da operação.
            </p>
            <p>
              Com a manutenção preventiva em dia, empresas de comunicação visual, estamparias, gráficas, escolas técnicas e pequenas indústrias reduzem custos com reparos emergenciais e prolongam a vida útil do equipamento. Quando há falha, o diagnóstico correto acelera a correção e ajuda a recuperar o desempenho da máquina com mais previsibilidade.
            </p>
            <a className="button-secondary importance-cta" href="#agendamento">
              Agendar manutenção preventiva
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
          <div className="importance-list" aria-label="Pontos principais da manutenção">
            {maintenancePoints.map((point) => (
              <div className="importance-item" key={point.title}>
                <point.icon aria-hidden="true" />
                <div>
                  <h3>{point.title}</h3>
                  <p>{point.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="beneficios" title="Benefícios">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <div className="benefit-row" key={benefit}>
              <BadgeCheck aria-hidden="true" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="depoimentos" title="Depoimentos" intro="Serviços recentes realizados em máquinas laser CO₂ na região.">
        <div className="testimonial-grid">
          {testimonials.map((testimonial) => (
            <article className="testimonial-card" key={`${testimonial.name}-${testimonial.city}`}>
              <div className="testimonial-topline">
                <span>{testimonial.city}</span>
                <BadgeCheck aria-hidden="true" />
              </div>
              <p className="testimonial-text">“{testimonial.text}”</p>
              <div className="testimonial-footer">
                <strong>{testimonial.name}</strong>
                <span>{testimonial.service}</span>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="como-funciona" title="Como funciona">
        <div className="grid gap-4 md:grid-cols-5">
          {["Escolha uma data disponível.", "Selecione um horário livre.", "Preencha o formulário.", "Envie o agendamento pelo WhatsApp.", "Receba a confirmação."].map((step, index) => (
            <div className="step" key={step}>
              <span>Passo {index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="precos" title="Preços">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="price-panel">
            <CircleDollarSign aria-hidden="true" />
            <h3>Atendimento Técnico</h3>
            <div className="mt-6 grid gap-4">
              <PriceLine label="Primeira hora" value="R$ 100,00" />
              <PriceLine label="Horas adicionais" value="R$ 50,00 por hora" />
            </div>
            <p className="mt-5 text-sm font-semibold text-white">+ deslocamento, quando aplicável</p>
          </div>
          <div className="note-panel">
            <Sparkles className="text-[#00A8FF]" aria-hidden="true" />
            <p>
              Peças, componentes e materiais utilizados durante o reparo poderão ser cobrados separadamente mediante aprovação prévia do cliente.
            </p>
          </div>
        </div>
      </Section>

      <section id="agendamento" className="relative border-y border-[#00A8FF]/15 bg-slate-950/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <h2 className="text-4xl font-semibold text-white">Reserve um horário técnico</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Horários disponíveis: segunda a sexta às 18:00, 19:00 e 20:00; sábado das 08:00 às 12:00. Domingo indisponível.
            </p>
          </div>
          <BookingForm />
        </div>
      </section>

      <Section id="sobre" title="Sobre mim" intro="Atendimento direto, sem intermediários e com clareza sobre o que precisa ser feito." introStrong>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="about-copy">
            <p>
              Meu nome é Wilds Campos e trabalho com manutenção de máquinas laser CO₂, atendendo empresas e profissionais que dependem da máquina funcionando todos os dias para produzir e vender.
            </p>
            <p>
              Sei que uma máquina parada significa atraso, prejuízo e dor de cabeça. Por isso, procuro oferecer um atendimento rápido, transparente e focado na solução real do problema.
            </p>
            <p>
              Realizo diagnósticos, alinhamento óptico, limpeza técnica, troca de componentes, configurações de software e ajustes de desempenho para que sua máquina volte a operar com segurança e precisão.
            </p>
            <p>
              Em cada atendimento, você fala diretamente comigo. Sem intermediários, sem enrolação e com total clareza sobre o que precisa ser feito.
            </p>
            <p>
              <strong>Seu equipamento merece cuidado técnico. Seu negócio merece confiança.</strong>
            </p>
          </div>
          <div className="tech-panel">
            <Bot aria-hidden="true" />
            <span>Atendimento técnico direto, transparente e focado em colocar sua máquina de volta em operação.</span>
          </div>
        </div>
      </Section>

      <Section id="faq" title="FAQ" intro="Respostas rápidas para as dúvidas mais comuns antes do atendimento.">
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

      <Section id="contato" title="Contato" intro="Fale pelo WhatsApp para alinhar cidade, máquina, sintomas e prioridade do atendimento.">
        <div className="contact-band">
          <Headphones aria-hidden="true" />
          <div>
            <p className="font-mono text-sm text-[#00A8FF]">WhatsApp</p>
            <p className="mt-1 text-2xl font-semibold text-white">+{WHATSAPP_NUMBER}</p>
          </div>
          <a className="button-primary ml-auto" href={whatsappIntroUrl} target="_blank" rel="noopener noreferrer">
            Falar no WhatsApp
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </Section>

      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-[8px] border border-[#00A8FF]/25 bg-[#00A8FF] p-8 text-slate-950 md:p-12">
          <h2 className="max-w-3xl text-4xl font-semibold">Coloque sua laser CO₂ de volta em operação com atendimento técnico programado.</h2>
          <a className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-[4px] bg-slate-950 px-5 text-sm font-bold uppercase tracking-[0.12em] text-white" href="#agendamento">
            Agendar Manutenção
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <footer className="border-t border-slate-800 px-5 py-6 text-center text-sm text-slate-400 sm:px-8">
        <p>© {currentYear} Wilds Campos. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}

function Section({ id, title, intro, children, introStrong }: { id: string; title: string; intro?: string; children: React.ReactNode; introStrong?: boolean }) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="mb-10 max-w-3xl">
        <h2 className="text-4xl font-semibold tracking-normal text-white">{title}</h2>
        {intro && <p className={introStrong ? "mt-4 text-lg font-bold leading-8 text-slate-300" : "mt-4 text-lg leading-8 text-slate-300"}>{intro}</p>}
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
