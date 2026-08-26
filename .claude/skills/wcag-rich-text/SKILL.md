---
name: wcag-rich-text
description: Wzorce WCAG 2.2 AA dla edytora tekstu sformatowanego (rich text / WYSIWYG) w Angularze. Użyj ZAWSZE przy pracy nad toolbarem edytora, obszarem contenteditable, wstawianiem tabel i obrazów, ogłoszeniami dla czytników ekranu, skrótami klawiszowymi, focusem i kontrastem w tym projekcie. Wyzwalacze: toolbar, aria-pressed, roving tabindex, LiveAnnouncer, contenteditable, alt text, th scope, caption, focus trap, forced-colors, target size, rozmiar czcionki.
---

# WCAG 2.2 AA w edytorze rich text

Reguły wypracowane dla `projects/wysiwyg-editor`. Nie są ogólnikami — każda rozstrzyga
konkretną decyzję, którą łatwo podjąć źle.

## Zasada nadrzędna

Dostępność edytora rozstrzyga się w **modelu dokumentu i strukturze DOM**, nie w atrybutach
doklejonych na końcu. Jeśli schemat pozwala wyprodukować `<img>` bez `alt` albo `<th>` bez
`scope`, żadna ilość ARIA tego nie naprawi. Naprawiaj u źródła — w rozszerzeniu Tiptap.

## 1. Toolbar

- `role="toolbar"` + `aria-orientation="horizontal"` + `aria-label` + `aria-controls` na id
  obszaru edycji. Wewnątrz `role="group"` z `aria-label` dla każdej grupy komend.
- **Roving tabindex: dokładnie jeden `tabindex="0"` w całym toolbarze.** Reszta `-1`.
  Tab wchodzi na jedną kontrolkę i wychodzi z całego toolbara; strzałki nawigują.
  Używaj `FocusKeyManager` z `@angular/cdk/a11y` — w CDK 22 ma przeciążenie
  `constructor(items: Signal<T[]>, injector)`, więc działa wprost z `contentChildren()`.
  `withHorizontalOrientation(dir)`, `withHomeAndEnd()`, `withWrap()`.
  **Bez `withTypeAhead()`** — toolbar nie może przechwytywać znaków drukowalnych.
- **Wyłączone kontrolki zostają fokusowalne**: `aria-disabled="true"`, nigdy atrybut
  `disabled`. Wzorzec APG dla toolbara tego wymaga — inaczej „Cofnij" znika i wraca
  z kolejności nawigacji, co dezorientuje. Klik/Enter na `aria-disabled` jest no-opem.
- Toggle → `aria-pressed`. **Nigdy `aria-checked`, nigdy `role="switch"`.**
- Dropdown → wzorzec menu button: `aria-haspopup="menu"` (jawny token, nie `"true"`),
  `aria-expanded` na triggerze, `aria-controls` **tylko gdy otwarte**, pozycje jako
  `role="menuitemradio"` z `aria-checked`.
- **Nie używaj natywnego `<select>` do nagłówków.** W Chrome/Firefox na Windows strzałki
  zmieniają wartość i odpalają `change` przy *każdym* naciśnięciu — przeglądanie listy
  zamieniłoby akapit kolejno w H1, H2, H3 i zaśmieciło historię undo.
- **Skrót klawiszowy idzie do `aria-keyshortcuts` i tooltipa, NIGDY do `aria-label`.**
  Nazwa dostępna „Pogrubienie Ctrl+B" byłaby czytana przy każdym fokusie i przy każdym
  przejściu rotorem.
- Stan wciśnięty: `aria-pressed` dla AT, a dla osób widzących wypełnione tło **plus**
  wyraźna krawędź pigułki — zmiana kształtu i granicy, nie sam odcień (SC 1.4.1),
  z kontrastem krawędzi >= 3:1 (SC 1.4.11). **Nie** pogrubiaj obrysu aktywnej ikony:
  rozjeżdża to wagowo cały pasek i wygląda jak błąd renderowania.
