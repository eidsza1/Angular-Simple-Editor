import { test, expect, type Page } from '@playwright/test';

/**
 * PNG 240×140 — celowo realistyczny rozmiar.
 *
 * Obrazek kilkupikselowy byłby mniejszy niż pola chwytania uchwytów (24×24 px), więc test
 * sprawdzałby patologiczny przypadek zamiast normalnego użycia.
 */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAPAAAACMCAIAAADN17N/AAABkElEQVR4nO3SUQkAIBTAwBfMEMY2liUEYRxcgH1szl6QMd8L4CFDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUgxNiqFJMTQphibF0KQYmhRDk2JoUi52sFsz+qRRvAAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Domyślna treść demo zawiera już jeden obraz, więc testy muszą jednoznacznie wskazać ten
 * wgrany w teście.
 *
 * Rozpoznajemy go po adresie `blob:` — obraz z domyślnej treści ma zwykły URL pliku.
 * Pozycja w dokumencie NIE nadaje się na kryterium: kontener wstawiamy po pierwszym
 * nagłówku, więc nowy obraz trafia PRZED ten domyślny.
 */
const wstawionyImg = (page: Page) => page.locator('.wysiwyg-image__img[src^="blob:"]');
const wstawionyObraz = (page: Page) => page.locator('.wysiwyg-image:has(> img[src^="blob:"])');

async function wstawKontenerUploadu(page: Page) {
  await page.locator('.wysiwyg__content-editable h2').first().click();
  await page.getByRole('button', { name: 'Wstaw obraz', exact: true }).click();
  await expect(page.locator('.wysiwyg-upload')).toBeVisible();
}

async function wgrajPlik(page: Page) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('.wysiwyg-upload__pick').click(),
  ]);
  await chooser.setFiles({ name: 'proba.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('.wysiwyg-upload__preview')).toBeVisible();
}

/** PNG 1600×500 — SZERSZY niż kolumna tekstu. To on ujawnia przepełnienie kartki. */
const PNG_SZEROKI = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAABkAAAAH0CAIAAADqknYdAAAMKElEQVR42u3YQQ0AAAjEsBOGJnQiCxuQNKmCPZfqAQAAAICzIgEAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAGFgqAAAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAICBpQIAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAGlgQAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAYGCpAAAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAGlgoAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAABhYAAAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAACAgQUAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAYGABAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAICBBQAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAABgYAEAAACAgQUAAAAABhYAAAAABhYAAAAAGFgAAAAAGFgAAAAAYGABAAAAgIEFAAAAgIEFAAAAAAYWAAAAAAYWAAAAABhYAAAAAGBgAQAAAGBgAQAAAICBBQAAAAAGFgAAAAAGFgAAAAAYWAAAAAAYWAAAAABgYAEAAACAgQUAAADAFwvSBKKsdNBNmQAAAABJRU5ErkJggg==',
  'base64',
);

async function wgrajSzeroki(page: Page) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('.wysiwyg-upload__pick').click(),
  ]);
  await chooser.setFiles({ name: 'szeroki.png', mimeType: 'image/png', buffer: PNG_SZEROKI });
  await expect(page.locator('.wysiwyg-upload__preview')).toBeVisible();
}

/** Granice kolumny tekstu wewnątrz białej kartki. */
async function graniceKartki(page: Page) {
  const tresc = page.locator('.wysiwyg__content-editable');
  const pud = (await tresc.boundingBox())!;
  const cs = await tresc.evaluate((el) => {
    const s = getComputedStyle(el);
    return { pl: parseFloat(s.paddingLeft), pr: parseFloat(s.paddingRight) };
  });
  return { lewa: pud.x + cs.pl, prawa: pud.x + pud.width - cs.pr };
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.wysiwyg__content-editable')).toBeVisible();
});

test('wybór pliku z dysku otwiera okno i pokazuje formularz opisu', async ({ page }) => {
  await wstawKontenerUploadu(page);
  await wgrajPlik(page);

  const alt = page.locator('.wysiwyg-upload__field input[type=text]');
  await expect(alt).toBeVisible();
  // Etykieta musi być powiązana z polem — `<label for>`, nie sam `aria-label`.
  const altId = await alt.getAttribute('id');
  await expect(page.locator(`label[for="${altId}"]`)).toBeVisible();
});

