import Image from '@tiptap/extension-image';
import type { NodeView } from '@tiptap/pm/view';
import { NodeSelection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import type { WysiwygMessages } from '../config/wysiwyg-messages';

export interface AccessibleImageOptions {
  messages: WysiwygMessages | null;
  announce: ((message: string) => void) | null;
  inline: boolean;
  allowBase64: boolean;
}

/** Kroki szerokości dostępne z klawiatury. `null` = rozmiar pierwotny. */
const WIDTH_STEPS: readonly (number | null)[] = [25, 50, 75, 100, null];
const MIN_PERCENT = 10;
const MAX_PERCENT = 100;

type WrapMode = 'none' | 'left' | 'right';

interface NodeViewProps {
  readonly editor: Editor;
  readonly getPos: () => number | undefined;
  readonly node: { attrs: Record<string, unknown> };
}

/**
 * Obraz z zawsze obecnym `alt`, regulowaną szerokością i oblewaniem tekstem.
 *
 * Domyślny node Tiptap deklaruje `alt: { default: null }`, a atrybut o wartości `null` nie
 * jest renderowany — powstaje `<img src="...">` bez `alt`, co narusza SC 1.1.1 (poziom A).
 * To nie jest ustawienie do rozważenia, tylko wada domyślnej konfiguracji.
 */
export const AccessibleImage = Image.extend<AccessibleImageOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      messages: null,
      announce: null,
      inline: false,
      allowBase64: false,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      alt: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('alt') ?? '',
        renderHTML: (attributes: Record<string, unknown>) => ({ alt: (attributes['alt'] as string) ?? '' }),
      },
      /** Szerokość w procentach szerokości kolumny tekstu. `null` = rozmiar pierwotny. */
      widthPercent: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const raw = element.style.width;
          const match = /^(\d+(?:\.\d+)?)%$/.exec(raw);
          return match ? Number(match[1]) : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const value = attributes['widthPercent'] as number | null;
          return value ? { style: `width: ${value}%` } : {};
        },
      },
      /**
       * Oblewanie tekstem. Zapisujemy w `style`, a nie w klasie, żeby treść wyglądała tak
       * samo poza edytorem, bez dołączania jego arkusza stylów.
       */
      wrap: {
        default: 'none',
        parseHTML: (element: HTMLElement) => {
          const float = element.style.float;
          return float === 'left' || float === 'right' ? float : 'none';
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const value = attributes['wrap'] as WrapMode;
          return value === 'left' || value === 'right' ? { style: `float: ${value}` } : {};
        },
      },
    };
  },

  addNodeView() {
    return (props) => new ImageView(props as unknown as NodeViewProps, this.options);
  },
});

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  // Każdy element wewnątrz węzła: `draggable="false"`. Gdy węzeł jest zaznaczony,
  // ProseMirror ustawia `draggable="true"` na kontenerze, a w Chrome `mousedown`
  // na potomku elementu przeciągalnego rozpoczyna PRZECIĄGANIE zamiast kliknięcia.
  node.draggable = false;
  return node;
}

class ImageView implements NodeView {
  readonly dom: HTMLElement;

  private readonly img: HTMLImageElement;
  private readonly bar: HTMLElement;
  private readonly msg: WysiwygMessages;
  private readonly announce: (message: string) => void;

  private widthPercent: number | null;
  private wrap: WrapMode;

  constructor(
    private readonly props: NodeViewProps,
    options: AccessibleImageOptions,
  ) {
    this.msg = options.messages!;
    this.announce = options.announce ?? (() => {});

    this.widthPercent = (props.node.attrs['widthPercent'] as number | null) ?? null;
    this.wrap = (props.node.attrs['wrap'] as WrapMode) ?? 'none';

    this.dom = el('span', 'wysiwyg-image');
    this.dom.contentEditable = 'false';
    this.dom.draggable = false;

    this.img = el('img', 'wysiwyg-image__img');
    this.img.src = String(props.node.attrs['src'] ?? '');
    this.img.alt = String(props.node.attrs['alt'] ?? '');

    this.bar = this.buildControlBar();
    const editBtn = this.buildEditButton();
    const handles = this.buildHandles();

    // Elementy, których zdarzenia obsługujemy sami — patrz `stopEvent`.
    this.controls = [this.bar, editBtn, handles];

    this.dom.append(this.img, editBtn, handles, this.bar);
    this.applyStyles();
  }

  private controls: HTMLElement[] = [];

  // --- sterowanie z klawiatury ---

