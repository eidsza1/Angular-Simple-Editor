import type { ElementRef } from '@angular/core';
import type { FocusableOption, FocusOrigin } from '@angular/cdk/a11y';

/**
 * Wspólna baza kontrolek toolbara. `FocusKeyManager` operuje na tym interfejsie.
 */
export abstract class WysiwygToolbarItem implements FocusableOption {
  abstract readonly elementRef: ElementRef<HTMLElement>;

  /**
   * ZAWSZE `false`.
   *
   * `ListKeyManager` domyślnie pomija elementy z `disabled === true`. Wzorzec APG dla
   * toolbara wymaga czegoś odwrotnego: wyłączona kontrolka ma zostać w kolejności rovingu,
   * inaczej „Cofnij" znikałoby i wracało z nawigacji strzałkami, co dezorientuje.
   * Niedostępność wyrażamy przez `aria-disabled`, nie przez wypadnięcie z fokusu.
   */
  readonly disabled = false;

  abstract setTabIndex(value: 0 | -1): void;

  focus(_origin?: FocusOrigin): void {
    this.elementRef.nativeElement.focus();
  }

  getLabel(): string {
    return this.elementRef.nativeElement.getAttribute('aria-label') ?? '';
  }
}
