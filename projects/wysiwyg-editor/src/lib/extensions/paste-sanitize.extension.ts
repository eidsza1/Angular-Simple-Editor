import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { SanitizePolicy } from '../sanitize/sanitize-policy';
import type { WysiwygSanitizerLike } from '../sanitize/wysiwyg-sanitizer';

export interface PasteSanitizeOptions {
  sanitizer: WysiwygSanitizerLike | null;
  policy: Partial<SanitizePolicy>;
}

/**
 * Sanityzacja wklejanego HTML.
 *
 * `transformPastedHTML` działa **przed** parsowaniem do schematu ProseMirror, więc to
 * właściwy punkt zaczepienia: widzi surowy string, zanim cokolwiek trafi do dokumentu.
 */
export const PasteSanitizeExtension = Extension.create<PasteSanitizeOptions>({
  name: 'wysiwygPasteSanitize',

  addOptions() {
    return { sanitizer: null, policy: {} };
  },

  addProseMirrorPlugins() {
    const { sanitizer, policy } = this.options;

    return [
      new Plugin({
        key: new PluginKey('wysiwygPasteSanitize'),
        props: {
          transformPastedHTML: (html) => (sanitizer ? sanitizer.sanitize(html, policy) : html),
        },
      }),
    ];
  },
});
