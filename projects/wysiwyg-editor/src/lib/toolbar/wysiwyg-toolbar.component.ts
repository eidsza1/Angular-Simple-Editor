import { ChangeDetectionStrategy, Component, computed, input, output, viewChild } from '@angular/core';
import { RovingToolbarDirective } from '../a11y/roving-toolbar.directive';
import { WysiwygToolbarButtonComponent } from './wysiwyg-toolbar-button.component';
import { WysiwygMenuButtonComponent, type WysiwygMenuOption } from './wysiwyg-menu-button.component';
import { WysiwygLinkButtonComponent, type LinkSubmitEvent } from './wysiwyg-link-button.component';
import {
  WysiwygTableButtonComponent,
  type TableInsertEvent,
  type WysiwygTableAction,
} from './wysiwyg-table-button.component';
import { ALL_TEXT_ALIGNMENTS } from '../config/wysiwyg-feature.model';
import type { HeadingLevel, TextAlignment } from '../config/wysiwyg-feature.model';
import type { WysiwygIconName } from '../icons/wysiwyg-icon.component';
import {
  WYSIWYG_COMMANDS_BY_ID,
  WYSIWYG_TOOLBAR_GROUPS,
  type CommandDescriptor,
} from '../core/command-registry';
import type { WysiwygMessages } from '../config/wysiwyg-messages';
import type { WysiwygTableConfig } from '../config/wysiwyg-config.model';
import type { WysiwygFeature } from '../config/wysiwyg-feature.model';
import type { WysiwygEditorState } from '../core/editor-state.model';

interface RenderedCommand {
  readonly descriptor: CommandDescriptor;
  readonly label: string;
  readonly pressed: boolean;
  readonly disabled: boolean;
}

interface RenderedGroup {
  readonly id: string;
  readonly label: string;
  readonly commands: readonly RenderedCommand[];
}

@Component({
  selector: 'wysiwyg-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RovingToolbarDirective,
    WysiwygToolbarButtonComponent,
    WysiwygMenuButtonComponent,
    WysiwygLinkButtonComponent,
    WysiwygTableButtonComponent,
  ],
  template: `
    <div
      class="wysiwyg-toolbar"
      role="toolbar"
      aria-orientation="horizontal"
      [attr.aria-label]="messages().toolbarLabel"
      [attr.aria-controls]="ariaControls()"
      wysiwygRovingToolbar
      (returnFocus)="returnFocus.emit()"
    >
      @for (group of groups(); track group.id) {
        <div role="group" class="wysiwyg-toolbar__group" [attr.aria-label]="group.label">
          <!-- Rodzaj listy otwiera grupę bloków, żeby nie tworzyć osobnego separatora. -->
          @if (group.id === 'blocks' && showListMenu()) {
            <wysiwyg-menu-button
              [label]="messages().listMenu"
              [options]="listOptions()"
              [current]="currentListValue()"
              [triggerIcon]="listTriggerIcon()"
              [highlighted]="currentListValue() !== ''"
              [disabledState]="disabled()"
              (selected)="listSelected.emit($any($event))"
            />
          }

          @for (item of group.commands; track item.descriptor.id) {
            <button
              wysiwygToolbarButton
              [command]="item.descriptor"
              [label]="item.label"
              [pressed]="item.pressed"
              [disabledState]="item.disabled"
              (activate)="command.emit($event)"
            ></button>
          }

          <!-- Odnośnik domyka grupę stylu tekstu — jak w projekcie paska. -->
          @if (group.id === 'textStyle' && showLink()) {
            <wysiwyg-link-button
              [label]="messages().link"
              [urlLabel]="messages().linkUrlLabel"
              [applyLabel]="messages().linkApply"
              [removeLabel]="messages().linkRemove"
              [cancelLabel]="messages().cancel"
              [invalidMessage]="messages().linkInvalid"
              [active]="state().marks.link"
              [currentHref]="currentHref()"
              [disabledState]="disabled()"
              (applyLink)="applyLink.emit($event)"
              (removeRequested)="removeLink.emit()"
            />
          }
        </div>

        <!-- Tabela ma WŁASNĄ grupę zaraz za stylem tekstu: to nie jest formatowanie znaku
             ani wstawianie obiektu, tylko struktura dokumentu. -->
        @if (group.id === 'textStyle' && showTable()) {
          <div role="group" class="wysiwyg-toolbar__group" [attr.aria-label]="messages().groupTable">
            <wysiwyg-table-button
              [messages]="messages()"
              [config]="tableConfig()"
              [inTable]="state().selection.inTable"
              [currentCaption]="state().selection.tableCaption ?? ''"
              [currentHeaderRow]="state().selection.tableHeaderRow"
              [currentHeaderColumn]="state().selection.tableHeaderColumn"
              [disabledState]="disabled() || sourceMode()"
              (insertTable)="insertTable.emit($event)"
              (tableAction)="tableAction.emit($event)"
              (captionApplied)="tableCaption.emit($event)"
            />
          </div>
        }

        <!-- Wybór poziomu nagłówka tuż po grupie historii, zgodnie z układem paska. -->
        @if (group.id === 'history' && showHeadingMenu()) {
          <div role="group" class="wysiwyg-toolbar__group" [attr.aria-label]="messages().groupParagraph">
            <wysiwyg-menu-button
              [label]="messages().headingMenu"
              [options]="headingOptions()"
              [current]="currentHeadingValue()"
              [triggerIcon]="headingTriggerIcon()"
              [highlighted]="currentHeadingValue() !== 0"
              [disabledState]="disabled()"
              (selected)="headingSelected.emit($any($event))"
            />
          </div>

        }
      }

      @if (showImage()) {
        <div role="group" class="wysiwyg-toolbar__group" [attr.aria-label]="messages().groupInsert">
          <button
            wysiwygToolbarButton
            [command]="imageCommand"
            [label]="messages().insertImage"
            [pressed]="false"
            [disabledState]="disabled()"
            (activate)="insertImage.emit()"
          ></button>
        </div>
      }

      @if (showSourceToggle() || showThemeToggle()) {
        <div role="group" class="wysiwyg-toolbar__group wysiwyg-toolbar__group--trailing"
             [attr.aria-label]="messages().groupView">
          @if (showSourceToggle()) {
            <button
              wysiwygToolbarButton
              [command]="sourceCommand"
              [label]="messages().sourceView"
              [pressed]="sourceMode()"
              [disabledState]="false"
              (activate)="toggleSource.emit()"
            ></button>
          }
          @if (showThemeToggle()) {
            <button
              wysiwygToolbarButton
              [command]="themeCommand()"
              [label]="darkTheme() ? messages().themeToLight : messages().themeToDark"
              [pressed]="darkTheme()"
              [disabledState]="false"
              (activate)="toggleTheme.emit()"
            ></button>
          }
        </div>
      }
    </div>
  `,
})
export class WysiwygToolbarComponent {
  readonly features = input.required<readonly WysiwygFeature[]>();
  readonly state = input.required<WysiwygEditorState>();
  readonly messages = input.required<WysiwygMessages>();
  readonly canRun = input.required<(descriptor: CommandDescriptor) => boolean>();
  readonly ariaControls = input<string | null>(null);
  readonly disabled = input(false);
  readonly sourceMode = input(false);
  readonly darkTheme = input(false);

