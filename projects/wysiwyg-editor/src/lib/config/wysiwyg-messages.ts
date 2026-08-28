/**
 * Wszystkie teksty widoczne dla użytkownika i czytane przez technologie asystujące.
 *
 * Zasada: `aria-label` przycisku zawiera **samą nazwę akcji**, bez skrótu klawiszowego.
 * Skrót trafia do `aria-keyshortcuts` i do tooltipa — inaczej byłby czytany przy każdym
 * fokusie i przy każdym przejściu rotorem.
 */
export interface WysiwygMessages {
  // toolbar
  toolbarLabel: string;
  groupTextStyle: string;
  groupParagraph: string;
  groupLists: string;
  groupScripts: string;
  groupAlign: string;
  groupTable: string;
  groupInsert: string;
  groupView: string;
  groupHistory: string;

  // komendy
  bold: string;
  italic: string;
  underline: string;
  bulletList: string;
  orderedList: string;
  blockquote: string;
  codeBlock: string;
  strike: string;
  code: string;
  highlight: string;
  link: string;
  superscript: string;
  subscript: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  alignJustify: string;
  undo: string;
  redo: string;
  clearFormatting: string;
  shortcutsHelp: string;

  // nagłówki
  headingMenu: string;
  listMenu: string;
  paragraph: string;
  heading1: string;
  heading2: string;
  heading3: string;
  heading4: string;
  heading5: string;
  heading6: string;



  // obraz
  insertImage: string;

  // tabela
  /** Etykieta przycisku, gdy kursor jest POZA tabelą. */
  insertTable: string;
  /** Etykieta tego samego przycisku, gdy kursor stoi w tabeli. */
  editTable: string;
  tableRowsLabel: string;
  tableColsLabel: string;
  tableHeaderRow: string;
  tableHeaderColumn: string;
  tableCaptionLabel: string;
  tableCaptionHint: string;
  tableCaptionRequired: string;
  tableSizeInvalid: (maxRows: number, maxCols: number) => string;
  tableInsertSubmit: string;
  tableCaptionApply: string;
  tableGroupRows: string;
  tableGroupColumns: string;
  tableGroupHeaders: string;
  tableAddRowBefore: string;
  tableAddRowAfter: string;
  tableDeleteRow: string;
  tableAddColumnBefore: string;
  tableAddColumnAfter: string;
  tableDeleteColumn: string;
  tableToggleHeaderRow: string;
  tableToggleHeaderColumn: string;
  tableDelete: string;
  tableClose: string;
  tableKeyboardHint: string;
  /** Etykieta przewijalnego obszaru wokół tabeli — musi rozróżniać tabele na stronie. */
  tableRegionLabel: (caption: string) => string;
  tableRegionFallback: string;
  announceTableInserted: (rows: number, cols: number) => string;
  announceTableRowAdded: string;
  announceTableRowDeleted: string;
  announceTableColumnAdded: string;
  announceTableColumnDeleted: string;
  announceTableCaptionUpdated: string;
  announceTableDeleted: string;
  announceTableExit: string;

  // odnosnik
  linkUrlLabel: string;
  linkApply: string;
  linkRemove: string;
  linkInvalid: string;
  cancel: string;

  // wgrywanie obrazu
  uploadClickToSelect: string;
  uploadOrDragDrop: string;
  uploadConstraints: (maxFiles: number, maxMegabytes: number) => string;
  uploadAltLabel: string;
  uploadAltHint: string;
  uploadDecorative: string;
  uploadInsert: string;
  uploadRemove: string;
  uploadAltRequired: string;
  uploadTooLarge: (maxMegabytes: number) => string;
  uploadFailed: string;
  uploadNoUploader: string;
  uploadUrlLabel: string;
  uploadRegionLabel: string;
  announceImageInserted: (alt: string) => string;
  announceImageDecorative: string;

  // rozmiar i oplywanie obrazu
  imageToolbarLabel: string;
  imageWidth: (percent: number) => string;
  imageWidthAuto: string;
  imageWrapNone: string;
  imageWrapLeft: string;
  imageWrapRight: string;
  imageWrapHint: string;
  imageResizeHint: string;
  imageEditAlt: string;
  uploadCancel: string;
  announceAltUpdated: string;
  announceImageWidth: (percent: number) => string;
  announceImageWrap: (mode: string) => string;

