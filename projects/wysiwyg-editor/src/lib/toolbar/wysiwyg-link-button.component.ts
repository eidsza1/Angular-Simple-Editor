import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
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

const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

/** Dopuszczamy wyłącznie protokoły bezpieczne — `javascript:` nie ma tu wstępu. */
const SAFE_URL_RE = /^(https?:\/\/|mailto:|\/|#)/i;

export interface LinkSubmitEvent {
  readonly href: string;
}

/**
 * Wstawianie i edycja odnośnika.
 *
 * Popover, nie modal: nie przerywa pracy, a `cdkTrapFocus` i tak zamyka fokus w środku na
 * czas edycji. Escape zamyka i przywraca fokus na przycisk (SC 2.1.2).
 */
@Component({
  selector: 'wysiwyg-link-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkConnectedOverlay, CdkTrapFocus, WysiwygIconComponent],
  providers: [{ provide: WysiwygToolbarItem, useExisting: WysiwygLinkButtonComponent }],
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
      [class.wysiwyg-btn--active]="active() || open()"
      (click)="toggle()"
    >
      <wysiwyg-icon name="link" />
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
        class="wysiwyg-popover"
        role="dialog"
        aria-modal="false"
        [attr.aria-label]="label()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        (keydown)="onKeydown($event)"
      >
        <label class="wysiwyg-popover__label" [for]="inputId">{{ urlLabel() }}</label>
        <input
          #urlInput
          class="wysiwyg-popover__input"
          type="url"
          inputmode="url"
          [id]="inputId"
          [value]="draft()"
          [attr.aria-invalid]="invalid() ? 'true' : null"
          [attr.aria-describedby]="invalid() ? errorId : null"
          (input)="draft.set($any($event.target).value)"
        />
        @if (invalid()) {
          <p class="wysiwyg-popover__error" role="alert" [id]="errorId">{{ invalidMessage() }}</p>
        }
        <div class="wysiwyg-popover__actions">
          <button type="button" class="wysiwyg-popover__btn wysiwyg-popover__btn--primary" (click)="submit()">
            {{ applyLabel() }}
          </button>
          @if (active()) {
            <button type="button" class="wysiwyg-popover__btn" (click)="removeLink()">{{ removeLabel() }}</button>
          }
          <button type="button" class="wysiwyg-popover__btn" (click)="close(true)">{{ cancelLabel() }}</button>
        </div>
      </div>
    </ng-template>
  `,
})
export class WysiwygLinkButtonComponent extends WysiwygToolbarItem {
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly label = input.required<string>();
  readonly urlLabel = input.required<string>();
  readonly applyLabel = input.required<string>();
  readonly removeLabel = input.required<string>();
  readonly cancelLabel = input.required<string>();
  readonly invalidMessage = input.required<string>();
  readonly active = input(false);
  readonly currentHref = input<string>('');
  readonly disabledState = input(false);

  readonly applyLink = output<LinkSubmitEvent>();
  readonly removeRequested = output<void>();

  protected readonly positions = POSITIONS;
  protected readonly inputId = nextWysiwygId('link-url');
  protected readonly errorId = nextWysiwygId('link-error');

  private readonly triggerRef = viewChildren<ElementRef<HTMLButtonElement>>('trigger');
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('urlInput');

  private readonly _open = signal(false);
  protected readonly open = this._open.asReadonly();
  protected readonly draft = signal('');
  private readonly _invalid = signal(false);
  protected readonly invalid = this._invalid.asReadonly();

  private readonly _tabIndex = signal<0 | -1>(-1);
  protected readonly tabIndex = this._tabIndex.asReadonly();

  protected readonly triggerEl = computed(() => this.triggerRef()[0] ?? this.elementRef);

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
    // SC 3.3.7 Redundant Entry — przy edycji istniejącego odnośnika nie każemy przepisywać URL.
    this.draft.set(this.currentHref());
    this._invalid.set(false);
    this._open.set(true);
  }

  protected close(returnFocus: boolean): void {
    if (!this._open()) {
      return;
    }
    this._open.set(false);
    if (returnFocus) {
      this.focus();
    }
  }

  protected submit(): void {
    const href = this.draft().trim();
    if (!SAFE_URL_RE.test(href)) {
      this._invalid.set(true);
      // Fokus wraca na pole z błędem — SC 3.3.1 i 3.3.3.
      this.inputRef()?.nativeElement.focus();
      return;
    }
    this._invalid.set(false);
    this.applyLink.emit({ href });
    this.close(true);
  }

  protected removeLink(): void {
    this.removeRequested.emit();
    this.close(true);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close(true);
      return;
    }
    if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') {
      event.preventDefault();
      this.submit();
    }
  }
}