  readonly command = output<CommandDescriptor>();
  readonly returnFocus = output<void>();
  readonly toggleSource = output<void>();
  readonly toggleTheme = output<void>();
  /** `0` oznacza akapit; `1..6` to poziom nagłówka. */
  readonly headingSelected = output<number>();
  readonly applyLink = output<LinkSubmitEvent>();
  readonly removeLink = output<void>();
  readonly insertImage = output<void>();
  readonly insertTable = output<TableInsertEvent>();
  readonly tableAction = output<WysiwygTableAction>();
  readonly tableCaption = output<string>();
  readonly listSelected = output<string>();

  readonly currentHref = input<string>('');

  protected readonly showLink = computed(() => this.features().includes('link'));
  protected readonly showImage = computed(() => this.features().includes('image'));
  protected readonly showTable = computed(() => this.features().includes('table'));

  /** Wstawianie obrazu nie jest komendą Tiptap — obsługuje je komponent nadrzędny. */
  protected readonly imageCommand: CommandDescriptor = {
    id: 'insertImage' as CommandDescriptor['id'],
    feature: 'image',
    labelKey: 'insertImage',
    icon: 'image',
    kind: 'action',
    run: () => false,
    canRun: () => true,
  };

  readonly tableConfig = input.required<WysiwygTableConfig>();

  readonly headingLevels = input<readonly HeadingLevel[]>([1, 2, 3, 4, 5, 6]);
  readonly alignments = input<readonly TextAlignment[]>(ALL_TEXT_ALIGNMENTS);

  protected readonly showHeadingMenu = computed(() => this.features().includes('heading'));

  protected readonly headingOptions = computed<readonly WysiwygMenuOption<number>[]>(() => {
    const m = this.messages();
    return [
      { value: 0, label: m.paragraph, glyph: '¶' },
      ...this.headingLevels().map((level) => ({
        value: level,
        label: m[`heading${level}` as keyof typeof m] as string,
        icon: `heading${level}` as const,
      })),
    ];
  });

  protected readonly currentHeadingValue = computed(() => {
    const s = this.state();
    return s.blockType === 'heading' && s.headingLevel ? s.headingLevel : 0;
  });

  /** Ikona triggera pokazuje bieżący poziom, np. „H2"; dla akapitu — generyczne „H". */
  protected readonly headingTriggerIcon = computed(() => {
    const v = this.currentHeadingValue();
    return (v === 0 ? 'heading' : `heading${v}`) as WysiwygIconName;
  });

  // --- listy ---

