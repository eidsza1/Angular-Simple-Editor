import { Injectable, inject } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

/**
 * Opakowanie `LiveAnnouncer` z polityką: **ogłaszaj tylko to, czego AT samo nie powie.**
 *
 * Kliknięcie toggle'a w toolbarze NIE jest ogłaszane — zmiana `aria-pressed` na
 * sfokusowanym przycisku jest czytana natywnie, a dodatkowe ogłoszenie daje podwójną mowę.
 * Ogłaszamy natomiast skróty wywołane z obszaru treści, gdzie nie ma sfokusowanej
 * kontrolki, która powiedziałaby o zmianie.
 *
 * Wymaga `@angular/cdk/a11y-prebuilt.css` — bez klasy `.cdk-visually-hidden` komunikaty
 * wyświetlają się jako WIDOCZNY tekst na stronie.
 */
@Injectable()
export class WysiwygAnnouncer {
  private readonly live = inject(LiveAnnouncer);

  private lastMessage = '';
  private lastAt = 0;

  /** Domyślny tryb. `duration` czyści region, żeby nie zostawały „duchy" komunikatów. */
  polite(message: string): void {
    if (!this.shouldAnnounce(message)) {
      return;
    }
    void this.live.announce(message, 'polite', 2000);
  }

  /** WYŁĄCZNIE dla błędów blokujących akcję. */
  assertive(message: string): void {
    if (!this.shouldAnnounce(message)) {
      return;
    }
    void this.live.announce(message, 'assertive', 2000);
  }

  /** Odfiltrowuje powtórki w krótkim oknie — np. przytrzymany skrót klawiszowy. */
  private shouldAnnounce(message: string): boolean {
    const now = Date.now();
    if (message === this.lastMessage && now - this.lastAt < 1000) {
      return false;
    }
    this.lastMessage = message;
    this.lastAt = now;
    return true;
  }
}
