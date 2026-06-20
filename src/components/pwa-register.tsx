"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || window.location.hostname === "localhost") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA installability should not block normal site usage.
    });
  }, []);

  return null;
}
