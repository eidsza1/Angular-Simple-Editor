import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { WysiwygIconComponent } from '../icons/wysiwyg-icon.component';
import { WysiwygToolbarItem } from '../a11y/toolbar-item';
import type { CommandDescriptor } from '../core/command-registry';

/**
 * Pojedyncza kontrolka toolbara — toggle albo akcja.
 *
 * Kluczowe decyzje dostępnościowe:
 *  - `aria-pressed` dla toggle'a. NIE `aria-checked`, NIE `role="switch"`.
 *  - Skrót idzie do `aria-keyshortcuts` i `title`, **nigdy do `aria-label`** — nazwa
 *    „Pogrubienie Ctrl+B" byłaby czytana przy każdym fokusie i przejściu rotorem.
 *  - `title` jest IDENTYCZNY z `aria-label` (SC 2.5.3 Label in Name): użytkownik sterowania
 *    głosem mówi to, co widzi w tooltipie.
 *  - Niedostępność przez `aria-disabled`, nie przez atrybut `disabled` — kontrolka ma
 *    zostać w kolejności rovingu (wzorzec APG dla toolbara).
 *  - `type="button"`, żeby wewnątrz `<form>` nie wysyłał formularza.
 */
@Component({
  selector: 'button[wysiwygToolbarButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WysiwygIconComponent],
  providers: [{ provide: WysiwygToolbarItem, useExisting: WysiwygToolbarButtonComponent }],
  host: {
    class: 'wysiwyg-btn',
    type: 'button',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'label()',
    '[attr.aria-pressed]': 'ariaPressed()',
    '[attr.aria-keyshortcuts]': 'command().ariaKeyShortcuts ?? null',
    '[attr.aria-disabled]': 'disabledState() ? "true" : null',
    '[class.wysiwyg-btn--active]': 'pressed()',
    '[class.wysiwyg-btn--disabled]': 'disabledState()',
    '[class.wysiwyg-btn--labelled]': 'visibleLabel()',
    '(click)': 'onActivate($event)',
  },
  template: `
    <wysiwyg-icon [name]="command().icon" />
    @if (visibleLabel(); as text) {
      <span class="wysiwyg-btn__text">{{ text }}</span>
    }
  `,
})
export class WysiwygToolbarButtonComponent extends WysiwygToolbarItem {
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly command = input.required<CommandDescriptor>();
  readonly label = input.required<string>();
  readonly pressed = input(false);
  readonly disabledState = input(false);
  /**
   * Widoczny podpis obok ikony.
   *
   * SC 2.5.3 Label in Name: nazwa dostępna (`aria-label`) MUSI zawierać ten tekst, inaczej
   * użytkownik sterowania głosem powie to, co widzi, a system tego nie rozpozna.
   */
  readonly visibleLabel = input<string>('');

  readonly activate = output<CommandDescriptor>();

  private readonly _tabIndex = signal<0 | -1>(-1);
  protected readonly tabIndex = this._tabIndex.asReadonly();

  protected readonly ariaPressed = computed(() =>
    this.command().kind === 'toggle' ? String(this.pressed()) : null,
  );

  override setTabIndex(value: 0 | -1): void {
    this._tabIndex.set(value);
  }

  protected onActivate(event: MouseEvent): void {
    // `aria-disabled` nie blokuje kliknięcia tak jak atrybut `disabled` — musimy sami.
    if (this.disabledState()) {
      event.preventDefault();
      return;
    }
    this.activate.emit(this.command());
  }
}
