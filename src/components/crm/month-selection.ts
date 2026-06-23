"use client";

import { useEffect, useState } from "react";
import { getCurrentMonthKey } from "@/components/crm/formatters";

export function useAutoMonthSelection() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthKey);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);

  useEffect(() => {
    function refreshCurrentMonth() {
      const nextMonth = getCurrentMonthKey();
      setCurrentMonth((previousMonth) => {
        if (previousMonth === nextMonth) return previousMonth;
        setSelectedMonth((selected) => (selected === previousMonth ? nextMonth : selected));
        return nextMonth;
      });
    }

    refreshCurrentMonth();
    const timerId = window.setInterval(refreshCurrentMonth, 60_000);
    return () => window.clearInterval(timerId);
  }, []);

  return { currentMonth, selectedMonth, setSelectedMonth };
}
