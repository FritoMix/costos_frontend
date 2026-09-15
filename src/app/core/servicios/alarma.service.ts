import { Injectable } from '@angular/core';

/**
 * Alarma sonora de los avisos de planta.
 *
 * El sonido se GENERA en el navegador con Web Audio, no se descarga: así no
 * depende de ningún archivo externo (que además la política de seguridad del
 * sitio bloquearía) y suena igual aunque la planta esté sin internet.
 *
 * Es un patrón de dos tonos alternados —como una sirena corta— repetido
 * durante 5 segundos: se distingue del ruido de las máquinas y no se
 * confunde con el sonido de un mensaje cualquiera.
 */
@Injectable({ providedIn: 'root' })
export class AlarmaService {
  private contexto: AudioContext | null = null;
  private sonando = false;

  /** Duración total de la alarma, en segundos (requisito de planta). */
  private readonly DURACION_SEGUNDOS = 5;

  /**
   * Los navegadores no dejan sonar audio hasta que la persona interactúa con
   * la página. Como el operario entra con usuario y contraseña, aprovechamos
   * ese momento para dejar el audio listo.
   */
  prepararTrasInteraccion(): void {
    try {
      this.obtenerContexto()?.resume();
    } catch {
      // Si el navegador no lo permite todavía, no pasa nada: se reintenta
      // cuando suene la primera alarma.
    }
  }

  /** Hace sonar la alarma durante 5 segundos. */
  sonar(): void {
    // Si ya está sonando, no se encima una alarma sobre otra.
    if (this.sonando) {
      return;
    }

    const contexto = this.obtenerContexto();
    if (!contexto) {
      return;
    }

    void contexto.resume().catch(() => undefined);

    this.sonando = true;
    const inicio = contexto.currentTime;

    // Volumen general de la alarma: audible sin ser molesto.
    const volumen = contexto.createGain();
    volumen.gain.value = 0.0001;
    volumen.connect(contexto.destination);

    // Pitidos de 0.25 s con 0.25 s de silencio, alternando dos tonos.
    const duracionPitido = 0.25;
    const paso = 0.5;
    const tonos = [880, 660];

    for (let i = 0; i * paso < this.DURACION_SEGUNDOS; i++) {
      const desde = inicio + i * paso;
      const oscilador = contexto.createOscillator();
      const ganancia = contexto.createGain();

      oscilador.type = 'square';
      oscilador.frequency.value = tonos[i % tonos.length];

      // Subida y bajada suaves: evita el "clic" seco al cortar la onda.
      ganancia.gain.setValueAtTime(0.0001, desde);
      ganancia.gain.exponentialRampToValueAtTime(0.32, desde + 0.02);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, desde + duracionPitido);

      oscilador.connect(ganancia);
      ganancia.connect(volumen);
      oscilador.start(desde);
      oscilador.stop(desde + duracionPitido + 0.02);
    }

    volumen.gain.value = 1;
    setTimeout(() => (this.sonando = false), this.DURACION_SEGUNDOS * 1000);
  }

  private obtenerContexto(): AudioContext | null {
    if (this.contexto) {
      return this.contexto;
    }
    try {
      this.contexto = new AudioContext();
      return this.contexto;
    } catch {
      // Navegador sin soporte de Web Audio: la app sigue funcionando, solo
      // que el aviso entra sin sonido.
      return null;
    }
  }
}
