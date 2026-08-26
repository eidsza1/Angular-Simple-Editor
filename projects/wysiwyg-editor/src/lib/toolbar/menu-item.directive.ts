import { Directive, ElementRef, inject } from '@angular/core';
import type { FocusableOption } from '@angular/cdk/a11y';

/** Pozycja menu obsługiwana przez `FocusKeyManager`. */
@Directive({ selector: '[wysiwygMenuItem]' })
export class MenuItemDirective implements FocusableOption {
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly disabled = false;

  focus(): void {
    this.elementRef.nativeElement.focus();
  }

  getLabel(): string {
    return this.elementRef.nativeElement.textContent?.trim() ?? '';
  }
}