test('pusty tekst alternatywny blokuje wstawienie i przenosi fokus na pole', async ({ page }) => {
  await wstawKontenerUploadu(page);
  await wgrajPlik(page);

  await page.locator('.wysiwyg-upload__btn--primary').click();

  const alt = page.locator('.wysiwyg-upload__field input[type=text]');
  await expect(alt).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.wysiwyg-upload__error')).toContainText('tekst alternatywny');
  await expect(alt).toBeFocused();
  // Celowo `.wysiwyg-image__img`, a nie dowolny `img`: podgląd w kontenerze wgrywania też
  // jest obrazem, więc szersze zapytanie zliczałoby go i test przechodziłby przypadkiem.
  // Wstawiony obraz nie może się pojawić; ten z domyślnej treści zostaje.
  await expect(wstawionyImg(page)).toHaveCount(0);
});

test('obraz wstawia się z tekstem alternatywnym', async ({ page }) => {
  await wstawKontenerUploadu(page);
  await wgrajPlik(page);

  await page.locator('.wysiwyg-upload__field input[type=text]').fill('Czerwony kwadrat');
  await page.locator('.wysiwyg-upload__btn--primary').click();

  await expect(wstawionyImg(page)).toHaveAttribute('alt', 'Czerwony kwadrat');
  await expect(page.locator('.wysiwyg-upload')).toHaveCount(0);
});

test('szerokość i oblewanie dają się ustawić Z KLAWIATURY, nie tylko przeciąganiem', async ({ page }) => {
  await wstawKontenerUploadu(page);
  await wgrajPlik(page);
  await page.locator('.wysiwyg-upload__field input[type=text]').fill('Wykres');
  await page.locator('.wysiwyg-upload__btn--primary').click();

  await wstawionyImg(page).click();
  // Kliknięcie w obraz MUSI go zaznaczyć — inaczej pasek rozmiaru się nie pokaże.
  await expect(wstawionyObraz(page)).toHaveClass(/wysiwyg-image--selected/);

  await wstawionyObraz(page).getByRole('button', { name: 'Szerokość 50%' }).click();
  // Szerokość siedzi na KONTENERZE: procent musi się odnosić do szerokości kolumny tekstu.
  await expect(wstawionyObraz(page)).toHaveAttribute('style', /width:\s*50%/);

  await wstawionyObraz(page).getByRole('button', { name: 'Wyrównaj obraz do lewej' }).click();
  await expect(wstawionyObraz(page)).toHaveAttribute('style', /float:\s*left/);
  await expect(wstawionyObraz(page).getByRole('button', { name: 'Wyrównaj obraz do lewej' })).toHaveAttribute('aria-pressed', 'true');

  // Sedno oblewania: kolejny akapit musi wejść OBOK obrazu, a nie pod nim.
  const obraz = await wstawionyObraz(page).boundingBox();
  const akapit = await page.locator('.wysiwyg-image ~ p').first().boundingBox();
  expect(akapit!.y).toBeLessThan(obraz!.y + obraz!.height);
});

test('ikona edycji otwiera formularz opisu z wypełnioną wartością i zachowuje rozmiar', async ({ page }) => {
  await wstawKontenerUploadu(page);
  await wgrajPlik(page);
  await page.locator('.wysiwyg-upload__field input[type=text]').fill('Pierwotny opis');
  await page.locator('.wysiwyg-upload__btn--primary').click();

  await wstawionyImg(page).click();
  await wstawionyObraz(page).getByRole('button', { name: 'Szerokość 50%' }).click();
  await wstawionyObraz(page).getByRole('button', { name: 'Edytuj tekst alternatywny' }).click();

  const alt = page.locator('.wysiwyg-upload__field input[type=text]');
  // SC 3.3.7 Redundant Entry — istniejący opis nie może wymagać przepisania.
  await expect(alt).toHaveValue('Pierwotny opis');

  await alt.fill('Poprawiony opis');
  await page.locator('.wysiwyg-upload__btn--primary').click();

  await expect(wstawionyImg(page)).toHaveAttribute('alt', 'Poprawiony opis');
  // Edycja opisu NIE MOŻE gubić ustawionej wcześniej szerokości.
  await expect(wstawionyObraz(page)).toHaveAttribute('style', /width:\s*50%/);
});

test('anulowanie edycji przywraca obraz zamiast go usuwać', async ({ page }) => {
  await wstawKontenerUploadu(page);
  await wgrajPlik(page);
  await page.locator('.wysiwyg-upload__field input[type=text]').fill('Zostaje');
  await page.locator('.wysiwyg-upload__btn--primary').click();

  await wstawionyImg(page).click();
  await wstawionyObraz(page).getByRole('button', { name: 'Edytuj tekst alternatywny' }).click();
  await page.getByRole('button', { name: 'Anuluj', exact: true }).click();

  await expect(wstawionyImg(page)).toHaveAttribute('alt', 'Zostaje');
});

