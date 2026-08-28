import { describe, expect, it } from 'vitest';
import { resolveHeaderScope } from './accessible-table.extension';

/**
 * `scope` wynika WYŁĄCZNIE z położenia komórki w siatce — te przypadki są jedynym
 * miejscem, w którym ta reguła jest zapisana wprost.
 */
describe('resolveHeaderScope', () => {
  const cell = (top: number, left: number, height = 1, width = 1) => ({
    top,
    left,
    bottom: top + height,
    right: left + width,
  });

  it('nagłówek w pierwszym wierszu opisuje kolumnę', () => {
    expect(resolveHeaderScope(cell(0, 3))).toBe('col');
  });

  it('nagłówek w pierwszej kolumnie, poniżej pierwszego wiersza, opisuje wiersz', () => {
    expect(resolveHeaderScope(cell(2, 0))).toBe('row');
  });

  it('róg tabeli należy do wiersza nagłówkowego, więc opisuje kolumnę', () => {
    expect(resolveHeaderScope(cell(0, 0))).toBe('col');
  });

  it('scalenie w poziomie robi z nagłówka opis grupy kolumn', () => {
    expect(resolveHeaderScope(cell(0, 0, 1, 3))).toBe('colgroup');
  });

  it('scalenie w pionie robi z nagłówka opis grupy wierszy', () => {
    expect(resolveHeaderScope(cell(1, 0, 2, 1))).toBe('rowgroup');
  });

  // Komórka scalona w obu osiach jest dwuznaczna. Wygrywa `colgroup`, bo scalanie
  // w poziomie to w praktyce zawsze nagłówek nadrzędny grupy kolumn.
  it('scalenie w obu osiach rozstrzygamy na korzyść grupy kolumn', () => {
    expect(resolveHeaderScope(cell(0, 0, 2, 2))).toBe('colgroup');
  });

  it('nagłówek w środku tabeli dostaje bezpieczne „col"', () => {
    expect(resolveHeaderScope(cell(2, 2))).toBe('col');
  });
});
