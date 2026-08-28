import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { CdkConnectedOverlay, type ConnectedPosition } from '@angular/cdk/overlay';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { WysiwygIconComponent } from '../icons/wysiwyg-icon.component';
import { WysiwygToolbarItem } from '../a11y/toolbar-item';
import { nextWysiwygId } from '../a11y/wysiwyg-id';
import type { WysiwygMessages } from '../config/wysiwyg-messages';
import type { WysiwygTableConfig } from '../config/wysiwyg-config.model';

/** Operacje na istniejącej tabeli. Odwzorowują komendy `@tiptap/extension-table`. */
export type WysiwygTableAction =
  | 'addRowBefore'
  | 'addRowAfter'
  | 'deleteRow'
  | 'addColumnBefore'
  | 'addColumnAfter'
  | 'deleteColumn'
  | 'toggleHeaderRow'
  | 'toggleHeaderColumn'
  | 'deleteTable';

export interface TableInsertEvent {
  readonly rows: number;
  readonly cols: number;
  readonly withHeaderRow: boolean;
  readonly withHeaderColumn: boolean;
  readonly caption: string;
}

/**
 * Warianty z `originX: 'end'` nie są ozdobnikiem: panel jest szeroki, a przycisk tabeli
 * stoi po prawej stronie paska. Bez nich formularz wychodził poza prawą krawędź okna
 * i pola po prostu znikały.
 */
const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
];

/**
 * Wstawianie tabeli o zadanej liczbie wierszy i kolumn oraz edycja tabeli pod kursorem.
 *
 * Świadomie NIE jest to popularna siatka „najedź i wybierz 4×3": jej komórki mają około
 * 16 px, czyli poniżej progu SC 2.5.8 Target Size (24 px), a wybór rozmiaru zależy tam od
 * precyzyjnego ruchu wskaźnikiem. Pola liczbowe działają tak samo myszą, klawiaturą
 * i sterowaniem głosem — i pozwalają podać rozmiar, którego siatka by nie objęła.
 *
 * Panel edycji zostaje OTWARTY po każdej operacji: dodawanie kolejnych wierszy wymagałoby
 * inaczej ponownego otwierania menu, a kursor i tak zostaje w komórce, więc następna
 * komenda ma na czym działać.
 */