- Ikony: **inline SVG z `fill: currentColor`**, `aria-hidden="true" focusable="false"`.
  Ikonofont i `background-image` znikają w trybie forced-colors. `focusable="false"` jest
  konieczne, bo inaczej axe zgłasza `nested-interactive`.

## 2. Obszar edycji

**Natywny `contenteditable="true"` z `role="textbox"` (domyślka Tiptap) — ZWERYFIKOWANE
w przeglądarce, nie założone.**

Popularna porada mówi, żeby `role="textbox"` usunąć, bo rzekomo spłaszcza potomków
w drzewie dostępności. **Sprawdź to, zanim zastosujesz.** Zrzut drzewa dostępności
Chromium dla tego edytora pokazuje strukturę zachowaną w obu wariantach:

```
z role="textbox":   textbox "Treść oferty" → heading[level=2], list, listitem, paragraph
bez role:           generic "Treść oferty" → heading[level=2], list, listitem, paragraph
```

Usunięcie roli degraduje element do `generic`, czyli **odbiera AT jedyny sygnał, że pole
jest edytowalne**, nic nie zyskując w zamian. Dodatkowo Tiptap 3 wstawia `role: "textbox"`
na sztywno w `Editor.createView()` — jeśli chcesz go nie mieć, musisz go jawnie usunąć
z DOM po utworzeniu widoku (`editorProps.attributes` z pustym stringiem da nieprawidłowy
`role=""`, nie brak atrybutu).

Zachowanie AT to jednak nie to samo co drzewo Chromium. Flaga `useTextboxRole` zostaje
jako furtka, a weryfikacja w NVDA/JAWS/VoiceOver jest **obowiązkowa** — patrz §9 pkt 1.

Na `contenteditable` ustawiamy: `aria-labelledby` / `aria-label`, `aria-describedby`,
`aria-multiline="true"`, `spellcheck`, `id`.
Readonly → `contenteditable="false"` + `aria-readonly="true"`.
Disabled → `contenteditable="false"` + `aria-disabled="true"`.

**Pułapka integracyjna:** `<label for>` **nie działa** na `div[contenteditable]` — to nie jest
element etykietowalny. Konsument musi użyć `aria-labelledby`. Brak etykiety → `console.warn`
w `ngDevMode`.

## 3. Skróty klawiszowe

SC 2.1.4 dotyczy skrótów złożonych **wyłącznie ze znaków**. Nie implementujemy ani jednego
skrótu jednoznakowego → kryterium spełnione z definicji.

| Skrót | Akcja |
|---|---|
| `Ctrl/⌘+B` / `+I` / `+U` | pogrubienie / kursywa / podkreślenie |
| `Ctrl/⌘+Alt+0..6` | akapit + H1–H6 |
| `Ctrl/⌘+Shift+8` / `+7` | lista punktowana / numerowana |
| `Alt+F10` | fokus na toolbar (de facto standard: TinyMCE, CKEditor) |
| `Escape` | wyjście z tabeli / z toolbara / zamknięcie menu |

Dlaczego `Ctrl+Alt+cyfra`, a nie `Alt+cyfra`: `Ctrl+1..9` przełącza karty we wszystkich
przeglądarkach, `Alt+1..8` w Firefoksie na Win/Linux. Polski układ „programisty" mapuje
AltGr (== Ctrl+Alt) tylko na litery `a c e l n o s x z` — **cyfry są wolne**.

`Escape` rób `preventDefault()` **tylko gdy faktycznie obsłużone** — inaczej zablokujesz
Escape nadrzędnego dialogu.

Nie dawaj skrótu tabeli ani obrazowi: `Ctrl+Alt+T` otwiera terminal w GNOME.

## 4. LiveAnnouncer — ogłaszaj tylko to, czego AT samo nie powie

To jest miejsce, w którym najłatwiej pogorszyć dostępność, próbując ją poprawić.

