import { test, expect } from '@playwright/test';

/**
 * Wejście do paska i wyjście z niego. Regresja: `Alt+F10` był obsługiwany, ale przy
 * PIERWSZYM użyciu nie przenosił fokusu — `FocusKeyManager` trzyma wtedy `activeItemIndex`
 * równe -1, a nie `null`, więc `?? 0` nie łapało tej wartości i menedżer po cichu nie robił
 * nic. Skrót zaczynał działać dopiero po wcześniejszym kliknięciu w pasek.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.wysiwyg__content-editable')).toBeVisible();
});

test('Alt+F10 przenosi fokus z treści na pasek już za pierwszym razem', async ({ page }) => {
  await page.locator('.wysiwyg__content-editable h2').first().click();

  await page.keyboard.press('Alt+F10');

  await expect(page.getByRole('button', { name: 'Cofnij' })).toBeFocused();
});

test('Escape z paska wraca do treści', async ({ page }) => {
  await page.locator('.wysiwyg__content-editable h2').first().click();
  await page.keyboard.press('Alt+F10');
  await expect(page.getByRole('button', { name: 'Cofnij' })).toBeFocused();

  await page.keyboard.press('Escape');

  await expect(page.locator('.wysiwyg__content-editable')).toBeFocused();
});

// Wzorzec APG dla paska: dokładnie JEDEN tabstop, reszta na strzałkach.
test('pasek ma dokładnie jeden tabstop, a strzałki przesuwają fokus', async ({ page }) => {
  await page.locator('.wysiwyg__content-editable h2').first().click();
  await page.keyboard.press('Alt+F10');

  await expect(page.locator('.wysiwyg-toolbar [tabindex="0"]')).toHaveCount(1);

  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Ponów' })).toBeFocused();
  await expect(page.locator('.wysiwyg-toolbar [tabindex="0"]')).toHaveCount(1);
});
