import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { colorTecla } from './presentacion-tanda';

@Component({
  selector: 'app-paso-personal-horno',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  templateUrl: './paso-personal.component.html',
})
export class PasoPersonalHornoComponent {
  readonly opciones = input.required<readonly number[]>();
  readonly area = input.required<string>();
  readonly prefijoTestId = input.required<string>();
  readonly valor = model.required<number>();

  protected claseValorGrande(activo: boolean): string {
    const base =
      'flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-2 text-4xl font-extrabold ' +
      'tabular-nums shadow-2xs transition active:scale-95';
    return `${base} ${colorTecla(activo)}`;
  }
}
