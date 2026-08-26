import { Node, type Editor } from '@tiptap/core';
import type { NodeView } from '@tiptap/pm/view';

interface NodeViewProps {
  readonly editor: Editor;
  readonly getPos: () => number | undefined;
  readonly node: { attrs: Record<string, unknown> };
}
import type { WysiwygImageConfig } from '../config/wysiwyg-config.model';
import type { WysiwygMessages } from '../config/wysiwyg-messages';

export interface ImageUploadOptions {
  config: WysiwygImageConfig | null;
  messages: WysiwygMessages | null;
  announce: ((message: string) => void) | null;
}

const MB = 1_000_000;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  // KAŻDY element wewnątrz węzła dostaje `draggable="false"`.
  //
  // Gdy węzeł atomowy jest zaznaczony — a jest, zaraz po wstawieniu — ProseMirror ustawia
  // na jego kontenerze `draggable="true"`. W Chrome `mousedown` na potomku elementu
  // przeciągalnego ROZPOCZYNA PRZECIĄGANIE i kliknięcie nigdy nie dochodzi do skutku,
  // więc etykieta wyboru pliku przestaje działać. Safari stosuje inną heurystykę i tam
  // problem się nie ujawniał.
  node.draggable = false;
  return node;
}


const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(viewBox: string, className: string, paths: { d: string; opacity?: string; stroke?: boolean }[]): SVGElement {
  const node = document.createElementNS(SVG_NS, 'svg');
  node.setAttribute('viewBox', viewBox);
  node.setAttribute('fill', 'currentColor');
  node.setAttribute('focusable', 'false');
  node.setAttribute('aria-hidden', 'true');
  node.setAttribute('class', className);
  for (const p of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', p.d);
    path.setAttribute('fill', 'currentColor');
    if (p.opacity) path.setAttribute('fill-opacity', p.opacity);
    if (p.stroke) {
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.5');
    }
    node.append(path);
  }
  return node;
}

/**
 * Grafika strefy upuszczania — kartka dokumentu z zawiniętym rogiem i okrągłą plakietką
 * ze strzałką w chmurze. Ścieżki pochodzą z `tiptap-ui-components` (MIT, © 2025 Tiptap).
 *
 * Całość jest CZYSTO DEKORACYJNA i oznaczona `aria-hidden` — sens niosą przycisk
 * „Kliknij, aby wgrać" i tekst z ograniczeniami, nie obrazek.
 */
