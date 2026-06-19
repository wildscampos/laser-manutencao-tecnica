# LASER Manutenção Técnica

Site profissional em Next.js para divulgação de serviços de manutenção de máquinas laser CO2, com agendamento online integrado ao Firebase Firestore e abertura automática do WhatsApp após a reserva.

Site publicado: https://laser-manutencao-tecnica.web.app

## Tecnologias

- Next.js App Router com export estático
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- Firebase Firestore client SDK
- Firebase Hosting gratuito
- Lucide React

## Estrutura

- `src/app/page.tsx`: single page application e conteúdo do site.
- `src/components/booking-form.tsx`: formulário de agendamento.
- `src/lib/client-appointments.ts`: consulta disponibilidade e cria reservas no Firestore.
- `src/lib/firebase-client.ts`: configuração pública do Firebase Web SDK.
- `src/lib/schedule.ts`: regras de dias e horários.
- `src/lib/service-area.ts`: cidades atendidas e cálculo interno de deslocamento.
- `src/config/whatsapp.ts`: número e mensagem do WhatsApp.
- `firestore.rules`: regras que protegem os dados pessoais e impedem sobrescrita de horários.
- `firebase.json`: deploy estático para Firebase Hosting.

## Banco

Projeto Firebase: `laser-manutencao-co2-20260618`

Coleções:

- `slots`: pública para disponibilidade. Contém apenas `data`, `horario`, `status` e auditoria básica.
- `agendamentos`: dados completos do cliente. Escrita permitida apenas na criação; leitura pública bloqueada.

Documento: ID determinístico no formato `YYYY-MM-DD_HH-mm`, garantindo unicidade por `data + horario`.

Campos em `agendamentos`:

```json
{
  "id": "string",
  "nome": "string",
  "telefone": "string",
  "whatsapp": "string",
  "empresa": "string",
  "rua": "string",
  "numero": "string",
  "bairro": "string",
  "cidade": "string",
  "modeloMaquina": "string",
  "servico": "string",
  "data": "YYYY-MM-DD",
  "horario": "HH:mm",
  "observacoes": "string",
  "fotoNome": "string",
  "deslocamentoKm": "number",
  "deslocamentoValor": "number",
  "status": "agendado",
  "createdAt": "timestamp",
  "createdAtIso": "string"
}
```

## Configuração

As configurações públicas do Firebase já possuem fallback em `src/lib/firebase-client.ts`. Para sobrescrever localmente, crie `.env.local` a partir de `.env.example`.

```bash
npm install
npm run dev
```

## Deploy gratuito

```bash
npm run build
firebase deploy --only firestore:rules,hosting --project laser-manutencao-co2-20260618
```

## Atualizações

- Para trocar o WhatsApp, altere `NEXT_PUBLIC_WHATSAPP_NUMBER` ou `src/config/whatsapp.ts`.
- Para alterar horários, edite `src/lib/schedule.ts` e revise `firestore.rules`.
- Para alterar cidades, distância ou taxa de deslocamento, edite `src/lib/service-area.ts` e revise `firestore.rules`.
- Para alterar serviços, edite `src/app/page.tsx` e `src/lib/schedule.ts`.
- Para revisar reservas, consulte a coleção `agendamentos` no Firestore.
