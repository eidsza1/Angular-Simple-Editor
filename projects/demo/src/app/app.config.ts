import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideWysiwygEditor } from 'wysiwyg-editor';
import { WYSIWYG_CONFIG } from './wysiwyg.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Konfiguracja edytora żyje w osobnym pliku — patrz `wysiwyg.config.ts`.
    provideWysiwygEditor(WYSIWYG_CONFIG),
  ],
};
