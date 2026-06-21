import type { Metadata } from "next";
import { CrmApp } from "@/components/crm-app";

export const metadata: Metadata = {
  title: "Financeiro | LaserFix",
  description: "Financeiro restrito de atendimentos LaserFix.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CrmFinancePage() {
  return <CrmApp view="finance" />;
}
