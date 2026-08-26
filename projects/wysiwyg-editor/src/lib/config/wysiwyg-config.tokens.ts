import { InjectionToken, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import {
  WYSIWYG_DEFAULT_CONFIG,
  mergeWysiwygConfig,
  type DeepPartial,
  type WysiwygEditorConfig,
} from './wysiwyg-config.model';
import { WYSIWYG_MESSAGES_PL, type WysiwygMessages } from './wysiwyg-messages';

export const WYSIWYG_EDITOR_CONFIG = new InjectionToken<WysiwygEditorConfig>('WYSIWYG_EDITOR_CONFIG', {
  providedIn: 'root',
  factory: () => WYSIWYG_DEFAULT_CONFIG,
});

export const WYSIWYG_MESSAGES = new InjectionToken<WysiwygMessages>('WYSIWYG_MESSAGES', {
  providedIn: 'root',
  factory: () => WYSIWYG_MESSAGES_PL,
});

/**
 * Konfiguracja rozstrzygana kaskadowo:
 * `WYSIWYG_DEFAULT_CONFIG` → ten provider → `[config]` na instancji → `[features]`.
 */
export function provideWysiwygEditor(
  overrides?: DeepPartial<WysiwygEditorConfig>,
  messages?: Partial<WysiwygMessages>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: WYSIWYG_EDITOR_CONFIG,
      useValue: mergeWysiwygConfig(WYSIWYG_DEFAULT_CONFIG, overrides),
    },
    {
      provide: WYSIWYG_MESSAGES,
      useValue: messages ? { ...WYSIWYG_MESSAGES_PL, ...messages } : WYSIWYG_MESSAGES_PL,
    },
  ]);
}
