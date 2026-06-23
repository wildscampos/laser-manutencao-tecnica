import type { Metadata } from "next";
import { CrmApp } from "@/components/crm-app";

export const metadata: Metadata = {
  title: "Gastos | LaserFix",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CrmExpensesPage() {
  return <CrmApp view="expenses" />;
}
