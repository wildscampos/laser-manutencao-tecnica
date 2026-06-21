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

  test("mantém agendamento manual somente na página de agendamentos", async ({ page }) => {
    await page.goto("/crm/clientes");
    await expect(page.getByRole("heading", { name: /^Agendamento manual$/i })).toHaveCount(0);

    await page.goto("/crm/agendamentos");
    await expect(page.getByRole("heading", { name: /^Agendamento manual$/i })).toBeVisible();
  });

  test("oculta horários indisponíveis no agendamento manual", async ({ page }) => {
    await page.goto("/crm/agendamentos");
    await expect(page.getByLabel("Data")).toBeHidden();
    await page.getByText("Agendamento manual").click();
    await page.getByLabel("Data").fill("2026-06-21");

    const timeSelect = page.getByLabel("Horário");
    await expect(timeSelect).toContainText("Nenhum horário livre");
    await expect(timeSelect).not.toContainText("18:00");
  });

  test("mantém formulários de criação recolhidos por padrão", async ({ page }) => {
    await page.goto("/crm/agendamentos");
    await expect(page.getByLabel("Data")).toBeHidden();
    await page.getByText("Agendamento manual").click();
    await expect(page.getByLabel("Data")).toBeVisible();

    await page.goto("/crm/clientes");
    await expect(page.getByRole("button", { name: /Salvar cliente/i })).toBeHidden();
    await page.getByText("Cadastrar cliente").click();
    await expect(page.getByRole("button", { name: /Salvar cliente/i })).toBeVisible();
  });

  test("mantém histórico financeiro recolhido por padrão", async ({ page }) => {
    await page.goto("/crm/financeiro");
    await expect(page.locator(".crm-finance-card").first()).toBeHidden();
    await page.getByText("Histórico financeiro").click();
    await expect(page.locator(".crm-finance-card").first()).toBeVisible();
  });

  test("lista somente horários disponíveis no bloqueio manual", async ({ page }) => {
    await page.goto("/crm/disponibilidade");
    await page.getByLabel("Data").fill("2026-06-21");

    const timeSelect = page.getByLabel("Horário");
    await expect(timeSelect).toContainText("Nenhum horário livre");
    await expect(timeSelect).not.toContainText("18:00");
    await expect(page.getByRole("button", { name: /Bloquear horário/i })).toBeDisabled();
  });

  test("mantém tema do CRM persistente entre páginas sem texto no botão", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("laserfix-crm-theme", "light");
      document.documentElement.dataset.crmTheme = "light";
    });

    const themeButton = page.getByRole("button", { name: /Alternar tema do CRM/i });
    await expect(themeButton).toHaveText("");

    await themeButton.click();
    await expect(page.locator("html")).toHaveAttribute("data-crm-theme", "dark");

    await page.goto("/crm/clientes");
    await expect(page.locator("html")).toHaveAttribute("data-crm-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-crm-theme", "dark");
  });

  test("mantém apenas um agendamento expandido por vez", async ({ page }) => {
    await page.goto("/crm/agendamentos");

    const cards = page.locator(".crm-appointment-accordion");
    await expect(cards.first()).toBeVisible();

    await cards.first().getByRole("button").first().click();
    await expect(cards.first().getByRole("button", { name: /Recolher/i })).toBeVisible();

    if ((await cards.count()) > 1) {
      await cards.nth(1).getByRole("button").first().click();
      await expect(cards.first().getByRole("button", { name: /Expandir/i })).toBeVisible();
      await expect(cards.nth(1).getByRole("button", { name: /Recolher/i })).toBeVisible();
    }
  });
});
