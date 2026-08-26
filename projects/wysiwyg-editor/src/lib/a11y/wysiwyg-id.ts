let counter = 0;

/** Stabilny, unikalny identyfikator dla powiązań ARIA (`aria-controls`, `aria-describedby`). */
export function nextWysiwygId(suffix: string): string {
  counter += 1;
  return `wysiwyg-${suffix}-${counter}`;
}
