import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { TableMap } from '@tiptap/pm/tables';
import { Plugin, PluginKey, Selection, TextSelection } from '@tiptap/pm/state';
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model';
import type { NodeView, ViewMutationRecord } from '@tiptap/pm/view';
import type { WysiwygMessages } from '../config/wysiwyg-messages';

export interface AccessibleTableOptions {
  messages: WysiwygMessages | null;
  announce: ((message: string) => void) | null;
}

export interface AccessibleTableHeaderOptions {
  /** Nazwa węzła nagłówka. Wydzielona, żeby plugin `scope` nie zaszywał jej na sztywno. */
  headerNodeName: string;
}

/** Wartości atrybutu `scope` dopuszczone przez HTML dla komórki `<th>`. */
export type TableHeaderScope = 'col' | 'row' | 'colgroup' | 'rowgroup';

/** Prostokąt komórki w siatce tabeli — dokładnie to, co zwraca `TableMap.findCell()`. */
export interface TableCellRect {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
}

/**
 * Wylicza `scope` z POŁOŻENIA komórki w siatce, a nie z jej wyglądu.
 *
 * Bez `scope` czytnik ekranu nie wie, czy `<th>` opisuje kolumnę, czy wiersz, i przy
 * nawigacji po komórkach czyta złe nagłówki albo żadnych (SC 1.3.1). Tiptap nie renderuje
 * tego atrybutu w ogóle, więc liczymy go sami.
 *
 * Kolejność warunków ma znaczenie: komórka scalona w poziomie opisuje GRUPĘ kolumn, nawet
 * jeśli stoi w pierwszej kolumnie, dlatego `colgroup` wygrywa z `row`. Komórka scalona
 * w obu osiach jest z definicji dwuznaczna — wybieramy `colgroup`, bo scalanie w poziomie
 * to w praktyce zawsze nagłówek nadrzędny grupy kolumn.
 */
export function resolveHeaderScope(rect: TableCellRect): TableHeaderScope {
  if (rect.right - rect.left > 1) {
    return 'colgroup';
  }
  if (rect.bottom - rect.top > 1) {
    return 'rowgroup';
  }
  if (rect.top === 0) {
    return 'col';
  }
  if (rect.left === 0) {
    return 'row';
  }
  // Nagłówek w środku tabeli: bez dodatkowej wiedzy najbezpieczniejsze jest „kolumna".
  return 'col';
}

const headerScopeKey = new PluginKey('wysiwygTableHeaderScope');

/**
 * Przelicza `scope` wszystkich komórek nagłówkowych po każdej zmianie dokumentu.
 *
 * Musi to być `appendTransaction`, a nie `renderHTML`: renderowanie węzła nie zna jego
 * pozycji w siatce, a właśnie od niej zależy poprawna wartość. Dodanie kolumny na początku
 * zamienia „nagłówek wiersza" w zwykły nagłówek i odwrotnie — bez przeliczenia atrybut
 * zostałby z poprzedniej pozycji i kłamał.
 */
function headerScopePlugin(headerNodeName: string): Plugin {
  return new Plugin({
    key: headerScopeKey,
    appendTransaction: (transactions, _oldState, newState) => {
      if (!transactions.some((t) => t.docChanged)) {
        return null;
      }

      const tr = newState.tr;
      let modified = false;

      newState.doc.descendants((node, pos) => {
        if (node.type.spec['tableRole'] !== 'table') {
          return true;
        }
        const map = TableMap.get(node);
        const tableStart = pos + 1;
        const visited = new Set<number>();

        for (const offset of map.map) {
          // Komórka scalona pojawia się w mapie tyle razy, ile pól zajmuje.
          if (visited.has(offset)) {
            continue;
          }
          visited.add(offset);

          const cellPos = tableStart + offset;
          const cell = newState.doc.nodeAt(cellPos);
          if (!cell || cell.type.name !== headerNodeName) {
            continue;
          }

          const scope = resolveHeaderScope(map.findCell(offset));
          if (cell.attrs['scope'] !== scope) {
            // `setNodeAttribute` nie zmienia rozmiarów węzłów, więc pozycje policzone
            // z mapy pozostają aktualne przez całą pętlę.
            tr.setNodeAttribute(cellPos, 'scope', scope);
            modified = true;
          }
        }
        return true;
      });

      return modified ? tr : null;
    },
  });
}

/**
 * Komórka nagłówkowa z ZAWSZE obecnym, wyliczonym atrybutem `scope`.
 */
