import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { DensidadVigente, Horno, MuestraDensidad } from '../../core/modelos/catalogos.model';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';

/**
 * Muestreos de densidad del aceite.
 */
@Component({
  selector: 'app-densidad-aceite',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    BotonComponent,
    CargandoComponent,
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
            <span>Densidad del Aceite</span>
            <span class="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-extrabold text-amber-800 border border-amber-200">
              🛢️ Control Volumétrico
            </span>
          </h1>
          <p class="mt-1 text-sm text-slate-500 font-medium">
            Muestreos por horno para el cálculo preciso de absorción y kilos de aceite consumidos.
          </p>
        </div>
      </header>

      <!-- Seccion 1: Tarjetas de Densidad Vigente por Horno -->
      <div class="space-y-4">
        <h2 class="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <span>📊 Densidad Vigente por Horno</span>
        </h2>

        @if (cargando()) {
          <div class="p-8 rounded-3xl border border-slate-200/90 bg-white">
            <app-cargando texto="Cargando densidades vigentes…" />
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (vigente of vigentes(); track vigente.horno_id) {
              <div class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
                <div class="flex items-center justify-between gap-3 mb-3">
                  <span class="text-sm font-bold text-slate-900">{{ vigente.horno_nombre }}</span>
                  <span class="text-[11px] font-mono font-semibold text-slate-400">
                    {{ vigente.fecha ? (vigente.fecha | date: 'dd/MM/yyyy') : 'Sin fecha' }}
                  </span>
                </div>
                <div class="mt-2 flex items-baseline gap-2">
                  @if (vigente.densidad_kg_por_litro !== null) {
                    <span class="text-2xl font-black font-mono text-sky-700">
                      {{ vigente.densidad_kg_por_litro | number: '1.0-4' }}
                    </span>
                    <span class="text-xs font-bold text-slate-500">kg/L</span>
                  } @else {
                    <span class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                      ⚠️ Sin muestras registradas
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Seccion 2: Grid 2 Columnas para Registrar Muestra e Historial -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Columna Izquierda: Formulario de Registro de Muestra -->
        <div class="lg:col-span-5">
          <div class="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs transition-all">
            <div class="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 text-xs">
                  🧪
                </span>
                Registrar Nueva Muestra
              </h2>
            </div>

            <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-4.5">
              <div>
                <label class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block" for="horno">Horno</label>
                <select id="horno" class="campo" formControlName="horno_id">
                  <option [ngValue]="null" disabled>Selecciona un horno…</option>
                  @for (horno of hornos(); track horno.id) {
                    <option [ngValue]="horno.id">{{ horno.nombre }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block" for="fecha">Fecha de la Muestra</label>
                <input id="fecha" type="date" class="campo font-mono" formControlName="fecha" />
              </div>

              <div>
                <label class="etiqueta text-xs font-bold text-slate-700 mb-1.5 block" for="densidad">Densidad Medida (kg/L)</label>
                <input
                  id="densidad"
                  type="number"
                  inputmode="decimal"
                  step="0.0001"
                  min="0.0001"
                  max="2"
                  placeholder="Ej. 0.9180"
                  class="campo font-mono"
                  formControlName="densidad_kg_por_litro"
                />
              </div>

              <div class="pt-2">
                <app-boton tipo="submit" variante="primario" [anchoCompleto]="true" [cargando]="enviando()">
                  Guardar Muestra de Densidad
                </app-boton>
              </div>
            </form>
          </div>
        </div>

        <!-- Columna Derecha: Historial de Muestras -->
        <div class="lg:col-span-7">
          <div class="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Historial de Muestras Registradas
              </h3>
              <span class="text-xs text-slate-500 font-medium">
                Total: {{ muestras().length }}
              </span>
            </div>

            @if (muestras().length === 0) {
              <p class="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                Todavía no hay muestras registradas en el historial.
              </p>
            } @else {
              <div class="overflow-x-auto">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th class="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">Fecha</th>
                      <th class="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Horno</th>
                      <th class="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-right font-mono">Densidad (kg/L)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (muestra of muestras(); track muestra.id) {
                      <tr class="hover:bg-sky-50/40 transition-colors">
                        <td class="py-4 px-6 font-mono font-bold text-slate-800 text-xs">
                          {{ muestra.fecha | date: 'dd/MM/yyyy' }}
                        </td>
                        <td class="py-4 px-4 font-bold text-slate-900 text-sm">
                          {{ nombreHorno(muestra.horno_id) }}
                        </td>
                        <td class="py-4 px-6 text-right font-mono font-bold text-sky-700 text-sm">
                          {{ muestra.densidad_kg_por_litro | number: '1.0-4' }} kg/L
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
  `,
})
export class DensidadAceitePage {
  private readonly fb = inject(FormBuilder);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly hornos = signal<Horno[]>([]);
  protected readonly vigentes = signal<DensidadVigente[]>([]);
  protected readonly muestras = signal<MuestraDensidad[]>([]);

  protected readonly formulario = this.fb.group({
    horno_id: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.nonNullable.control(new Date().toISOString().slice(0, 10), Validators.required),
    densidad_kg_por_litro: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.0001),
    ]),
  });

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    forkJoin({
      hornos: this.catalogos.listarHornos(),
      vigentes: this.catalogos.densidadesVigentes(),
      muestras: this.catalogos.listarMuestrasDensidad(),
    }).subscribe({
      next: ({ hornos, vigentes, muestras }) => {
        this.hornos.set(hornos);
        this.vigentes.set(vigentes);
        this.muestras.set(muestras);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected nombreHorno(hornoId: number): string {
    return this.hornos().find((horno) => horno.id === hornoId)?.nombre ?? '—';
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    this.enviando.set(true);
    this.catalogos
      .registrarMuestraDensidad({
        horno_id: valores.horno_id!,
        fecha: valores.fecha,
        densidad_kg_por_litro: Number(valores.densidad_kg_por_litro),
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.avisos.exito('Muestra registrada.');
          this.formulario.controls.densidad_kg_por_litro.reset();
          this.cargar();
        },
        error: () => this.enviando.set(false),
      });
  }
}