function buildDropzoneArt(): HTMLElement {
  const wrap = el('div', 'wysiwyg-upload__art');
  wrap.setAttribute('aria-hidden', 'true');

  wrap.append(
    svg('0 0 43 57', 'wysiwyg-upload__art-doc', [
      {
        d: 'M0.75 10.75C0.75 5.64137 4.89137 1.5 10 1.5H32.3431C33.2051 1.5 34.0317 1.84241 34.6412 2.4519L40.2981 8.10876C40.9076 8.71825 41.25 9.5449 41.25 10.4069V46.75C41.25 51.8586 37.1086 56 32 56H10C4.89137 56 0.75 51.8586 0.75 46.75V10.75Z',
        opacity: '0.11',
        stroke: true,
      },
    ]),
    svg('0 0 10 10', 'wysiwyg-upload__art-corner', [
      {
        d: 'M0 0.75H0.343146C1.40401 0.75 2.42143 1.17143 3.17157 1.92157L8.82843 7.57843C9.57857 8.32857 10 9.34599 10 10.4069V10.75H4C1.79086 10.75 0 8.95914 0 6.75V0.75Z',
      },
    ]),
  );

  const badge = el('span', 'wysiwyg-upload__art-badge');
  badge.append(
    svg('0 0 24 24', 'wysiwyg-upload__art-cloud', [
      {
        d: 'M11.1953 4.41771C10.3478 4.08499 9.43578 3.94949 8.5282 4.02147C7.62062 4.09345 6.74133 4.37102 5.95691 4.83316C5.1725 5.2953 4.50354 5.92989 4.00071 6.68886C3.49788 7.44783 3.17436 8.31128 3.05465 9.2138C2.93495 10.1163 3.0222 11.0343 3.3098 11.8981C3.5974 12.7619 4.07781 13.5489 4.71463 14.1995C5.10094 14.5942 5.09414 15.2274 4.69945 15.6137C4.30476 16 3.67163 15.9932 3.28532 15.5985C2.43622 14.731 1.79568 13.6816 1.41221 12.5299C1.02875 11.3781 0.91241 10.1542 1.07201 8.95084C1.23162 7.74748 1.66298 6.59621 2.33343 5.58425C3.00387 4.57229 3.89581 3.72617 4.9417 3.10998C5.98758 2.4938 7.15998 2.1237 8.37008 2.02773C9.58018 1.93176 10.7963 2.11243 11.9262 2.55605C13.0561 2.99968 14.0703 3.69462 14.8919 4.58825C15.5423 5.29573 16.0585 6.11304 16.4177 7.00002H17.4999C18.6799 6.99991 19.8288 7.37933 20.7766 8.08222C21.7245 8.78515 22.4212 9.7743 22.7637 10.9036C23.1062 12.0328 23.0765 13.2423 22.6788 14.3534C22.2812 15.4644 21.5367 16.4181 20.5554 17.0736C20.0962 17.3803 19.4752 17.2567 19.1684 16.7975C18.8617 16.3382 18.9853 15.7172 19.4445 15.4105C20.069 14.9934 20.5427 14.3865 20.7958 13.6794C21.0488 12.9724 21.0678 12.2027 20.8498 11.4841C20.6318 10.7655 20.1885 10.136 19.5853 9.6887C18.9821 9.24138 18.251 8.99993 17.5001 9.00002H15.71C15.2679 9.00002 14.8783 8.70973 14.7518 8.28611C14.4913 7.41374 14.0357 6.61208 13.4195 5.94186C12.8034 5.27164 12.0427 4.75043 11.1953 4.41771Z',
      },
      {
        d: 'M11 14.4142V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V14.4142L15.2929 16.7071C15.6834 17.0976 16.3166 17.0976 16.7071 16.7071C17.0976 16.3166 17.0976 15.6834 16.7071 15.2929L12.7078 11.2936C12.7054 11.2912 12.703 11.2888 12.7005 11.2864C12.5208 11.1099 12.2746 11.0008 12.003 11L12 11L11.997 11C11.8625 11.0004 11.7343 11.0273 11.6172 11.0759C11.502 11.1236 11.3938 11.1937 11.2995 11.2864C11.297 11.2888 11.2946 11.2912 11.2922 11.2936L7.29289 15.2929C6.90237 15.6834 6.90237 16.3166 7.29289 16.7071C7.68342 17.0976 8.31658 17.0976 8.70711 16.7071L11 14.4142Z',
      },
    ]),
  );
  wrap.append(badge);
  return wrap;
}

/**
 * Węzeł-kontener wstawiany w miejscu kursora, w którym użytkownik wybiera plik, a potem
 * uzupełnia tekst alternatywny. Po zatwierdzeniu podmienia się na zwykły `image`.
 *
 * Decyzje dostępnościowe:
 *  - Wrapper ma `contenteditable="false"` — inaczej kursor tekstowy wchodziłby pomiędzy
 *    kontrolki, a ProseMirror próbowałby edytować ich zawartość.
 *  - Kontrolki to prawdziwe `<button>`, `<input>` i `<label for>`, nie klikalne `<div>`.
 *  - Tekst alternatywny jest WYMAGANY albo trzeba jawnie zaznaczyć „obraz dekoracyjny";
 *    trzeciej drogi nie ma (SC 1.1.1). Walidacja przy zatwierdzeniu przenosi fokus na pole
 *    z błędem i oznacza je `aria-invalid` (SC 3.3.1, 3.3.3).
 *  - Błędy pokazujemy jako widoczny `role="alert"` przy polu, a nie przez LiveAnnouncer —
 *    komunikat ma zostać na ekranie, nie zniknąć po odczytaniu.
 */
