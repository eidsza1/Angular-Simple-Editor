/**
 * Allowlista odpowiada dokładnie temu, co schemat ProseMirror potrafi reprezentować.
 * Cokolwiek szerszego przeżyłoby sanityzację, a i tak zginęło przy parsowaniu — dawałoby
 * cichy rozjazd między tym, co wpisano, a tym, co zapisano.
 */
export const WYSIWYG_ALLOWED_TAGS: readonly string[] = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  's',
  'del',
  'mark',
  'sup',
  'sub',
  'code',
  'pre',
  'img',
  // Tabela. `caption` jest na liście, bo bez podpisu tabela jest nierozróżnialna w rotorze
  // czytnika; `colgroup`/`col` świadomie POZA listą — niosą wyłącznie szerokości w px,
  // których i tak nie renderujemy (SC 1.4.10).
  'table',
  'caption',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
];

export const WYSIWYG_ALLOWED_ATTR: readonly string[] = [
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'style',
  'dir',
  'lang',
  // Highlight zapisuje kolor w `data-color`; `ALLOW_DATA_ATTR: false` blokuje data-*
  // hurtowo, więc ten jeden trzeba dopuścić imiennie.
  'data-color',
  // Komórki tabeli. `scope` jest tu obowiązkowe: bez niego czytnik ekranu nie wie, czy
  // `<th>` opisuje wiersz, czy kolumnę (SC 1.3.1).
  'colspan',
  'rowspan',
  'scope',
];

export const WYSIWYG_FORBID_TAGS: readonly string[] = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'svg',
  'math',
  'link',
  'meta',
  'base',
];

export const WYSIWYG_FORBID_ATTR: readonly string[] = [
  'srcset',
  'sizes',
  'formaction',
  'ping',
  'autofocus',
  'contenteditable',
];

/**
 * SC 1.4.4 Resize Text — dopuszczamy wyłącznie jednostki względne.
 *
 * `px` w treści dokumentu ignoruje ustawiony przez użytkownika domyślny rozmiar czcionki
 * i nie powiększa się w trybie „Powiększaj tylko tekst". Ten regex egzekwuje regułę także
 * na treści wklejanej z Worda i Google Docs, gdzie `px` jest normą.
 */
export const FONT_SIZE_VALUE_RE = /^\d*\.?\d+(em|rem|%)$/;

/**
 * Jedyne dopuszczalne właściwości w atrybucie `style`, każda z własnym wzorcem wartości.
 *
 * Filtrowanie deklaracja po deklaracji (zamiast „style wolno albo nie wolno") zabija
 * `position: fixed` (clickjacking), `background: url(...)`, `-moz-binding` oraz `font-size`
 * w pikselach — jednym mechanizmem.
 */
export const ALLOWED_STYLE_PROPS: ReadonlyMap<string, RegExp> = new Map([
  // Rozmiar czcionki nie jest funkcją edytora, ale treść wklejana z Worda i Google Docs
  // jest go pełna. Przepuszczamy WYŁĄCZNIE jednostki względne — `px` łamie SC 1.4.4.
  ['font-size', FONT_SIZE_VALUE_RE],
  // Tak renderuje się `@tiptap/extension-text-align`.
  ['text-align', /^(start|end|left|right|center|justify)$/],
  ['background-color', /^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/],
  ['width', /^\d+(px|%)$/],
  // Oblewanie tekstem wokół obrazu. Zapisujemy w `style`, a nie w klasie, żeby treść
  // renderowała się tak samo poza edytorem, bez dołączania jego arkusza.
  ['float', /^(left|right|none)$/],
]);

/**
 * Protokoły bezpieczne wszędzie. Świadomie bez `data:` — dla obrazów jest osobny wariant.
 *
 * `blob:` jest dopuszczony, bo tak wyglądają adresy z `URL.createObjectURL()`, których
 * używa każdy podgląd wgrywanego pliku. Jako `img src` nie wykonuje kodu, a jego odrzucenie
 * powodowało CICHĄ utratę treści: sanitizer usuwał `src`, po czym `parseHTML` Tiptapa
 * (`img[src]`) przestawało pasować i kasowało cały węzeł obrazu.
 *
 * UWAGA: adresy `blob:` żyją tylko w bieżącej sesji przeglądarki. Przed zapisem treści
 * trzeba je zastąpić trwałym URL-em ze swojego magazynu plików.
 */
export const URI_RE_SAFE = /^(?:(?:https?|mailto|tel|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

/** Jak wyżej plus `data:image/*;base64` — włączane tylko przy `allowBase64`. */
export const URI_RE_WITH_DATA_IMAGE =
  /^(?:(?:https?|mailto|tel|blob):|data:image\/(?:png|jpeg|gif|webp|avif);base64,|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

/**
 * Jedyne dopuszczalne typy MIME w `src="data:..."`.
 *
 * MUSI być egzekwowane własnym hookiem, a nie przez `ALLOWED_URI_REGEXP`: DOMPurify trzyma
 * `img` w wbudowanej liście `DATA_URI_TAGS` i dla tych tagów **celowo pomija** sprawdzenie
 * URI. Bez tego `<img src="data:text/html;base64,...">` przechodzi nietknięty.
 * `ADD_DATA_URI_TAGS` potrafi tylko dodawać do tej listy, więc nie da się jej wyłączyć.
 */
export const DATA_URI_IMAGE_RE = /^data:image\/(png|jpeg|jpg|gif|webp|avif);base64,[a-z0-9+/]+=*$/i;

/** Alt-teksty, które nie niosą informacji — powód miękkiego ostrzeżenia, nie blokady. */
export const USELESS_ALT_TEXTS: readonly string[] = ['obraz', 'zdjęcie', 'zdjecie', 'image', 'foto', 'grafika', 'photo'];

export interface SanitizePolicy {
  readonly allowBase64: boolean;
  readonly maxInlineBytes: number;
  readonly allowedTags: readonly string[];
  readonly allowedAttr: readonly string[];
}

export const DEFAULT_SANITIZE_POLICY: SanitizePolicy = {
  allowBase64: false,
  maxInlineBytes: 200_000,
  allowedTags: WYSIWYG_ALLOWED_TAGS,
  allowedAttr: WYSIWYG_ALLOWED_ATTR,
};