  /**
   * Pasek kontrolek jest RÓWNOWAŻNIKIEM przeciągania dla osób, które nie używają myszy.
   *
   * Bez niego zmiana rozmiaru i oblewania byłaby dostępna wyłącznie wskaźnikiem, co łamie
   * SC 2.1.1 Keyboard — kryterium poziomu A. Przyciski są zwykłymi `<button>`, więc trafiają
   * do kolejności Tab, gdy obraz jest zaznaczony.
   */
  private buildControlBar(): HTMLElement {
    const bar = el('span', 'wysiwyg-image__bar');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', this.msg.imageToolbarLabel);

    for (const step of WIDTH_STEPS) {
      const label = step === null ? this.msg.imageWidthAuto : this.msg.imageWidth(step);
      const b = el('button', 'wysiwyg-image__btn', step === null ? 'auto' : `${step}%`);
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.title = label;
      b.addEventListener('mousedown', (e) => e.stopPropagation());
      b.addEventListener('click', () => this.setWidth(step, true));
      bar.append(b);
    }

    const wrapModes: readonly [WrapMode, keyof WysiwygMessages][] = [
      ['left', 'imageWrapLeft'],
      ['none', 'imageWrapNone'],
      ['right', 'imageWrapRight'],
    ];
    for (const [mode, key] of wrapModes) {
      const label = this.msg[key] as string;
      const b = el('button', 'wysiwyg-image__btn wysiwyg-image__btn--wrap', mode === 'none' ? '—' : mode === 'left' ? '⇤' : '⇥');
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.title = label;
      // `aria-pressed` niesie stan dla technologii asystujących — wizualnie sygnalizuje
      // go wypełnienie przycisku.
      b.setAttribute('aria-pressed', String(this.wrap === mode));
      b.dataset['wrap'] = mode;
      b.addEventListener('mousedown', (e) => e.stopPropagation());
      b.addEventListener('click', () => this.setWrap(mode));
      bar.append(b);
    }

    return bar;
  }

