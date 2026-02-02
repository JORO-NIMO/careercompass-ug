# E2E Testing (Playwright)

This project uses unit tests with Vitest. For end-to-end testing, we recommend Playwright.

## Setup

1. Install Playwright and browsers:

```bash
npm i -D @playwright/test
npx playwright install --with-deps
```

2. Create a basic config `playwright.config.ts` at the project root:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'test/e2e',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

3. Add scripts to `package.json`:

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui"
  }
}
```

## Sample Test

Create `test/e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('home loads and has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PlacementBridge/);
});

test('navigate to Find Placements', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Find Placements/i }).click();
  await expect(page).toHaveURL(/.*find-placements/);
});
```

## Run

Start the dev server then run e2e:

```bash
npm run dev
npm run e2e
```

If running in CI, ensure the dev server is available and `BASE_URL` is set.
