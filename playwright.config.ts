import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta (opcionais). Rodam contra um servidor já ligado
 * (E2E_BASE_URL, padrão http://localhost:3000) e com sessões de teste
 * passadas por variáveis de ambiente. Veja tests/e2e/README.md.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Maceio",
    channel: process.env.E2E_CHROME_CHANNEL ?? undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
