import { describe, expect, it } from 'vitest';
import {
  COMMANDS_IN_DEDICATED_CONTROLS,
  WYSIWYG_COMMANDS,
  WYSIWYG_COMMANDS_BY_ID,
  WYSIWYG_TOOLBAR_GROUPS,
} from '../core/command-registry';
import { ALL_WYSIWYG_FEATURES } from '../config/wysiwyg-feature.model';
import type { WysiwygFeature } from '../config/wysiwyg-feature.model';
import { WYSIWYG_MESSAGES_PL } from '../config/wysiwyg-messages';

describe('rejestr komend paska', () => {
  it('każda komenda ma etykietę obecną w komunikatach', () => {
    for (const c of WYSIWYG_COMMANDS) {
      expect(WYSIWYG_MESSAGES_PL[c.labelKey], `brak etykiety dla ${c.id}`).toBeTruthy();
    }
  });

  it('każda komenda wskazuje na istniejącą flagę funkcji', () => {
    for (const c of WYSIWYG_COMMANDS) {
      expect(ALL_WYSIWYG_FEATURES, `nieznana funkcja w ${c.id}`).toContain(c.feature);
    }
  });

  it('togglе mają isActive, a akcje nie', () => {
    for (const c of WYSIWYG_COMMANDS) {
      if (c.kind === 'toggle') {
        expect(typeof c.isActive, `${c.id} jest togglem, więc musi mieć isActive`).toBe('function');
      } else {
        expect(c.isActive, `${c.id} jest akcją, więc nie powinna mieć isActive`).toBeUndefined();
      }
    }
  });

  it('skróty klawiszowe są w formacie W3C i nigdy nie trafiają do etykiety', () => {
    for (const c of WYSIWYG_COMMANDS) {
      if (!c.ariaKeyShortcuts) {
        continue;
      }
      expect(c.ariaKeyShortcuts, `${c.id}`).toMatch(/^(Control|Alt|Shift|Meta)(\+(Control|Alt|Shift|Meta))*\+\S+$/);
      const label = WYSIWYG_MESSAGES_PL[c.labelKey] as string;
      // Nazwa dostępna ze skrótem byłaby czytana przy każdym fokusie i przejściu rotorem.
      expect(label, `${c.id}: skrót nie może być częścią etykiety`).not.toMatch(/Ctrl|Control|\+/);
    }
  });

  it('grupy odwołują się wyłącznie do istniejących komend', () => {
    for (const g of WYSIWYG_TOOLBAR_GROUPS) {
      expect(WYSIWYG_MESSAGES_PL[g.labelKey], `brak etykiety grupy ${g.id}`).toBeTruthy();
      for (const id of g.commands) {
        expect(WYSIWYG_COMMANDS_BY_ID.has(id), `grupa ${g.id} wskazuje nieznaną komendę ${id}`).toBe(true);
      }
    }
  });

  it('każda komenda jest renderowana dokładnie raz — przez grupę albo własną kontrolkę', () => {
    const wGrupach = WYSIWYG_TOOLBAR_GROUPS.flatMap((g) => g.commands);
    for (const c of WYSIWYG_COMMANDS) {
      const wGrupie = wGrupach.filter((id) => id === c.id).length;
      const wlasna = COMMANDS_IN_DEDICATED_CONTROLS.includes(c.id) ? 1 : 0;
      // Zero miejsc = komenda nigdy się nie wyrenderuje. Dwa = zdublowany przycisk.
      expect(wGrupie + wlasna, `${c.id}: miejsc renderowania ${wGrupie + wlasna}`).toBe(1);
    }
  });

  it('komendy z własnych kontrolek nie dublują się w grupach', () => {
    const wGrupach = WYSIWYG_TOOLBAR_GROUPS.flatMap((g) => g.commands);
    for (const id of COMMANDS_IN_DEDICATED_CONTROLS) {
      expect(wGrupach, `${id} jest jednocześnie w grupie i we własnej kontrolce`).not.toContain(id);
    }
  });

  it('wyłączenie funkcji usuwa wszystkie jej komendy z paska', () => {
    const bezStyluTekstu: readonly WysiwygFeature[] = ALL_WYSIWYG_FEATURES.filter(
      (f) => f !== 'bold' && f !== 'italic',
    );
    const widoczne = WYSIWYG_COMMANDS.filter((c) => bezStyluTekstu.includes(c.feature)).map((c) => c.id);
    expect(widoczne).not.toContain('bold');
    expect(widoczne).not.toContain('italic');
    expect(widoczne).toContain('underline');
  });

  it('komendy wyrównania niosą swój tryb, żeby dało się je filtrować pojedynczo', () => {
    const wyrownania = WYSIWYG_COMMANDS.filter((c) => c.feature === 'textAlign');
    expect(wyrownania).toHaveLength(4);
    expect(wyrownania.map((c) => c.alignment).sort()).toEqual(['center', 'justify', 'left', 'right']);
  });
});
