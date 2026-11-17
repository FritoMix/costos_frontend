import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-paso-horario-horno',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  templateUrl: './paso-horario.component.html',
})
export class PasoHorarioHornoComponent {
  readonly horaInicio = input.required<string>();
  readonly horaFin = input.required<string>();
  readonly ajustes = input.required<readonly number[]>();
  readonly atrasar = output<number>();
  readonly reiniciar = output<void>();
}