export const AccessibleTableHeader = TableHeader.extend<AccessibleTableHeaderOptions>({
  addOptions() {
    return { ...this.parent?.(), headerNodeName: 'tableHeader' };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      scope: {
        default: 'col',
        parseHTML: (element: HTMLElement) => element.getAttribute('scope') ?? 'col',
        // Renderowany BEZWARUNKOWO — `<th>` bez `scope` to błąd, nie wariant stylistyczny.
        renderHTML: (attributes: Record<string, unknown>) => ({
          scope: (attributes['scope'] as string) || 'col',
        }),
      },
    };
  },

  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), headerScopePlugin(this.name)];
  },
});

export { TableCell as AccessibleTableCell, TableRow as AccessibleTableRow };

/** Znajduje tabelę, w której stoi kursor. `null`, gdy zaznaczenie jest poza tabelą. */
function findTableAround($pos: ResolvedPos): { node: PMNode; pos: number } | null {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type.spec['tableRole'] === 'table') {
      return { node, pos: $pos.before(depth) };
    }
  }
  return null;
}

/**
 * Widok tabeli: obszar przewijania z etykietą + `<caption>` renderowany z atrybutu węzła.
 *
 * Wrapper NIE jest kosmetyką. Wąska tabela w wąskiej kolumnie musi się przewijać w poziomie,
 * a obszar przewijalny nieosiągalny z klawiatury łamie SC 2.1.1 — stąd `tabindex="0"`,
 * `role="region"` i `aria-label`.
 *
 * `<caption>` powstaje z ATRYBUTU węzła, nie z jego dziecka. `TableMap.get()` zakłada, że
 * każde dziecko `table` jest wierszem — caption jako węzeł potomny rozsypałby mapę i wraz
 * z nią wszystkie komendy tabeli.
 */
class AccessibleTableView implements NodeView {
  readonly dom: HTMLElement;
  readonly contentDOM: HTMLElement;
  private readonly table: HTMLTableElement;
  private readonly caption: HTMLTableCaptionElement;
  private node: PMNode;

  constructor(
    node: PMNode,
    private readonly messages: WysiwygMessages | null,
  ) {
    this.node = node;

    this.dom = document.createElement('div');
    this.dom.className = 'wysiwyg-table-scroll';
    this.dom.setAttribute('role', 'region');
    this.dom.setAttribute('tabindex', '0');

    this.table = document.createElement('table');
    this.table.className = 'wysiwyg-table';

    this.caption = document.createElement('caption');
    // Treść podpisu żyje w atrybucie węzła — ProseMirror nią nie zarządza, więc nie może
    // być edytowalna w miejscu. Zmienia się przez panel tabeli.
    this.caption.setAttribute('contenteditable', 'false');
    this.table.appendChild(this.caption);

    this.contentDOM = document.createElement('tbody');
    this.table.appendChild(this.contentDOM);
    this.dom.appendChild(this.table);

    this.render(node);
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) {
      return false;
    }
    this.node = node;
    this.render(node);
    return true;
  }

  /**
   * Mutacje POZA `contentDOM` to nasze własne zmiany podpisu i etykiety. Bez tego
   * ProseMirror uznałby je za edycję użytkownika i przeparsowałby tabelę od nowa.
   */
  ignoreMutation(mutation: ViewMutationRecord): boolean {
    const target = mutation.target as Node;
    return this.dom.contains(target) && !this.contentDOM.contains(target);
  }

  private render(node: PMNode): void {
    const caption = String(node.attrs['caption'] ?? '').trim();
    this.caption.textContent = caption;
    // `hidden` przegrałoby z `display: table-caption` z arkusza — ustawiamy styl wprost.
    this.caption.style.display = caption ? '' : 'none';
    this.dom.setAttribute(
      'aria-label',
      caption
        ? (this.messages?.tableRegionLabel(caption) ?? caption)
        : (this.messages?.tableRegionFallback ?? 'Table'),
    );
  }
}

/**
 * Tabela dostępna z klawiatury, z podpisem i bez uchwytów zmiany szerokości.
 *
 * Trzy decyzje, które nie są konfiguracją, tylko warunkiem zgodności:
 *
 *  1. `resizable: false` — uchwyt ma 5 px szerokości (łamie SC 2.5.8 Target Size) i działa
 *     wyłącznie myszą (SC 2.1.1).
 *  2. Nadpisany `Tab` — domyślny keymap Tiptapa w OSTATNIEJ komórce dodaje nowy wiersz
 *     zamiast wyjść z tabeli. Użytkownik klawiatury nigdy by jej nie opuścił, a to pułapka
 *     klawiaturowa, czyli naruszenie SC 2.1.2 na poziomie A.
 *  3. `Escape` jako druga, przewidywalna droga wyjścia — Tab z ostatniej komórki wymaga
 *     przejścia przez wszystkie pozostałe.
 */
