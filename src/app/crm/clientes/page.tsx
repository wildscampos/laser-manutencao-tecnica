import type { Metadata } from "next";
import { CrmApp } from "@/components/crm-app";

export const metadata: Metadata = {
  title: "Clientes | LaserFix",
  description: "Cadastro restrito de clientes LaserFix.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CrmCustomersPage() {
  return <CrmApp view="customers" />;
}
