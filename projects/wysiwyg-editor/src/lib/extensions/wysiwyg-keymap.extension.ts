import { Extension } from '@tiptap/core';

export interface WysiwygKeymapOptions {
  /** Wywoływane przy Alt+F10 — przenosi fokus na pasek narzędzi. */
  onFocusToolbar: (() => void) | null;
  /** Ogłoszenie zmiany wywołanej skrótem Z OBSZARU TREŚCI. */
  onAnnounce: ((message: string) => void) | null;
  messages: {
    markOn: (name: string) => string;
    markOff: (name: string) => string;
    labels: Record<string, string>;
    undo: string;
    redo: string;
  } | null;
}

/**
 * Skróty własne edytora i ogłoszenia dla skrótów wywołanych z obszaru treści.
 *
 * SC 2.1.4 Character Key Shortcuts jest spełnione z definicji — nie ma tu ani jednego
 * skrótu złożonego wyłącznie ze znaku.
 *
 * `Alt+F10` to de facto standard wejścia do paska narzędzi (TinyMCE, CKEditor). Samo `F10`
 * otwiera pasek menu przeglądarki, `Alt+F10` nie.
 */
export const WysiwygKeymapExtension = Extension.create<WysiwygKeymapOptions>({
  name: 'wysiwygKeymap',
  // Wyżej niż domyślne rozszerzenia, żeby wygrać keymap dla skrótów, które nadpisujemy.
  priority: 1000,

  addOptions() {
    return { onFocusToolbar: null, onAnnounce: null, messages: null };
  },

  addKeyboardShortcuts() {
    const announceMark = (name: string) => {
      const { onAnnounce, messages } = this.options;
      if (!onAnnounce || !messages) {
        return;
      }
      const label = messages.labels[name] ?? name;
      // Odczyt PO wykonaniu komendy — `isActive` zwraca już nowy stan.
      onAnnounce(this.editor.isActive(name) ? messages.markOn(label) : messages.markOff(label));
    };

    /**
     * Skróty marek nie są tu *implementowane* — Tiptap już je obsługuje. Zwracamy `false`,
     * żeby zdarzenie poszło dalej do właściwego rozszerzenia, a sami tylko ogłaszamy wynik
     * po zakończeniu transakcji.
     */
    const announceAfter = (name: string) => (): boolean => {
      queueMicrotask(() => announceMark(name));
      return false;
    };

    return {
      'Alt-F10': () => {
        this.options.onFocusToolbar?.();
        return true;
      },
      'Mod-b': announceAfter('bold'),
      'Mod-i': announceAfter('italic'),
      'Mod-u': announceAfter('underline'),
      'Mod-Shift-s': announceAfter('strike'),
      'Mod-e': announceAfter('code'),
    };
  },
});
