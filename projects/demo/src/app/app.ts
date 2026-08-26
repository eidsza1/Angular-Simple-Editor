import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { WysiwygEditorComponent } from 'wysiwyg-editor';

const INITIAL_HTML = `
<h2>Zaczynamy</h2>
<p>To jest edytor tekstu sformatowanego z <mark>podświetleniem</mark>,
<strong>pogrubieniem</strong>, <em>kursywą</em>, <s>przekreśleniem</s>,
<u>podkreśleniem</u> i <code>kodem</code>.</p>
<p>Formatuj myszą albo skrótami: <code>Ctrl+B</code>, <code>Ctrl+I</code>,
<code>Ctrl+U</code>. Do paska narzędzi wejdziesz klawiszem <code>Alt+F10</code>,
a strzałkami przejdziesz między przyciskami. Zasady, na których to zbudowano, opisuje
<a href="https://www.w3.org/WAI/WCAG22/quickref/" target="_blank" rel="noopener noreferrer">skrócony przewodnik po WCAG 2.2</a>.</p>
<h3>Możliwości</h3>
<ul>
<li>Nagłówki, listy punktowane i numerowane</li>
<li>Wyrównanie tekstu i indeksy: x<sup>2</sup>, H<sub>2</sub>O</li>
<li>Podgląd i edycja źródła HTML</li>
</ul>
<p><img src="przyklad.png" alt="Gradient od granatu do fioletu, obraz przykładowy" style="width: 50%; float: left"></p>
<p>Kliknij obraz obok, żeby zobaczyć jego pasek narzędzi. Możesz zmienić szerokość
przeciągając róg albo przyciskami — a także ustawić, z której strony ma go opływać tekst.
Ikona ołówka w rogu otwiera pole tekstu alternatywnego.</p>
<blockquote><p>Cała treść przechodzi przez sanityzację — także ta wklejona i ta wpisana
w widoku źródła. Sanitizer usuwa skrypty, atrybuty zdarzeń i rozmiary czcionki podane
w pikselach, bo te ostatnie nie skalują się przy powiększeniu tekstu.</p></blockquote>
<h3>Blok kodu</h3>
<p>Fragment w linii wygląda tak: <code>provideWysiwygEditor(WYSIWYG_CONFIG)</code>.
Dłuższe listingi trafiają do osobnego bloku:</p>
<pre><code>features: [
  'bold', 'italic', 'underline',
  'heading', 'bulletList', 'image',
]</code></pre>
`.trim();

/** Wymusza treść inną niż sam pusty akapit — `<p></p>` to „puste" dla użytkownika. */
function notBlankHtml(control: { value: string | null }): Record<string, boolean> | null {
  const text = (control.value ?? '').replace(/<[^>]*>/g, '').trim();
  return text.length > 0 ? null : { required: true };
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WysiwygEditorComponent, ReactiveFormsModule],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    content: [INITIAL_HTML, [Validators.required, notBlankHtml]],
  });

  protected readonly contentControl = this.form.controls.content;

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  private readonly formStatus = toSignal(this.form.statusChanges, {
    initialValue: this.form.status,
  });

  protected readonly html = computed(() => this.formValue().content ?? '');
  protected readonly isInvalid = computed(() => this.formStatus() === 'INVALID');

  protected readonly isDisabled = signal(false);
  protected readonly submitted = signal<string | null>(null);

  protected toggleDisabled(): void {
    const next = !this.isDisabled();
    this.isDisabled.set(next);
    // W formularzach reaktywnych sterujemy przez control.disable(), NIGDY przez [disabled]
    // na komponencie — jednoczesne użycie obu daje ostrzeżenie Angulara i rozjazd stanu.
    if (next) {
      this.contentControl.disable();
    } else {
      this.contentControl.enable();
    }
  }

  protected loadDirty(): void {
    // Wejście z zewnątrz: sanitizer musi to wyczyścić przed wstawieniem do edytora.
    this.contentControl.setValue(
      '<h3>Wklejone z zewnątrz</h3>' +
        '<script>alert(1)</script>' +
        '<p style="font-size:14px;position:fixed">Tekst 14px + position:fixed</p>' +
        '<p style="font-size:1.25em">Tekst 1.25em</p>' +
        '<img src="x" onerror="alert(1)">' +
        '<a href="javascript:alert(1)">zły link</a>' +
        '<table><tr><th>Nagłówek bez scope</th></tr></table>',
    );
  }

  protected reset(): void {
    this.form.reset({ content: INITIAL_HTML });
    this.submitted.set(null);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    this.submitted.set(this.form.valid ? this.contentControl.value : null);
  }
}