test('obraz nie wychodzi poza kartkę przy żadnej szerokości ani oblewaniu', async ({ page }) => {
  await wstawKontenerUploadu(page);
  await wgrajPlik(page);
  await page.locator('.wysiwyg-upload__field input[type=text]').fill('Szeroki obraz');
  await page.locator('.wysiwyg-upload__btn--primary').click();
  await wstawionyImg(page).click();

  const granice = async () => {
    const tresc = page.locator('.wysiwyg__content-editable');
    const pud = await tresc.boundingBox();
    const cs = await tresc.evaluate((el) => {
      const s = getComputedStyle(el);
      return { pl: parseFloat(s.paddingLeft), pr: parseFloat(s.paddingRight) };
    });
    return { lewa: pud!.x + cs.pl, prawa: pud!.x + pud!.width - cs.pr };
  };

  for (const szerokosc of ['Szerokość 100%', 'Szerokość 75%', 'Szerokość 50%']) {
    for (const oblewanie of ['Bez oblewania', 'Wyrównaj obraz do lewej', 'Wyrównaj obraz do prawej']) {
      await wstawionyObraz(page).getByRole('button', { name: szerokosc }).click();
      await wstawionyObraz(page).getByRole('button', { name: oblewanie }).click();

      const g = await granice();
      const obraz = (await wstawionyObraz(page).boundingBox())!;
      // Tolerancja 1 px na zaokrąglenia subpikselowe.
      expect(obraz.x, `${szerokosc} + ${oblewanie}: lewa krawędź`).toBeGreaterThanOrEqual(g.lewa - 1);
      expect(obraz.x + obraz.width, `${szerokosc} + ${oblewanie}: prawa krawędź`).toBeLessThanOrEqual(g.prawa + 1);
    }
  }
});

test('przycisk edycji leży NA obrazie, a nie obok niego', async ({ page }) => {
  await wstawKontenerUploadu(page);
  await wgrajPlik(page);
  await page.locator('.wysiwyg-upload__field input[type=text]').fill('Opis');
  await page.locator('.wysiwyg-upload__btn--primary').click();
  await wstawionyImg(page).click();

  const obraz = (await wstawionyImg(page).boundingBox())!;
  const przycisk = (await wstawionyObraz(page).locator('.wysiwyg-image__edit').boundingBox())!;

  expect(przycisk.x).toBeGreaterThanOrEqual(obraz.x - 1);
  expect(przycisk.x + przycisk.width).toBeLessThanOrEqual(obraz.x + obraz.width + 1);
  expect(przycisk.y).toBeGreaterThanOrEqual(obraz.y - 1);
  expect(przycisk.y + przycisk.height).toBeLessThanOrEqual(obraz.y + obraz.height + 1);
});

test('SZEROKI obraz mieści się w kartce w rozmiarze pierwotnym', async ({ page }) => {
  await wstawKontenerUploadu(page);
  await wgrajSzeroki(page);
  await page.locator('.wysiwyg-upload__field input[type=text]').fill('Szeroki');
  await page.locator('.wysiwyg-upload__btn--primary').click();

  const g = await graniceKartki(page);
  const obraz = (await wstawionyObraz(page).boundingBox())!;
  expect(obraz.x + obraz.width, 'prawa krawędź obrazu').toBeLessThanOrEqual(g.prawa + 1);
});

test('przeciągnięcie uchwytu daleko poza kartkę nie wypycha obrazu poza nią', async ({ page }) => {
  await wstawKontenerUploadu(page);
  await wgrajSzeroki(page);
  await page.locator('.wysiwyg-upload__field input[type=text]').fill('Szeroki');
  await page.locator('.wysiwyg-upload__btn--primary').click();
  await wstawionyImg(page).click();

  const uchwyt = (await wstawionyObraz(page).locator('.wysiwyg-image__handle--se').boundingBox())!;
  await page.mouse.move(uchwyt.x + uchwyt.width / 2, uchwyt.y + uchwyt.height / 2);
  await page.mouse.down();
  // Ciągniemy grubo poza obszar edytora.
  await page.mouse.move(uchwyt.x + 1200, uchwyt.y + 200, { steps: 12 });
  await page.mouse.up();

  const g = await graniceKartki(page);
  const obraz = (await wstawionyObraz(page).boundingBox())!;
  expect(obraz.x + obraz.width, 'prawa krawędź po przeciągnięciu').toBeLessThanOrEqual(g.prawa + 1);
});

