import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { WysiwygSanitizer, filterStyleAttribute } from './wysiwyg-sanitizer';
import { FONT_SIZE_VALUE_RE } from './sanitize-policy';

describe('WysiwygSanitizer', () => {
  let sanitizer: WysiwygSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sanitizer = TestBed.inject(WysiwygSanitizer);
  });

  describe('XSS', () => {
    const attacks: readonly [name: string, input: string][] = [
      ['tag script', '<p>a</p><script>alert(1)</script>'],
      ['img onerror', '<img src=x onerror="alert(1)">'],
      ['href javascript:', '<a href="javascript:alert(1)">klik</a>'],
      ['svg onload', '<svg onload="alert(1)"></svg>'],
      ['iframe', '<iframe src="https://evil.example"></iframe>'],
      ['tag style', '<style>body{display:none}</style>'],
      ['formaction', '<button formaction="javascript:alert(1)">x</button>'],
      ['obiekt', '<object data="evil.swf"></object>'],
      ['meta refresh', '<meta http-equiv="refresh" content="0;url=https://evil.example">'],
      ['zagnieżdżony script', '<p><b><script>alert(1)</script></b></p>'],
    ];

    it.each(attacks)('neutralizuje: %s', (_name, input) => {
      const out = sanitizer.sanitize(input);
      expect(out).not.toMatch(/<script|onerror|onload|javascript:|<iframe|<object|formaction/i);
    });

    it('usuwa atrybut contenteditable — inaczej wklejony fragment tworzyłby zagnieżdżone pole edycji', () => {
      expect(sanitizer.sanitize('<p contenteditable="true">x</p>')).not.toContain('contenteditable');
    });
  });

  describe('atrybut style — SC 1.4.4 i clickjacking', () => {
    it('usuwa font-size w px', () => {
      expect(sanitizer.sanitize('<span style="font-size:14px">a</span>')).not.toContain('font-size');
    });

    it('zachowuje font-size w em', () => {
      expect(sanitizer.sanitize('<span style="font-size:1.25em">a</span>')).toContain('font-size: 1.25em');
    });

    it('zachowuje font-size w rem i %', () => {
      expect(sanitizer.sanitize('<span style="font-size:120%">a</span>')).toContain('120%');
      expect(sanitizer.sanitize('<span style="font-size:0.75rem">a</span>')).toContain('0.75rem');
    });

    it('usuwa position:fixed (clickjacking)', () => {
      const out = sanitizer.sanitize('<p style="position:fixed;inset:0;z-index:9999">a</p>');
      expect(out).not.toMatch(/position|z-index|inset/);
    });

    it('usuwa background:url()', () => {
      expect(sanitizer.sanitize('<p style="background:url(https://evil.example/x)">a</p>')).not.toContain('url(');
    });

    it('usuwa cały atrybut, gdy nic z niego nie zostało', () => {
      expect(sanitizer.sanitize('<p style="color:red">a</p>')).toBe('<p>a</p>');
    });

    it('zachowuje dozwoloną deklarację obok odrzuconej', () => {
      const out = sanitizer.sanitize('<p style="color:red;text-align:center">a</p>');
      expect(out).toContain('text-align: center');
      expect(out).not.toContain('color');
    });
  });

  describe('domknięcia WCAG', () => {
    it('dodaje alt="" obrazowi bez alt (SC 1.1.1)', () => {
      const out = sanitizer.sanitize('<img src="https://example.com/a.png">');
      expect(out).toContain('alt=""');
    });

    it('nie nadpisuje istniejącego alt', () => {
      const out = sanitizer.sanitize('<img src="https://example.com/a.png" alt="Wykres sprzedaży">');
      expect(out).toContain('alt="Wykres sprzedaży"');
    });

    it('wymusza rel na target="_blank"', () => {
      const out = sanitizer.sanitize('<a href="https://example.com" target="_blank">x</a>');
      expect(out).toContain('rel="noopener noreferrer"');
    });
  });

  describe('obrazy data:', () => {
    const dataImg = '<img src="data:image/png;base64,iVBORw0KGgo=" alt="a">';

    it('usuwa obraz base64, gdy allowBase64 = false (domyślnie)', () => {
      expect(sanitizer.sanitize(dataImg)).not.toContain('data:image');
    });

    it('zachowuje obraz base64 przy allowBase64 = true', () => {
      expect(sanitizer.sanitize(dataImg, { allowBase64: true })).toContain('data:image/png');
    });

    it('usuwa obraz base64 przekraczający maxInlineBytes', () => {
      const huge = `<img src="data:image/png;base64,${'A'.repeat(5000)}" alt="a">`;
      expect(sanitizer.sanitize(huge, { allowBase64: true, maxInlineBytes: 100 })).not.toContain('data:image');
    });

    // Regresja: DOMPurify trzyma `img` w DATA_URI_TAGS i pomija dla niego ALLOWED_URI_REGEXP,
    // więc bez własnego sprawdzenia MIME to przechodziło nietknięte.
    it('usuwa data:text/html nawet przy allowBase64 = true', () => {
      const out = sanitizer.sanitize('<img src="data:text/html;base64,PHNjcmlwdD4=" alt="a">', {
        allowBase64: true,
      });
      expect(out).not.toContain('data:text/html');
    });

    it('usuwa data:image/svg+xml — SVG bywa nośnikiem skryptu', () => {
      const out = sanitizer.sanitize('<img src="data:image/svg+xml;base64,PHN2Zz4=" alt="a">', {
        allowBase64: true,
      });
      expect(out).not.toContain('svg+xml');
    });

    it('usuwa data: o niepoprawnej strukturze base64', () => {
      const out = sanitizer.sanitize('<img src="data:image/png;base64,<script>" alt="a">', {
        allowBase64: true,
      });
      expect(out).not.toContain('data:image');
    });
  });

  // Regresja: odrzucenie `blob:` usuwało `src`, przez co `parseHTML` Tiptapa (`img[src]`)
  // przestawało pasować i CAŁY węzeł obrazu znikał po zatwierdzeniu wgrania.
  describe('adresy obrazów', () => {
    it('zachowuje blob: — tak wygląda podgląd wgrywanego pliku', () => {
      const out = sanitizer.sanitize('<img src="blob:http://localhost:4200/abc-123" alt="Wykres">');
      expect(out).toContain('blob:http://localhost:4200/abc-123');
    });

    it('zachowuje zwykły https', () => {
      expect(sanitizer.sanitize('<img src="https://cdn.example/a.webp" alt="x">')).toContain('https://cdn.example');
    });

    it('nadal odrzuca javascript: w src', () => {
      expect(sanitizer.sanitize('<img src="javascript:alert(1)" alt="x">')).not.toContain('javascript:');
    });
  });

  describe('zachowanie struktury', () => {
    it('nie rusza poprawnej treści edytora', () => {
      const html =
        '<h2 style="text-align: center">Tytuł</h2>' +
        '<p><strong>a</strong> <em>b</em> <s>c</s> <code>d</code> <mark>e</mark> ' +
        '<sup>f</sup> <sub>g</sub></p>' +
        '<ul><li><p>x</p></li></ul><blockquote><p>cytat</p></blockquote>';
      expect(sanitizer.sanitize(html)).toBe(html);
    });

    it('usuwa tabelę — funkcja nie jest jeszcze wspierana przez schemat', () => {
      const out = sanitizer.sanitize('<table><tr><th>H</th><td>D</td></tr></table>');
      expect(out).not.toContain('<table');
    });

    it('zwraca pusty string dla pustego wejścia', () => {
      expect(sanitizer.sanitize('')).toBe('');
    });
  });

  // Regresja: `DOMPurify.removed` zawiera wpis `BODY` z własnego parsowania, więc surowe
  // `removed.length > 0` oznaczało KAŻDĄ treść jako naruszoną — i brudziło formularz przy
  // samym wczytaniu wartości.
  describe('raport removedSomething', () => {
    it('jest false dla treści, z której nic nie usunięto', () => {
      const html = '<h2>Tytuł</h2><p><strong>a</strong> <em>b</em> <mark>c</mark></p><ul><li><p>x</p></li></ul>';
      expect(sanitizer.sanitizeDetailed(html).removedSomething).toBe(false);
    });

    it('jest false dla pustego wejścia', () => {
      expect(sanitizer.sanitizeDetailed('').removedSomething).toBe(false);
    });

    it('jest true, gdy usunięto element', () => {
      expect(sanitizer.sanitizeDetailed('<p>a</p><script>alert(1)</script>').removedSomething).toBe(true);
    });

    it('jest true, gdy usunięto atrybut', () => {
      expect(sanitizer.sanitizeDetailed('<img src="x" onerror="alert(1)" alt="">').removedSomething).toBe(true);
    });
  });
});

describe('filterStyleAttribute', () => {
  it('ignoruje deklaracje bez dwukropka', () => {
    expect(filterStyleAttribute('font-size')).toBe('');
  });

  it('normalizuje wielkość liter', () => {
    expect(filterStyleAttribute('FONT-SIZE: 1.25EM')).toBe('font-size: 1.25em');
  });
});

describe('FONT_SIZE_VALUE_RE — SC 1.4.4', () => {
  it.each(['1.25em', '.75em', '0.875em', '120%', '1rem'])('przyjmuje %s', (v) => {
    expect(FONT_SIZE_VALUE_RE.test(v)).toBe(true);
  });

  it.each(['14px', '1e5em', 'calc(1em)', 'var(--x)', 'larger', '12pt', ''])('odrzuca %s', (v) => {
    expect(FONT_SIZE_VALUE_RE.test(v)).toBe(false);
  });
});
