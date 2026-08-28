// Import side-effectowy, nie ozdobnik.
//
// Tiptap dokłada komendy (`undo`, `redo`, `setTextAlign`, …) przez `declare module` w plikach
// `.d.ts` poszczególnych paczek. Jeśli żaden plik w danej kompilacji nie zaimportuje paczki,
// TypeScript tych komend NIE widzi — build biblioteki przechodził tylko dlatego, że
// `StarterKit` wciągał je z innego miejsca, a kompilacja testów już nie.
import '@tiptap/extensions';
import type { Editor } from '@tiptap/core';
import type { HeadingLevel, TextAlignment } from '../config/wysiwyg-feature.model';

export type WysiwygMarkName =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'highlight'
  | 'link'
  | 'superscript'
  | 'subscript';

export type WysiwygBlockType =
  | 'paragraph'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'other';

export interface WysiwygSelectionState {
  /** `href` odnośnika pod kursorem — potrzebny, by nie kazać go przepisywać (SC 3.3.7). */
  readonly linkHref: string | null;
  readonly onImage: boolean;
  readonly imageAlt: string | null;
  /** Czy kursor stoi w komórce tabeli — steruje panelem tabeli w pasku. */
  readonly inTable: boolean;
  /** Podpis tabeli pod kursorem. `null` poza tabelą — SC 3.3.7 przy edycji. */
  readonly tableCaption: string | null;
  /** Czy pierwszy wiersz tabeli składa się z komórek nagłówkowych (`aria-pressed`). */
  readonly tableHeaderRow: boolean;
  /** Czy pierwsza kolumna tabeli składa się z komórek nagłówkowych (`aria-pressed`). */
  readonly tableHeaderColumn: boolean;
  readonly isEmptySelection: boolean;
}

export interface WysiwygEditorState {
  readonly marks: Readonly<Record<WysiwygMarkName, boolean>>;
  readonly blockType: WysiwygBlockType;
  readonly headingLevel: HeadingLevel | null;
  readonly alignment: TextAlignment | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly selection: WysiwygSelectionState;
  readonly isEmpty: boolean;
}

export const EMPTY_EDITOR_STATE: WysiwygEditorState = {
  marks: {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    code: false,
    highlight: false,
    link: false,
    superscript: false,
    subscript: false,
  },
  blockType: 'paragraph',
  headingLevel: null,
  alignment: null,
  canUndo: false,
  canRedo: false,
  selection: {
    linkHref: null,
    onImage: false,
    imageAlt: null,
    inTable: false,
    tableCaption: null,
    tableHeaderRow: false,
    tableHeaderColumn: false,
    isEmptySelection: true,
  },
  isEmpty: true,
};

const MARK_NAMES: readonly WysiwygMarkName[] = [
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'highlight',
  'link',
  'superscript',
  'subscript',
];

function resolveBlockType(editor: Editor): { blockType: WysiwygBlockType; headingLevel: HeadingLevel | null } {
  if (editor.isActive('heading')) {
    const level = editor.getAttributes('heading')['level'];
    return { blockType: 'heading', headingLevel: typeof level === 'number' ? (level as HeadingLevel) : null };
  }
  if (editor.isActive('bulletList')) return { blockType: 'bulletList', headingLevel: null };
  if (editor.isActive('orderedList')) return { blockType: 'orderedList', headingLevel: null };
  if (editor.isActive('blockquote')) return { blockType: 'blockquote', headingLevel: null };
  if (editor.isActive('codeBlock')) return { blockType: 'codeBlock', headingLevel: null };
  if (editor.isActive('paragraph')) return { blockType: 'paragraph', headingLevel: null };
  return { blockType: 'other', headingLevel: null };
}

function resolveAlignment(editor: Editor): TextAlignment | null {
  for (const a of ['left', 'center', 'right', 'justify'] as const) {
    if (editor.isActive({ textAlign: a })) {
      return a;
    }
  }
  return null;
}

interface TableSnapshot {
  readonly caption: string;
  readonly headerRow: boolean;
  readonly headerColumn: boolean;
}

/**
 * Stan tabeli, w której stoi kursor. `null`, gdy kursor jest poza tabelą.
 *
 * Czytamy węzeł wprost z zaznaczenia, a nie przez `editor.isActive('table')`: przy
 * wyłączonej funkcji `table` typ węzła w ogóle nie istnieje w schemacie i `isActive`
 * przewraca się na „Unknown node type".
 */
function readTableState(editor: Editor): TableSnapshot | null {
  const $from = editor.state.selection.$from;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.spec['tableRole'] !== 'table') {
      continue;
    }

    const rows = Array.from({ length: node.childCount }, (_, i) => node.child(i));
    const isHeaderRow = (row: (typeof rows)[number]): boolean =>
      row.childCount > 0 &&
      Array.from({ length: row.childCount }, (_, i) => row.child(i)).every(
        (cell) => cell.type.spec['tableRole'] === 'header_cell',
      );

    return {
      caption: (node.attrs['caption'] as string | undefined) ?? '',
      headerRow: rows.length > 0 && isHeaderRow(rows[0]!),
      // Kolumna nagłówkowa liczy się tylko wtedy, gdy KAŻDY wiersz zaczyna się od `<th>`.
      // Inaczej przycisk pokazywałby „wciśnięty" dla tabeli, która ma sam wiersz nagłówkowy.
      headerColumn:
        rows.length > 0 &&
        rows.every((row) => row.firstChild?.type.spec['tableRole'] === 'header_cell'),
    };
  }
  return null;
}

/**
 * Czysta funkcja — jeden odczyt całego stanu edytora, wołany **raz na klatkę** zamiast
 * kilkunastu wywołań `editor.isActive()` z szablonu przy każdej detekcji zmian.
 *
 * Testowalna bez Angulara.
 */
export function readEditorState(editor: Editor): WysiwygEditorState {
  const { blockType, headingLevel } = resolveBlockType(editor);
  const onImage = editor.isActive('image');
  const table = readTableState(editor);

  const marks = {} as Record<WysiwygMarkName, boolean>;
  for (const name of MARK_NAMES) {
    marks[name] = editor.isActive(name);
  }

  return {
    marks,
    blockType,
    headingLevel,
    alignment: resolveAlignment(editor),
    canUndo: editor.can().chain().undo().run(),
    canRedo: editor.can().chain().redo().run(),
    selection: {
      linkHref: editor.isActive('link') ? ((editor.getAttributes('link')['href'] as string) ?? null) : null,
      onImage,
      imageAlt: onImage ? ((editor.getAttributes('image')['alt'] as string | undefined) ?? '') : null,
      inTable: !!table,
      tableCaption: table?.caption ?? null,
      tableHeaderRow: table?.headerRow ?? false,
      tableHeaderColumn: table?.headerColumn ?? false,
      isEmptySelection: editor.state.selection.empty,
    },
    isEmpty: editor.isEmpty,
  };
}
