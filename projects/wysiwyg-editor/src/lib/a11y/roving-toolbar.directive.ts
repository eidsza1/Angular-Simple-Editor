import {
  Directive,
  Injector,
  contentChildren,
  effect,
  inject,
  output,
  type OnDestroy,
} from '@angular/core';
import { FocusKeyManager } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import { WysiwygToolbarItem } from './toolbar-item';

/**
 * Roving tabindex dla `role="toolbar"` — dokładnie JEDEN tabstop na cały pasek.
 *
 * Tab wchodzi na ostatnio używaną kontrolkę i wychodzi z całego toolbara; nawigacja
 * wewnątrz odbywa się strzałkami (SC 2.1.1, 2.4.3).
 */
@Directive({
  selector: '[wysiwygRovingToolbar]',
  host: {
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn($event)',
  },
})
export class RovingToolbarDirective implements OnDestroy {
  private readonly items = contentChildren(WysiwygToolbarItem, { descendants: true });
  private readonly directionality = inject(Directionality, { optional: true });
  private readonly injector = inject(Injector);

  /** Emitowane, gdy fokus ma wrócić do obszaru edycji (Escape). */
  readonly returnFocus = output<void>();

  /**
   * Tworzony w konstruktorze, NIE w `effect()`.
   *
   * `FocusKeyManager` w CDK 22 sam wywołuje `effect()` w swoim konstruktorze, a Angular
   * zabrania zagnieżdżania (NG0602). Przyjmuje sygnał `items`, więc nie musi czekać,
   * aż kontrolki się wyrenderują.
   */
  private readonly manager: FocusKeyManager<WysiwygToolbarItem> = new FocusKeyManager(
    this.items,
    this.injector,
  )
    .withHorizontalOrientation(this.directionality?.value ?? 'ltr')
    // Toolbar jest poziomy. Strzałki góra/dół zostawiamy przeglądarce (przewijanie strony),
    // zamiast je połykać.
    .withVerticalOrientation(false)
    .withHomeAndEnd()
    .withWrap();
  // BEZ withTypeAhead(): toolbar nie może przechwytywać znaków drukowalnych.

  constructor() {
    this.manager.change.subscribe((index) => this.applyTabIndexes(index));

    // Utrzymuje dokładnie jeden `tabindex="0"`, także gdy zestaw kontrolek się zmieni
    // (np. po przełączeniu feature flag).
    effect(() => {
      const items = this.items();
      if (items.length > 0) {
        this.applyTabIndexes(this.manager.activeItemIndex ?? 0);
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.returnFocus.emit();
      return;
    }
    // Nie połykaj skrótów aplikacji ani przeglądarki.
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    this.manager.onKeydown(event);
  }

  /** Klik myszą też musi przesunąć „pamięć" rovingu, inaczej Tab wróci w złe miejsce. */
  protected onFocusIn(event: FocusEvent): void {
    const index = this.items().findIndex((item) => item.elementRef.nativeElement === event.target);
    if (index >= 0 && index !== this.manager.activeItemIndex) {
      this.manager.updateActiveItem(index);
      this.applyTabIndexes(index);
    }
  }

  /**
   * Ustawia fokus na zapamiętanej kontrolce — wejście przez Alt+F10.
   *
   * `?? 0` NIE WYSTARCZY: zanim ktokolwiek dotknie paska, `FocusKeyManager` trzyma
   * `activeItemIndex` równe **-1**, a nie `null`, więc operator wpuszczał tę wartość dalej.
   * `setActiveItem(-1)` nie trafia w żaden element, `activeItem` zostaje `null` i menedżer
   * po cichu nie robi nic — Alt+F10 działał dopiero po wcześniejszym kliknięciu w pasek.
   */
  focusActiveItem(): void {
    const index = this.manager.activeItemIndex;
    this.manager.setActiveItem(index != null && index >= 0 ? index : 0);
  }

  private applyTabIndexes(activeIndex: number): void {
    const items = this.items();
    const safeIndex = activeIndex >= 0 && activeIndex < items.length ? activeIndex : 0;
    items.forEach((item, i) => item.setTabIndex(i === safeIndex ? 0 : -1));
  }

  ngOnDestroy(): void {
    this.manager.destroy();
  }
}
