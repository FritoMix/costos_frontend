import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { ItemCatalogo } from '../../core/modelos/catalogos.model';
import type { DetalleOrden, RegistroHornoGuardar } from '../../core/modelos/produccion.model';
import { AuthService } from '../../core/servicios/auth.service';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { OrdenesService } from '../../core/servicios/ordenes.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';
import { TarjetaComponent } from '../../ui/tarjeta.component';

/**
 * Registro de una tanda de fritura.
 *
 * Al operario solo se le piden los datos que mide: la fecha, la orden y su
 * propio nombre los pone la app. Los kilos crudos y el aceite consumido se
 * calculan en el servidor con los valores vigentes de la planta.
 */
@Component({
  selector: 'app-horno-registro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    TarjetaComponent,
    BotonComponent,
    CargandoComponent,
  ],
  template: `
    @if (cargando()) {
      <app-cargando texto="Cargando estación de fritura…" />
    } @else if (detalle(); as datos) {
      <div class="mx-auto max-w-3xl space-y-6">
        <header>
          <a routerLink="/horno" class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            Volver a órdenes de horno
          </a>
          <h1 class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {{ editandoId() ? 'Corregir Tanda de Horno' : 'Registro de Tanda de Fritura' }}
          </h1>
          <p class="mt-1 text-sm font-semibold text-slate-600">
            Orden <span class="font-mono text-slate-900">#{{ datos.orden.numero_orden }}</span> · {{ datos.orden.producto.nombre_comercial }} · <span class="text-marca-700 font-bold">{{ datos.orden.horno.nombre }}</span>
          </p>
        </header>

        <app-tarjeta>
          <form [formGroup]="formulario" (ngSubmit)="guardar()" class="space-y-6">
            <!-- Horario y Materia Prima -->
            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label class="etiqueta" for="hora_inicio">Hora de Inicio</label>
                <input id="hora_inicio" type="time" class="campo" formControlName="hora_inicio" />
              </div>
              <div>
                <label class="etiqueta" for="hora_fin">Hora de Fin</label>
                <input id="hora_fin" type="time" class="campo" formControlName="hora_fin" />
                <p class="ayuda">Si cruza medianoche, el sistema calcula la duración automáticamente.</p>
              </div>

              <div>
                <label class="etiqueta" for="bultos">Bultos de Papa Cruda</label>
                <input
                  id="bultos"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej. 10.00"
                  class="campo"
                  formControlName="cantidad_bultos"
                />
              </div>
              <div>
                <label class="etiqueta" for="temperatura">Temperatura del Aceite (°C)</label>
                <input
                  id="temperatura"
                  type="number"
                  inputmode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="Ej. 175.5"
                  class="campo"
                  formControlName="temperatura_aceite_c"
                />
              </div>

              <div>
                <label class="etiqueta" for="op_seleccion">Operarios en Selección</label>
                <input
                  id="op_seleccion"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  placeholder="Ej. 2"
                  class="campo"
                  formControlName="operarios_seleccion"
                />
              </div>
              <div>
                <label class="etiqueta" for="op_horno">Operarios en Horno</label>
                <input
                  id="op_horno"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  placeholder="Ej. 1"
                  class="campo"
                  formControlName="operarios_horno"
                />
              </div>

              <div>
                <label class="etiqueta" for="nivel_inicial">Nivel Inicial de Aceite (cm)</label>
                <input
                  id="nivel_inicial"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="Ej. 45.00"
                  class="campo"
                  formControlName="nivel_aceite_inicial_cm"
                />
              </div>
              <div>
                <label class="etiqueta" for="nivel_final">Nivel Final de Aceite (cm)</label>
                <input
                  id="nivel_final"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="Ej. 42.50"
                  class="campo"
                  formControlName="nivel_aceite_final_cm"
                />
                <p class="ayuda font-mono font-semibold text-slate-700">
                  Consumo estimado: {{ diferenciaAceite() | number: '1.0-2' }} cm
                </p>
              </div>
            </div>

            <!-- Desperdicio -->
            <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Registro de Desperdicio (Opcional)
                </h3>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="etiqueta" for="tipo_desperdicio">Tipo de Desperdicio</label>
                  <select
                    id="tipo_desperdicio"
                    class="campo bg-white"
                    formControlName="tipo_desperdicio_id"
                  >
                    <option [ngValue]="null">Sin desperdicio</option>
                    @for (tipo of tiposDesperdicio(); track tipo.id) {
                      <option [ngValue]="tipo.id">{{ tipo.nombre }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="etiqueta" for="cantidad_desperdicio">Cantidad Desperdicio (kg)</label>
                  <input
                    id="cantidad_desperdicio"
                    type="number"
                    inputmode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="campo bg-white"
                    formControlName="cantidad_desperdicio_kg"
                  />
                </div>
                <div class="sm:col-span-2">
                  <label class="etiqueta" for="obs_desperdicio">Motivo u Observación del Desperdicio</label>
                  <input
                    id="obs_desperdicio"
                    type="text"
                    placeholder="Ej. Papa quemada o defecto de corte"
                    class="campo bg-white"
                    formControlName="observacion_desperdicio"
                  />
                </div>
              </div>
            </div>

            <div>
              <label class="etiqueta" for="observaciones">Observaciones Generales de la Tanda</label>
              <textarea
                id="observaciones"
                rows="2"
                placeholder="Novedades de línea, presión de gas o estado de la materia prima..."
                class="campo"
                formControlName="observaciones"
              ></textarea>
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-2">
              <app-boton tipo="submit" variante="primario" tamano="grande" [cargando]="enviando()">
                {{ editandoId() ? 'Guardar Corrección' : 'Guardar Tanda' }}
              </app-boton>
              @if (editandoId()) {
                <app-boton variante="secundario" (click)="cancelarEdicion()">
                  Cancelar Corrección
                </app-boton>
              }
            </div>
          </form>
        </app-tarjeta>

        <app-tarjeta titulo="Tandas Registradas en esta Orden" [sinRelleno]="true">
          @if (datos.registros_horno.length === 0) {
            <p class="px-5 py-8 text-center text-sm text-slate-400">Todavía no hay tandas registradas.</p>
          } @else {
            <ul class="divide-y divide-slate-100">
              @for (registro of datos.registros_horno; track registro.id) {
                <li class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50/70 transition">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-xs font-bold text-slate-700">
                        {{ registro.hora_inicio | date: 'HH:mm' }} – {{ registro.hora_fin | date: 'HH:mm' }}
                      </span>
                      <span class="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200/60 font-mono">
                        {{ registro.cantidad_bultos | number: '1.0-2' }} bultos
                      </span>
                    </div>
                    <p class="mt-1 text-xs text-slate-500 font-medium">
                      <span class="font-bold text-slate-800">{{ registro.kg_crudos_calculados | number: '1.0-2' }} kg crudos</span> ·
                      @if (registro.kg_aceite_consumido !== null) {
                        <span class="font-mono text-slate-700 font-bold">{{ registro.kg_aceite_consumido | number: '1.0-2' }} kg aceite</span>
                      } @else {
                        <span class="text-slate-400">Aceite sin calcular</span>
                      }
                      · Operario: {{ registro.usuario.nombre_completo }}
                    </p>
                  </div>
                  @if (puedeEditar(registro.usuario.id)) {
                    <app-boton variante="secundario" (click)="editar(registro.id)">
                      Corregir
                    </app-boton>
                  }
                </li>
              }
            </ul>
          }
        </app-tarjeta>
      </div>
    }
  `,
})
export class HornoRegistroPage {
  readonly id = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly ordenes = inject(OrdenesService);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);
  private readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly detalle = signal<DetalleOrden | null>(null);
  protected readonly tiposDesperdicio = signal<ItemCatalogo[]>([]);
  protected readonly editandoId = signal<number | null>(null);

  protected readonly formulario = this.fb.group({
    hora_inicio: this.fb.nonNullable.control('', Validators.required),
    hora_fin: this.fb.nonNullable.control('', Validators.required),
    cantidad_bultos: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    operarios_seleccion: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
    operarios_horno: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
    nivel_aceite_inicial_cm: this.fb.control<number | null>(null, Validators.required),
    nivel_aceite_final_cm: this.fb.control<number | null>(null, Validators.required),
    temperatura_aceite_c: this.fb.control<number | null>(null, Validators.required),
    observaciones: this.fb.control<string | null>(null),
    tipo_desperdicio_id: this.fb.control<number | null>(null),
    cantidad_desperdicio_kg: this.fb.control<number | null>(null),
    observacion_desperdicio: this.fb.control<string | null>(null),
  });

  private readonly valores = signal(this.formulario.getRawValue());

  protected readonly diferenciaAceite = computed(() => {
    const { nivel_aceite_inicial_cm, nivel_aceite_final_cm } = this.valores();
    return Number(nivel_aceite_inicial_cm ?? 0) - Number(nivel_aceite_final_cm ?? 0);
  });

  constructor() {
    this.formulario.valueChanges.subscribe(() => this.valores.set(this.formulario.getRawValue()));
    queueMicrotask(() => this.cargar());
  }

  private cargar(): void {
    forkJoin({
      detalle: this.ordenes.detalle(Number(this.id())),
      tipos: this.catalogos.listarTiposDesperdicio(true),
    }).subscribe({
      next: ({ detalle, tipos }) => {
        this.detalle.set(detalle);
        this.tiposDesperdicio.set(tipos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected puedeEditar(usuarioId: number): boolean {
    // El backend aplica la misma regla: solo el autor (o el admin).
    return this.auth.esAdmin() || usuarioId === this.auth.usuario()?.id;
  }

  protected editar(registroId: number): void {
    const registro = this.detalle()?.registros_horno.find((r) => r.id === registroId);
    if (!registro) {
      return;
    }
    const desperdicio = registro.desperdicios[0];
    this.editandoId.set(registroId);
    this.formulario.patchValue({
      hora_inicio: this.soloHora(registro.hora_inicio),
      hora_fin: this.soloHora(registro.hora_fin),
      cantidad_bultos: Number(registro.cantidad_bultos),
      operarios_seleccion: registro.operarios_seleccion,
      operarios_horno: registro.operarios_horno,
      nivel_aceite_inicial_cm: Number(registro.nivel_aceite_inicial_cm),
      nivel_aceite_final_cm: Number(registro.nivel_aceite_final_cm),
      temperatura_aceite_c: registro.temperatura_aceite_c ? Number(registro.temperatura_aceite_c) : null,
      observaciones: registro.observaciones,
      tipo_desperdicio_id: desperdicio?.tipo_desperdicio_id ?? null,
      cantidad_desperdicio_kg: desperdicio ? Number(desperdicio.cantidad_kg) : null,
      observacion_desperdicio: desperdicio?.observacion ?? null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected cancelarEdicion(): void {
    this.editandoId.set(null);
    this.formulario.reset({ operarios_seleccion: 0, operarios_horno: 0 });
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.avisos.error('Faltan datos por completar.');
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos: RegistroHornoGuardar = {
      hora_inicio: valores.hora_inicio,
      hora_fin: valores.hora_fin,
      cantidad_bultos: Number(valores.cantidad_bultos),
      operarios_seleccion: Number(valores.operarios_seleccion),
      operarios_horno: Number(valores.operarios_horno),
      nivel_aceite_inicial_cm: Number(valores.nivel_aceite_inicial_cm),
      nivel_aceite_final_cm: Number(valores.nivel_aceite_final_cm),
      temperatura_aceite_c: Number(valores.temperatura_aceite_c),
      observaciones: valores.observaciones,
      tipo_desperdicio_id: valores.tipo_desperdicio_id,
      cantidad_desperdicio_kg: valores.cantidad_desperdicio_kg
        ? Number(valores.cantidad_desperdicio_kg)
        : null,
      observacion_desperdicio: valores.observacion_desperdicio,
    };

    this.enviando.set(true);
    const ordenId = Number(this.id());
    const editando = this.editandoId();
    const peticion = editando
      ? this.ordenes.actualizarRegistroHorno(ordenId, editando, datos)
      : this.ordenes.crearRegistroHorno(ordenId, datos);

    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(editando ? 'Tanda corregida.' : 'Tanda registrada.');
        this.cancelarEdicion();
        this.cargar();
      },
      error: () => this.enviando.set(false),
    });
  }

  /** "2026-08-26T14:30:00-05:00" -> "14:30" (hora local del navegador). */
  private soloHora(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  }
}
