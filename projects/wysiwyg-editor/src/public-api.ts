/*
 * Public API Surface of wysiwyg-editor
 */

export { WysiwygEditorComponent } from './lib/wysiwyg-editor.component';

export {
  WYSIWYG_EDITOR_CONFIG,
  WYSIWYG_MESSAGES,
  provideWysiwygEditor,
} from './lib/config/wysiwyg-config.tokens';

export { WYSIWYG_DEFAULT_CONFIG, mergeWysiwygConfig } from './lib/config/wysiwyg-config.model';
export type {
  DeepPartial,
  UploadedImage,
  WysiwygEditorConfig,
  WysiwygImageConfig,
  WysiwygTableConfig,
} from './lib/config/wysiwyg-config.model';

export { ALL_TEXT_ALIGNMENTS, ALL_WYSIWYG_FEATURES } from './lib/config/wysiwyg-feature.model';
export type { HeadingLevel, TextAlignment, WysiwygFeature } from './lib/config/wysiwyg-feature.model';

export { WYSIWYG_MESSAGES_PL } from './lib/config/wysiwyg-messages';
export type { WysiwygMessages } from './lib/config/wysiwyg-messages';

export { WysiwygEditorCore } from './lib/core/wysiwyg-editor-core';
export { EMPTY_EDITOR_STATE, readEditorState } from './lib/core/editor-state.model';
export type {
  WysiwygBlockType,
  WysiwygEditorState,
  WysiwygMarkName,
  WysiwygSelectionState,
} from './lib/core/editor-state.model';
export { buildExtensions } from './lib/core/extension-factory';
export type { ExtensionDeps } from './lib/core/extension-factory';

export { WYSIWYG_SANITIZER } from './lib/sanitize/sanitizer.token';
export { WysiwygSanitizer, filterStyleAttribute } from './lib/sanitize/wysiwyg-sanitizer';
export type { WysiwygSanitizerLike } from './lib/sanitize/wysiwyg-sanitizer';
export {
  ALLOWED_STYLE_PROPS,
  DATA_URI_IMAGE_RE,
  DEFAULT_SANITIZE_POLICY,
  FONT_SIZE_VALUE_RE,
  USELESS_ALT_TEXTS,
  WYSIWYG_ALLOWED_ATTR,
  WYSIWYG_ALLOWED_TAGS,
  WYSIWYG_FORBID_ATTR,
  WYSIWYG_FORBID_TAGS,
} from './lib/sanitize/sanitize-policy';
export type { SanitizePolicy } from './lib/sanitize/sanitize-policy';

export { PasteSanitizeExtension } from './lib/extensions/paste-sanitize.extension';
export {
  AccessibleTable,
  AccessibleTableCell,
  AccessibleTableHeader,
  AccessibleTableRow,
  resolveHeaderScope,
} from './lib/extensions/accessible-table.extension';
export type {
  AccessibleTableOptions,
  TableCellRect,
  TableHeaderScope,
} from './lib/extensions/accessible-table.extension';
export type {
  TableInsertEvent,
  WysiwygTableAction,
} from './lib/toolbar/wysiwyg-table-button.component';