@Component({
  selector: 'wysiwyg-table-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkConnectedOverlay, CdkTrapFocus, WysiwygIconComponent],
  providers: [{ provide: WysiwygToolbarItem, useExisting: WysiwygTableButtonComponent }],
  template: `
    <button
      #trigger
      type="button"
      class="wysiwyg-btn"
      [attr.tabindex]="tabIndex()"
      [attr.aria-label]="label()"
      [attr.title]="label()"
      aria-haspopup="dialog"
      [attr.aria-expanded]="open()"
      [attr.aria-disabled]="disabledState() ? 'true' : null"
      [class.wysiwyg-btn--active]="open() || inTable()"
      (click)="toggle()"
    >
      <wysiwyg-icon name="table" />
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="triggerEl()"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      cdkConnectedOverlayHasBackdrop
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      (backdropClick)="close(false)"
      (detach)="close(false)"
    >
      <div
        class="wysiwyg-popover wysiwyg-popover--table"
        role="dialog"
        aria-modal="false"
        [attr.aria-label]="label()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        (keydown)="onKeydown($event)"
      >
        @if (!inTable()) {
          <div class="wysiwyg-table-form">
            <div class="wysiwyg-table-form__row">
              <div class="wysiwyg-table-form__field">
                <label class="wysiwyg-popover__label" [for]="rowsId">{{ messages().tableRowsLabel }}</label>
                <input
                  #rowsInput
                  class="wysiwyg-popover__input wysiwyg-popover__input--number"
                  type="number"
                  inputmode="numeric"
                  step="1"
                  min="1"
                  [id]="rowsId"
                  [max]="config().maxRows"
                  [value]="rows() ?? ''"
                  [attr.aria-invalid]="sizeInvalid() ? 'true' : null"
                  [attr.aria-describedby]="sizeInvalid() ? errorId : null"
                  (input)="rows.set(toNumber($event))"
                />
              </div>
              <div class="wysiwyg-table-form__field">
                <label class="wysiwyg-popover__label" [for]="colsId">{{ messages().tableColsLabel }}</label>
                <input
                  class="wysiwyg-popover__input wysiwyg-popover__input--number"
                  type="number"
                  inputmode="numeric"
                  step="1"
                  min="1"
                  [id]="colsId"
                  [max]="config().maxCols"
                  [value]="cols() ?? ''"
                  [attr.aria-invalid]="sizeInvalid() ? 'true' : null"
                  [attr.aria-describedby]="sizeInvalid() ? errorId : null"
                  (input)="cols.set(toNumber($event))"
                />
              </div>
            </div>

            <label class="wysiwyg-popover__check">
              <input type="checkbox" [checked]="headerRow()" (change)="headerRow.set(isChecked($event))" />
              <span>{{ messages().tableHeaderRow }}</span>
            </label>
            <label class="wysiwyg-popover__check">
              <input type="checkbox" [checked]="headerColumn()" (change)="headerColumn.set(isChecked($event))" />
              <span>{{ messages().tableHeaderColumn }}</span>
            </label>

            <label class="wysiwyg-popover__label" [for]="captionId">{{ messages().tableCaptionLabel }}</label>
            <input
              #captionInput
              class="wysiwyg-popover__input"
              type="text"
              [id]="captionId"
              [value]="caption()"
              [attr.aria-describedby]="captionDescribedBy()"
              [attr.aria-invalid]="captionInvalid() ? 'true' : null"
              (input)="caption.set(toText($event))"
            />
            <p class="wysiwyg-popover__hint" [id]="captionHintId">{{ messages().tableCaptionHint }}</p>

            @if (errorMessage(); as error) {
              <p class="wysiwyg-popover__error" role="alert" [id]="errorId">{{ error }}</p>
            }

            <div class="wysiwyg-popover__actions">
              <button
                type="button"
                class="wysiwyg-popover__btn wysiwyg-popover__btn--primary"
                (click)="submitInsert()"
              >
                {{ messages().tableInsertSubmit }}
              </button>
              <button type="button" class="wysiwyg-popover__btn" (click)="close(true)">
                {{ messages().cancel }}
              </button>
            </div>
          </div>
        } @else {
          <div class="wysiwyg-table-form">
            <label class="wysiwyg-popover__label" [for]="captionId">{{ messages().tableCaptionLabel }}</label>
            <div class="wysiwyg-table-form__row">
              <input
                #captionInput
                class="wysiwyg-popover__input"
                type="text"
                [id]="captionId"
                [value]="caption()"
                [attr.aria-describedby]="captionDescribedBy()"
                [attr.aria-invalid]="captionInvalid() ? 'true' : null"
                (input)="caption.set(toText($event))"
              />
              <button type="button" class="wysiwyg-popover__btn" (click)="submitCaption()">
                {{ messages().tableCaptionApply }}
              </button>
            </div>
            <p class="wysiwyg-popover__hint" [id]="captionHintId">{{ messages().tableCaptionHint }}</p>

            @if (errorMessage(); as error) {
              <p class="wysiwyg-popover__error" role="alert" [id]="errorId">{{ error }}</p>
            }

            <div role="group" class="wysiwyg-table-form__group" [attr.aria-label]="messages().tableGroupRows">
              <button type="button" class="wysiwyg-popover__btn" (click)="act('addRowBefore')">
                {{ messages().tableAddRowBefore }}
              </button>
              <button type="button" class="wysiwyg-popover__btn" (click)="act('addRowAfter')">
                {{ messages().tableAddRowAfter }}
              </button>
              <button type="button" class="wysiwyg-popover__btn" (click)="act('deleteRow')">
                {{ messages().tableDeleteRow }}
              </button>
            </div>

            <div role="group" class="wysiwyg-table-form__group" [attr.aria-label]="messages().tableGroupColumns">
              <button type="button" class="wysiwyg-popover__btn" (click)="act('addColumnBefore')">
                {{ messages().tableAddColumnBefore }}
              </button>
              <button type="button" class="wysiwyg-popover__btn" (click)="act('addColumnAfter')">
                {{ messages().tableAddColumnAfter }}
              </button>
              <button type="button" class="wysiwyg-popover__btn" (click)="act('deleteColumn')">
                {{ messages().tableDeleteColumn }}
              </button>
            </div>

            <div role="group" class="wysiwyg-table-form__group" [attr.aria-label]="messages().tableGroupHeaders">
              <button
                type="button"
                class="wysiwyg-popover__btn"
                [attr.aria-pressed]="headerRow()"
                (click)="act('toggleHeaderRow')"
              >
                {{ messages().tableToggleHeaderRow }}
              </button>
              <button
                type="button"
                class="wysiwyg-popover__btn"
                [attr.aria-pressed]="headerColumn()"
                (click)="act('toggleHeaderColumn')"
              >
                {{ messages().tableToggleHeaderColumn }}
              </button>
            </div>

            <p class="wysiwyg-popover__hint">{{ messages().tableKeyboardHint }}</p>

            <div class="wysiwyg-popover__actions">
              <button
                type="button"
                class="wysiwyg-popover__btn wysiwyg-popover__btn--danger"
                (click)="deleteTable()"
              >
                {{ messages().tableDelete }}
              </button>
              <button type="button" class="wysiwyg-popover__btn" (click)="close(true)">
                {{ messages().tableClose }}
              </button>
            </div>
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class WysiwygTableButtonComponent extends WysiwygToolbarItem {
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly messages = input.required<WysiwygMessages>();
  readonly config = input.required<WysiwygTableConfig>();
  /** Kursor stoi w tabeli → panel przechodzi z trybu wstawiania w tryb edycji. */
  readonly inTable = input(false);
  readonly currentCaption = input('');
  readonly currentHeaderRow = input(false);
  readonly currentHeaderColumn = input(false);
  readonly disabledState = input(false);

  readonly insertTable = output<TableInsertEvent>();
  readonly tableAction = output<WysiwygTableAction>();
  readonly captionApplied = output<string>();

  protected readonly positions = POSITIONS;
  protected readonly rowsId = nextWysiwygId('table-rows');
  protected readonly colsId = nextWysiwygId('table-cols');
  protected readonly captionId = nextWysiwygId('table-caption');
  protected readonly captionHintId = nextWysiwygId('table-caption-hint');
  protected readonly errorId = nextWysiwygId('table-error');

  private readonly triggerRef = viewChildren<ElementRef<HTMLButtonElement>>('trigger');
  private readonly rowsRef = viewChild<ElementRef<HTMLInputElement>>('rowsInput');
  private readonly captionRef = viewChild<ElementRef<HTMLInputElement>>('captionInput');

  private readonly _open = signal(false);
  protected readonly open = this._open.asReadonly();

  /**
   * `null` oznacza puste pole, a nie zero.
   *
   * `valueAsNumber` daje `NaN`, kiedy użytkownik wyczyści pole liczbowe — wstawienie tego
   * z powrotem w `[value]` daje ostrzeżenie „The specified value NaN cannot be parsed"
   * i pole, którego nie da się już poprawić.
   */
  protected readonly rows = signal<number | null>(3);
  protected readonly cols = signal<number | null>(3);
  protected readonly headerRow = signal(true);
  protected readonly headerColumn = signal(false);
  protected readonly caption = signal('');

  private readonly _errorMessage = signal<string | null>(null);
  protected readonly errorMessage = this._errorMessage.asReadonly();
  private readonly _invalidField = signal<'size' | 'caption' | null>(null);
  protected readonly sizeInvalid = computed(() => this._invalidField() === 'size');
  protected readonly captionInvalid = computed(() => this._invalidField() === 'caption');

  private readonly _tabIndex = signal<0 | -1>(-1);
  protected readonly tabIndex = this._tabIndex.asReadonly();

  protected readonly triggerEl = computed(() => this.triggerRef()[0] ?? this.elementRef);

  /**
   * Ta sama kontrolka, dwie nazwy — bo robi dwie różne rzeczy. `title` jest identyczny
   * z `aria-label` (SC 2.5.3): użytkownik sterowania głosem mówi to, co widzi w tooltipie.
   */
  protected readonly label = computed(() =>
    this.inTable() ? this.messages().editTable : this.messages().insertTable,
  );

  protected readonly captionDescribedBy = computed(() =>
    [this.captionHintId, this.captionInvalid() ? this.errorId : null].filter(Boolean).join(' '),
  );

  constructor() {
    super();
    // Stan nagłówków przychodzi z dokumentu — przyciski `aria-pressed` muszą go odbijać
    // także wtedy, gdy zmieni go coś innego niż ten panel (np. cofnięcie zmiany).
    effect(() => {
      this.headerRow.set(this.inTable() ? this.currentHeaderRow() : this.config().withHeaderRow);
      this.headerColumn.set(
        this.inTable() ? this.currentHeaderColumn() : this.config().withHeaderColumn,
      );
    });
  }

  override setTabIndex(value: 0 | -1): void {
    this._tabIndex.set(value);
  }

  override focus(): void {
    this.triggerEl().nativeElement.focus();
  }

  protected toggle(): void {
    if (this.disabledState()) {
      return;
    }
    if (this._open()) {
      this.close(true);
      return;
    }
    this.resetDraft();
    this._open.set(true);
  }

  protected close(returnFocus: boolean): void {
    if (!this._open()) {
      return;
    }
    this._open.set(false);
    this.clearError();
    if (returnFocus) {
      this.focus();
    }
  }

  /** SC 3.3.7 Redundant Entry — w trybie edycji nie każemy przepisywać istniejącego tytułu. */
  private resetDraft(): void {
    const cfg = this.config();
    this.rows.set(cfg.defaultRows);
    this.cols.set(cfg.defaultCols);
    this.caption.set(this.inTable() ? this.currentCaption() : '');
    this.clearError();
  }

  protected submitInsert(): void {
    const cfg = this.config();
    const rows = Math.trunc(this.rows() ?? NaN);
    const cols = Math.trunc(this.cols() ?? NaN);

    if (
      !Number.isFinite(rows) ||
      !Number.isFinite(cols) ||
      rows < 1 ||
      cols < 1 ||
      rows > cfg.maxRows ||
      cols > cfg.maxCols
    ) {
      this.fail('size', this.messages().tableSizeInvalid(cfg.maxRows, cfg.maxCols), this.rowsRef());
      return;
    }

    const caption = this.caption().trim();
    if (cfg.requireCaption && !caption) {
      this.fail('caption', this.messages().tableCaptionRequired, this.captionRef());
      return;
    }

    this.clearError();
    this.insertTable.emit({
      rows,
      cols,
      withHeaderRow: this.headerRow(),
      withHeaderColumn: this.headerColumn(),
      caption,
    });
    // Fokus wraca do treści razem z kursorem postawionym w pierwszej komórce, więc panel
    // zamykamy BEZ przywracania fokusu na trigger.
    this.close(false);
  }

  protected submitCaption(): void {
    const caption = this.caption().trim();
    if (this.config().requireCaption && !caption) {
      this.fail('caption', this.messages().tableCaptionRequired, this.captionRef());
      return;
    }
    this.clearError();
    this.captionApplied.emit(caption);
  }

  protected act(action: WysiwygTableAction): void {
    this.clearError();
    this.tableAction.emit(action);
  }

  protected deleteTable(): void {
    this.tableAction.emit('deleteTable');
    this.close(false);
  }

  /** Błąd blokujący: komunikat w `role="alert"`, `aria-invalid` i fokus na polu (SC 3.3.1). */
  private fail(field: 'size' | 'caption', message: string, target?: ElementRef<HTMLInputElement>): void {
    this._invalidField.set(field);
    this._errorMessage.set(message);
    target?.nativeElement.focus();
  }

  private clearError(): void {
    this._invalidField.set(null);
    this._errorMessage.set(null);
  }

  protected toNumber(event: Event): number | null {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    return Number.isFinite(value) ? value : null;
  }

  protected toText(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      // Bez `stopPropagation` Escape poszedłby dalej do toolbara i zabrał fokus do treści.
      event.stopPropagation();
      this.close(true);
      return;
    }
    if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') {
      event.preventDefault();
      if (this.inTable()) {
        this.submitCaption();
      } else {
        this.submitInsert();
      }
    }
  }
}