test('pasek i uchwyty obrazu nie wystają poza białą kartkę', async ({ page }) => {
  await wstawKontenerUploadu(page);
  await wgrajSzeroki(page);
  await page.locator('.wysiwyg-upload__field input[type=text]').fill('Szeroki');
  await page.locator('.wysiwyg-upload__btn--primary').click();
  await wstawionyImg(page).click();
  await wstawionyObraz(page).getByRole('button', { name: 'Szerokość 100%' }).click();

  // Biała kartka, czyli host — a nie sama kolumna tekstu.
  const kartka = (await page.locator('.wysiwyg__host').boundingBox())!;

  const elementy = ['.wysiwyg-image__bar', '.wysiwyg-image__handle--nw', '.wysiwyg-image__handle--se'];
  for (const sel of elementy) {
    await expect(wstawionyObraz(page).locator(sel), `${sel} musi być widoczny`).toBeVisible();
    const b = (await wstawionyObraz(page).locator(sel).boundingBox())!;
    expect(b.x, `${sel}: lewa`).toBeGreaterThanOrEqual(kartka.x - 1);
    expect(b.x + b.width, `${sel}: prawa`).toBeLessThanOrEqual(kartka.x + kartka.width + 1);
    expect(b.y, `${sel}: góra`).toBeGreaterThanOrEqual(kartka.y - 1);
    expect(b.y + b.height, `${sel}: dół`).toBeLessThanOrEqual(kartka.y + kartka.height + 1);
  }
});

test('oblewany obraz na końcu dokumentu nie wypływa poniżej białej kartki', async ({ page }) => {
  // Kursor na OSTATNIM bloku, żeby obraz trafił na sam koniec dokumentu — tam float, którego
  // rodzic nie domyka, wypływa poza kontener.
  await page.locator('.wysiwyg__content-editable > *').last().click();
  await page.getByRole('button', { name: 'Wstaw obraz', exact: true }).click();
  await wgrajSzeroki(page);
  await page.locator('.wysiwyg-upload__field input[type=text]').fill('Na koncu');
  await page.locator('.wysiwyg-upload__btn--primary').click();

  await wstawionyImg(page).click();
  await wstawionyObraz(page).getByRole('button', { name: 'Wyrównaj obraz do lewej' }).click();
  await page.waitForTimeout(150);

  const kartka = (await page.locator('.wysiwyg__host').boundingBox())!;
  const obraz = (await wstawionyObraz(page).boundingBox())!;
  expect(obraz.y + obraz.height, 'dolna krawędź obrazu vs kartka').toBeLessThanOrEqual(
    kartka.y + kartka.height + 1,
  );
});

test.describe('konfiguracja paska', () => {
  test('wyłączenie funkcji w konfiguracji chowa jej przycisk', async ({ page }) => {
    const etykiety = await page.locator('[role="toolbar"] button').evaluateAll((els) =>
      els.map((e) => e.getAttribute('aria-label')),
    );
    // Zestaw z `wysiwyg.config.ts` — po zmianie konfiguracji ten test ma paść, i o to chodzi.
    expect(etykiety).toContain('Pogrubienie');
    expect(etykiety).toContain('Widok źródła HTML');
    // `clearFormatting` nie jest włączone, więc nie może się pojawić.
    expect(etykiety).not.toContain('Wyczyść formatowanie');
  });

  test('menu nagłówków pokazuje wyłącznie poziomy z konfiguracji', async ({ page }) => {
    await page.getByRole('button', { name: 'Poziom nagłówka' }).click();
    // Menu żyje w overlayu CDK poza drzewem edytora i renderuje się asynchronicznie —
    // bez oczekiwania odczyt trafiał w pustą listę.
    await expect(page.locator('[role="menuitemradio"]').first()).toBeVisible();

    const pozycje = await page.locator('[role="menuitemradio"]').evaluateAll((els) =>
      els.map((e) => e.textContent!.trim()),
    );
    // Konfiguracja demo: headingLevels [2, 3, 4] — H1, H5 i H6 mają NIE istnieć.
    expect(pozycje.some((t) => t.includes('Nagłówek 2'))).toBe(true);
    expect(pozycje.some((t) => t.includes('Nagłówek 1'))).toBe(false);
    expect(pozycje.some((t) => t.includes('Nagłówek 5'))).toBe(false);
  });

  test('domyślna treść zawiera odnośnik i obraz z opisem', async ({ page }) => {
    const link = page.locator('.wysiwyg__content-editable a').first();
    await expect(link).toHaveAttribute('href', /w3\.org/);
    // Wymuszone przez sanitizer: `target="_blank"` bez `rel` to podatność na tabnabbing.
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    // Tu chodzi o obraz z DOMYŚLNEJ treści, a nie o wgrany w teście.
    const obrazDomyslny = page.locator('.wysiwyg-image__img:not([src^="blob:"])');
    await expect(obrazDomyslny).toHaveAttribute('alt', /.+/);
  });
});

