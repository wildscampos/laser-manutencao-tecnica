import type { CrmAppointment } from "@/lib/crm";

export function getAppointmentStartTime(appointment: CrmAppointment) {
  return new Date(`${appointment.data}T${appointment.horario}:00`).getTime();
}

async function showCrmNotification(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  const options: NotificationOptions = {
    body,
    icon: "/pwa-icon-laserfix-192.png",
    badge: "/pwa-icon-laserfix-192.png",
    tag,
    data: { url: "/crm" },
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return true;
    }

    new Notification(title, options);
    return true;
  } catch {
    try {
      new Notification(title, options);
      return true;
    } catch {
      return false;
    }
  }
}

export function readNotificationKeys(storageKey: string) {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(storageKey) || "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function writeNotificationKeys(storageKey: string, keys: Set<string>) {
  window.localStorage.setItem(storageKey, JSON.stringify(Array.from(keys)));
}

export async function showCrmNotificationOnce(storageKey: string, uniqueKey: string, title: string, body: string, tag: string) {
  const notifiedKeys = readNotificationKeys(storageKey);
  if (notifiedKeys.has(uniqueKey)) return;

  const shown = await showCrmNotification(title, body, tag);
  if (!shown) return;

  notifiedKeys.add(uniqueKey);
  writeNotificationKeys(storageKey, notifiedKeys);
}

export async function requestCrmNotificationPermission() {
  if (!("Notification" in window)) return "denied" as NotificationPermission;
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}
