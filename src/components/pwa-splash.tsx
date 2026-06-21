"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const splashSessionKey = "laserfix-pwa-splash-shown";

function isStandalonePwa() {
  const iosNavigator = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean(iosNavigator.standalone)
  );
}

export function PwaSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isStandalonePwa()) return;
    if (window.sessionStorage.getItem(splashSessionKey) === "true") return;

    window.sessionStorage.setItem(splashSessionKey, "true");
    const showTimerId = window.setTimeout(() => {
      setVisible(true);
    }, 0);

    const timerId = window.setTimeout(() => {
      setVisible(false);
    }, 1600);

    return () => {
      window.clearTimeout(showTimerId);
      window.clearTimeout(timerId);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pwa-custom-splash" role="status" aria-label="Abrindo LaserFix">
      <Image src="/pwa-splash-logo.jpg" alt="LaserFix" width={1280} height={720} priority />
    </div>
  );
}