  /**
   * Ikona edycji w rogu obrazu — otwiera formularz tekstu alternatywnego.
   *
   * Zamiast dublować formularz, zamieniamy obraz na węzeł `imageUpload` w trybie edycji:
   * to dokładnie ten sam formularz, który pojawia się po wgraniu pliku. Szerokość
   * i oblewanie przekazujemy dalej, żeby edycja opisu ich nie kasowała.
   */
  private buildEditButton(): HTMLElement {
    const btn = el('button', 'wysiwyg-image__edit');
    btn.type = 'button';
    btn.setAttribute('aria-label', this.msg.imageEditAlt);
    btn.title = this.msg.imageEditAlt;

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'currentColor');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    // Ołówek — Lucide `pencil`, przerysowany jako wypełnienie dla spójności z resztą ikon.
    path.setAttribute(
      'd',
      'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497zM15 5l4 4',
    );
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    icon.append(path);
    btn.append(icon);

    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', () => this.openAltEditor());
    return btn;
  }

  private openAltEditor(): void {
    const pos = this.props.getPos();
    if (pos === undefined) {
      return;
    }
    const alt = this.img.getAttribute('alt') ?? '';
    this.props.editor
      .chain()
      .focus()
      .insertContentAt(
        { from: pos, to: pos + 1 },
        {
          type: 'imageUpload',
          attrs: {
            src: this.img.getAttribute('src'),
            alt,
            // Pusty `alt` na istniejącym obrazie oznacza świadomą decyzję „dekoracyjny".
            decorative: alt === '',
            widthPercent: this.widthPercent,
            wrap: this.wrap,
          },
        },
      )
      .run();
  }

  // --- przeciąganie (wyłącznie dla wskaźnika) ---

  private buildHandles(): HTMLElement {
    const group = el('span', 'wysiwyg-image__handles');
    // Uchwyty są CZYSTO wizualne i `aria-hidden`: dla klawiatury równoważnikiem jest pasek
    // kontrolek. Obszar chwytania ma 24×24 px (SC 2.5.8), choć widoczna kropka jest mniejsza.
    group.setAttribute('aria-hidden', 'true');

    for (const corner of ['nw', 'ne', 'sw', 'se'] as const) {
      const h = el('span', `wysiwyg-image__handle wysiwyg-image__handle--${corner}`);
      h.addEventListener('pointerdown', (e) => this.startDrag(e, corner));
      group.append(h);
    }
    return group;
  }

  private startDrag(event: PointerEvent, corner: 'nw' | 'ne' | 'sw' | 'se'): void {
    event.preventDefault();
    event.stopPropagation();

    const container = this.dom.parentElement;
    if (!container) {
      return;
    }
    // Szerokość CONTENT BOXU, nie ramki elementu.
    //
    // `getBoundingClientRect().width` obejmuje padding, a `width: X%` rozwiązuje się
    // względem content boxu. W wariancie „kartki" obszar edycji ma po 4rem paddingu
    // z każdej strony, więc liczenie z ramki dawało zawyżony procent i obraz wychodził
    // poza stronę.
    const cs = getComputedStyle(container);
    const containerWidth =
      container.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
    if (containerWidth <= 0) {
      return;
    }
    const startX = event.clientX;
    const startWidth = this.img.getBoundingClientRect().width;
    const growsRight = corner === 'ne' || corner === 'se';

    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);

    const onMove = (e: PointerEvent) => {
      const delta = (e.clientX - startX) * (growsRight ? 1 : -1);
      const percent = ((startWidth + delta) / containerWidth) * 100;
      this.widthPercent = Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, Math.round(percent)));
      this.applyStyles();
    };

    const onUp = () => {
      handle.releasePointerCapture(event.pointerId);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      // Transakcję zapisujemy DOPIERO na koniec przeciągania — inaczej każdy ruch myszy
      // byłby osobnym krokiem w historii cofania.
      this.commitAttrs();
      this.announce(this.msg.announceImageWidth(this.widthPercent ?? MAX_PERCENT));
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }

  // --- wspólne ---

  private setWidth(percent: number | null, announce: boolean): void {
    this.widthPercent = percent;
    this.applyStyles();
    this.commitAttrs();
    if (announce) {
      this.announce(percent === null ? this.msg.imageWidthAuto : this.msg.announceImageWidth(percent));
    }
  }

  private setWrap(mode: WrapMode): void {
    this.wrap = mode;
    this.applyStyles();
    this.commitAttrs();
    this.syncWrapButtons();
    const label =
      mode === 'left' ? this.msg.imageWrapLeft : mode === 'right' ? this.msg.imageWrapRight : this.msg.imageWrapNone;
    this.announce(this.msg.announceImageWrap(label));
  }

  private applyStyles(): void {
    // Szerokość ustawiamy na KONTENERZE, nie na obrazie.
    //
    // Wcześniej `width: 50%` siedziało na `<img>`, a procent rozwiązuje się względem
    // kontenera — który sam kurczył się do zawartości. Powstawało błędne koło: kontener
    // zostawał przy naturalnej szerokości obrazu, obraz stawał się jej połową, a uchwyty
    // i przycisk edycji — pozycjonowane względem kontenera — lądowały obok obrazu.
    // Przy okazji `float` na kontenerze o pełnej szerokości nie mógł oblać się tekstem.
    this.dom.style.width = this.widthPercent === null ? '' : `${this.widthPercent}%`;
    this.dom.style.float = this.wrap === 'none' ? '' : this.wrap;
    this.dom.classList.toggle('wysiwyg-image--wrapped', this.wrap !== 'none');
  }

  private commitAttrs(): void {
    const pos = this.props.getPos();
    if (pos === undefined) {
      return;
    }
    this.props.editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeAttribute(pos, 'widthPercent', this.widthPercent);
        tr.setNodeAttribute(pos, 'wrap', this.wrap);
        // Zaznaczenie węzła trzeba PRZYWRÓCIĆ.
        //
        // Kliknięcie kontrolki przenosi fokus na przycisk i ProseMirror gubi zaznaczenie
        // obrazu — a wtedy znikają uchwyty i nie da się wykonać drugiej zmiany z rzędu
        // (np. ustawić szerokości, a zaraz potem oblewania).
        tr.setSelection(NodeSelection.create(tr.doc, pos));
        return true;
      })
      .run();
  }

  /**
   * Aktualizacja W MIEJSCU zamiast przebudowy widoku.
   *
   * Bez tej metody ProseMirror niszczy node view przy każdej zmianie atrybutu i tworzy go
   * od nowa — a wtedy przycisk, który właśnie kliknięto, przestaje istnieć i fokus przepada.
   * Objawiało się to tak, że po ustawieniu szerokości nie dało się kliknąć oblewania.
   */
  update(node: { type: { name: string }; attrs: Record<string, unknown> }): boolean {
    if (node.type.name !== 'image') {
      return false;
    }
    this.widthPercent = (node.attrs['widthPercent'] as number | null) ?? null;
    this.wrap = (node.attrs['wrap'] as WrapMode) ?? 'none';
    this.img.src = String(node.attrs['src'] ?? '');
    this.img.alt = String(node.attrs['alt'] ?? '');
    this.applyStyles();
    this.syncWrapButtons();
    return true;
  }

  private syncWrapButtons(): void {
    for (const b of this.bar.querySelectorAll<HTMLElement>('[data-wrap]')) {
      b.setAttribute('aria-pressed', String(b.dataset['wrap'] === this.wrap));
    }
  }

  selectNode(): void {
    this.dom.classList.add('wysiwyg-image--selected');
  }

  deselectNode(): void {
    this.dom.classList.remove('wysiwyg-image--selected');
  }

  /**
   * Zdarzenia z KONTROLEK obsługujemy sami; wszystko inne musi trafić do ProseMirror.
   *
   * Wcześniej metoda zwracała `true` niemal zawsze, więc ProseMirror nigdy nie zobaczył
   * kliknięcia w obraz i nie tworzył zaznaczenia węzła. Skutek: kliknięcie obrazu nie
   * zaznaczało go, `selectNode()` się nie wywoływało, a pasek rozmiaru w ogóle się nie
   * pokazywał.
   */
  stopEvent(event: Event): boolean {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return false;
    }
    return this.controls.some((c) => c === target || c.contains(target));
  }

  ignoreMutation(): boolean {
    return true;
  }
}
