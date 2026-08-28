import type { HeadingLevel, TextAlignment, WysiwygFeature } from './wysiwyg-feature.model';
import { ALL_TEXT_ALIGNMENTS } from './wysiwyg-feature.model';

export interface UploadedImage {
  readonly src: string;
  readonly width?: number;
  readonly height?: number;
}

export interface WysiwygImageConfig {
  /**
   * Docelowe miejsce wgrywania. Bez tej funkcji kontener uploadu pokazuje wyłącznie pole
   * na adres URL — nie ma dokąd wysłać pliku.
   */
  readonly upload?: (file: File, signal: AbortSignal) => Promise<UploadedImage>;
  readonly accept: string;
  /** Maksymalny rozmiar pojedynczego pliku w bajtach. */
  readonly maxFileBytes: number;
  /** Ile plików można wrzucić do jednego kontenera naraz. */
  readonly maxFiles: number;
  /**
   * Osadzanie obrazów jako `data:` w treści. Domyślnie `false`.
   *
   * Plik 5 MB to ~6,85 mln znaków w jednym atrybucie `src`: DOMPurify parsuje ten string
   * przy każdej sanityzacji, autozapis wysyła go przy każdej zmianie, a kolumna w bazie
   * puchnie. Włączać wyłącznie świadomie i z niskim `maxInlineBytes`.
   */
  readonly allowBase64: boolean;
  readonly maxInlineBytes: number;
}

export interface WysiwygTableConfig {
  /** Wartości początkowe w panelu wstawiania. */
  readonly defaultRows: number;
  readonly defaultCols: number;
  /**
   * Górne ograniczenie rozmiaru wstawianej tabeli.
   *
   * To nie jest ochrona przed wydajnością, tylko przed niedostępną treścią: tabela szersza
   * niż kilkanaście kolumn jest nie do przejścia czytnikiem ekranu i nie mieści się przy
   * powiększeniu do 400 % (SC 1.4.10). Autor, który naprawdę potrzebuje więcej, podnosi
   * limit świadomie.
   */
  readonly maxRows: number;
  readonly maxCols: number;
  /** Domyślne zaznaczenie pola „pierwszy wiersz to nagłówki" w panelu wstawiania. */
  readonly withHeaderRow: boolean;
  readonly withHeaderColumn: boolean;
  /**
   * Czy `<caption>` jest wymagany przy wstawianiu.
   *
   * Domyślnie `true`. Tabela bez podpisu zmusza użytkownika czytnika ekranu do wejścia
   * w komórki, żeby w ogóle zorientować się, czego dotyczy — a lista tabel w rotorze staje
   * się listą nierozróżnialnych pozycji „tabela".
   */
  readonly requireCaption: boolean;
}

/**
 * `system` oznacza podążanie za `prefers-color-scheme`; pozostałe wartości wymuszają motyw.
 */
export type WysiwygTheme = 'system' | 'light' | 'dark';

export interface WysiwygEditorConfig {
  readonly features: readonly WysiwygFeature[];
  readonly headingLevels: readonly HeadingLevel[];
  readonly alignments: readonly TextAlignment[];
  /** Podstawienia typu `- ` → lista, `# ` → nagłówek, `**x**` → pogrubienie. */
  readonly enableInputRules: boolean;
  /**
   * Czy obszar edycji ma mieć `role="textbox"`. Domyślnie `true`.
   *
   * Uzasadnienie (zweryfikowane zrzutem drzewa dostępności Chromium, nie założone):
   * Tiptap 3 wstawia tę rolę na sztywno w `Editor.createView()`, a Chromium **zachowuje
   * strukturę potomków** — nagłówki i listy są widoczne w drzewie zarówno z tą rolą, jak
   * i bez niej. Usunięcie roli degraduje element do `generic`, czyli odbiera technologiom
   * asystującym jedyny sygnał, że pole jest edytowalne.
   *
   * `false` usuwa atrybut. Zachowanie NVDA/JAWS/VoiceOver zależy od AT, nie od Chromium,
   * i MUSI zostać sprawdzone ręcznie — pozycja 1 w `docs/a11y-manual-checklist.md`.
   */
  readonly useTextboxRole: boolean;
  readonly stickyToolbar: boolean;
  /** Motyw początkowy. Przycisk w pasku przełącza go w trakcie pracy. */
  readonly theme: WysiwygTheme;
  /**
   * Szerokość kolumny treści w wariancie „kartki" (`class="wysiwyg--paper"`).
   *
   * Dowolna długość CSS. Podawaj w `rem`, a nie w `px`: przy powiększeniu tekstu w
   * ustawieniach przeglądarki kolumna ma rosnąć razem z nim, inaczej przy 200 % mieści
   * się w niej kilka słów w wierszu (SC 1.4.4).
   *
   * Wartość jest jednocześnie ograniczeniem czytelności — wiersz dłuższy niż mniej więcej
   * 80 znaków męczy przy czytaniu (SC 1.4.8 jest wprawdzie na poziomie AAA, ale to dobra
   * praktyka niezależnie od poziomu).
   */
  readonly paperMaxWidth: string;
  readonly image: WysiwygImageConfig;
  readonly table: WysiwygTableConfig;
  readonly link: { readonly autolink: boolean };
}

export const WYSIWYG_DEFAULT_CONFIG: WysiwygEditorConfig = {
  features: [
    'undoRedo',
    'heading',
    'bulletList',
    'orderedList',
    'blockquote',
    'codeBlock',
    'bold',
    'italic',
    'strike',
    'code',
    'underline',
    'highlight',
    'link',
    'superscript',
    'subscript',
    'table',
    'textAlign',
    'image',
    'sourceView',
    'themeToggle',
  ],
  headingLevels: [1, 2, 3, 4, 5, 6],
  alignments: ALL_TEXT_ALIGNMENTS,
  enableInputRules: true,
  useTextboxRole: true,
  stickyToolbar: false,
  theme: 'system',
  paperMaxWidth: '44rem',
  image: {
    accept: 'image/png,image/jpeg,image/webp,image/gif,image/avif',
    maxFileBytes: 5_000_000,
    maxFiles: 3,
    allowBase64: false,
    maxInlineBytes: 300_000,
  },
  table: {
    defaultRows: 3,
    defaultCols: 3,
    maxRows: 30,
    maxCols: 12,
    withHeaderRow: true,
    withHeaderColumn: false,
    requireCaption: true,
  },
  link: { autolink: true },
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Scala nadpisania z konfiguracją bazową. Tablice są zastępowane, nie łączone. */
export function mergeWysiwygConfig(
  base: WysiwygEditorConfig,
  overrides: DeepPartial<WysiwygEditorConfig> | null | undefined,
): WysiwygEditorConfig {
  if (!overrides) {
    return base;
  }
  return {
    ...base,
    ...overrides,
    image: { ...base.image, ...overrides.image },
    table: { ...base.table, ...overrides.table },
    link: { ...base.link, ...overrides.link },
  } as WysiwygEditorConfig;
}