export const ImageUploadExtension = Node.create<ImageUploadOptions>({
  name: 'imageUpload',
  group: 'block',
  atom: true,
  draggable: false,
  selectable: true,

  addOptions() {
    return { config: null, messages: null, announce: null };
  },

  /**
   * Atrybuty pozwalają otworzyć ten sam formularz w trybie EDYCJI istniejącego obrazu.
   *
   * Dzięki temu „zmień tekst alternatywny" korzysta dokładnie z tego formularza co
   * wstawianie, zamiast dublować go drugą implementacją. Szerokość i oblewanie przechodzą
   * przez konwersję nietknięte — inaczej edycja opisu kasowałaby ustawienia rozmiaru.
   */
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      decorative: { default: false },
      widthPercent: { default: null },
      wrap: { default: 'none' },
    };
  },

  parseHTML() {
    // Świadomie nie parsujemy z HTML: to węzeł roboczy, nie treść dokumentu.
    return [];
  },

  renderHTML() {
    return ['div', { 'data-image-upload': '' }];
  },

  addNodeView() {
    return (props) => new ImageUploadView(props as unknown as NodeViewProps, this.options);
  },
});

class ImageUploadView implements NodeView {
  readonly dom: HTMLElement;

  private readonly cfg: WysiwygImageConfig;
  private readonly msg: WysiwygMessages;
  private readonly announce: (message: string) => void;

  private src: string | null = null;
  private objectUrl: string | null = null;
  private abort: AbortController | null = null;
  /** Tryb edycji istniejącego obrazu — inaczej zachowuje się przycisk drugorzędny. */
  private readonly isEditing: boolean;
  private readonly initialAlt: string;
  private readonly initialDecorative: boolean;
  private readonly widthPercent: number | null;
  private readonly wrap: string;

  private altInput?: HTMLInputElement;
  private decorativeInput?: HTMLInputElement;
  private errorBox?: HTMLElement;

  constructor(
    private readonly props: NodeViewProps,
    options: ImageUploadOptions,
  ) {
    this.cfg = options.config!;
    this.msg = options.messages!;
    this.announce = options.announce ?? (() => {});

    this.dom = el('div', 'wysiwyg-upload');
    // Bez tego ProseMirror traktowałby wnętrze jak edytowalny tekst.
    this.dom.contentEditable = 'false';
    this.dom.draggable = false;
    this.dom.setAttribute('role', 'group');
    this.dom.setAttribute('aria-label', this.msg.uploadRegionLabel);

    const attrs = props.node.attrs;
    this.src = (attrs['src'] as string | null) ?? null;
    this.initialAlt = (attrs['alt'] as string) ?? '';
    this.initialDecorative = Boolean(attrs['decorative']);
    this.widthPercent = (attrs['widthPercent'] as number | null) ?? null;
    this.wrap = (attrs['wrap'] as string) ?? 'none';
    this.isEditing = this.src !== null;

    if (this.isEditing) {
      // Obraz już istnieje — od razu pokazujemy formularz opisu, z pominięciem wyboru pliku.
      this.renderAltForm(this.src!);
    } else {
      this.renderPicker();
    }
  }

  // --- etap 1: wybór pliku ---

