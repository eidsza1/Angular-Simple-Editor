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
  selection: { linkHref: null, onImage: false, imageAlt: null, isEmptySelection: true },
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

/**
 * Czysta funkcja — jeden odczyt całego stanu edytora, wołany **raz na klatkę** zamiast
 * kilkunastu wywołań `editor.isActive()` z szablonu przy każdej detekcji zmian.
 *
 * Testowalna bez Angulara.
 */
export function readEditorState(editor: Editor): WysiwygEditorState {
  const { blockType, headingLevel } = resolveBlockType(editor);
  const onImage = editor.isActive('image');

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
      isEmptySelection: editor.state.selection.empty,
    },
    isEmpty: editor.isEmpty,
  };
}
