import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type { Turno, TurnoGuardar } from '../../core/modelos/catalogos.model';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { ConfirmarComponent } from '../../ui/confirmar.component';

/**
 * Turnos de la planta.
 * Detecta sola si el turno cruza la medianoche cuando la hora de fin es menor que la de inicio.
 */
@Component({
  selector: 'app-turnos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    BotonComponent,
    CargandoComponent,
    ConfirmarComponent,
  ],
  template: `
    <div class="mx-auto max-w-6xl space-y-8">
      <!-- Encabezado Espacioso -->
      <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <a routerLink="/catalogos" class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-2">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver a Catálogos Maestros
          </a>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <span>Turnos Operativos</span>
            <span class="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-extrabold text-sky-800 border border-sky-200">
              {{ turnos().length }} turnos
            </span>
          </h1>
          <p class="mt-1 text-sm text-slate-500 font-medium">
            Con estos horarios la app detecta automáticamente a qué turno pertenece cada recepción u orden.
          </p>
        </div>
      </header>

      <!-- Grid 2 Columnas Desapeñuscado -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Columna Izquierda: Formulario -->
        <div class="lg:col-span-5">
          <div class="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs transition-all">
            <div class="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 text-xs">
                  {{ editando() ? '✏️' : '⏱️' }}
                </span>
                {{ editando() ? 'Corregir Turno' : 'Agregar Turno' }}
              </h2>
              @if (editando()) {
                <span class="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  Modo Edición
                </span>
              }
            </div>

            <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-4.5">
              <div>
                <label class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block" for="nombre">Nombre del Turno</label>
                <input
                  id="nombre"
                  type="text"
                  class="campo"
                  formControlName="nombre"
                  placeholder="Ej. Turno Mañana (6 AM - 2 PM)"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block" for="inicio">Hora Inicio</label>
                  <input id="inicio" type="time" class="campo font-mono" formControlName="hora_inicio" />
                </div>
                <div>
                  <label class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block" for="fin">Hora Fin</label>
                  <input id="fin" type="time" class="campo font-mono" formControlName="hora_fin" />
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                <label class="flex items-center justify-between cursor-pointer select-none">
                  <div>
                    <span class="text-xs font-bold text-slate-800 block">Turno Activo</span>
                    <span class="text-[11px] text-slate-500 font-medium">Habilitado para asignación automática</span>
                  </div>
                  <input
                    type="checkbox"
                    formControlName="activo"
                    class="h-5 w-5 rounded border-slate-300 text-marca-600 focus:ring-marca-500 cursor-pointer"
                  />
                </label>
              </div>

              <div class="flex items-center gap-3 pt-2">
                <app-boton tipo="submit" variante="primario" [anchoCompleto]="true" [cargando]="enviando()">
                  {{ editando() ? 'Guardar Cambios' : 'Agregar Turno' }}
                </app-boton>
                @if (editando()) {
                  <app-boton variante="secundario" (click)="cancelarEdicion()">
                    Cancelar
                  </app-boton>
                }
              </div>
            </form>
          </div>
        </div>

        <!-- Columna Derecha: Tabla de Turnos -->
        <div class="lg:col-span-7">
          <div class="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Turnos Configurados
              </h3>
              <span class="text-xs text-slate-500 font-medium">
                Total: {{ turnos().length }}
              </span>
            </div>

            @if (cargando()) {
              <div class="p-8">
                <app-cargando texto="Cargando turnos…" />
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th class="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">Turno</th>
                      <th class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Horario</th>
                      <th class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                      <th class="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (turno of turnos(); track turno.id) {
                      <tr class="hover:bg-sky-50/40 transition-colors">
                        <td class="py-4 px-6 font-bold text-slate-900 text-sm">
                          {{ turno.nombre }}
                        </td>
                        <td class="py-4 px-4 whitespace-nowrap">
                          <div class="inline-flex flex-col">
                            <span class="font-mono font-bold text-slate-800 text-xs">
                              {{ turno.hora_inicio }} – {{ turno.hora_fin }}
                            </span>
                            @if (turno.cruza_medianoche) {
                              <span class="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 mt-0.5">
                                🌙 Cruza medianoche
                              </span>
                            }
                          </div>
                        </td>
                        <td class="py-4 px-4">
                          @if (turno.activo) {
                            <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/60">
                              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                              Activo
                            </span>
                          } @else {
                            <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 border border-slate-200">
                              <span class="h-2 w-2 rounded-full bg-slate-400"></span>
                              Inactivo
                            </span>
                          }
                        </td>
                        <td class="py-4 px-6 text-right whitespace-nowrap">
                          <div class="inline-flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 hover:text-sky-900 border border-sky-200/80 transition-all cursor-pointer"
                              (click)="editar(turno)"
                            >
                              ✏️ Corregir
                            </button>
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:text-rose-900 border border-rose-200/80 transition-all cursor-pointer"
                              (click)="aEliminar.set(turno)"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="px-6 py-12 text-center text-slate-400 font-medium">
                          No hay turnos configurados.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>

      </div>
    </div>

    <app-confirmar
      [abierto]="aEliminar() !== null"
      [titulo]="'¿Eliminar ' + (aEliminar()?.nombre ?? '') + '?'"
      mensaje="Solo se puede eliminar si ninguna orden ni recepción lo usa. Si ya tiene datos, desactívalo."
      textoConfirmar="Sí, eliminar"
      [peligroso]="true"
      (confirmado)="eliminar()"
      (cancelado)="aEliminar.set(null)"
    />
  `,
})
export class TurnosPage {
  private readonly fb = inject(FormBuilder);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly turnos = signal<Turno[]>([]);
  protected readonly editando = signal<Turno | null>(null);
  protected readonly aEliminar = signal<Turno | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    hora_inicio: ['06:00', Validators.required],
    hora_fin: ['14:00', Validators.required],
    activo: [true],
  });

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.catalogos.listarTurnos().subscribe({
      next: (turnos) => {
        this.turnos.set(turnos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected editar(turno: Turno): void {
    this.editando.set(turno);
    this.formulario.setValue({
      nombre: turno.nombre,
      hora_inicio: turno.hora_inicio.slice(0, 5),
      hora_fin: turno.hora_fin.slice(0, 5),
      activo: turno.activo,
    });
  }

  protected cancelarEdicion(): void {
    this.editando.set(null);
    this.formulario.reset({ nombre: '', hora_inicio: '06:00', hora_fin: '14:00', activo: true });
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = this.formulario.getRawValue() as TurnoGuardar;
    const editando = this.editando();
    this.enviando.set(true);

    const peticion = editando
      ? this.catalogos.actualizarTurno(editando.id, datos)
      : this.catalogos.crearTurno(datos);

    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(editando ? 'Turno actualizado.' : 'Turno agregado.');
        this.cancelarEdicion();
        this.cargar();
      },
      error: () => this.enviando.set(false),
    });
  }

  protected eliminar(): void {
    const turno = this.aEliminar();
    this.aEliminar.set(null);
    if (!turno) {
      return;
    }
    this.catalogos.eliminarTurno(turno.id).subscribe(() => {
      this.avisos.exito(`"${turno.nombre}" eliminado.`);
      this.cargar();
    });
  }
}
