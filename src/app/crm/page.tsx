import type { Metadata } from "next";
import { CrmApp } from "@/components/crm-app";

export const metadata: Metadata = {
  title: "LaserFix",
  description: "CRM restrito para acompanhamento dos atendimentos LaserFix.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CrmPage() {
  return <CrmApp />;
}