| Zdarzenie | Ogłaszamy? | Dlaczego |
|---|---|---|
| Klik na toggle w toolbarze | **NIE** | zmiana `aria-pressed` na sfokusowanym przycisku jest czytana natywnie → podwójna mowa |
| `Ctrl+B` z obszaru treści | **TAK** | nie ma sfokusowanej kontrolki, która by to powiedziała |
| Wybór z menu nagłówków | **NIE** | `aria-checked` + powrót fokusu na trigger czytający nową wartość |
| Wstawienie/usunięcie tabeli, wiersza, kolumny, obrazu | **TAK**, polite | zmiana DOM daleko od fokusu |
| Wyjście z tabeli, undo/redo | **TAK**, polite | efekt jest czysto wizualny |
| **Ruch kursora między komórkami** | **DOMYŚLNIE NIE** | NVDA i JAWS **same** czytają nagłówki i pozycję komórki; nasze ogłoszenie nakłada się na ich mowę i ją przerywa |
| Błąd walidacji w dialogu | **NIE tędy** | widoczny `<p role="alert">` + `aria-invalid` + fokus na pole (SC 3.3.1/3.3.3) |

`assertive` **wyłącznie** dla błędów blokujących akcję. Wszystko inne `polite`.
Dedupe identycznych komunikatów w oknie ~1 s. Podawaj `duration`, żeby region się czyścił.

**Wymóg techniczny:** `LiveAnnouncer` używa `.cdk-visually-hidden` z
`@angular/cdk/a11y-prebuilt.css`. Bez tego importu **komunikaty wyświetlają się jako
widoczny tekst na dole strony**.

## 5. Tabele

- `<th>` **musi** mieć `scope`. Tiptap go nie renderuje — rozszerz `TableHeader` i przeliczaj
  `col`/`row`/`colgroup`/`rowgroup` przez `TableMap` w `appendTransaction`.
- `<caption>` wymagany. **Trzymaj go jako atrybut node'a `table`, nie jako dziecko** —
  `TableMap.get()` zakłada, że każde dziecko `table` jest wierszem; caption-dziecko rozwali
  mapę i wszystkie komendy tabeli.
- **Wyjście z tabeli to blocker poziomu A (SC 2.1.2).** Domyślny keymap Tiptap w ostatniej
  komórce **dodaje wiersz zamiast wyjść** — użytkownik klawiatury nigdy nie opuści tabeli.
  Nadpisz `Tab` i `Escape` rozszerzeniem z `priority: 1000`.
- `resizable: false`. Uchwyt resize ma 5 px (łamie 2.5.8) i działa tylko myszą (2.1.1).
  Szerokość ustawiaj dyskretnymi krokami z menu przez `setCellAttribute('colwidth')`.
- Wrapper przewijania: `overflow-x: auto` **+ `tabindex="0" role="region" aria-label`** —
  przewijalny obszar nieosiągalny z klawiatury to naruszenie 2.1.1.
- **Bez `role="grid"`** — natywna semantyka `<table>` jest poprawna; `role="grid"` wymusiłby
  pełny model klawiaturowy siatki.

## 6. Obrazy

- **Alt wymagany albo jawny checkbox „obraz dekoracyjny". Trzeciej opcji nie ma.**
  Zaznaczenie „dekoracyjny" wyłącza pole alt i wymusza `alt=""` — to poprawne oznaczenie,
  `role="presentation"` jest zbędne.
- Tiptap ma `alt: { default: null }`, a `null` **nie jest renderowany** → `<img>` bez `alt`.
  Rozszerz node: `default: ''` + `renderHTML: attrs => ({ alt: attrs.alt ?? '' })`.
- Walidacja przy submit: blokada + `aria-invalid="true"` + `role="alert"` + **fokus na pole alt**.
- Miękkie ostrzeżenie (nie blokada), gdy alt == nazwa pliku albo należy do
  `{obraz, zdjęcie, image, foto, grafika}`.
