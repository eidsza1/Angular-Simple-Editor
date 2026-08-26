import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  Injector,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
  type OnDestroy,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import type { FocusPosition, JSONContent } from '@tiptap/core';
import { WYSIWYG_EDITOR_CONFIG, WYSIWYG_MESSAGES } from './config/wysiwyg-config.tokens';
import { WYSIWYG_SANITIZER } from './sanitize/sanitizer.token';
import type { SanitizePolicy } from './sanitize/sanitize-policy';
import { mergeWysiwygConfig, type DeepPartial, type WysiwygEditorConfig } from './config/wysiwyg-config.model';
import type { WysiwygFeature } from './config/wysiwyg-feature.model';
import { WysiwygEditorCore } from './core/wysiwyg-editor-core';
import { buildExtensions } from './core/extension-factory';
import { nextWysiwygId } from './a11y/wysiwyg-id';
import { WysiwygAnnouncer } from './a11y/wysiwyg-announcer.service';
import { WysiwygToolbarComponent } from './toolbar/wysiwyg-toolbar.component';
import type { CommandDescriptor } from './core/command-registry';

/** Ustawia atrybut ARIA o wartości logicznej albo go usuwa. Nigdy nie zostawia `=""`. */
function setBooleanAria(el: Element, name: string, value: boolean): void {
  if (value) {
    el.setAttribute(name, 'true');
  } else {
    el.removeAttribute(name);
  }
}

@Component({
  selector: 'wysiwyg-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ProseMirror renderuje DOM wewnątrz hosta poza Angularem, więc emulowana enkapsulacja
  // nie nadałaby mu atrybutów `_ngcontent`.
  encapsulation: ViewEncapsulation.None,
  providers: [
    WysiwygEditorCore,
    WysiwygAnnouncer,
    { provide: NG_VALUE_ACCESSOR, useExisting: WysiwygEditorComponent, multi: true },
  ],
  imports: [WysiwygToolbarComponent],
  host: {
    class: 'wysiwyg',
    '[class.wysiwyg--disabled]': 'isDisabled()',
    '[class.wysiwyg--readonly]': 'readonly()',
    '[class.wysiwyg--focused]': 'hasFocus()',
    '[class.wysiwyg--sticky]': 'resolvedConfig().stickyToolbar',
    '[style.--wysiwyg-paper-max]': 'resolvedConfig().paperMaxWidth',
  },
  template: `
    <wysiwyg-toolbar
      #toolbar
      [features]="resolvedConfig().features"
      [state]="core.state()"
      [messages]="messages"
      [canRun]="canRunCommand"
      [disabled]="isDisabled() || readonly()"
      [ariaControls]="sourceMode() ? sourceId : contentId"
      [sourceMode]="sourceMode()"
      [headingLevels]="resolvedConfig().headingLevels"
      [alignments]="resolvedConfig().alignments"
      [currentHref]="currentHref()"
      (headingSelected)="onHeadingSelected($event)"
      (listSelected)="onListSelected($event)"
      (applyLink)="onApplyLink($event)"
      (removeLink)="onRemoveLink()"
      (insertImage)="onInsertImage()"
      (command)="onToolbarCommand($event)"
      (returnFocus)="focusCurrentView()"
      (toggleSource)="toggleSourceMode()"
    />

    <!--
      Host NIGDY nie jest usuwany z DOM, nawet w widoku źródła: ProseMirror jest jego
      wyłącznym właścicielem, a @if zniszczyłby poddrzewo pod nim. Ukrywamy go stylem.
    -->
    <!--
      Atrybut inert przy wyłączonym polu usuwa CAŁĄ treść z kolejności Tab i blokuje
      kliknięcia, także w kontrolkach osadzonych w node view. Samo contenteditable="false"
      tego nie robi.
      (Uwaga: bez odwrotnych apostrofów — szablon jest literałem szablonowym.)
    -->
    <div
      class="wysiwyg__scroll"
      [class.wysiwyg__scroll--hidden]="sourceMode()"
      [attr.inert]="sourceMode() || isDisabled() ? '' : null"
    >
      <div #host class="wysiwyg__host" ngSkipHydration></div>
    </div>

    @if (sourceMode()) {
      <div class="wysiwyg__source-wrap">
        <label [for]="sourceId" class="cdk-visually-hidden">{{ messages.sourceTextareaLabel }}</label>
        <textarea
          #source
          [id]="sourceId"
          class="wysiwyg__source"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          [attr.aria-describedby]="sourceHintId"
          [value]="sourceDraft()"
          (input)="onSourceInput($event)"
        ></textarea>
        <p [id]="sourceHintId" class="wysiwyg__source-hint">{{ messages.sourceHint }}</p>
      </div>
    }

    <div [id]="hintId" class="cdk-visually-hidden">{{ messages.editorHint }}</div>
  `,
})
export class WysiwygEditorComponent implements ControlValueAccessor, OnDestroy {
  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly toolbarRef = viewChild.required<WysiwygToolbarComponent>('toolbar');
  private readonly baseConfig = inject(WYSIWYG_EDITOR_CONFIG);
  private readonly sanitizer = inject(WYSIWYG_SANITIZER);

