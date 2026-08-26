import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  computed,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { CdkConnectedOverlay, type ConnectedPosition } from '@angular/cdk/overlay';
import { FocusKeyManager } from '@angular/cdk/a11y';
import { WysiwygIconComponent, type WysiwygIconName } from '../icons/wysiwyg-icon.component';
import { WysiwygToolbarItem } from '../a11y/toolbar-item';
import { nextWysiwygId } from '../a11y/wysiwyg-id';
import { MenuItemDirective } from './menu-item.directive';

export interface WysiwygMenuOption<T> {
  readonly value: T;
  readonly label: string;
  /**
   * Glif po lewej stronie pozycji, np. `H` z indeksem `2`.
   *
   * To zwykły TEKST, nie font ikon — przetrwa tryb wysokiego kontrastu i skalowanie.
   * Jest `aria-hidden`, bo nazwę dostępną niesie już etykieta („Nagłówek 2").
   */
  readonly glyph?: string;
  readonly glyphSub?: string;
  /** Ikona pozycji. Ma pierwszeństwo przed `glyph`. */
  readonly icon?: WysiwygIconName;
}

const MENU_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

/**
 * Przycisk otwierający menu wyboru (wzorzec APG „menu button").
 *
 * Świadomie NIE jest to natywny `<select>`: w Chrome i Firefoksie na Windows strzałki
 * zmieniają w nim wartość i odpalają `change` przy KAŻDYM naciśnięciu, więc przeglądanie
 * listy zamieniałoby akapit kolejno w H1, H2, H3 i zaśmiecało historię cofania. Wzorzec
 * menu pozwala przeglądać pozycje bez zatwierdzania.
 */
@Component({
  selector: 'wysiwyg-menu-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkConnectedOverlay, WysiwygIconComponent, MenuItemDirective],
  providers: [{ provide: WysiwygToolbarItem, useExisting: WysiwygMenuButtonComponent }],
  template: `
    <button
      #trigger
      type="button"
      class="wysiwyg-btn wysiwyg-btn--menu"
      [attr.tabindex]="tabIndex()"
      [attr.aria-label]="label()"
      [attr.title]="label()"
      [attr.aria-haspopup]="'menu'"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? menuId : null"
      [attr.aria-disabled]="disabledState() ? 'true' : null"
      [class.wysiwyg-btn--active]="open() || highlighted()"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
    >
      @if (triggerIcon(); as ti) {
        <wysiwyg-icon [name]="ti" />
      } @else {
        <span class="wysiwyg-btn__glyph" aria-hidden="true">
          {{ triggerGlyph() }}@if (triggerGlyphSub()) {<sub>{{ triggerGlyphSub() }}</sub>}
        </span>
      }
      <wysiwyg-icon name="chevronDown" class="wysiwyg-btn__chevron" />
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
      <div [id]="menuId" role="menu" class="wysiwyg-menu" [attr.aria-label]="label()" (keydown)="onMenuKeydown($event)">
        @for (option of options(); track option.value) {
          <button
            wysiwygMenuItem
            type="button"
            role="menuitemradio"
            class="wysiwyg-menu__item"
            tabindex="-1"
            [attr.aria-checked]="option.value === current()"
            (click)="select(option)"
          >
            @if (option.icon; as oi) {
              <wysiwyg-icon [name]="oi" class="wysiwyg-menu__icon" />
            } @else if (option.glyph) {
              <span class="wysiwyg-menu__glyph" aria-hidden="true">
                {{ option.glyph }}@if (option.glyphSub) {<sub>{{ option.glyphSub }}</sub>}
              </span>
            }
            <span class="wysiwyg-menu__label">{{ option.label }}</span>
          </button>
        }
      </div>
    </ng-template>
  `,
})
export class WysiwygMenuButtonComponent<T> extends WysiwygToolbarItem {
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly label = input.required<string>();
  readonly options = input.required<readonly WysiwygMenuOption<T>[]>();
  readonly current = input<T | null>(null);
  readonly triggerGlyph = input<string>('');
  readonly triggerGlyphSub = input<string>('');
  readonly triggerIcon = input<WysiwygIconName | null>(null);
  readonly disabledState = input(false);
  /** Podświetla trigger, gdy bieżąca wartość jest inna niż domyślna. */
  readonly highlighted = input(false);

  readonly selected = output<T>();

  protected readonly positions = MENU_POSITIONS;
  protected readonly menuId = nextWysiwygId('menu');

  private readonly triggerRef = viewChildren<ElementRef<HTMLButtonElement>>('trigger');
  private readonly items = viewChildren(MenuItemDirective);

  private readonly _open = signal(false);
  protected readonly open = this._open.asReadonly();

  private readonly _tabIndex = signal<0 | -1>(-1);
  protected readonly tabIndex = this._tabIndex.asReadonly();

  protected readonly triggerEl = computed(() => this.triggerRef()[0] ?? this.elementRef);

  private manager: FocusKeyManager<MenuItemDirective> | null = null;

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
    this._open() ? this.close(true) : this.openMenu();
  }

  private openMenu(activeIndex = this.indexOfCurrent()): void {
    this._open.set(true);
    // Menu renderuje się dopiero po otwarciu overlaya, więc menedżer powstaje po renderze.
    queueMicrotask(() => {
      this.manager = new FocusKeyManager(this.items, this.injector).withWrap().withHomeAndEnd();
      this.manager.setActiveItem(activeIndex >= 0 ? activeIndex : 0);
    });
  }

  /** `returnFocus` musi być `true` przy zamknięciu z klawiatury — inaczej fokus przepada. */
  protected close(returnFocus: boolean): void {
    if (!this._open()) {
      return;
    }
    this._open.set(false);
    this.manager = null;
    if (returnFocus) {
      this.focus();
    }
  }

  protected select(option: WysiwygMenuOption<T>): void {
    this.selected.emit(option.value);
    // Fokus wraca na trigger, który odczyta nową wartość — dlatego wyboru z menu NIE
    // ogłaszamy osobno przez LiveAnnouncer (byłaby podwójna mowa).
    this.close(true);
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this._open()) {
        this.openMenu();
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.openMenu(this.options().length - 1);
    }
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      // `stopPropagation`, żeby Escape nie poszedł dalej i nie zabrał fokusu z toolbara.
      event.stopPropagation();
      this.close(true);
      return;
    }
    if (event.key === 'Tab') {
      this.close(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const index = this.manager?.activeItemIndex ?? -1;
      const option = this.options()[index];
      if (option) {
        this.select(option);
      }
      return;
    }
    this.manager?.onKeydown(event);
  }

  private indexOfCurrent(): number {
    return this.options().findIndex((o) => o.value === this.current());
  }
}