- Tryb edycji prefilluje `src` i `alt` — SC 3.3.7 Redundant Entry.
- Dialog przez CDK `Dialog` (focus trap i `restoreFocus` w standardzie). Pola z **prawdziwymi
  `<label for>`**, nie `aria-label` — etykieta zostaje widoczna przy zoomie 400 %.

## 7. Rozmiar czcionki a SC 1.4.4

**Nie dawaj pickera pikseli.** `px` w treści dokumentu ignoruje ustawiony przez użytkownika
domyślny rozmiar czcionki i **nie powiększa się** w trybie „Powiększaj tylko tekst"
(Firefox) — a to jest prawdziwy test SC 1.4.4. Zoom całej strony to maskuje.

Semantyczna skala w `em`: `xs 0.75 / sm 0.875 / md → unsetFontSize() / lg 1.25 / xl 1.5`.
`em`, nie `rem` — „Duża" wewnątrz `<h2>` ma być duża *względem nagłówka*.
`md` nie generuje żadnego markupu.
Sanitizer wymusza `/^\d*\.?\d+(em|rem|%)$/` → **`px` znika też z treści wklejanej z Worda**.

## 8. CSS

- `:focus-visible` → `outline: 2px` + `outline-offset: 2px` + `box-shadow` drugiego pierścienia
  (żeby był widoczny na jasnym i ciemnym tle). Nigdzie `outline: none` bez zamiennika.
- **SC 2.5.8 Target Size**: przyciski min. 24×24 CSS px; używamy 32×32, przy
  `pointer: coarse` 44×44. Świadomie odrzucone jako naruszenia: siatka hover 6×6 do wyboru
  wymiarów tabeli (~16 px komórki), uchwyty resize kolumn i obrazów.
- **SC 2.4.11 Focus Not Obscured**: sticky toolbar musi mieć
  `scroll-padding-block-start: calc(wysokość-toolbara + 8px)` na kontenerze przewijania
  i `scroll-margin-block-start` na blokach treści.
- `prefers-reduced-motion` — obejmij też `.cdk-overlay-container *`.
- **`forced-colors: active`**: tła są nadpisywane przez system, więc stanu „wciśnięty"
  **nie wolno** wyrażać samym `background-color` — dodaj grubość obramowania. Domyślny
  `.selectedCell::after` z `prosemirror-tables` (`rgba(200,200,255,.4)`) jest tam niewidoczny
  → nadpisz.
- Wymagane importy: `@angular/cdk/a11y-prebuilt.css` (LiveAnnouncer) i
  `@angular/cdk/overlay-prebuilt.css` (Dialog/Overlay).

## 9. Czego axe NIE złapie

axe wykrywa ~30 % problemów. Poza jego zasięgiem jest wszystko poniżej — to musi trafić do
`docs/a11y-manual-checklist.md` i być przechodzone przed każdym wydaniem:

1. Czy w obszarze edycji działają klawisze `H` / `L` / `T` (NVDA, JAWS).
2. Czy region live nie zagaduje czytnika przy nawigacji po tabeli.
3. Czy z każdej konstrukcji (tabela, lista, obraz) **da się wyjść** samą klawiaturą.
4. **Firefox „Powiększaj tylko tekst" 200 %** — jedyny test, który wykrywa rozmiary w `px`.
5. Kontrast zmierzony przyrządem dla stanów default/hover/pressed/focused/disabled,
   osobno tekst (4.5:1) i ikony/obramowania (3:1), w motywie jasnym i ciemnym.
6. **SC 2.5.3 Label in Name**: tooltip musi być **identyczny** z `aria-label`, inaczej
   użytkownik sterowania głosem powie „kliknij Pogrubienie", a nazwa dostępna brzmi inaczej.
   To najczęstsza wpadka przy przyciskach ikonowych.
7. Wklejenie z Worda i Google Docs: czy sanitizer nie zniszczył struktury i czy `px` zniknęły.