  protected readonly showListMenu = computed(
    () => this.features().includes('bulletList') || this.features().includes('orderedList'),
  );

  protected readonly listOptions = computed<readonly WysiwygMenuOption<string>[]>(() => {
    const m = this.messages();
    const f = this.features();
    const options: WysiwygMenuOption<string>[] = [];
    if (f.includes('bulletList')) {
      options.push({ value: 'bulletList', label: m.bulletList, icon: 'bulletList' });
    }
    if (f.includes('orderedList')) {
      options.push({ value: 'orderedList', label: m.orderedList, icon: 'orderedList' });
    }
    return options;
  });

  protected readonly currentListValue = computed(() => {
    const b = this.state().blockType;
    return b === 'bulletList' || b === 'orderedList' ? b : '';
  });

  protected readonly listTriggerIcon = computed(() => {
    const v = this.currentListValue();
    return (v === 'orderedList' ? 'orderedList' : 'bulletList') as WysiwygIconName;
  });

  protected readonly showSourceToggle = computed(() => this.features().includes('sourceView'));
  protected readonly showThemeToggle = computed(() => this.features().includes('themeToggle'));

  /**
   * Ikona pokazuje motyw, KTÓRY ZOSTANIE WŁĄCZONY, a nie bieżący — tak samo jak etykieta
   * („Włącz motyw ciemny"). Odwrotna konwencja myli: użytkownik widzi słońce i nie wie,
   * czy właśnie jest jasno, czy kliknięcie rozjaśni.
   */
  protected readonly themeCommand = computed<CommandDescriptor>(() => ({
    id: 'themeToggle' as CommandDescriptor['id'],
    feature: 'themeToggle',
    labelKey: this.darkTheme() ? 'themeToLight' : 'themeToDark',
    icon: this.darkTheme() ? 'themeLight' : 'themeDark',
    kind: 'toggle',
    run: () => false,
    canRun: () => true,
  }));

  /**
   * Przełącznik widoku źródła NIE jest komendą edytora — nie zmienia dokumentu, tylko
   * sposób jego prezentacji. Dlatego nie ma go w `WYSIWYG_COMMANDS`; deskryptor jest tu
   * minimalny i służy wyłącznie temu, by przycisk renderował się tak samo jak pozostałe.
   */
  protected readonly sourceCommand: CommandDescriptor = {
    id: 'sourceView' as CommandDescriptor['id'],
    feature: 'sourceView',
    labelKey: 'sourceView',
    icon: 'sourceView',
    kind: 'toggle',
    run: () => false,
    canRun: () => true,
  };

  private readonly roving = viewChild.required(RovingToolbarDirective);

  /**
   * Stany wszystkich kontrolek liczone JEDNYM przebiegiem, zależnym od snapshotu stanu.
   *
   * Gdyby `pressed`/`disabled` były wywołaniami metod w szablonie, `can()` odpalałoby się
   * dla każdego z kilkunastu przycisków przy każdym cyklu detekcji zmian — a transakcja
   * leci na każde naciśnięcie klawisza. Zależność od `state()` gwarantuje przy okazji, że
   * przyciski nie zostaną z nieaktualnym `aria-disabled` z pierwszego renderu, sprzed
   * utworzenia instancji edytora.
   */
  protected readonly groups = computed<RenderedGroup[]>(() => {
    const features = this.features();
    const messages = this.messages();
    const state = this.state();
    const allDisabled = this.disabled();
    const canRun = this.canRun();
    const allowedAlignments = this.alignments();

    return WYSIWYG_TOOLBAR_GROUPS.map((group) => ({
      id: group.id,
      label: messages[group.labelKey] as string,
      commands: group.commands
        .map((id) => WYSIWYG_COMMANDS_BY_ID.get(id))
        .filter((d): d is CommandDescriptor => !!d && features.includes(d.feature))
        // Wyrównania filtrujemy dodatkowo po `alignments`: bez tego wyłączenie np.
        // justowania w konfiguracji nie chowałoby jego przycisku, a klikanie go nie
        // dawałoby efektu — kontrolka wyglądałaby na zepsutą.
        .filter((d) => !d.alignment || allowedAlignments.includes(d.alignment))
        .map((descriptor) => ({
          descriptor,
          label: messages[descriptor.labelKey] as string,
          pressed: descriptor.isActive?.(state) ?? false,
          // W widoku źródła komendy dokumentu nie mają zastosowania, ale kontrolki zostają
          // w kolejności rovingu (aria-disabled, nie atrybut disabled).
          disabled: allDisabled || this.sourceMode() || !canRun(descriptor),
        })),
      // Grupa bez widocznych kontrolek nie może zostawić pustego `role="group"`.
    })).filter((group) => group.commands.length > 0);
  });

  /** Wejście do toolbara skrótem Alt+F10 — na zapamiętaną kontrolkę. */
  focusToolbar(): void {
    this.roving().focusActiveItem();
  }
}
