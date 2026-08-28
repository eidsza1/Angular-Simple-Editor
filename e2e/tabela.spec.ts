import { test, expect, type Page } from '@playwright/test';

/**
 * Testy pilnują tego, czego nie widać na zrzucie ekranu: struktury tabeli i wyjścia z niej
 * klawiaturą. `scope` i pułapka klawiaturowa to naruszenia poziomu A, więc regresja tutaj
 * jest poważniejsza niż byle usterka wizualna.
 */

const panel = (page: Page) => page.locator('.wysiwyg-popover--table');

/**
 * Tytuł wstawianej tabeli. Służy też za jej identyfikator w testach: domyślna treść demo
 * zawiera własną tabelę, więc samo `table` trafiałoby w dwie i łamało tryb strict.
 */
const TYTUL = 'Ceny biletów';

const tabela = (page: Page) =>
  page.locator('.wysiwyg__content-editable table', {
    has: page.locator('caption', { hasText: TYTUL }),
  });

const obszarPrzewijania = (page: Page) =>
  page.locator('.wysiwyg-table-scroll', { has: page.locator('caption', { hasText: TYTUL }) });

/**
 * Stawia kursor w komórce i UPEWNIA SIĘ, że ProseMirror już o tym wie.
 *
 * Samo kliknięcie nie wystarcza: ProseMirror przenosi zaznaczenie z DOM do swojego stanu
 * dopiero przy najbliższym `selectionchange`, a test naciska klawisz kilka milisekund po
 * kliknięciu — szybciej, niż to nastąpi. Wpisany znak wymusza synchronizację, a asercja
 * na jego widoczności jest dowodem, że kursor stoi tam, gdzie test zakłada. Człowiek nigdy
 * nie trafia w to okno, więc to artefakt testu, nie usterka edytora.
 */
async function ustawKursorWKomorce(page: Page, komorka: ReturnType<Page['locator']>) {
  await komorka.click();
  await page.keyboard.type('x');
  await expect(komorka).toHaveText('x');
}

/**
 * Czy kursor stoi w tabeli.
 *
 * Sprawdzane przez `expect.poll`, bo ProseMirror synchronizuje zaznaczenie DOM po
 * zakończeniu transakcji — odczyt tuż po naciśnięciu klawisza łapie jeszcze stan sprzed.
 */
async function oczekujKursorPozaTabela(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const anchor = window.getSelection()?.anchorNode ?? null;
        const el = anchor?.nodeType === 1 ? (anchor as Element) : anchor?.parentElement;
        return !!el?.closest('table');
      }),
    )
    .toBe(false);
}

async function otworzPanelWstawiania(page: Page) {
  await page.locator('.wysiwyg__content-editable p').first().click();
  await page.getByRole('button', { name: 'Wstaw tabelę', exact: true }).first().click();
  await expect(panel(page)).toBeVisible();
}

async function wstawTabele(page: Page, wiersze: number, kolumny: number, tytul = TYTUL) {
  await otworzPanelWstawiania(page);
  await panel(page).getByLabel('Liczba wierszy').fill(String(wiersze));
  await panel(page).getByLabel('Liczba kolumn').fill(String(kolumny));
  await panel(page).getByLabel('Tytuł tabeli').fill(tytul);
  await panel(page).getByRole('button', { name: 'Wstaw tabelę' }).click();
  await expect(tabela(page)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.wysiwyg__content-editable')).toBeVisible();
});

test('wstawia tabelę o zadanej liczbie wierszy i kolumn', async ({ page }) => {
  await wstawTabele(page, 4, 2);

  await expect(tabela(page).locator('tr')).toHaveCount(4);
  await expect(tabela(page).locator('tr').first().locator('th, td')).toHaveCount(2);
  await expect(tabela(page).locator('caption')).toHaveText(TYTUL);
});

