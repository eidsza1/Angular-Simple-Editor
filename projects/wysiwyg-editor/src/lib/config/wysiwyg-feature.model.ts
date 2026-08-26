/**
 * Pojedyncza funkcja edytora. Steruje jednocześnie tym, które rozszerzenie Tiptap
 * zostanie zarejestrowane, i tym, które kontrolki pojawią się w toolbarze.
 *
 * Świadomie NIE ma tu `table` ani `fontSize`:
 *  - tabela jest odłożona na później (wymaga własnych rozszerzeń na `scope`, `<caption>`
 *    i wyjście z tabeli — domyślny keymap Tiptap tworzy pułapkę klawiaturową, SC 2.1.2),
 *  - rozmiar czcionki zastąpiła hierarchia nagłówków.
 */
export type WysiwygFeature =
  // marki
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'highlight'
  | 'link'
  | 'superscript'
  | 'subscript'
  // bloki
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'textAlign'
  // wstawianie
  | 'image'
  // widok
  | 'sourceView'
  | 'themeToggle'
  // historia
  | 'undoRedo';

export const ALL_WYSIWYG_FEATURES: readonly WysiwygFeature[] = [
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'highlight',
  'link',
  'superscript',
  'subscript',
  'heading',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  'textAlign',
  'image',
  'sourceView',
  'themeToggle',
  'undoRedo',
] as const;

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * `justify` jest dostępne, ale odradzane: wyjustowany tekst tworzy nierówne odstępy
 * („rzeki”), co utrudnia czytanie osobom z dysleksją. WCAG zabrania go dopiero na poziomie
 * AAA (SC 1.4.8), więc zostaje jako świadoma decyzja autora treści.
 */
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

export const ALL_TEXT_ALIGNMENTS: readonly TextAlignment[] = ['left', 'center', 'right', 'justify'] as const;
