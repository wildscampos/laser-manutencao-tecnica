import type { Metadata } from "next";
import { CrmApp } from "@/components/crm-app";

export const metadata: Metadata = {
  title: "Histórico | LaserFix",
  description: "Histórico restrito de clientes e atendimentos LaserFix.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CrmHistoryPage() {
  return <CrmApp view="history" />;
}