  protected readonly core = inject(WysiwygEditorCore);
  private readonly announcer = inject(WysiwygAnnouncer);
  private readonly injector = inject(Injector);
  protected readonly messages = inject(WYSIWYG_MESSAGES);

  readonly contentId = nextWysiwygId('content');
  protected readonly hintId = nextWysiwygId('hint');
  protected readonly sourceId = nextWysiwygId('source');
  protected readonly sourceHintId = nextWysiwygId('source-hint');

  /** Dwukierunkowy `[(value)]`. `model()` sam tworzy output `valueChange`. */
  readonly value = model<string>('');
  readonly config = input<DeepPartial<WysiwygEditorConfig> | null>(null);
  readonly features = input<readonly WysiwygFeature[] | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

  readonly editorFocus = output<FocusEvent>();
  readonly editorBlur = output<FocusEvent>();

  private readonly _hasFocus = signal(false);
  protected readonly hasFocus = this._hasFocus.asReadonly();

  private readonly _sourceMode = signal(false);
  protected readonly sourceMode = this._sourceMode.asReadonly();
  /** Bufor edycji w widoku źródła; stosowany dopiero przy powrocie do widoku wizualnego. */
  protected readonly sourceDraft = signal('');
  private readonly sourceRef = viewChild<ElementRef<HTMLTextAreaElement>>('source');

  /** Straż przed pętlą `writeValue → setContent → update → value.set() → …`. */
  private applyingExternal = false;
  /**
   * Ostatnia wartość, którą sami wyemitowaliśmy.
   *
   * Efekt na `value()` MUSI ignorować własne emisje. Inaczej po każdym naciśnięciu klawisza
   * leciał cykl: `update` → sanityzacja → wynik różni się od `getHTML()` → `setContent` →
   * dokument wstawiany od nowa i KURSOR SKACZE NA KONIEC. Objawiało się to tak, że pierwsza
   * litera trafiała w miejsce kursora, a każda następna na sam koniec treści.
   */
  private lastEmittedValue: string | null = null;
  private created = false;
  /** Czy użytkownik kiedykolwiek wszedł do obszaru treści — patrz `ensureFocusedEditor`. */
  private hasBeenFocused = false;

  protected readonly resolvedConfig = computed<WysiwygEditorConfig>(() => {
    const merged = mergeWysiwygConfig(this.baseConfig, this.config());
    const overrideFeatures = this.features();
    return overrideFeatures ? { ...merged, features: overrideFeatures } : merged;
  });

