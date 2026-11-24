import { DecimalPipe } from '@angular/common';
import type { OnInit} from '@angular/core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type { TipoAceite, TipoAceiteGuardar } from '../../core/modelos/catalogos.model';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';

/**
 * Tipos de aceite de fritura (V18): densidad fija y proveedor.
 * La densidad del catálogo solo se usa en un horno sin muestras de densidad.
 */
@Component({
  selector: 'app-aceites',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, BotonComponent, CargandoComponent],
  template: `
    <div class="pagina-contenido mx-auto max-w-5xl">
      <header class="border-b border-slate-200/80 pb-5">
        <a
          routerLink="/catalogos"
          class="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900"
          >← Volver a Catálogos Maestros</a
        >
        <h1 class="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Tipos de Aceite
        </h1>
        <p class="mt-1 text-sm font-medium text-slate-500">
          Aceites de fritura con su densidad (kg/L) y proveedor. Si un horno no tiene muestras de
          densidad, se usa la del aceite que tenga asignado.
        </p>
      </header>

      <form
        class="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-4"
        [formGroup]="formulario"
        (ngSubmit)="guardar()"
      >
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-xs font-bold text-slate-700" for="aceite-nombre"
            >Nombre</label
          >
          <input
            id="aceite-nombre"
            class="campo"
            formControlName="nombre"
            placeholder="Ej. Palma LS"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-bold text-slate-700" for="aceite-densidad"
            >Densidad (kg/L)</label
          >
          <input
            id="aceite-densidad"
            type="number"
            step="0.0001"
            min="0.5"
            max="1.2"
            class="campo font-mono"
            formControlName="densidad_kg_por_litro"
            placeholder="0.9100"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-bold text-slate-700" for="aceite-proveedor"
            >Proveedor</label
          >
          <input id="aceite-proveedor" class="campo" formControlName="proveedor" />
        </div>
        <label class="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" formControlName="activo" /> Activo
        </label>
        <div class="flex gap-2 sm:col-span-3 sm:justify-end">
          @if (editando()) {
            <app-boton variante="secundario" (click)="cancelar()">Cancelar</app-boton>
          }
          <app-boton tipo="submit" [cargando]="enviando()">
            {{ editando() ? 'Guardar cambios' : 'Agregar aceite' }}
          </app-boton>
        </div>
        @if (
          formulario.controls.densidad_kg_por_litro.touched &&
          formulario.controls.densidad_kg_por_litro.invalid
        ) {
          <p class="text-sm font-semibold text-rose-600 sm:col-span-4">
            La densidad debe estar entre 0.5 y 1.2 kg/L.
          </p>
        }
      </form>

      <section class="mt-6">
        @if (cargando()) {
          <app-cargando texto="Cargando aceites…" />
        } @else if (aceites().length === 0) {
          <p
            class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"
          >
            Aún no hay aceites registrados.
          </p>
        } @else {
          <ul class="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            @for (aceite of aceites(); track aceite.id) {
              <li class="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p class="font-extrabold text-slate-900">
                    {{ aceite.nombre }}
                    @if (!aceite.activo) {
                      <span class="ml-1 text-xs font-bold text-slate-400">(inactivo)</span>
                    }
                  </p>
                  <p class="text-sm text-slate-500">
                    {{ aceite.densidad_kg_por_litro | number: '1.4-4' }} kg/L
                    @if (aceite.proveedor) {
                      · {{ aceite.proveedor }}
                    }
                  </p>
                </div>
                <div class="flex gap-2">
                  <app-boton variante="secundario" (click)="editar(aceite)">Editar</app-boton>
                  <app-boton variante="peligro" (click)="eliminar(aceite)">Eliminar</app-boton>
                </div>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
})
export class AceitesPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly aceites = signal<TipoAceite[]>([]);
  protected readonly editando = signal<TipoAceite | null>(null);

  protected readonly formulario = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
    densidad_kg_por_litro: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.5001),
      Validators.max(1.1999),
    ]),
    proveedor: this.fb.control<string | null>(null),
    activo: this.fb.nonNullable.control(true),
  });

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.catalogos.listarAceites().subscribe({
      next: (aceites) => {
        this.aceites.set(aceites);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected editar(aceite: TipoAceite): void {
    this.editando.set(aceite);
    this.formulario.setValue({
      nombre: aceite.nombre,
      densidad_kg_por_litro: Number(aceite.densidad_kg_por_litro),
      proveedor: aceite.proveedor,
      activo: aceite.activo,
    });
  }

  protected cancelar(): void {
    this.editando.set(null);
    this.formulario.reset({
      nombre: '',
      densidad_kg_por_litro: null,
      proveedor: null,
      activo: true,
    });
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valores = this.formulario.getRawValue();
    const datos: TipoAceiteGuardar = {
      nombre: valores.nombre.trim(),
      densidad_kg_por_litro: Number(valores.densidad_kg_por_litro),
      proveedor: valores.proveedor?.trim() || null,
      activo: valores.activo,
    };
    const actual = this.editando();
    this.enviando.set(true);
    const peticion = actual
      ? this.catalogos.actualizarAceite(actual.id, datos)
      : this.catalogos.crearAceite(datos);
    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(actual ? 'Aceite actualizado.' : 'Aceite agregado.');
        this.cancelar();
        this.cargar();
      },
      error: () => this.enviando.set(false),
    });
  }

  protected eliminar(aceite: TipoAceite): void {
    this.catalogos.eliminarAceite(aceite.id).subscribe({
      next: () => {
        this.avisos.exito('Aceite eliminado.');
        this.cargar();
      },
    });
  }
}
