// Importy side-effectowe, nie ozdobniki.
//
// Tiptap dokłada komendy (`toggleBulletList`, `toggleBlockquote`, `setTextAlign`, …) przez
// `declare module` w plikach `.d.ts` poszczególnych paczek. Bez zaimportowania paczki
// w danej kompilacji TypeScript tych komend NIE widzi — build biblioteki przechodził tylko
// dlatego, że wciągał je `StarterKit` z innego pliku.
import '@tiptap/extensions';
import '@tiptap/extension-list';
import '@tiptap/extension-blockquote';
import '@tiptap/extension-code-block';
import '@tiptap/extension-text-align';
import type { Editor } from '@tiptap/core';
import type { WysiwygIconName } from '../icons/wysiwyg-icon.component';
import type { WysiwygMessages } from '../config/wysiwyg-messages';
import type { TextAlignment, WysiwygFeature } from '../config/wysiwyg-feature.model';
import type { WysiwygEditorState } from './editor-state.model';

export type WysiwygCommandId =
  | 'undo'
  | 'redo'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'underline'
  | 'highlight'
  | 'link'
  | 'superscript'
  | 'subscript'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'insertImage';

export type WysiwygCommandKind = 'toggle' | 'action';

export interface CommandDescriptor {
  readonly id: WysiwygCommandId;
  readonly feature: WysiwygFeature;
  /** Ustawione tylko dla komend wyrównania — pozwala filtrować je pojedynczo. */
  readonly alignment?: TextAlignment;
  readonly labelKey: keyof WysiwygMessages;
  readonly icon: WysiwygIconName;
  readonly kind: WysiwygCommandKind;
  /** Format W3C dla `aria-keyshortcuts`, np. `"Control+B"`. NIGDY nie trafia do etykiety. */
  readonly ariaKeyShortcuts?: string;
  run(editor: Editor): boolean;
  canRun(editor: Editor): boolean;
  /** Tylko dla `kind === 'toggle'`. Czytane ze snapshotu stanu, nie z edytora. */
  isActive?(state: WysiwygEditorState): boolean;
}

function markCommand(
  id: WysiwygCommandId,
  feature: WysiwygFeature,
  labelKey: keyof WysiwygMessages,
  icon: WysiwygIconName,
  tiptapName: string,
  ariaKeyShortcuts?: string,
): CommandDescriptor {
  return {
    id,
    feature,
    labelKey,
    icon,
    kind: 'toggle',
    ariaKeyShortcuts,
    run: (e) => e.chain().focus().toggleMark(tiptapName).run(),
    canRun: (e) => e.can().chain().toggleMark(tiptapName).run(),
    isActive: (s) => s.marks[tiptapName as keyof typeof s.marks] ?? false,
  };
}

function alignCommand(
  id: WysiwygCommandId,
  labelKey: keyof WysiwygMessages,
  icon: WysiwygIconName,
  alignment: TextAlignment,
): CommandDescriptor {
  return {
    id,
    feature: 'textAlign',
    alignment,
    labelKey,
    icon,
    kind: 'toggle',
    run: (e) => e.chain().focus().setTextAlign(alignment).run(),
    canRun: (e) => e.can().chain().setTextAlign(alignment).run(),
    isActive: (s) => s.alignment === alignment,
  };
}

/**
 * Jedyne miejsce, gdzie żyje wiedza „co robi przycisk".
 *
 * Toolbar renderuje się z tego rejestru przez filtr `cfg.features`, testy jednostkowe po
 * nim iterują, a dialog pomocy skrótów generuje się z `ariaKeyShortcuts`.
 */
