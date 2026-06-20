import type { Metadata } from "next";
import { CrmApp } from "@/components/crm-app";

export const metadata: Metadata = {
  title: "Agendamentos | LaserFix",
  description: "Agenda restrita de atendimentos LaserFix.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CrmAppointmentsPage() {
  return <CrmApp view="appointments" />;
}