test.describe('pole wyłączone', () => {
  test('wyłączenie pola blokuje edycję obrazu', async ({ page }) => {
    // Najpierw upewniamy się, że w stanie włączonym kontrolki SĄ — inaczej test przechodziłby
    // także wtedy, gdyby nigdy ich nie było.
    await page.locator('.wysiwyg-image__img').first().click();
    await expect(page.locator('.wysiwyg-image__edit').first()).toBeVisible();

    await page.getByRole('button', { name: 'Wyłącz pole' }).click();

    await expect(page.locator('.wysiwyg-image__edit').first()).toBeHidden();
    await expect(page.locator('.wysiwyg-image__bar').first()).toBeHidden();
    await expect(page.locator('.wysiwyg-image__handles').first()).toBeHidden();

    // Treść musi też wypaść z kolejności Tab, nie tylko zniknąć wizualnie.
    await expect(page.locator('.wysiwyg__scroll')).toHaveAttribute('inert', '');
  });

  test('ponowne włączenie przywraca kontrolki obrazu', async ({ page }) => {
    await page.getByRole('button', { name: 'Wyłącz pole' }).click();
    await page.getByRole('button', { name: 'Włącz pole' }).click();

    await page.locator('.wysiwyg-image__img').first().click();
    await expect(page.locator('.wysiwyg-image__edit').first()).toBeVisible();
  });
});

test('domyślna treść zawiera kod w linii i blok kodu', async ({ page }) => {
  await expect(page.locator('.wysiwyg__content-editable p > code').first()).toBeVisible();
  await expect(page.locator('.wysiwyg__content-editable pre > code')).toBeVisible();
  await expect(page.locator('.wysiwyg__content-editable blockquote')).toBeVisible();
});

test.describe('pisanie w środku dokumentu', () => {
  test('kursor NIE przeskakuje na koniec po pierwszej literze', async ({ page }) => {
    // Akapit w środku treści, PRZED obrazem — dokładnie tam, gdzie objawiał się błąd.
    const akapit = page.locator('.wysiwyg__content-editable > p').first();
    await akapit.click();
    await page.keyboard.press('Home');
    await page.keyboard.type('ABCDEF', { delay: 30 });

    // Gdzie faktycznie wylądowały poszczególne znaki?
    const rozklad = await page.locator('.wysiwyg__content-editable > *').evaluateAll((els) =>
      els.map((e, i) => {
        const t = e.textContent ?? '';
        return { i, tag: e.tagName, pelny: t.includes('ABCDEF'), fragment: /A?B?C?D?EF|ABCDE/.test(t) && !t.includes('ABCDEF') };
      }),
    );
    const zNapisem = rozklad.filter((r) => r.pelny || r.fragment);

    // Sedno błędu: ciąg rozbijał się na dwa miejsca — pierwsza litera w kursorze,
    // reszta na końcu dokumentu.
    expect(zNapisem.length, `ABCDEF trafiło do ${zNapisem.length} bloków: ${JSON.stringify(rozklad)}`).toBe(1);
    expect((await akapit.textContent())!).toContain('ABCDEF');
  });

  test('pisanie w środku nie przebudowuje dokumentu', async ({ page }) => {
    const akapit = page.locator('.wysiwyg__content-editable > p').first();
    await akapit.click();
    await page.keyboard.press('Home');

    // Obraz jest osobnym node view; przebudowa dokumentu wymieniłaby jego element w DOM.
    const przedId = await page.locator('.wysiwyg-image__img').first().evaluate((el) => {
      (el as HTMLElement).dataset['znacznik'] = 'ten-sam';
      return (el as HTMLElement).dataset['znacznik'];
    });
    expect(przedId).toBe('ten-sam');

    await page.keyboard.type('XYZ', { delay: 30 });

    const poId = await page
      .locator('.wysiwyg-image__img')
      .first()
      .evaluate((el) => (el as HTMLElement).dataset['znacznik'] ?? 'WYMIENIONY');
    expect(poId, 'obraz został przebudowany przy pisaniu').toBe('ten-sam');
  });
});
