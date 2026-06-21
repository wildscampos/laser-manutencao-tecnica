import type { Metadata } from "next";
import { CrmApp } from "@/components/crm-app";

export const metadata: Metadata = {
  title: "Disponibilidade | LaserFix",
  description: "Bloqueio restrito de horários LaserFix.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CrmAvailabilityPage() {
  return <CrmApp view="availability" />;
}