export const AccessibleTable = Table.extend<AccessibleTableOptions>({
  // Wyżej niż domyślne rozszerzenia, żeby wygrać keymap dla `Tab` i `Escape`.
  priority: 1000,

  addOptions() {
    return {
      ...this.parent?.(),
      resizable: false,
      messages: null,
      announce: null,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      /**
       * Podpis tabeli. WCAG wymaga go, żeby dało się odróżnić tabele na stronie i poznać
       * zawartość bez wchodzenia w komórki.
       */
      caption: {
        default: '',
        parseHTML: (element: HTMLElement) =>
          element.querySelector(':scope > caption')?.textContent?.trim() ?? '',
        // Nie renderujemy go jako atrybut `caption="…"` — trafia do elementu `<caption>`
        // w `renderHTML` węzła.
        renderHTML: () => ({}),
      },
    };
  },

  /**
   * `<caption>` MUSI zostać jawnie pominięty przy parsowaniu.
   *
   * Bez tej reguły parser ProseMirror wchodzi do podpisu (żadna reguła go nie obsługuje),
   * znajduje w środku tekst i — żeby zmieścić go w treści `tableRow+` — dorabia dla niego
   * PUSTY WIERSZ na początku tabeli. Objawiało się to tak, że każdy obieg przez widok
   * źródła albo `writeValue()` dokładał wiersz z tytułem w komórce.
   *
   * Sam tekst podpisu czyta atrybut `caption` z elementu `<table>`, więc nic nie ginie.
   */
  parseHTML() {
    return [{ tag: 'table' }, { tag: 'caption', ignore: true }];
  },

  /**
   * Świadomie BEZ `<colgroup>` i bez wyliczonej szerokości w pikselach, które generuje
   * domyślna implementacja: `min-width` w px nie skaluje się przy powiększeniu tekstu
   * i wymusza poziome przewijanie strony przy 400 % (SC 1.4.10).
   */
  renderHTML({ node, HTMLAttributes }) {
    const caption = String(node.attrs['caption'] ?? '').trim();
    const table: unknown[] = ['table', HTMLAttributes];
    if (caption) {
      table.push(['caption', {}, caption]);
    }
    table.push(['tbody', 0]);
    return table as never;
  },

  addNodeView() {
    const messages = this.options.messages;
    return ({ node }) => new AccessibleTableView(node as PMNode, messages);
  },

  addKeyboardShortcuts() {
    const isInTable = (): boolean => !!findTableAround(this.editor.state.selection.$from);

    /**
     * Wyprowadza kursor przed tabelę (`-1`) albo za nią (`1`).
     *
     * Gdy po tej stronie nie ma na czym postawić kursora — tabela jest pierwszym albo
     * ostatnim węzłem dokumentu — dokładamy akapit. Inaczej `Selection.near()` odbiłoby
     * się z powrotem do środka tabeli i wyjście wyglądałoby na zepsute.
     */
    const exitTable = (direction: 1 | -1): boolean => {
      const { state, dispatch } = this.editor.view;
      const info = findTableAround(state.selection.$from);
      if (!info) {
        return false;
      }

      const tableEnd = info.pos + info.node.nodeSize;
      const target = direction === 1 ? tableEnd : info.pos;
      const tr = state.tr;
      const near = Selection.near(tr.doc.resolve(target), direction);
      const landsInsideTable = near.from > info.pos && near.from < tableEnd;

      if (landsInsideTable || !(near instanceof TextSelection)) {
        const paragraph = state.schema.nodes['paragraph']?.createAndFill();
        if (!paragraph) {
          return false;
        }
        tr.insert(target, paragraph);
        // `target + 1` to wnętrze świeżo wstawionego akapitu — dla obu kierunków.
        tr.setSelection(TextSelection.near(tr.doc.resolve(target + 1), 1));
      } else {
        tr.setSelection(near);
      }

      dispatch(tr.scrollIntoView());

      const message = this.options.messages?.announceTableExit;
      if (message) {
        this.options.announce?.(message);
      }
      return true;
    };

    return {
      ...(this.parent?.() ?? {}),

      Tab: () => {
        if (!isInTable()) {
          // Poza tabelą Tab NIE MOŻE być połknięty — musi wyprowadzić fokus z edytora.
          return false;
        }
        if (this.editor.commands.goToNextCell()) {
          return true;
        }
        return exitTable(1);
      },

      'Shift-Tab': () => {
        if (!isInTable()) {
          return false;
        }
        if (this.editor.commands.goToPreviousCell()) {
          return true;
        }
        return exitTable(-1);
      },

      // `preventDefault` (czyli `return true`) TYLKO gdy faktycznie obsłużone — inaczej
      // zablokowalibyśmy Escape nadrzędnego okna dialogowego aplikacji.
      Escape: () => (isInTable() ? exitTable(1) : false),
    };
  },
});
