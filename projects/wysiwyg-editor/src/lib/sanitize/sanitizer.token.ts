import { InjectionToken, inject } from '@angular/core';
import { WysiwygSanitizer, type WysiwygSanitizerLike } from './wysiwyg-sanitizer';

/**
 * Pozwala podmienić implementację sanitizera (np. na wariant serwerowy albo na wrapper
 * logujący odrzucone fragmenty) bez modyfikowania komponentu.
 */
export const WYSIWYG_SANITIZER = new InjectionToken<WysiwygSanitizerLike>('WYSIWYG_SANITIZER', {
  providedIn: 'root',
  factory: () => inject(WysiwygSanitizer),
});
