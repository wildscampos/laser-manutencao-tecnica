# LASER Manutencao Tecnica

Site profissional em Next.js para divulgacao de servicos de manutencao de maquinas laser CO2, com agendamento online integrado ao Firebase Firestore e abertura automatica do WhatsApp apos a reserva.

Site publicado: https://laser-manutencao-tecnica.web.app

## Tecnologias

- Next.js App Router com export estatico
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- Firebase Firestore client SDK
- Firebase Hosting gratuito
- Lucide React

## Estrutura

- `src/app/page.tsx`: single page application e conteudo do site.
- `src/components/booking-form.tsx`: formulario de agendamento.
- `src/lib/client-appointments.ts`: consulta disponibilidade e cria reservas no Firestore.
- `src/lib/firebase-client.ts`: configuracao publica do Firebase Web SDK.
- `src/lib/schedule.ts`: regras de dias e horarios.
- `src/config/whatsapp.ts`: numero e mensagem do WhatsApp.
- `firestore.rules`: regras que protegem os dados pessoais e impedem sobrescrita de horarios.
- `firebase.json`: deploy estatico para Firebase Hosting.

## Banco

Projeto Firebase: `laser-manutencao-co2-20260618`

Colecoes:

- `slots`: publica para disponibilidade. Contem apenas `data`, `horario`, `status` e auditoria basica.
- `agendamentos`: dados completos do cliente. Escrita permitida apenas na criacao; leitura publica bloqueada.

Documento: ID deterministico no formato `YYYY-MM-DD_HH-mm`, garantindo unicidade por `data + horario`.

Campos em `agendamentos`:

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

As configuracoes publicas do Firebase ja possuem fallback em `src/lib/firebase-client.ts`. Para sobrescrever localmente, crie `.env.local` a partir de `.env.example`.

```bash
npm install
npm run dev
```

## Deploy gratuito

```bash
npm run build
firebase deploy --only firestore:rules,hosting --project laser-manutencao-co2-20260618
```

## Atualizacoes

- Para trocar o WhatsApp, altere `NEXT_PUBLIC_WHATSAPP_NUMBER` ou `src/config/whatsapp.ts`.
- Para alterar horarios, edite `src/lib/schedule.ts` e revise `firestore.rules`.
- Para alterar servicos, edite `src/app/page.tsx` e `src/lib/schedule.ts`.
- Para revisar reservas, consulte a colecao `agendamentos` no Firestore.