export const WYSIWYG_COMMANDS: readonly CommandDescriptor[] = [
  {
    id: 'undo',
    feature: 'undoRedo',
    labelKey: 'undo',
    icon: 'undo',
    kind: 'action',
    ariaKeyShortcuts: 'Control+Z',
    run: (e) => e.chain().focus().undo().run(),
    canRun: (e) => e.can().chain().undo().run(),
  },
  {
    id: 'redo',
    feature: 'undoRedo',
    labelKey: 'redo',
    icon: 'redo',
    kind: 'action',
    ariaKeyShortcuts: 'Control+Y',
    run: (e) => e.chain().focus().redo().run(),
    canRun: (e) => e.can().chain().redo().run(),
  },

  {
    id: 'bulletList',
    feature: 'bulletList',
    labelKey: 'bulletList',
    icon: 'bulletList',
    kind: 'toggle',
    ariaKeyShortcuts: 'Control+Shift+8',
    run: (e) => e.chain().focus().toggleBulletList().run(),
    canRun: (e) => e.can().chain().toggleBulletList().run(),
    isActive: (s) => s.blockType === 'bulletList',
  },
  {
    id: 'orderedList',
    feature: 'orderedList',
    labelKey: 'orderedList',
    icon: 'orderedList',
    kind: 'toggle',
    ariaKeyShortcuts: 'Control+Shift+7',
    run: (e) => e.chain().focus().toggleOrderedList().run(),
    canRun: (e) => e.can().chain().toggleOrderedList().run(),
    isActive: (s) => s.blockType === 'orderedList',
  },
  {
    id: 'blockquote',
    feature: 'blockquote',
    labelKey: 'blockquote',
    icon: 'blockquote',
    kind: 'toggle',
    run: (e) => e.chain().focus().toggleBlockquote().run(),
    canRun: (e) => e.can().chain().toggleBlockquote().run(),
    isActive: (s) => s.blockType === 'blockquote',
  },
  {
    id: 'codeBlock',
    feature: 'codeBlock',
    labelKey: 'codeBlock',
    icon: 'codeBlock',
    kind: 'toggle',
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
    canRun: (e) => e.can().chain().toggleCodeBlock().run(),
    isActive: (s) => s.blockType === 'codeBlock',
  },

  markCommand('bold', 'bold', 'bold', 'bold', 'bold', 'Control+B'),
  markCommand('italic', 'italic', 'italic', 'italic', 'italic', 'Control+I'),
  markCommand('strike', 'strike', 'strike', 'strike', 'strike', 'Control+Shift+S'),
  markCommand('code', 'code', 'code', 'code', 'code', 'Control+E'),
  markCommand('underline', 'underline', 'underline', 'underline', 'underline', 'Control+U'),
  markCommand('highlight', 'highlight', 'highlight', 'highlight', 'highlight'),
  markCommand('superscript', 'superscript', 'superscript', 'superscript', 'superscript'),
  markCommand('subscript', 'subscript', 'subscript', 'subscript', 'subscript'),

  alignCommand('alignLeft', 'alignLeft', 'alignLeft', 'left'),
  alignCommand('alignCenter', 'alignCenter', 'alignCenter', 'center'),
  alignCommand('alignRight', 'alignRight', 'alignRight', 'right'),
  alignCommand('alignJustify', 'alignJustify', 'alignJustify', 'justify'),
];

export const WYSIWYG_COMMANDS_BY_ID: ReadonlyMap<WysiwygCommandId, CommandDescriptor> = new Map(
  WYSIWYG_COMMANDS.map((c) => [c.id, c]),
);

export interface ToolbarGroupDefinition {
  readonly id: string;
  readonly labelKey: keyof WysiwygMessages;
  readonly commands: readonly WysiwygCommandId[];
}

/**
 * Komendy renderowane przez WŁASNE kontrolki, a nie przez grupy paska.
 *
 * Listy mieszkają w rozwijanym menu „Rodzaj listy", więc celowo nie ma ich w żadnej grupie.
 * Zostają jednak w rejestrze, bo to on jest źródłem etykiet, ikon i skrótów — a testy
 * pilnują, żeby każda komenda była renderowana dokładnie raz: albo przez grupę, albo tutaj.
 */
export const COMMANDS_IN_DEDICATED_CONTROLS: readonly WysiwygCommandId[] = ['bulletList', 'orderedList'];

/** Kolejność i podział na grupy odwzorowują układ paska z projektu. */
export const WYSIWYG_TOOLBAR_GROUPS: readonly ToolbarGroupDefinition[] = [
  { id: 'history', labelKey: 'groupHistory', commands: ['undo', 'redo'] },
  // `bulletList` i `orderedList` żyją w rozwijanym menu list, nie jako osobne przyciski.
  { id: 'blocks', labelKey: 'groupLists', commands: ['blockquote', 'codeBlock'] },
  {
    id: 'textStyle',
    labelKey: 'groupTextStyle',
    commands: ['bold', 'italic', 'strike', 'code', 'underline', 'highlight'],
  },
  { id: 'scripts', labelKey: 'groupScripts', commands: ['superscript', 'subscript'] },
  {
    id: 'align',
    labelKey: 'groupAlign',
    commands: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'],
  },
];