  /** Ustawiane przez `setDisabledState()` z Reactive Forms — niezależne od inputu. */
  private readonly cvaDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());
  private readonly isEditable = computed(() => !this.isDisabled() && !this.readonly());

  private readonly sanitizePolicy = computed<Partial<SanitizePolicy>>(() => {
    const image = this.resolvedConfig().image;
    return { allowBase64: image.allowBase64, maxInlineBytes: image.maxInlineBytes };
  });

  constructor() {
    // Wyłącznie tutaj. `afterNextRender` nie odpala się na serwerze, więc `new Editor()`
    // nigdy nie sięgnie po `document` podczas SSR.
    afterNextRender(() => this.createEditor());

    effect(() => {
      const editable = this.isEditable();
      if (this.created) {
        this.core.setEditable(editable);
        this.applyAriaState();
      }
    });

    effect(() => {
      const next = this.value();
      if (!this.created || this.applyingExternal) {
        return;
      }
      // Wartość pochodząca z samego edytora nie może wracać do niego przez `setContent`.
      if (next === this.lastEmittedValue) {
        return;
      }
      this.applyExternalValue(next);
    });
  }

  private createEditor(): void {
    const cfg = this.resolvedConfig();

    if (typeof ngDevMode !== 'undefined' && ngDevMode && !this.ariaLabel() && !this.ariaLabelledby()) {
      console.warn(
        '[wysiwyg-editor] Brak etykiety. Ustaw [aria-labelledby] wskazujący na widoczną etykietę ' +
          'albo [aria-label]. Uwaga: <label for> NIE działa na div[contenteditable] — to nie jest ' +
          'element etykietowalny.',
      );
    }

    this.core.create({
      host: this.hostRef().nativeElement,
      contentId: this.contentId,
      initialHtml: this.sanitizer.sanitize(this.value(), this.sanitizePolicy()),
      extensions: buildExtensions(cfg, {
        sanitizer: this.sanitizer,
        messages: this.messages,
        announce: (message) => this.announcer.polite(message),
        keymap: {
          onFocusToolbar: () => this.focusToolbar(),
          // Ogłaszamy TYLKO skróty z obszaru treści — w toolbarze `aria-pressed` na
          // sfokusowanym przycisku jest czytane natywnie i dublowałoby komunikat.
          onAnnounce: (message) => this.announcer.polite(message),
          messages: {
            markOn: this.messages.announceMarkOn,
            markOff: this.messages.announceMarkOff,
            labels: {
              bold: this.messages.bold,
              italic: this.messages.italic,
              underline: this.messages.underline,
              strike: this.messages.strike,
              code: this.messages.code,
            },
            undo: this.messages.announceUndo,
            redo: this.messages.announceRedo,
          },
        },
      }),
      editable: this.isEditable(),
      enableInputRules: cfg.enableInputRules,
      attributes: this.buildAriaAttributes(),
      role: cfg.useTextboxRole ? 'textbox' : null,
      onUpdate: (html) => this.onEditorUpdate(html),
      onFocus: (event) => {
        this._hasFocus.set(true);
        this.hasBeenFocused = true;
        this.editorFocus.emit(event);
      },
      onBlur: (event) => {
        this._hasFocus.set(false);
        this.onTouchedFn?.();
        this.editorBlur.emit(event);
      },
    });

    this.created = true;
  }

  private buildAriaAttributes(): Record<string, string> {
    const describedBy = [this.ariaDescribedby(), this.hintId].filter(Boolean).join(' ');
    const attrs: Record<string, string> = {
      'aria-multiline': 'true',
      'aria-describedby': describedBy,
      spellcheck: 'true',
    };

    // Etykieta: `aria-labelledby` ma pierwszeństwo, potem `aria-label`, na końcu fallback.
    const labelledby = this.ariaLabelledby();
    if (labelledby) {
      attrs['aria-labelledby'] = labelledby;
    } else {
      attrs['aria-label'] = this.ariaLabel() ?? this.messages.editorFallbackLabel;
    }

    // `role` jest ustawiane osobno, przez `CreateEditorOptions.role` — Tiptap wstawia
    // `role="textbox"` na sztywno i trzeba je nadpisać albo usunąć po utworzeniu widoku.
    return attrs;
  }

  /** Stan `readonly`/`disabled` musi być czytelny dla AT, a nie tylko wizualny. */
  private applyAriaState(): void {
    const el = this.core.editor?.view.dom as HTMLElement | undefined;
    if (!el) {
      return;
    }
    // `toggleAttribute` dałoby `aria-disabled=""`, a atrybuty ARIA o wartościach logicznych
    // wymagają jawnego "true"/"false" — pusty string bywa przez czytniki ignorowany.
    setBooleanAria(el, 'aria-readonly', this.readonly() && !this.isDisabled());
    setBooleanAria(el, 'aria-disabled', this.isDisabled());
  }

  /** Droga wejścia nr 1: `[(value)]` i `writeValue()`. Zawsze przez sanitizer. */
  private applyExternalValue(html: string | null): void {
    const clean = this.sanitizer.sanitize(html ?? '', this.sanitizePolicy());
    // Porównujemy postacie PO SANITYZACJI po obu stronach.
    //
    // Zestawianie `clean` z surowym `getHTML()` dawało fałszywą różnicę, gdy sanitizer
    // normalizował markup (np. przepisywał atrybut `style` obrazu) — i wyzwalało zbędne
    // `setContent`, które gubi pozycję kursora.
    if (clean === this.sanitizer.sanitize(this.core.getHTML(), this.sanitizePolicy())) {
      return;
    }
    // Nie przerywaj kompozycji IME / martwego klawisza — uciełoby wpisywany znak
    // (polskie diakrytyki w Safari, klawiatury ekranowe na Androidzie).
    if (this.core.isComposing) {
      return;
    }
    this.applyingExternal = true;
    try {
      this.core.setContentFromHost(clean);
    } finally {
      this.applyingExternal = false;
    }
  }

  private onEditorUpdate(html: string): void {
    if (this.applyingExternal) {
      return;
    }
    // Węzeł uploadu to stan ROBOCZY, nie treść dokumentu.
    //
    // Gdyby go tu przepuścić, sanitizer słusznie usunąłby `<div data-image-upload>`
    // (nie ma go w allowliście), wynik różniłby się od `getHTML()`, efekt na `value`
    // wstawiłby treść od nowa i ZNISZCZYŁ node view razem z wybranym plikiem i wpisanym
    // tekstem alternatywnym. Wartość emitujemy dopiero, gdy obraz zostanie zatwierdzony
    // albo kontener usunięty.
    if (this.core.hasNode('imageUpload')) {
      return;
    }
    const clean = this.sanitizer.sanitize(html, this.sanitizePolicy());
    this.lastEmittedValue = clean;
    this.value.set(clean);
    this.onChangeFn?.(clean);
  }

  // --- ControlValueAccessor ---

  writeValue(value: string | null): void {
    const incoming = value ?? '';
    let normalized: string;
    let sanitizerChangedInput = false;

    this.applyingExternal = true;
    try {
      const result = this.sanitizer.sanitizeDetailed(incoming, this.sanitizePolicy());
      const clean = result.html;
      sanitizerChangedInput = result.removedSomething;
      if (this.created) {
        this.core.setContentFromHost(clean);
        // Czytamy z powrotem z edytora, a nie zapisujemy `clean`: schemat ProseMirror
        // normalizuje treść (odrzuca węzły, których nie zna), więc bez tego `value`
        // rozjechałoby się z `getHTML()`.
        normalized = this.core.getHTML();
      } else {
        normalized = clean;
      }
      this.value.set(normalized);
    } finally {
      this.applyingExternal = false;
    }

    // Zwykle `writeValue` NIE MOŻE wołać `onChange` — oznaczyłoby to formularz jako `dirty`
    // już przy inicjalizacji.
    //
    // Wyjątek TYLKO wtedy, gdy sanitizer faktycznie coś usunął: inaczej `FormControl`
    // zostałby z treścią, której edytor nigdy nie pokazał, i aplikacja zapisałaby
    // niezsanityzowany HTML, gdyby użytkownik nic nie wpisał.
    //
    // Sygnałem jest RAPORT sanitizera (`removed`), nie porównanie stringów: normalizacja
    // schematu ProseMirror (`<li>x</li>` → `<li><p>x</p></li>`) i przeserializowanie HTML
    // przez DOMPurify zmieniają treść także wtedy, gdy nic nie zostało usunięte.
    if (sanitizerChangedInput) {
      this.onChangeFn?.(normalized);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  // --- API publiczne ---

  focus(position: FocusPosition = 'end'): void {
    this.core.focus(position);
  }

  /**
   * Przełącza widok wizualny ↔ źródło HTML (odpowiednik przycisku „Source" w CKEditorze).
   *
   * Wejście w źródło: bufor dostaje aktualny HTML.
   * Wyjście: bufor przechodzi przez sanitizer i trafia do dokumentu — tekstowe pole jest
   * pełnoprawną drogą wejścia HTML, więc nie może omijać sanityzacji.
   */
  toggleSourceMode(): void {
    const goingToSource = !this._sourceMode();

    if (goingToSource) {
      this.sourceDraft.set(this.core.getHTML());
      this._sourceMode.set(true);
      this.announcer.polite(this.messages.announceSourceOn);
    } else {
      this.applySourceDraft();
      this._sourceMode.set(false);
      this.announcer.polite(this.messages.announceSourceOff);
    }

    // Fokus musi podążyć za widokiem, inaczej zostaje na przycisku, a użytkownik klawiatury
    // nie wie, gdzie wylądował.
    afterNextRender(() => this.focusCurrentView(), { injector: this.injector });
  }

  private applySourceDraft(): void {
    const clean = this.sanitizer.sanitize(this.sourceDraft(), this.sanitizePolicy());
    this.applyingExternal = true;
    try {
      this.core.setContentFromHost(clean);
    } finally {
      this.applyingExternal = false;
    }
    const normalized = this.core.getHTML();
    this.value.set(normalized);
    this.onChangeFn?.(normalized);
  }

  protected onSourceInput(event: Event): void {
    this.sourceDraft.set((event.target as HTMLTextAreaElement).value);
  }

  /** Ustawia fokus w aktywnym widoku — używane po zamknięciu toolbara i po przełączeniu. */
  protected focusCurrentView(): void {
    if (this._sourceMode()) {
      this.sourceRef()?.nativeElement.focus();
    } else {
      this.core.focus();
    }
  }

  /** Przenosi fokus na pasek narzędzi — cel skrótu Alt+F10. */
  focusToolbar(): void {
    this.toolbarRef().focusToolbar();
  }

  /**
   * Kliknięcie kontrolki w toolbarze NIE jest ogłaszane: zmiana `aria-pressed` na
   * sfokusowanym przycisku jest czytana natywnie, a własne ogłoszenie dałoby podwójną mowę.
   */
  /** Wyrównanie z głównego paska → oblewanie obrazu, gdy zaznaczony jest obraz. */
  private static readonly ALIGN_TO_WRAP: Readonly<Record<string, 'left' | 'right' | 'none'>> = {
    alignLeft: 'left',
    alignCenter: 'none',
    alignRight: 'right',
  };

  protected onToolbarCommand(descriptor: CommandDescriptor): void {
    const editor = this.ensureFocusedEditor();
    if (!editor) {
      return;
    }

    // Gdy zaznaczony jest obraz, przyciski wyrównania z głównego paska muszą działać NA NIM.
    //
    // `@tiptap/extension-text-align` obsługuje wyłącznie nagłówki i akapity, więc bez tego
    // kliknięcie „Wyrównaj do lewej" przy zaznaczonym obrazie albo nie robiło nic, albo
    // zmieniało wyrównanie sąsiedniego akapitu — z perspektywy użytkownika wyglądało to
    // po prostu na zepsute.
    const wrap = WysiwygEditorComponent.ALIGN_TO_WRAP[descriptor.id];
    if (wrap && editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', { wrap }).run();
      return;
    }

    descriptor.run(editor);
  }

  /**
   * Zwraca instancję edytora z pewnością, że jest na czym wykonać komendę.
   *
   * UWAGA na pułapkę: kliknięcie kontrolki paska ZABIERA edytorowi fokus, więc
   * `editor.isFocused` jest wtedy `false` — mimo że zaznaczenie użytkownika nadal siedzi
   * w stanie ProseMirror i `.chain().focus()` je przywróci. Wymuszanie tu `focus('end')`
   * kasowałoby to zaznaczenie i komenda działałaby na końcu dokumentu zamiast na
   * zaznaczonym fragmencie.
   *
   * Na koniec dokumentu skaczemy WYŁĄCZNIE wtedy, gdy użytkownik nigdy nie wszedł do
   * treści — wtedy faktycznie nie ma czego przywracać.
   */
  private ensureFocusedEditor() {
    const editor = this.core.editor;
    if (!editor) {
      return null;
    }
    if (!this.hasBeenFocused) {
      editor.commands.focus('end');
      this.hasBeenFocused = true;
    }
    return editor;
  }

  /** `0` = akapit, `1..6` = poziom nagłówka. */
  protected onHeadingSelected(level: number): void {
    const editor = this.ensureFocusedEditor();
    if (!editor) {
      return;
    }
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
    }
  }

  /** Wybór z menu list działa jak przełącznik: ponowny wybór aktywnej listy ją wyłącza. */
  protected onListSelected(kind: string): void {
    const editor = this.ensureFocusedEditor();
    if (!editor) {
      return;
    }
    if (kind === 'bulletList') {
      editor.chain().focus().toggleBulletList().run();
    } else if (kind === 'orderedList') {
      editor.chain().focus().toggleOrderedList().run();
    }
  }

  protected readonly currentHref = computed(
    () => (this.core.state().selection.linkHref ?? '') as string,
  );

  protected onApplyLink(event: { href: string }): void {
    this.ensureFocusedEditor()?.chain().focus().extendMarkRange('link').setLink({ href: event.href }).run();
  }

  protected onRemoveLink(): void {
    this.ensureFocusedEditor()?.chain().focus().extendMarkRange('link').unsetLink().run();
  }

  protected onInsertImage(): void {
    const editor = this.ensureFocusedEditor();
    if (!editor) {
      return;
    }

    // Węzeł uploadu jest blokiem NAJWYŻSZEGO POZIOMU. Wstawianie go „w miejscu kursora"
    // zawodziło po cichu, gdy kursor stał w liście: schemat `listItem` nie dopuszcza tego
    // bloku, więc ProseMirror go pomijał, a komenda i tak zwracała `true`. Z perspektywy
    // użytkownika przycisk po prostu nic nie robił.
    //
    // Dlatego wstawiamy ZA blokiem najwyższego poziomu, w którym stoi kursor — działa
    // w każdym kontekście i jest sensowniejsze wizualnie niż kontener wciśnięty
    // w punkt listy.
    const { $from } = editor.state.selection;
    const insertPos = $from.depth > 0 ? $from.after(1) : editor.state.doc.content.size;

    // `scrollIntoView()` nie jest kosmetyką: bez niego kontener wstawiony poza widocznym
    // obszarem wygląda tak samo jak brak reakcji.
    editor
      .chain()
      .focus()
      .insertContentAt(insertPos, { type: 'imageUpload' })
      .scrollIntoView()
      .run();

    // Diagnostyka trybu deweloperskiego.
    //
    // `insertContentAt` potrafi ZWRÓCIĆ `true` i mimo to nic nie wstawić, gdy schemat nie
    // dopuszcza węzła w danym miejscu — wtedy z perspektywy użytkownika przycisk po prostu
    // nie działa i nie ma czego szukać w konsoli. Ten warunek zamienia ciszę w konkretny
    // komunikat z pozycją wstawiania.
    if (typeof ngDevMode !== 'undefined' && ngDevMode && !this.core.hasNode('imageUpload')) {
      console.warn(
        '[wysiwyg-editor] Nie udało się wstawić kontenera wgrywania obrazu. ' +
          `Pozycja: ${insertPos}, głębokość zaznaczenia: ${$from.depth}. ` +
          'Sprawdź, czy schemat dopuszcza blok „imageUpload" w tym miejscu.',
      );
    }
  }

  /** Przekazywane do toolbara jako pole, nie metoda — musi być stabilną referencją. */
  protected readonly canRunCommand = (descriptor: CommandDescriptor): boolean => {
    const editor = this.core.editor;
    return editor ? descriptor.canRun(editor) : false;
  };

  getHTML(): string {
    return this.core.getHTML();
  }

  getJSON(): JSONContent | null {
    return this.core.getJSON();
  }

  isEmpty(): boolean {
    return this.core.isEmpty();
  }

  private onChangeFn?: (value: string) => void;
  private onTouchedFn?: () => void;

  ngOnDestroy(): void {
    this.core.destroy();
    this.created = false;
  }
}
