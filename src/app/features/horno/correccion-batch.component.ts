import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { protegerRecarga } from '../../core/guards/cambios.guard';
import type {
  DetalleOrden,
  RegistroHorno,
  ValoresBatch,
} from '../../core/modelos/produccion.model';
import { OrdenesService } from '../../core/servicios/ordenes.service';

@Component({
  selector: 'app-correccion-batch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <section class="mx-auto mt-5 max-w-md rounded-xl border border-slate-200 p-4 text-left">
      @if (!editando()) {
        <p>
          {{ registro().cantidad_baches }} baches · {{ registro().aceite_agregado_litros }} L de
          aceite
        </p>
        <button type="button" class="mt-2 font-bold text-marca-700 underline" (click)="abrir()">
          Corregir registro
        </button>
      } @else {
        <form #formulario ngNativeValidate (submit)="$event.preventDefault(); guardar(formulario)">
          <fieldset [disabled]="ocupado()" class="grid gap-3 sm:grid-cols-2">
            <legend class="mb-2 font-bold">Corregir registro de horno</legend>
            <label
              >Cantidad de baches
              <input
                class="mt-1 w-full rounded-lg border p-2"
                type="number"
                required
                min="1"
                max="999"
                step="1"
                name="baches"
                [(ngModel)]="baches"
              />
            </label>
            <label
              >Aceite agregado (L)
              <input
                class="mt-1 w-full rounded-lg border p-2"
                type="number"
                required
                min="0"
                max="99999"
                step="0.01"
                name="litros"
                [(ngModel)]="litros"
              />
            </label>
          </fieldset>
          <div class="mt-4 flex flex-wrap gap-3">
            @if (conflicto()) {
              <button
                type="button"
                class="font-bold text-marca-700"
                [disabled]="ocupado()"
                (click)="recargar()"
              >
                Cargar registro actual
              </button>
            } @else {
              <button
                type="submit"
                class="rounded-lg bg-marca-700 px-4 py-2 text-white disabled:opacity-50"
                [disabled]="ocupado() || !pendiente()"
              >
                Guardar corrección
              </button>
            }
            <button type="button" [disabled]="ocupado()" (click)="cerrar()">Cancelar</button>
          </div>
        </form>
      }
      <p role="status" class="mt-2 text-sm">{{ mensaje() }}</p>
    </section>
  `,
})
export class CorreccionBatchComponent {
  readonly registro = input.required<RegistroHorno>();
  readonly guardado = output<RegistroHorno>();
  readonly recargado = output<DetalleOrden>();
  readonly ocupado = signal(false);
  protected readonly editando = signal(false);
  protected readonly conflicto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly baches = signal<number | null>(null);
  protected readonly litros = signal<number | null>(null);
  private readonly original = signal<ValoresBatch | null>(null);
  private readonly ordenes = inject(OrdenesService);
  readonly pendiente = computed(
    () =>
      this.editando() &&
      (this.baches() !== this.original()?.cantidad_baches ||
        this.litros() !== this.original()?.aceite_agregado_litros),
  );

  constructor() {
    protegerRecarga(() => this.ocupado() || this.pendiente());
  }

  protected abrir(): void {
    const r = this.registro();
    const valores = {
      cantidad_baches: Number(r.cantidad_baches),
      aceite_agregado_litros: Number(r.aceite_agregado_litros),
    };
    this.original.set(valores);
    this.baches.set(valores.cantidad_baches);
    this.litros.set(valores.aceite_agregado_litros);
    this.mensaje.set('');
    this.conflicto.set(false);
    this.editando.set(true);
  }

  protected cerrar(): void {
    this.editando.set(false);
    this.mensaje.set('');
  }

  protected guardar(formulario: HTMLFormElement): void {
    const anterior = this.original();
    const baches = this.baches();
    const litros = this.litros();
    if (
      this.ocupado() ||
      this.conflicto() ||
      !this.pendiente() ||
      !formulario.reportValidity() ||
      !anterior ||
      baches === null ||
      litros === null
    )
      return;
    const r = this.registro();
    this.ocupado.set(true);
    this.ordenes
      .corregirBatch(r.orden_id, r.id, anterior, {
        cantidad_baches: baches,
        aceite_agregado_litros: litros,
      })
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (registro) => {
          this.guardado.emit(registro);
          this.cerrar();
          this.mensaje.set('Corrección guardada.');
        },
        error: (error) => {
          this.conflicto.set(error.status === 409);
          this.mensaje.set(
            this.conflicto()
              ? 'Otra persona corrigió el registro. Carga los valores actuales antes de continuar.'
              : 'No se pudo guardar la corrección. Tus valores siguen en el formulario.',
          );
        },
      });
  }

  protected recargar(): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.ordenes
      .detalle(this.registro().orden_id)
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (detalle) => {
          this.cerrar();
          this.recargado.emit(detalle);
          this.mensaje.set('Registro actualizado.');
        },
        error: () => this.mensaje.set('No se pudo cargar el registro. Inténtalo de nuevo.'),
      });
  }
}
