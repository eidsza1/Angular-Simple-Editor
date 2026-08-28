import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import createDOMPurify, { type Config, type DOMPurify } from 'dompurify';
import {
  ALLOWED_STYLE_PROPS,
  DATA_URI_IMAGE_RE,
  DEFAULT_SANITIZE_POLICY,
  URI_RE_SAFE,
  URI_RE_WITH_DATA_IMAGE,
  WYSIWYG_FORBID_ATTR,
  WYSIWYG_FORBID_TAGS,
  type SanitizePolicy,
} from './sanitize-policy';

export interface SanitizeResult {
  readonly html: string;
  /**
   * `true`, gdy sanitizer faktycznie coś usunął (element albo atrybut).
   *
   * Celowo NIE porównujemy wejścia z wyjściem: DOMPurify parsuje i serializuje HTML od
   * nowa, więc bezpieczna treść też potrafi zmienić postać (kolejność atrybutów, encje,
   * domknięcia znaczników). Porównanie stringów dawałoby fałszywe alarmy.
   */
  readonly removedSomething: boolean;
}

export interface WysiwygSanitizerLike {
  sanitize(dirty: string, policy?: Partial<SanitizePolicy>): string;
  sanitizeDetailed(dirty: string, policy?: Partial<SanitizePolicy>): SanitizeResult;
}

/** Węzły, które DOMPurify tworzy sam podczas parsowania — nie pochodzą z treści. */
const PARSER_WRAPPER_NODES = new Set(['HTML', 'HEAD', 'BODY']);

/**
 * Odsiewa wpisy z `DOMPurify.removed`, które są artefaktem jego własnego parsowania.
 *
 * DOMPurify wkłada treść do dokumentu roboczego i przy sprzątaniu raportuje usunięcie
 * `<body>`. Gdyby liczyć to jako ingerencję w treść, KAŻDA sanityzacja — także zupełnie
 * czystego HTML — wyglądałaby na taką, w której coś wycięto.
 */
function isMeaningfulRemoval(entry: { element?: Node; attribute?: Attr | null }): boolean {
  if (entry.attribute) {
    return true;
  }
  const nodeName = entry.element?.nodeName;
  return !!nodeName && !PARSER_WRAPPER_NODES.has(nodeName);
}

/** Przepuszcza tylko deklaracje z `ALLOWED_STYLE_PROPS`, każdą zwalidowaną własnym wzorcem. */
export function filterStyleAttribute(value: string): string {
  const kept: string[] = [];
  for (const declaration of value.split(';')) {
    const idx = declaration.indexOf(':');
    if (idx === -1) {
      continue;
    }
    const prop = declaration.slice(0, idx).trim().toLowerCase();
    const propValue = declaration.slice(idx + 1).trim().toLowerCase();
    const pattern = ALLOWED_STYLE_PROPS.get(prop);
    if (pattern && pattern.test(propValue)) {
      kept.push(`${prop}: ${propValue}`);
    }
  }
  return kept.join('; ');
}

@Injectable({ providedIn: 'root' })
export class WysiwygSanitizer implements WysiwygSanitizerLike {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Własna, izolowana instancja DOMPurify.
   *
   * `addHook()` i `setConfig()` działają na stanie instancji. Użycie globalnego singletona
   * kolidowałoby z hookami aplikacji konsumującej i psuło się przy wielu edytorach naraz.
   */
  private purify: DOMPurify | null = null;

  /** Polityka bieżącego wywołania. Bezpieczne, bo `sanitize()` jest synchroniczne. */
  private activePolicy: SanitizePolicy = DEFAULT_SANITIZE_POLICY;

  sanitize(dirty: string, policy?: Partial<SanitizePolicy>): string {
    return this.sanitizeDetailed(dirty, policy).html;
  }