  private renderPicker(): void {
    this.dom.replaceChildren();
    const zone = el('div', 'wysiwyg-upload__zone');

    // Wybór pliku bez ani jednej linii JavaScriptu: natywna para `<input type="file">`
    // + `<label for>`.
    //
    // Wcześniejszy wariant wołał `fileInput.click()` z handlera przycisku i w Chrome nie
    // otwierał okna — programowe kliknięcie ukrytego inputu podlega bramce aktywacji
    // użytkownika i bywa blokowane. Etykieta powiązana `for` uruchamia wybór pliku
    // natywnie, a sam input pozostaje fokusowalny, więc Enter i Spacja też działają.
    // Mniej kodu i mniej rzeczy, które mogą się zepsuć.
    const inputId = `wysiwyg-file-${Math.trunc(performance.now())}-${Math.trunc(Math.random() * 1e6)}`;

    const fileInput = el('input');
    fileInput.type = 'file';
    fileInput.id = inputId;
    fileInput.accept = this.cfg.accept;
    fileInput.className = 'wysiwyg-upload__file';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      // Reset wartości: bez tego ponowny wybór TEGO SAMEGO pliku nie wyzwala `change`,
      // więc po nieudanej próbie użytkownik nie mógłby powtórzyć.
      fileInput.value = '';
      if (file) {
        void this.handleFile(file);
      }
    });
    // ProseMirror obsługuje `mousedown` na węzłach atomowych, żeby je zaznaczyć, i potrafi
    // zjeść zdarzenie, zanim dojdzie do kontrolki.
    fileInput.addEventListener('mousedown', (e) => e.stopPropagation());

    // Świadomie `<button>`, a NIE `<label for>`.
    //
    // Etykieta powiązana `for` jest zwykle najpewniejszym sposobem otwarcia wyboru pliku,
    // ale WEWNĄTRZ `contenteditable` Chrome nie przekazuje kliknięcia z etykiety do inputu:
    // obszar edycji przechwytuje `mousedown` na ustawienie karetki. Safari i Firefox
    // przekazują je normalnie — stąd objaw „działa wszędzie poza Chrome".
    //
    // Przycisk dostaje kliknięcie sam i jest natywnie obsługiwany klawiaturą.
    const pick = el('button', 'wysiwyg-upload__pick', this.msg.uploadClickToSelect);
    pick.type = 'button';
    pick.setAttribute('aria-describedby', `${inputId}-limits`);
    pick.addEventListener('mousedown', (e) => e.stopPropagation());
    pick.addEventListener('click', () => {
      if (typeof ngDevMode !== 'undefined' && ngDevMode) {
        console.info('[wysiwyg-editor] Kliknięto wybór pliku; otwieram okno dialogowe.');
      }
      fileInput.click();
    });

    const hint = el('span', 'wysiwyg-upload__hint', ` ${this.msg.uploadOrDragDrop}`);

    const limits = el(
      'p',
      'wysiwyg-upload__limits',
      this.msg.uploadConstraints(this.cfg.maxFiles, Math.round(this.cfg.maxFileBytes / MB)),
    );
    limits.id = `${inputId}-limits`;

    // Input MUSI sąsiadować bezpośrednio z etykietą: selektor `:focus-visible + label`
    // przenosi na nią wskaźnik fokusu, bo sam input jest niewidoczny.
    const line = el('p', 'wysiwyg-upload__line');
    line.append(fileInput, pick, hint);
    zone.append(buildDropzoneArt(), line, limits);

    // Bez uploadera jedyną drogą jest adres URL — pokazujemy to wprost, zamiast dawać
    // przycisk, który i tak nic nie zrobi.
    if (!this.cfg.upload) {
      zone.append(this.buildUrlFallback());
      fileInput.disabled = true;
      pick.disabled = true;
      pick.classList.add('wysiwyg-upload__pick--disabled');
      limits.textContent = this.msg.uploadNoUploader;
    }

    this.dom.append(zone);
    this.attachDropHandlers(zone);

    // Świadomie BEZ nasłuchu kliknięcia na całej strefie: zdarzenie z wstawienia węzła
    // potrafiło go od razu wyzwolić i okno wyboru pliku otwierało się samo, bez akcji
    // użytkownika. Wyboru dokonuje przycisk, a strefa obsługuje przeciągnij i upuść.
    zone.addEventListener('mousedown', (e) => e.stopPropagation());

    this.errorBox = el('p', 'wysiwyg-upload__error');
    this.errorBox.setAttribute('role', 'alert');
    this.dom.append(this.errorBox);
  }

  private buildUrlFallback(): HTMLElement {
    const wrap = el('div', 'wysiwyg-upload__field');
    const id = `wysiwyg-upload-url-${Math.trunc(performance.now())}`;
    const label = el('label', 'wysiwyg-upload__label', this.msg.uploadUrlLabel);
    label.htmlFor = id;
    const input = el('input', 'wysiwyg-upload__input');
    input.type = 'url';
    input.id = id;
    input.addEventListener('change', () => {
      const value = input.value.trim();
      if (value) {
        this.src = value;
        this.renderAltForm(value);
      }
    });
    wrap.append(label, input);
    return wrap;
  }

  private attachDropHandlers(zone: HTMLElement): void {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('wysiwyg-upload__zone--over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('wysiwyg-upload__zone--over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('wysiwyg-upload__zone--over');
      const file = e.dataTransfer?.files?.[0];
      if (file) void this.handleFile(file);
    });
  }

  private async handleFile(file: File): Promise<void> {
    if (file.size > this.cfg.maxFileBytes) {
      this.showError(this.msg.uploadTooLarge(Math.round(this.cfg.maxFileBytes / MB)));
      return;
    }
    if (!this.cfg.upload) {
      this.showError(this.msg.uploadNoUploader);
      return;
    }

    this.showError('');
    // Podgląd lokalny pojawia się natychmiast, żeby nie było pustego oczekiwania.
    this.objectUrl = URL.createObjectURL(file);
    this.renderAltForm(this.objectUrl, true);

    this.abort = new AbortController();
    try {
      const result = await this.cfg.upload(file, this.abort.signal);
      this.src = result.src;
      this.renderAltForm(result.src);
    } catch {
      this.showError(this.msg.uploadFailed);
      this.renderPicker();
    }
  }

  // --- etap 2: tekst alternatywny ---

  private renderAltForm(previewSrc: string, pending = false): void {
    this.dom.replaceChildren();

    const preview = el('img', 'wysiwyg-upload__preview');
    preview.src = previewSrc;
    // Podgląd jest dekoracyjny — opis dopiero powstaje w polu obok.
    preview.alt = '';
    if (pending) preview.classList.add('wysiwyg-upload__preview--pending');

    const uid = Math.trunc(performance.now());
    const altId = `wysiwyg-alt-${uid}`;
    const hintId = `wysiwyg-alt-hint-${uid}`;
    const errId = `wysiwyg-alt-err-${uid}`;
    const decoId = `wysiwyg-deco-${uid}`;

    const altLabel = el('label', 'wysiwyg-upload__label', this.msg.uploadAltLabel);
    altLabel.htmlFor = altId;

    this.altInput = el('input', 'wysiwyg-upload__input');
    this.altInput.type = 'text';
    this.altInput.id = altId;
    this.altInput.setAttribute('aria-describedby', hintId);
    // SC 3.3.7 Redundant Entry — przy edycji nie każemy przepisywać istniejącego opisu.
    this.altInput.value = this.initialAlt;

    const altHint = el('p', 'wysiwyg-upload__hint-text', this.msg.uploadAltHint);
    altHint.id = hintId;

    this.errorBox = el('p', 'wysiwyg-upload__error');
    this.errorBox.id = errId;
    this.errorBox.setAttribute('role', 'alert');

    const decoWrap = el('div', 'wysiwyg-upload__check');
    this.decorativeInput = el('input');
    this.decorativeInput.type = 'checkbox';
    this.decorativeInput.id = decoId;
    this.decorativeInput.checked = this.initialDecorative;
    this.altInput.disabled = this.initialDecorative;
    const decoLabel = el('label', '', this.msg.uploadDecorative);
    decoLabel.htmlFor = decoId;
    this.decorativeInput.addEventListener('change', () => {
      const decorative = this.decorativeInput!.checked;
      // Obraz dekoracyjny z opisem to sprzeczność — wyłączamy pole zamiast je ignorować.
      this.altInput!.disabled = decorative;
      if (decorative) this.altInput!.value = '';
    });
    decoWrap.append(this.decorativeInput, decoLabel);

    const insert = el('button', 'wysiwyg-upload__btn wysiwyg-upload__btn--primary', this.msg.uploadInsert);
    insert.type = 'button';
    insert.disabled = pending;
    insert.addEventListener('click', () => this.commit());

    // W trybie edycji drugi przycisk ANULUJE i przywraca obraz. Gdyby usuwał, użytkownik
    // straciłby zdjęcie tylko dlatego, że chciał poprawić jego opis.
    const secondaryLabel = this.isEditing ? this.msg.uploadCancel : this.msg.uploadRemove;
    const remove = el('button', 'wysiwyg-upload__btn', secondaryLabel);
    remove.type = 'button';
    remove.addEventListener('click', () => (this.isEditing ? this.restoreImage() : this.deleteSelf()));

    const actions = el('div', 'wysiwyg-upload__actions');
    actions.append(insert, remove);

    const fields = el('div', 'wysiwyg-upload__field');
    fields.append(altLabel, this.altInput, altHint, this.errorBox, decoWrap, actions);

    this.dom.append(preview, fields);
    this.altInput.focus();
  }

  private commit(): void {
    const decorative = this.decorativeInput?.checked ?? false;
    const alt = this.altInput?.value.trim() ?? '';

    if (!decorative && alt === '') {
      this.showError(this.msg.uploadAltRequired);
      this.altInput?.setAttribute('aria-invalid', 'true');
      // Fokus musi wrócić na pole, którego dotyczy błąd.
      this.altInput?.focus();
      return;
    }

    const src = this.src;
    if (!src) {
      this.showError(this.msg.uploadFailed);
      return;
    }

    const pos = this.props.getPos();
    if (pos === undefined) {
      return;
    }

    this.props.editor
      .chain()
      .focus()
      .insertContentAt(
        { from: pos, to: pos + 1 },
        {
          type: 'image',
          attrs: {
            src,
            alt: decorative ? '' : alt,
            widthPercent: this.widthPercent,
            wrap: this.wrap,
          },
        },
      )
      .run();

    this.announce(
      this.isEditing
        ? this.msg.announceAltUpdated
        : decorative
          ? this.msg.announceImageDecorative
          : this.msg.announceImageInserted(alt),
    );
  }

  /** Przywraca obraz bez zmian — wyjście z edycji opisu. */
  private restoreImage(): void {
    const pos = this.props.getPos();
    if (pos === undefined || this.src === null) {
      return;
    }
    this.props.editor
      .chain()
      .focus()
      .insertContentAt(
        { from: pos, to: pos + 1 },
        {
          type: 'image',
          attrs: {
            src: this.src,
            alt: this.initialDecorative ? '' : this.initialAlt,
            widthPercent: this.widthPercent,
            wrap: this.wrap,
          },
        },
      )
      .run();
  }

  private deleteSelf(): void {
    const pos = this.props.getPos();
    if (pos === undefined) {
      return;
    }
    this.props.editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
  }

  private showError(message: string): void {
    if (this.errorBox) {
      this.errorBox.textContent = message;
    }
    if (message === '') {
      this.altInput?.removeAttribute('aria-invalid');
    }
  }

  /** Węzeł jest atomowy i sam zarządza swoim DOM — ProseMirror nie może w niego wchodzić. */
  stopEvent(): boolean {
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy(): void {
    this.abort?.abort();
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
  }
}
