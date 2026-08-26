import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Szeregowo, nie równolegle.
  //
  // Wszystkie testy dzielą jeden serwer dev i jedną instancję aplikacji; przy czterech
  // workerach dawały fałszywe awarie zależne od kolejności. Suita jest mała, więc czas
  // wykonania nie jest tu argumentem.
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx ng serve demo --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