  sanitizeDetailed(dirty: string, policy?: Partial<SanitizePolicy>): SanitizeResult {
    if (!dirty) {
      return { html: '', removedSomething: false };
    }
    // Na serwerze nie ma DOM. Zwracamy pusty string zamiast przepuszczać niezweryfikowany
    // HTML — to bezpieczna strona pomyłki.
    if (!this.isBrowser) {
      return { html: '', removedSomething: false };
    }

    this.activePolicy = { ...DEFAULT_SANITIZE_POLICY, ...policy };
    const purify = this.ensureInstance();

    const config: Config = {
      ALLOWED_TAGS: [...this.activePolicy.allowedTags],
      ALLOWED_ATTR: [...this.activePolicy.allowedAttr],
      FORBID_TAGS: [...WYSIWYG_FORBID_TAGS],
      FORBID_ATTR: [...WYSIWYG_FORBID_ATTR],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      RETURN_TRUSTED_TYPE: false,
      ALLOWED_URI_REGEXP: this.activePolicy.allowBase64 ? URI_RE_WITH_DATA_IMAGE : URI_RE_SAFE,
    };

    const html = purify.sanitize(dirty, config);
    // `removed` jest resetowane przy każdym wywołaniu `sanitize()`.
    return { html, removedSomething: purify.removed.some(isMeaningfulRemoval) };
  }

  private ensureInstance(): DOMPurify {
    if (this.purify) {
      return this.purify;
    }

    const purify = createDOMPurify(window);

    // Filtrowanie `style` deklaracja po deklaracji.
    purify.addHook('uponSanitizeAttribute', (_node, data) => {
      if (data.attrName !== 'style') {
        return;
      }
      const filtered = filterStyleAttribute(data.attrValue);
      if (filtered === '') {
        data.keepAttr = false;
        return;
      }
      data.attrValue = filtered;
    });

    // Obrazy `data:` — typ MIME, opt-in i limit rozmiaru.
    purify.addHook('uponSanitizeElement', (node, data) => {
      if (data.tagName !== 'img') {
        return;
      }
      const el = node as Element;
      const src = el.getAttribute?.('src') ?? '';
      if (!src.startsWith('data:')) {
        return;
      }

      // Nie polegamy na ALLOWED_URI_REGEXP: DOMPurify pomija je dla `img` (DATA_URI_TAGS),
      // więc bez tej kontroli `data:text/html;base64,...` przeszłoby nietknięte.
      if (!DATA_URI_IMAGE_RE.test(src)) {
        el.remove();
        return;
      }

      // base64 rozdyma dane o ~37 %; porównujemy długość stringa z limitem bajtów pliku.
      const tooLarge = src.length > this.activePolicy.maxInlineBytes * 1.37;
      if (!this.activePolicy.allowBase64 || tooLarge) {
        el.remove();
      }
    });

    // Domknięcia wymagane przez WCAG, niezależnie od tego, co przyszło na wejściu.
    purify.addHook('afterSanitizeAttributes', (node) => {
      const el = node as Element;
      const tag = el.tagName?.toLowerCase();

      if (tag === 'a' && el.getAttribute('target') === '_blank') {
        el.setAttribute('rel', 'noopener noreferrer');
      }

      // SC 1.1.1 — każdy obraz ma `alt`. Brak atrybutu to błąd, `alt=""` to świadoma decyzja.
      if (tag === 'img' && !el.hasAttribute('alt')) {
        el.setAttribute('alt', '');
      }

      // SC 1.3.1 — każda komórka nagłówkowa ma `scope`.
      //
      // W edytorze pilnuje tego rozszerzenie tabeli, ale HTML potrafi wejść też bokiem:
      // z widoku źródła, z `writeValue()` albo ze schowka. Domykamy to na granicy: pierwszy
      // wiersz opisuje kolumny, każdy kolejny `<th>` — swój wiersz.
      if (tag === 'th' && !el.hasAttribute('scope')) {
        const row = el.parentElement;
        const isFirstRow = !!row && row.parentElement?.querySelector('tr') === row;
        el.setAttribute('scope', isFirstRow ? 'col' : 'row');
      }
    });

    this.purify = purify;
    return purify;
  }
}
