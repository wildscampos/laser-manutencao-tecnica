# LASER Manutencao Tecnica

Site profissional em Next.js para divulgacao de servicos de manutencao de maquinas laser CO2, com agendamento online integrado ao Firestore e abertura automatica do WhatsApp apos a reserva.

## Tecnologias

- Next.js App Router
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- Firebase Firestore com Firebase Admin
- Lucide React
- Vercel

## Estrutura

- `src/app/page.tsx`: single page application e conteudo do site.
- `src/components/booking-form.tsx`: formulario de agendamento.
- `src/app/api/availability/route.ts`: consulta horarios livres.
- `src/app/api/appointments/route.ts`: valida e cria agendamento.
- `src/lib/appointments.ts`: gravacao no Firestore e bloqueio de duplicidade.
- `src/lib/schedule.ts`: regras de dias e horarios.
- `src/config/whatsapp.ts`: numero e mensagem do WhatsApp.
- `firestore.rules`: bloqueia acesso client-side direto; o backend grava via Admin SDK.

## Banco

Projeto Firebase: `laser-manutencao-co2-20260618`

Colecao: `agendamentos`

Documento: ID deterministico no formato `YYYY-MM-DD_HH-mm`, garantindo unicidade por `data + horario`.

Campos:

```json
{
  "id": "string",
  "nome": "string",
  "telefone": "string",
  "whatsapp": "string",
  "empresa": "string",
  "cidade": "string",
  "modeloMaquina": "string",
  "servico": "string",
  "data": "YYYY-MM-DD",
  "horario": "HH:mm",
  "observacoes": "string",
  "fotoNome": "string",
  "status": "agendado",
  "createdAt": "timestamp",
  "createdAtIso": "string"
}
```

## Configuracao

Crie `.env.local` a partir de `.env.example`:

```bash
npm install
npm run dev
```

Variaveis obrigatorias:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_SITE_URL`

## Deploy

O projeto esta preparado para Vercel. Configure as mesmas variaveis de ambiente no projeto Vercel e publique:

```bash
npx vercel --prod
```

## Atualizacoes

- Para trocar o WhatsApp, altere `NEXT_PUBLIC_WHATSAPP_NUMBER` ou `src/config/whatsapp.ts`.
- Para alterar horarios, edite `src/lib/schedule.ts`.
- Para alterar servicos, edite `src/app/page.tsx` e `src/lib/schedule.ts`.
- Para revisar reservas, consulte a colecao `agendamentos` no Firestore.
