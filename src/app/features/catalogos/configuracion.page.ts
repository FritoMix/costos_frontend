import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';

/**
 * Valores generales de la planta.
 */
@Component({
  selector: 'app-configuracion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, BotonComponent, CargandoComponent],
  template: `
    <div class="mx-auto max-w-4xl space-y-8">
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
            <span>Configuración General de Planta</span>
          </h1>
          <p class="mt-1 text-sm text-slate-500 font-medium">
            Constantes globales de conversión y pesos estándar para cálculos automáticos de producción.
          </p>
        </div>
      </header>

      @if (cargando()) {
        <div class="p-8 rounded-3xl border border-slate-200/90 bg-white">
          <app-cargando texto="Cargando configuración vigente…" />
        </div>
      } @else {
        <div class="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-6">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <!-- Tarjeta Parámetro 1: Bulto Papa -->
              <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <div class="flex items-center gap-3 mb-2">
                    <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-base font-bold">
                      🥔
                    </span>
                    <h2 class="text-sm font-bold text-slate-900">
                      Peso Bulto Papa Cruda
                    </h2>
                  </div>
                  <p class="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                    Con este valor se calculan automáticamente los kilos crudos de cada tanda al ingresar bultos.
                  </p>
                </div>
                <div>
                  <label class="etiqueta text-xs font-bold text-slate-700 mb-1 block" for="bulto">Peso Estándar (kg)</label>
                  <div class="flex items-center gap-2">
                    <input
                      id="bulto"
                      type="number"
                      inputmode="decimal"
                      step="0.01"
                      min="0.01"
                      placeholder="Ej. 50.00"
                      class="campo flex-1 font-mono font-bold text-slate-900 bg-white"
                      formControlName="peso_estandar_bulto_kg"
                    />
                    <span class="rounded-xl bg-slate-200 px-3 py-3 font-mono text-xs font-bold text-slate-700 shrink-0">kg/bulto</span>
                  </div>
                </div>
              </div>

              <!-- Tarjeta Parámetro 2: Canastilla Backup -->
              <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <div class="flex items-center gap-3 mb-2">
                    <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-800 text-base font-bold">
                      🧺
                    </span>
                    <h2 class="text-sm font-bold text-slate-900">
                      Peso Canastilla (General)
                    </h2>
                  </div>
                  <p class="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                    Se utiliza como respaldo cuando un producto en particular no tiene asignado su propio peso específico.
                  </p>
                </div>
                <div>
                  <label class="etiqueta text-xs font-bold text-slate-700 mb-1 block" for="canastilla">Peso Estándar (kg)</label>
                  <div class="flex items-center gap-2">
                    <input
                      id="canastilla"
                      type="number"
                      inputmode="decimal"
                      step="0.01"
                      min="0.01"
                      placeholder="Ej. 10.00"
                      class="campo flex-1 font-mono font-bold text-slate-900 bg-white"
                      formControlName="peso_estandar_canastilla_kg"
                    />
                    <span class="rounded-xl bg-slate-200 px-3 py-3 font-mono text-xs font-bold text-slate-700 shrink-0">kg/canastilla</span>
                  </div>
                </div>
              </div>

            </div>

            <div class="pt-4 border-t border-slate-100 flex justify-end">
              <app-boton tipo="submit" variante="primario" tamano="grande" [cargando]="enviando()">
                Guardar Configuración General
              </app-boton>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class ConfiguracionPage {
  private readonly fb = inject(FormBuilder);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);

  protected readonly formulario = this.fb.group({
    peso_estandar_bulto_kg: this.fb.control<number | null>(null),
    peso_estandar_canastilla_kg: this.fb.control<number | null>(null),
  });

  constructor() {
    this.catalogos.verConfiguracion().subscribe({
      next: (configuracion) => {
        this.formulario.setValue({
          peso_estandar_bulto_kg: configuracion.peso_estandar_bulto_kg
            ? Number(configuracion.peso_estandar_bulto_kg)
            : null,
          peso_estandar_canastilla_kg: configuracion.peso_estandar_canastilla_kg
            ? Number(configuracion.peso_estandar_canastilla_kg)
            : null,
        });
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected guardar(): void {
    const valores = this.formulario.getRawValue();
    this.enviando.set(true);
    this.catalogos
      .guardarConfiguracion({
        peso_estandar_bulto_kg: valores.peso_estandar_bulto_kg
          ? Number(valores.peso_estandar_bulto_kg)
          : null,
        peso_estandar_canastilla_kg: valores.peso_estandar_canastilla_kg
          ? Number(valores.peso_estandar_canastilla_kg)
          : null,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.avisos.exito('Configuración guardada.');
        },
        error: () => this.enviando.set(false),
      });
  }
}