test('bez tytułu nie wstawia tabeli i przenosi fokus na pole z błędem', async ({ page }) => {
  await otworzPanelWstawiania(page);
  await panel(page).getByRole('button', { name: 'Wstaw tabelę' }).click();

  await expect(panel(page).getByRole('alert')).toHaveText('Podaj tytuł tabeli.');
  await expect(panel(page).getByLabel('Tytuł tabeli')).toBeFocused();
  await expect(panel(page).getByLabel('Tytuł tabeli')).toHaveAttribute('aria-invalid', 'true');
  await expect(tabela(page)).toHaveCount(0);
});

// SC 1.3.1 — bez `scope` czytnik ekranu czyta przy komórkach złe nagłówki albo żadnych.
test('nadaje scope wynikający z położenia komórki i przelicza go po zmianie', async ({ page }) => {
  await wstawTabele(page, 3, 3);

  await expect(tabela(page).locator('th')).toHaveCount(3);
  for (const th of await tabela(page).locator('th').all()) {
    await expect(th).toHaveAttribute('scope', 'col');
  }

  await ustawKursorWKomorce(page, tabela(page).locator('td').first());
  await page.getByRole('button', { name: 'Edytuj tabelę', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Kolumna nagłówkowa' }).click();

  // Pierwszy wiersz nadal opisuje kolumny; nagłówki pod nim opisują swoje wiersze.
  await expect(tabela(page).locator('tr').nth(1).locator('th').first()).toHaveAttribute('scope', 'row');
  await expect(tabela(page).locator('tr').first().locator('th').first()).toHaveAttribute('scope', 'col');
});

// SC 2.1.2 — domyślny keymap Tiptapa dodaje w ostatniej komórce wiersz zamiast wypuścić
// użytkownika. To pułapka klawiaturowa: bez tej poprawki z tabeli nie da się wyjść.
test('Tab w ostatniej komórce wychodzi z tabeli, zamiast dodać wiersz', async ({ page }) => {
  await wstawTabele(page, 3, 3);

  await ustawKursorWKomorce(page, tabela(page).locator('td').last());
  await page.keyboard.press('Tab');

  await oczekujKursorPozaTabela(page);
  await expect(tabela(page).locator('tr')).toHaveCount(3);
  await expect(page.locator('.wysiwyg__content-editable')).toBeFocused();
});

test('Escape wychodzi z tabeli z dowolnej komórki i ogłasza to czytnikowi', async ({ page }) => {
  await wstawTabele(page, 3, 3);

  await ustawKursorWKomorce(page, tabela(page).locator('td').first());
  await page.keyboard.press('Escape');

  await oczekujKursorPozaTabela(page);
  await expect(page.locator('.cdk-live-announcer-element')).toHaveText('Poza tabelą');
});

// SC 2.1.1 — obszar przewijalny musi być osiągalny z klawiatury.
test('tabela stoi w opisanym, fokusowalnym obszarze przewijania', async ({ page }) => {
  await wstawTabele(page, 3, 3);

  const wrapper = obszarPrzewijania(page);
  await expect(wrapper).toHaveAttribute('role', 'region');
  await expect(wrapper).toHaveAttribute('tabindex', '0');
  await expect(wrapper).toHaveAttribute('aria-label', `Tabela: ${TYTUL}`);
});

/**
 * Regresja: `<caption>` musi być POMINIĘTY przy parsowaniu. Bez tego parser wchodził
 * w podpis, znajdował tekst i dorabiał dla niego pusty wiersz — każdy obieg przez widok
 * źródła dokładał wiersz z tytułem w komórce.
 */
test('obieg przez widok źródła nie zmienia tabeli', async ({ page }) => {
  await wstawTabele(page, 3, 3);
  const przed = await tabela(page).innerHTML();

  await page.getByRole('button', { name: 'Widok źródła HTML' }).click();
  await expect(page.locator('.wysiwyg__source')).toBeVisible();
  await expect(page.locator('.wysiwyg__source')).toHaveValue(new RegExp(`<caption>${TYTUL}</caption>`));
  await expect(page.locator('.wysiwyg__source')).toHaveValue(/<th colspan="1" rowspan="1" scope="col">/);
  await page.getByRole('button', { name: 'Widok źródła HTML' }).click();

  await expect(tabela(page).locator('tr')).toHaveCount(3);
  expect(await tabela(page).innerHTML()).toBe(przed);
});
