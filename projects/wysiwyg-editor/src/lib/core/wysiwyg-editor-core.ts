import { Injectable, NgZone, computed, inject, signal, type OnDestroy } from '@angular/core';
import { Editor, type AnyExtension, type Content, type FocusPosition, type JSONContent } from '@tiptap/core';
import { EMPTY_EDITOR_STATE, readEditorState, type WysiwygEditorState } from './editor-state.model';

export interface CreateEditorOptions {
  readonly host: HTMLElement;
  readonly contentId: string;
  readonly initialHtml: string;
  readonly extensions: AnyExtension[];
  readonly editable: boolean;
  /** Atrybuty ARIA nakładane na element `contenteditable`. */
  readonly attributes: Record<string, string>;
  /**
   * Rola elementu edycji. `null` **usuwa** atrybut po utworzeniu widoku.
   *
   * Konieczne, bo Tiptap 3 wstawia `role: "textbox"` na sztywno w `Editor.createView()`,
   * a przekazanie `role: ''` dałoby pusty, nieprawidłowy atrybut zamiast jego braku.
   */
  readonly role: string | null;
  readonly enableInputRules: boolean;
  readonly onUpdate: (html: string) => void;
  readonly onFocus: (event: FocusEvent) => void;
  readonly onBlur: (event: FocusEvent) => void;
}

/**
 * Opakowanie instancji Tiptap. Dostarczane w `providers` komponentu (bez `providedIn`),
 * więc każdy edytor ma własną instancję.
 */
@Injectable()
export class WysiwygEditorCore implements OnDestroy {
  private readonly zone = inject(NgZone);

  private editorRef: Editor | null = null;
  private stateSyncScheduled = false;
  private frameHandle: number | null = null;

  private readonly _state = signal<WysiwygEditorState>(EMPTY_EDITOR_STATE);
  private readonly _ready = signal(false);

  readonly state = this._state.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly canUndo = computed(() => this._state().canUndo);
  readonly canRedo = computed(() => this._state().canRedo);
  readonly onImage = computed(() => this._state().selection.onImage);

  get editor(): Editor | null {
    return this.editorRef;
  }

  create(opts: CreateEditorOptions): void {
    this.destroy();

    // Zawsze poza strefą Angulara: ProseMirror wiesza `mousemove` (podczas zaznaczania),
    // `keydown`, `beforeinput` i `selectionchange` — w trybie zone każde z nich wywołałoby
    // pełny cykl detekcji zmian. W trybie zoneless `NgZone` to `NoopNgZone`, więc to no-op
    // i kod pozostaje jeden dla obu trybów.
    const editor = this.zone.runOutsideAngular(
      () =>
        new Editor({
          element: opts.host,
          content: opts.initialHtml,
          extensions: opts.extensions,
          editable: opts.editable,
          enableInputRules: opts.enableInputRules,
          // Własny CSS. Unika wstrzykiwanego `<style>` bez nonce przy ścisłym CSP.
          injectCSS: false,
          editorProps: {
            attributes: {
              id: opts.contentId,
              class: 'wysiwyg__content-editable',
              ...opts.attributes,
              // Nadpisuje `role: "textbox"` wstawiane przez Tiptap. Gdy `role === null`,
              // atrybut jest usuwany zaraz po utworzeniu widoku (niżej).
              ...(opts.role ? { role: opts.role } : {}),
            },
          },
        }),
    );

    if (opts.role === null) {
      editor.view.dom.removeAttribute('role');
    }

    this.editorRef = editor;

    editor.on('transaction', () => this.scheduleStateSync());
    editor.on('update', ({ editor: e }) => opts.onUpdate(e.getHTML()));
    editor.on('focus', ({ event }) => opts.onFocus(event));
    editor.on('blur', ({ event }) => opts.onBlur(event));

    this._state.set(readEditorState(editor));
    this._ready.set(true);
  }

  /**
   * Jeden snapshot stanu na klatkę zamiast jednego na transakcję — transakcja leci na każde
   * naciśnięcie klawisza, a odczyt stanu to kilkanaście wywołań `isActive()`.
   */
  private scheduleStateSync(): void {
    if (this.stateSyncScheduled) {
      return;
    }
    this.stateSyncScheduled = true;
    this.frameHandle = requestAnimationFrame(() => {
      this.stateSyncScheduled = false;
      this.frameHandle = null;
      const editor = this.editorRef;
      if (!editor || editor.isDestroyed) {
        return;
      }
      // Zapis do signala planuje detekcję zmian w obu trybach — `markForCheck()` jest
      // niepotrzebny i nie wolno go dodawać.
      this._state.set(readEditorState(editor));
    });
  }

  destroy(): void {
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
    this.stateSyncScheduled = false;
    this.editorRef?.destroy();
    this.editorRef = null;
    this._ready.set(false);
    this._state.set(EMPTY_EDITOR_STATE);
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  setEditable(editable: boolean): void {
    this.editorRef?.setEditable(editable);
    this.scheduleStateSync();
  }

  /** Ustawia treść z zewnątrz — bez emisji `update`, żeby nie powstała pętla. */
  setContentFromHost(html: Content): void {
    this.editorRef?.commands.setContent(html, { emitUpdate: false });
    this.scheduleStateSync();
  }

  getHTML(): string {
    return this.editorRef?.getHTML() ?? '';
  }

  getJSON(): JSONContent | null {
    return this.editorRef?.getJSON() ?? null;
  }

  /** Czy w dokumencie jest węzeł o danej nazwie — np. niedokończony upload obrazu. */
  hasNode(name: string): boolean {
    const editor = this.editorRef;
    if (!editor) {
      return false;
    }
    let found = false;
    editor.state.doc.descendants((node) => {
      if (found) {
        return false;
      }
      if (node.type.name === name) {
        found = true;
        return false;
      }
      return true;
    });
    return found;
  }

  isEmpty(): boolean {
    return this.editorRef?.isEmpty ?? true;
  }

  focus(position: FocusPosition = 'end'): void {
    this.editorRef?.commands.focus(position);
  }

  /** `true`, gdy trwa kompozycja IME lub martwego klawisza (polskie diakrytyki w Safari). */
  get isComposing(): boolean {
    return this.editorRef?.view.composing ?? false;
  }
}
