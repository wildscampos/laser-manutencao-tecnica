import { expect, test } from "@playwright/test";

const crmPassword = process.env.CRM_TEST_PASSWORD;

test.describe("CRM LaserFix", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!crmPassword, "Defina CRM_TEST_PASSWORD para validar login e páginas internas do CRM.");

    await page.goto("/crm");
    await page.getByLabel("Senha").fill(crmPassword!);
    await page.getByRole("button", { name: /Entrar/i }).click();
    await expect(page.getByRole("heading", { name: /Home do CRM/i })).toBeVisible();
  });

  test("exibe botões dos módulos principais", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Agendamentos/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Cadastro de clientes/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Histórico dos clientes/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Serviços e valores/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Financeiro/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Disponibilidade/i })).toBeVisible();
  });

  test("navega pelas páginas organizadas do CRM", async ({ page }) => {
    const routes = [
      { href: "/crm/agendamentos", heading: /Agendamentos/i },
      { href: "/crm/clientes", heading: /Clientes/i },
      { href: "/crm/historico", heading: /Histórico/i },
      { href: "/crm/servicos", heading: /Serviços/i },
      { href: "/crm/financeiro", heading: /Financeiro/i },
      { href: "/crm/disponibilidade", heading: /Disponibilidade/i },
    ];

    for (const route of routes) {
      await page.goto(route.href);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expect(page.getByRole("link", { name: /Home/i })).toBeVisible();
    }
  });
});
