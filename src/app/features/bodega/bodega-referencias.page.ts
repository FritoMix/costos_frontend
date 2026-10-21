import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type { ReferenciaPapa, ReferenciaPapaGuardar } from '../../core/modelos/bodega.model';
import { BodegaService } from '../../core/servicios/bodega.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { ConfirmarComponent } from '../../ui/confirmar.component';

/**
 * Catalogo de referencias de papa para Bodega.
 *
 * El peso promedio de cada bulto es la base del calculo de kilos crudos del
 * horno. Al corregirlo, las tandas ya registradas conservan el peso con el
 * que se calcularon.
 */
@Component({
  selector: 'app-bodega-referencias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    BotonComponent,
    CargandoComponent,
    ConfirmarComponent,
  ],
  template: `
    <div class="mx-auto max-w-6xl space-y-8">
      <header
        class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <a
            routerLink="/inicio"
            class="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Volver al inicio
          </a>
          <h1
            class="flex flex-wrap items-center gap-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl"
          >
            <span>Bodega de Papa</span>
            <span
              class="rounded-full border border-lime-200 bg-lime-100 px-3 py-0.5 text-xs font-extrabold text-lime-800"
            >
              {{ activas() }} activas
            </span>
          </h1>
          <p class="mt-1 max-w-2xl text-sm font-medium text-slate-500">
            Crea las referencias de papa y registra el peso promedio de cada bulto. El operario de
            horno elige una referencia al registrar la tanda.
          </p>
        </div>
      </header>

      <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <!-- Formulario -->
        <section class="lg:col-span-5">
          <div class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-7">
            <div class="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 class="flex items-center gap-2 text-base font-bold text-slate-900">
                <span
                  class="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-100 text-xs text-lime-800"
                >
                  {{ editando() ? '✏️' : '➕' }}
                </span>
                {{ editando() ? 'Corregir referencia' : 'Nueva referencia' }}
              </h2>
              @if (editando()) {
                <span
                  class="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"
                >
                  Modo edición
                </span>
              }
            </div>

            <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-5">
              <div>
                <label class="etiqueta text-xs font-bold text-slate-700" for="nombre">
                  Nombre de la referencia
                </label>
                <input
                  id="nombre"
                  type="text"
                  class="campo"
                  data-testid="bodega-nombre"
                  placeholder="Ej. Papa Criolla, Pastusa, Capiro"
                  formControlName="nombre"
                />
                <p class="ayuda">El nombre debe ser único para no confundir referencias.</p>
              </div>

              <div>
                <label class="etiqueta text-xs font-bold text-slate-700" for="peso">
                  Peso promedio por bulto (kg)
                </label>
                <div class="relative">
                  <input
                    id="peso"
                    type="number"
                    inputmode="decimal"
                    step="0.01"
                    min="0.01"
                    max="9999.99"
                    class="campo pr-16 font-mono"
                    data-testid="bodega-peso"
                    placeholder="Ej. 50.00"
                    formControlName="peso_promedio_bulto_kg"
                  />
                  <span
                    class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-bold text-slate-400"
                  >
                    kg / bulto
                  </span>
                </div>
                <p class="ayuda">
                  El operario verá este peso al elegir la referencia. Las tandas anteriores no se
                  recalculan.
                </p>
              </div>

              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                <label class="flex cursor-pointer select-none items-center justify-between">
                  <div>
                    <span class="block text-xs font-bold text-slate-800">Referencia activa</span>
                    <span class="text-[11px] font-medium text-slate-500">
                      Disponible para nuevas tandas de horno
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    formControlName="activo"
                    class="h-5 w-5 cursor-pointer rounded border-slate-300 text-marca-600 focus:ring-marca-500"
                  />
                </label>
              </div>

              <div class="flex items-center gap-3 pt-1">
                <app-boton
                  tipo="submit"
                  variante="primario"
                  [anchoCompleto]="true"
                  [cargando]="enviando()"
                  testId="guardar-referencia"
                >
                  {{ editando() ? 'Guardar cambios' : 'Registrar referencia' }}
                </app-boton>
                @if (editando()) {
                  <app-boton variante="secundario" (click)="cancelarEdicion()">Cancelar</app-boton>
                }
              </div>
            </form>
          </div>
        </section>

        <!-- Listado -->
        <section class="lg:col-span-7">
          <div class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
            <div
              class="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4"
            >
              <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700">
                Referencias registradas
              </h2>
              <span class="text-xs font-medium text-slate-500"
                >Total: {{ referencias().length }}</span
              >
            </div>

            @if (cargando()) {
              <div class="p-8">
                <app-cargando texto="Cargando referencias de papa…" />
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th
                        class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Referencia
                      </th>
                      <th
                        class="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Peso / bulto
                      </th>
                      <th
                        class="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Estado
                      </th>
                      <th
                        class="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (referencia of referencias(); track referencia.id) {
                      <tr
                        class="transition-colors hover:bg-lime-50/40"
                        [attr.data-testid]="'referencia-' + referencia.id"
                      >
                        <td class="px-6 py-4">
                          <p class="text-sm font-bold text-slate-900">{{ referencia.nombre }}</p>
                          <p class="mt-0.5 text-[11px] font-medium text-slate-400">
                            Creada {{ referencia.fecha_creacion | date: 'dd/MM/yyyy' }}
                          </p>
                        </td>
                        <td class="px-4 py-4 text-right font-mono text-sm font-bold text-slate-800">
                          {{ referencia.peso_promedio_bulto_kg | number: '1.2-2' }} kg
                        </td>
                        <td class="px-4 py-4">
                          @if (referencia.activo) {
                            <span
                              class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800"
                            >
                              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                              Activa
                            </span>
                          } @else {
                            <span
                              class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"
                            >
                              <span class="h-2 w-2 rounded-full bg-slate-400"></span>
                              Inactiva
                            </span>
                          }
                        </td>
                        <td class="whitespace-nowrap px-6 py-4 text-right">
                          <div class="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              class="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-lime-200/80 bg-lime-50 px-3 py-1.5 text-xs font-bold text-lime-800 transition-all hover:bg-lime-100 hover:text-lime-900"
                              (click)="editar(referencia)"
                            >
                              ✏️ Corregir
                            </button>
                            <button
                              type="button"
                              class="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-rose-200/80 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition-all hover:bg-rose-100 hover:text-rose-900"
                              (click)="aEliminar.set(referencia)"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td
                          colspan="4"
                          class="px-6 py-12 text-center text-sm font-medium text-slate-400"
                        >
                          Todavía no hay referencias de papa. Crea la primera con el formulario.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <div
            class="mt-4 rounded-2xl border border-lime-200/70 bg-lime-50/60 px-5 py-4 text-xs font-medium text-lime-900"
          >
            <p class="font-bold">¿Cómo se usa este peso?</p>
            <p class="mt-1 leading-relaxed">
              Al registrar una tanda, el operario elige la referencia. El sistema calcula
              <span class="font-mono font-bold">kg crudos = bultos × peso promedio</span> y guarda
              una copia de ese peso en el registro.
            </p>
          </div>
        </section>
      </div>
    </div>

    <app-confirmar
      [abierto]="aEliminar() !== null"
      [titulo]="'¿Eliminar ' + (aEliminar()?.nombre ?? '') + '?'"
      mensaje="Solo se puede eliminar si no tiene tandas de horno registradas. Si ya se usó, desactívala para conservar el histórico."
      textoConfirmar="Sí, eliminar"
      [peligroso]="true"
      (confirmado)="eliminar()"
      (cancelado)="aEliminar.set(null)"
    />
  `,
})
export class BodegaReferenciasPage {
  private readonly fb = inject(FormBuilder);
  private readonly bodega = inject(BodegaService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly referencias = signal<ReferenciaPapa[]>([]);
  protected readonly editando = signal<ReferenciaPapa | null>(null);
  protected readonly aEliminar = signal<ReferenciaPapa | null>(null);

  protected readonly activas = computed(() => this.referencias().filter((r) => r.activo).length);

  protected readonly formulario = this.fb.group({
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    peso_promedio_bulto_kg: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(9999.99),
    ]),
    activo: this.fb.nonNullable.control(true),
  });

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.bodega.listar(false, true).subscribe({
      next: (referencias) => {
        this.referencias.set(referencias);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected editar(referencia: ReferenciaPapa): void {
    this.editando.set(referencia);
    this.formulario.setValue({
      nombre: referencia.nombre,
      peso_promedio_bulto_kg: Number(referencia.peso_promedio_bulto_kg),
      activo: referencia.activo,
    });
  }

  protected cancelarEdicion(): void {
    this.editando.set(null);
    this.formulario.reset({ nombre: '', peso_promedio_bulto_kg: null, activo: true });
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos: ReferenciaPapaGuardar = {
      nombre: valores.nombre.trim(),
      peso_promedio_bulto_kg: Number(valores.peso_promedio_bulto_kg),
      activo: valores.activo,
    };

    const editando = this.editando();
    this.enviando.set(true);
    const peticion = editando
      ? this.bodega.actualizar(editando.id, datos)
      : this.bodega.crear(datos);

    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(editando ? 'Referencia actualizada.' : 'Referencia registrada.');
        this.cancelarEdicion();
        this.cargar();
      },
      error: () => this.enviando.set(false),
    });
  }

  protected eliminar(): void {
    const referencia = this.aEliminar();
    this.aEliminar.set(null);
    if (!referencia) {
      return;
    }

    this.bodega.eliminar(referencia.id).subscribe(() => {
      this.avisos.exito(`"${referencia.nombre}" eliminada.`);
      this.cargar();
    });
  }
}
