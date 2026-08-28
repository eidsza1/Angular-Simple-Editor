import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextAlign from '@tiptap/extension-text-align';
import type { AnyExtension } from '@tiptap/core';
import type { WysiwygEditorConfig } from '../config/wysiwyg-config.model';
import type { WysiwygFeature } from '../config/wysiwyg-feature.model';
import { PasteSanitizeExtension } from '../extensions/paste-sanitize.extension';
import { WysiwygKeymapExtension, type WysiwygKeymapOptions } from '../extensions/wysiwyg-keymap.extension';
import { AccessibleImage } from '../extensions/accessible-image.extension';
import {
  AccessibleTable,
  AccessibleTableCell,
  AccessibleTableHeader,
  AccessibleTableRow,
} from '../extensions/accessible-table.extension';
import { ImageUploadExtension } from '../extensions/image-upload.extension';
import type { WysiwygMessages } from '../config/wysiwyg-messages';
import type { WysiwygSanitizerLike } from '../sanitize/wysiwyg-sanitizer';

export interface ExtensionDeps {
  readonly sanitizer: WysiwygSanitizerLike;
  readonly keymap: WysiwygKeymapOptions;
  readonly messages: WysiwygMessages;
  readonly announce: (message: string) => void;
}

/**
 * Składa listę rozszerzeń Tiptap na podstawie feature flag.
 *
 * `@tiptap/starter-kit` zawiera już bold, italic, underline, strike, code, codeBlock, link,
 * listy, heading, paragraph, document, text, blockquote, hardBreak, horizontalRule,
 * gapcursor, dropcursor, trailingNode i undoRedo. Instalowanie tych paczek osobno dałoby
 * błąd „duplicate extension names".
 */
export function buildExtensions(cfg: WysiwygEditorConfig, deps: ExtensionDeps): AnyExtension[] {
  const has = (f: WysiwygFeature): boolean => cfg.features.includes(f);
  const hasAnyList = has('bulletList') || has('orderedList');

  const extensions: AnyExtension[] = [
    StarterKit.configure({
      heading: has('heading') ? { levels: [...cfg.headingLevels] } : false,
      bold: has('bold') ? {} : false,
      italic: has('italic') ? {} : false,
      underline: has('underline') ? {} : false,
      strike: has('strike') ? {} : false,
      code: has('code') ? {} : false,
      codeBlock: has('codeBlock') ? {} : false,
      bulletList: has('bulletList') ? {} : false,
      orderedList: has('orderedList') ? {} : false,
      listItem: hasAnyList ? {} : false,
      listKeymap: hasAnyList ? {} : false,
      blockquote: has('blockquote') ? {} : false,
      undoRedo: has('undoRedo') ? { newGroupDelay: 500 } : false,
      link: has('link')
        ? {
            openOnClick: false,
            autolink: cfg.link.autolink,
            // Bez tego wklejony `javascript:` mógłby stać się autolinkiem.
            protocols: ['http', 'https', 'mailto'],
          }
        : false,

      horizontalRule: false,

      // `trailingNode` gwarantuje akapit na końcu dokumentu, więc zawsze jest gdzie
      // postawić kursor po bloku, którego nie da się edytować (np. po obrazie).
      trailingNode: {},
      dropcursor: {},
      // `gapcursor` zostaje włączony domyślnie — nie przyjmuje opcji (typ to literalnie
      // `false`, wyłącznie do wyłączenia), więc nie wolno go tu przekazywać.
    }),

    PasteSanitizeExtension.configure({
      sanitizer: deps.sanitizer,
      policy: { allowBase64: cfg.image.allowBase64, maxInlineBytes: cfg.image.maxInlineBytes },
    }),

    WysiwygKeymapExtension.configure(deps.keymap),
  ];

  if (has('highlight')) {
    // `multicolor: false` świadomie: jeden kolor podświetlenia o zweryfikowanym kontraście.
    // Paleta kolorów wymagałaby zapewnienia kontrastu 4.5:1 dla KAŻDEJ pary kolor–tekst,
    // a przy dowolnym wyborze autora nie da się tego zagwarantować (SC 1.4.3).
    extensions.push(Highlight.configure({ multicolor: false }));
  }

  if (has('superscript')) {
    extensions.push(Superscript);
  }

  if (has('subscript')) {
    extensions.push(Subscript);
  }

  if (has('image')) {
    extensions.push(
      AccessibleImage.configure({
        inline: false,
        allowBase64: cfg.image.allowBase64,
        messages: deps.messages,
        announce: deps.announce,
      }),
      ImageUploadExtension.configure({
        config: cfg.image,
        messages: deps.messages,
        announce: deps.announce,
      }),
    );
  }

  if (has('table')) {
    // Kolejność bez znaczenia, ale komplet jest OBOWIĄZKOWY: bez `tableRow`, `tableCell`
    // i `tableHeader` schemat nie ma z czego zbudować tabeli, a `insertTable()` przewraca
    // się na brakującym typie węzła.
    extensions.push(
      AccessibleTable.configure({
        messages: deps.messages,
        announce: deps.announce,
      }),
      AccessibleTableRow,
      AccessibleTableHeader,
      AccessibleTableCell,
    );
  }

  if (has('textAlign')) {
    // `types` domyślnie jest puste — bez tego rozszerzenie rejestruje się i nic nie robi.
    extensions.push(
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: [...cfg.alignments],
        defaultAlignment: null,
      }),
    );
  }

  return extensions;
}
