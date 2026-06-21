import { expect, test } from "@playwright/test";

test.describe("site público LaserFix", () => {
  test("carrega a home e exibe CTAs principais", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/LaserFix/i);
    await expect(page.getByRole("heading", { name: /Manutenção de Máquinas/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Falar no WhatsApp/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Agendar Manutenção/i }).first()).toBeVisible();
  });

  test("abre a seção de agendamento", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Agendar Manutenção/i }).first().click();

    await expect(page.getByRole("heading", { name: /Agendamento/i })).toBeVisible();
    await expect(page.getByLabel("Nome")).toBeVisible();
    await expect(page.getByLabel("Cidade")).toBeVisible();
  });
});
