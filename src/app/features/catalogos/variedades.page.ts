import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { Linea, Variedad } from '../../core/modelos/catalogos.model';
import { CatalogosService } from '../../core/servicios/catalogos.service';
import { NotificacionesService } from '../../core/servicios/notificaciones.service';
import { BotonComponent } from '../../ui/boton.component';
import { CargandoComponent } from '../../ui/cargando.component';

/**
 * Tipos de materia prima por línea (Hartón, FHIA 21...). El supervisor
 * escoge uno al montar la orden en las líneas que lo piden. Aquí se agregan,
 * se corrigen los nombres mal escritos y se desactivan.
 */
@Component({
  selector: 'app-variedades',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, BotonComponent, CargandoComponent],
  template: `
    <div class="pagina-contenido mx-auto max-w-4xl">
      <header class="border-b border-slate-200/80 pb-5">
        <a
          routerLink="/catalogos"
          class="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900"
          >← Volver a Catálogos Maestros</a
        >
        <h1 class="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Tipos de Materia Prima
        </h1>
        <p class="mt-1 text-sm font-medium text-slate-500">
          Variedades que el supervisor escoge al montar la orden (por ejemplo, el plátano Hartón o
          FHIA 21).
        </p>
      </header>

      @if (cargando()) {
        <app-cargando texto="Cargando tipos…" />
      } @else {
        @for (linea of lineasConVariedad(); track linea.id) {
          <section
            class="mt-6 rounded-3xl border border-slate-200 bg-white p-5"
            [attr.data-testid]="'variedades-' + linea.codigo"
          >
            <h2 class="text-lg font-extrabold text-slate-900">{{ linea.nombre }}</h2>
            <ul class="mt-3 divide-y divide-slate-100">
              @for (variedad of variedadesDe(linea.id); track variedad.id) {
                <li class="flex flex-wrap items-center justify-between gap-3 py-3">
                  @if (editandoId() === variedad.id) {
                    <input
                      class="campo flex-1"
                      [(ngModel)]="nombreEditado"
                      aria-label="Nombre del tipo"
                      (keydown.enter)="guardarNombre(variedad)"
                    />
                    <div class="flex gap-2">
                      <app-boton variante="secundario" (click)="editandoId.set(null)"
                        >Cancelar</app-boton
                      >
                      <app-boton [cargando]="enviando()" (click)="guardarNombre(variedad)"
                        >Guardar</app-boton
                      >
                    </div>
                  } @else {
                    <span
                      class="font-bold"
                      [class]="variedad.activo ? 'text-slate-900' : 'text-slate-400 line-through'"
                    >
                      {{ variedad.nombre }}
                    </span>
                    <div class="flex gap-2">
                      <app-boton variante="secundario" (click)="editar(variedad)"
                        >Editar nombre</app-boton
                      >
                      <app-boton variante="secundario" (click)="alternar(variedad)">
                        {{ variedad.activo ? 'Desactivar' : 'Activar' }}
                      </app-boton>
                    </div>
                  }
                </li>
              } @empty {
                <li class="py-3 text-sm text-slate-500">Aún no hay tipos en esta línea.</li>
              }
            </ul>
            <div class="mt-3 flex gap-2">
              <input
                class="campo flex-1"
                placeholder="Nuevo tipo…"
                [ngModel]="nuevo()[linea.id] ?? ''"
                (ngModelChange)="fijarNuevo(linea.id, $event)"
                [attr.aria-label]="'Nuevo tipo de ' + linea.nombre"
              />
              <app-boton [cargando]="enviando()" (click)="agregar(linea)">Agregar</app-boton>
            </div>
          </section>
        } @empty {
          <p
            class="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"
          >
            Ninguna línea pide tipo de materia prima.
          </p>
        }
      }
    </div>
  `,
})
export class VariedadesPage {
  private readonly catalogos = inject(CatalogosService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly lineas = signal<Linea[]>([]);
  protected readonly variedades = signal<Variedad[]>([]);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly nuevo = signal<Record<number, string>>({});
  protected nombreEditado = '';

  protected readonly lineasConVariedad = computed(() =>
    this.lineas().filter(
      (l) => l.pide_variedad || this.variedades().some((v) => v.linea_id === l.id),
    ),
  );

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    forkJoin({
      lineas: this.catalogos.listarLineas(),
      variedades: this.catalogos.listarVariedades(),
    }).subscribe({
      next: ({ lineas, variedades }) => {
        this.lineas.set(lineas);
        this.variedades.set(variedades);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected variedadesDe(lineaId: number): Variedad[] {
    return this.variedades().filter((v) => v.linea_id === lineaId);
  }

  protected fijarNuevo(lineaId: number, texto: string): void {
    this.nuevo.update((n) => ({ ...n, [lineaId]: texto }));
  }

  protected editar(variedad: Variedad): void {
    this.nombreEditado = variedad.nombre;
    this.editandoId.set(variedad.id);
  }

  private reemplazar(cambiada: Variedad): void {
    this.variedades.update((lista) => lista.map((v) => (v.id === cambiada.id ? cambiada : v)));
  }

  protected guardarNombre(variedad: Variedad): void {
    const nombre = this.nombreEditado.trim();
    if (!nombre) {
      this.avisos.error('Escribe el nombre del tipo.');
      return;
    }
    this.enviando.set(true);
    this.catalogos
      .actualizarVariedad(variedad.id, {
        linea_id: variedad.linea_id,
        nombre,
        activo: variedad.activo,
      })
      .subscribe({
        next: (cambiada) => {
          this.enviando.set(false);
          this.editandoId.set(null);
          this.reemplazar(cambiada);
          this.avisos.exito('Nombre corregido.');
        },
        error: () => this.enviando.set(false),
      });
  }

  protected alternar(variedad: Variedad): void {
    this.catalogos
      .actualizarVariedad(variedad.id, {
        linea_id: variedad.linea_id,
        nombre: variedad.nombre,
        activo: !variedad.activo,
      })
      .subscribe({ next: (cambiada) => this.reemplazar(cambiada) });
  }

  protected agregar(linea: Linea): void {
    const nombre = (this.nuevo()[linea.id] ?? '').trim();
    if (!nombre) {
      this.avisos.error('Escribe el nombre del tipo.');
      return;
    }
    this.enviando.set(true);
    this.catalogos.crearVariedad({ linea_id: linea.id, nombre, activo: true }).subscribe({
      next: (nueva) => {
        this.enviando.set(false);
        this.variedades.update((lista) => [...lista, nueva]);
        this.fijarNuevo(linea.id, '');
        this.avisos.exito('Tipo agregado.');
      },
      error: () => this.enviando.set(false),
    });
  }
}
