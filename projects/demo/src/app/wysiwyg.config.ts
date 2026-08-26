import type { DeepPartial, WysiwygEditorConfig } from 'wysiwyg-editor';

/**
 * Konfiguracja edytora — jedyne miejsce, w którym włącza się i wyłącza przyciski paska.
 *
 * Zasada: pasek renderuje się WYŁĄCZNIE z tej listy. Usunięcie funkcji chowa jej kontrolkę
 * i jednocześnie nie rejestruje rozszerzenia Tiptap, więc odpowiadający jej znacznik
 * przestaje być dopuszczany przez schemat. Dzięki temu nie da się doprowadzić do stanu,
 * w którym treść zawiera formatowanie, którego użytkownik nie może już zmienić.
 *
 * Kolejność wpisów nie ma znaczenia — układ paska wynika z jego definicji grup.
 */
export const WYSIWYG_CONFIG: DeepPartial<WysiwygEditorConfig> = {
  features: [
    // --- historia ---
    'undoRedo',

    // --- bloki ---
    'heading',
    'bulletList',
    'orderedList',
    'blockquote',
    'codeBlock',

    // --- style tekstu ---
    'bold',
    'italic',
    'strike',
    'code',
    'underline',
    'highlight',
    'link',

    // --- indeksy ---
    'superscript',
    'subscript',

    // --- układ ---
    'textAlign',

    // --- wstawianie ---
    'image',

    // --- widok ---
    'sourceView',
  ],

  /**
   * Poziomy nagłówków w rozwijanym menu.
   *
   * Warto ograniczać: H1 zwykle należy do szablonu strony, a nie do treści, więc jego
   * dostępność w edytorze prowadzi do zdublowanych nagłówków pierwszego poziomu.
   */
  headingLevels: [2, 3, 4],

  /**
   * Wyrównania działają jako GRUPA — sterujesz nimi flagą `textAlign` powyżej.
   *
   * Ta lista pozwala dodatkowo zawęzić zestaw, gdyby zaszła potrzeba: usunięcie wpisu chowa
   * odpowiadający mu przycisk. Kandydatem do usunięcia bywa `justify` — wyjustowany tekst
   * tworzy nierówne odstępy („rzeki”), które utrudniają czytanie osobom z dysleksją.
   */
  alignments: ['left', 'center', 'right', 'justify'],

  image: {
    accept: 'image/png,image/jpeg,image/webp,image/avif',
    maxFileBytes: 5_000_000,
    maxFiles: 3,
    /**
     * Osadzanie obrazów w treści jako `data:`. Trzymamy wyłączone.
     *
     * Plik 5 MB to ~6,85 mln znaków w jednym atrybucie `src`: sanitizer parsuje ten string
     * przy każdej zmianie, autozapis wysyła go w całości, a kolumna w bazie puchnie.
     */
    allowBase64: false,
    // Atrapa na potrzeby demo — obraz żyje w pamięci przeglądarki. W realnej aplikacji
    // podstawia się tu wywołanie własnego endpointu, a do treści trafia zwrócony URL.
    upload: (file: File) => Promise.resolve({ src: URL.createObjectURL(file) }),
  },

  link: { autolink: true },

  /** Podstawienia w trakcie pisania: `- ` → lista, `# ` → nagłówek, `**x**` → pogrubienie. */
  enableInputRules: true,

  /**
   * Szerokość kolumny treści (biała „kartka").
   *
   * Świadomie w `rem`, nie w `px`: przy powiększeniu tekstu w przeglądarce kolumna rośnie
   * razem z nim. Wartość w pikselach dawałaby przy 200 % kilka słów w wierszu.
   */
  paperMaxWidth: '56rem',

  /** Pasek przyklejony do górnej krawędzi przy przewijaniu długiej treści. */
  stickyToolbar: false,
};