  // widok zrodla
  sourceView: string;
  themeToDark: string;
  themeToLight: string;
  announceThemeDark: string;
  announceThemeLight: string;
  sourceTextareaLabel: string;
  sourceHint: string;
  announceSourceOn: string;
  announceSourceOff: string;

  // obszar edycji
  editorFallbackLabel: string;
  editorHint: string;

  // ogłoszenia (funkcje, bo zależą od stanu)
  announceMarkOn: (markName: string) => string;
  announceMarkOff: (markName: string) => string;
  announceHeading: (level: number) => string;
  announceParagraph: string;
  announceUndo: string;
  announceRedo: string;
}

export const WYSIWYG_MESSAGES_PL: WysiwygMessages = {
  toolbarLabel: 'Formatowanie tekstu',
  groupTextStyle: 'Styl tekstu',
  groupParagraph: 'Akapit',
  groupLists: 'Akapit i listy',
  groupScripts: 'Indeksy',
  groupAlign: 'Wyrównanie',
  groupTable: 'Tabela',
  groupInsert: 'Wstawianie',
  groupView: 'Widok',
  groupHistory: 'Historia',

  bold: 'Pogrubienie',
  italic: 'Kursywa',
  underline: 'Podkreślenie',
  bulletList: 'Lista punktowana',
  orderedList: 'Lista numerowana',
  blockquote: 'Cytat',
  codeBlock: 'Blok kodu',
  strike: 'Przekreślenie',
  code: 'Kod',
  highlight: 'Podświetlenie',
  link: 'Odnośnik',
  superscript: 'Indeks górny',
  subscript: 'Indeks dolny',
  alignLeft: 'Wyrównaj do lewej',
  alignCenter: 'Wyśrodkuj',
  alignRight: 'Wyrównaj do prawej',
  alignJustify: 'Wyjustuj',
  undo: 'Cofnij',
  redo: 'Ponów',
  clearFormatting: 'Wyczyść formatowanie',
  shortcutsHelp: 'Skróty klawiszowe',

  headingMenu: 'Poziom nagłówka',
  listMenu: 'Rodzaj listy',
  paragraph: 'Akapit',
  heading1: 'Nagłówek 1',
  heading2: 'Nagłówek 2',
  heading3: 'Nagłówek 3',
  heading4: 'Nagłówek 4',
  heading5: 'Nagłówek 5',
  heading6: 'Nagłówek 6',



  insertImage: 'Wstaw obraz',

  // tabela
  insertTable: 'Wstaw tabelę',
  editTable: 'Edytuj tabelę',
  tableRowsLabel: 'Liczba wierszy',
  tableColsLabel: 'Liczba kolumn',
  tableHeaderRow: 'Pierwszy wiersz to nagłówki kolumn',
  tableHeaderColumn: 'Pierwsza kolumna to nagłówki wierszy',
  tableCaptionLabel: 'Tytuł tabeli',
  tableCaptionHint: 'Krótko opisz, co zawiera tabela. Tytuł jest widoczny nad tabelą i czytany przez czytniki ekranu.',
  tableCaptionRequired: 'Podaj tytuł tabeli.',
  tableSizeInvalid: (maxRows, maxCols) =>
    `Podaj od 1 do ${maxRows} wierszy i od 1 do ${maxCols} kolumn.`,
  tableInsertSubmit: 'Wstaw tabelę',
  tableCaptionApply: 'Zapisz tytuł',
  tableGroupRows: 'Wiersze',
  tableGroupColumns: 'Kolumny',
  tableGroupHeaders: 'Nagłówki',
  tableAddRowBefore: 'Wstaw wiersz powyżej',
  tableAddRowAfter: 'Wstaw wiersz poniżej',
  tableDeleteRow: 'Usuń wiersz',
  tableAddColumnBefore: 'Wstaw kolumnę z lewej',
  tableAddColumnAfter: 'Wstaw kolumnę z prawej',
  tableDeleteColumn: 'Usuń kolumnę',
  tableToggleHeaderRow: 'Wiersz nagłówkowy',
  tableToggleHeaderColumn: 'Kolumna nagłówkowa',
  tableDelete: 'Usuń tabelę',
  tableClose: 'Zamknij',
  tableKeyboardHint: 'W tabeli: Tab przechodzi do następnej komórki, Escape wychodzi z tabeli.',
  tableRegionLabel: (caption) => `Tabela: ${caption}`,
  tableRegionFallback: 'Tabela',
  announceTableInserted: (rows, cols) => `Wstawiono tabelę ${rows} na ${cols}`,
  announceTableRowAdded: 'Dodano wiersz',
  announceTableRowDeleted: 'Usunięto wiersz',
  announceTableColumnAdded: 'Dodano kolumnę',
  announceTableColumnDeleted: 'Usunięto kolumnę',
  announceTableCaptionUpdated: 'Zaktualizowano tytuł tabeli',
  announceTableDeleted: 'Usunięto tabelę',
  announceTableExit: 'Poza tabelą',

  linkUrlLabel: 'Adres odnośnika',
  linkApply: 'Zastosuj',
  linkRemove: 'Usuń odnośnik',
  linkInvalid: 'Podaj adres zaczynający się od https://, http://, mailto:, / lub #.',
  cancel: 'Anuluj',

  uploadClickToSelect: 'Wybierz plik z dysku',
  uploadOrDragDrop: 'albo przeciągnij i upuść',
  uploadConstraints: (n, mb) => `Maksymalnie ${n} pliki, po ${mb} MB`,
  uploadAltLabel: 'Tekst alternatywny',
  uploadAltHint: 'Opisz, co przedstawia obraz. Zwykle wystarczy jedno zdanie.',
  uploadDecorative: 'Obraz dekoracyjny (nie niesie treści)',
  uploadInsert: 'Wstaw',
  uploadRemove: 'Usuń',
  uploadAltRequired: 'Podaj tekst alternatywny albo zaznacz „Obraz dekoracyjny".',
  uploadTooLarge: (mb) => `Plik jest za duży. Maksymalny rozmiar to ${mb} MB.`,
  uploadFailed: 'Nie udało się wgrać pliku. Spróbuj ponownie.',
  uploadNoUploader: 'Wgrywanie plików nie jest skonfigurowane. Podaj adres obrazu.',
  uploadUrlLabel: 'Adres obrazu',
  uploadRegionLabel: 'Wstawianie obrazu',
  announceImageInserted: (alt) => `Wstawiono obraz: ${alt}`,
  announceImageDecorative: 'Wstawiono obraz dekoracyjny',

  imageToolbarLabel: 'Rozmiar i oblewanie obrazu',
  imageWidth: (p) => `Szerokość ${p}%`,
  imageWidthAuto: 'Rozmiar pierwotny',
  // Nazwy opisują pozycję OBRAZU, a nie kierunek, w który ucieka tekst.
  // Wariant „Tekst z prawej" był formalnie poprawny, ale odwracał intuicję użytkownika:
  // klikając go, spodziewał się obrazu po prawej.
  imageWrapNone: 'Bez oblewania',
  imageWrapLeft: 'Wyrównaj obraz do lewej',
  imageWrapRight: 'Wyrównaj obraz do prawej',
  imageWrapHint: 'Tekst opłynie obraz z drugiej strony.',
  imageResizeHint:
    'Obraz zaznaczony. Strzałki w lewo i w prawo zmieniają szerokość, Escape odznacza.',
  imageEditAlt: 'Edytuj tekst alternatywny',
  uploadCancel: 'Anuluj',
  announceAltUpdated: 'Zaktualizowano tekst alternatywny',
  announceImageWidth: (p) => `Szerokość ${p} procent`,
  announceImageWrap: (mode) => `Oblewanie: ${mode}`,

  sourceView: 'Widok źródła HTML',
  themeToDark: 'Włącz motyw ciemny',
  themeToLight: 'Włącz motyw jasny',
  announceThemeDark: 'Motyw ciemny',
  announceThemeLight: 'Motyw jasny',
  sourceTextareaLabel: 'Kod źródłowy HTML',
  sourceHint: 'Zmiany zostaną zastosowane po powrocie do widoku wizualnego.',
  announceSourceOn: 'Widok źródła HTML',
  announceSourceOff: 'Widok wizualny',

  editorFallbackLabel: 'Edytor tekstu sformatowanego',
  editorHint: 'Edytor tekstu sformatowanego. Naciśnij Alt+F10, aby przejść do paska narzędzi.',

  announceMarkOn: (m) => `${m} włączone`,
  announceMarkOff: (m) => `${m} wyłączone`,
  announceHeading: (level) => `Nagłówek ${level}`,
  announceParagraph: 'Akapit',
  announceUndo: 'Cofnięto',
  announceRedo: 'Ponowiono',
};
