/**
 * kokoro-tts.service.ts
 *
 * Servicio Angular para reproducción de audio en tiempo real usando Kokoro-82M.
 *
 * ESTRATEGIA ANTI-ENTRECORTADO:
 * ─────────────────────────────
 * Usa una cola de AudioBuffers con pre-carga en paralelo ("pipeline").
 * Mientras el usuario escucha la frase N, las frases N+1 y N+2 ya se están
 * descargando en background. Al terminar la frase N, la N+1 arranca
 * en CERO milisegundos porque ya está decodificada en RAM como AudioBuffer.
 *
 * Esto elimina los gaps entre frases causados por latencia de red.
 */

import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class KokoroTtsService {
  private api = inject(ApiService);

  // ── Estado público ────────────────────────────────────────────────────
  /** Emite `true` cuando hay audio reproduciéndose. */
  isSpeaking$ = new BehaviorSubject<boolean>(false);
  /** Emite el índice de la frase actual (útil para resaltado visual). */
  currentSentenceIdx$ = new BehaviorSubject<number>(-1);
  /** Emite el balance de tinta actualizado tras cada frase. */
  inkBalance$ = new BehaviorSubject<number | null>(null);
  /** Emite mensajes de error para mostrar en la UI. */
  error$ = new BehaviorSubject<string | null>(null);

  // ── Estado interno ────────────────────────────────────────────────────
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  /** Cola de AudioBuffers ya decodificados y listos para reproducir. */
  private audioQueue: Array<{ buffer: AudioBuffer; sentenceIdx: number }> = [];
  /** Promesas de descarga en vuelo (para no cancelarlas dos veces). */
  private fetchPromises: Promise<void>[] = [];

  private isStopped = false;
  private isPlayingQueue = false;
  private avatarId: number | null = null;

  // ── API Pública ───────────────────────────────────────────────────────

  /**
   * Divide `fullText` en frases, las pre-carga en paralelo y las reproduce
   * de forma continua sin gaps entre ellas.
   */
  async speak(fullText: string, avatarId: number): Promise<void> {
    this.stop();
    this.isStopped = false;
    this.avatarId = avatarId;
    this.error$.next(null);

    const sentences = this.splitIntoSentences(fullText);
    if (sentences.length === 0) return;

    this.isSpeaking$.next(true);

    // Pre-cargar la primera frase para arrancar rápido
    const firstBuffer = await this.fetchAudioBuffer(sentences[0], 0);
    if (this.isStopped) return;

    if (firstBuffer) {
      this.audioQueue.push(firstBuffer);
      this.playNextInQueue();
    }

    // Pre-cargar el resto en paralelo (pipeline de 2 en 2 para ahorrar RAM)
    this.prefetchPipeline(sentences.slice(1), avatarId);
  }

  /**
   * Detiene la reproducción inmediatamente y limpia todos los recursos.
   */
  stop(): void {
    this.isStopped = true;
    this.isPlayingQueue = false;
    this.audioQueue = [];
    this.fetchPromises = [];
    this.avatarId = null;

    if (this.currentSource) {
      try { this.currentSource.stop(); } catch (_) {}
      this.currentSource.onended = null;
      this.currentSource = null;
    }

    this.isSpeaking$.next(false);
    this.currentSentenceIdx$.next(-1);
  }

  // ── Lógica interna ────────────────────────────────────────────────────

  /**
   * Pipeline de pre-carga: descarga frases de 2 en 2 en paralelo.
   * No espera a que termine la descarga de un lote para empezar el siguiente.
   */
  private async prefetchPipeline(sentences: string[], avatarId: number): Promise<void> {
    const BATCH_SIZE = 2;
    for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
      if (this.isStopped) return;

      const batch = sentences.slice(i, i + BATCH_SIZE);
      const startIdx = i + 1; // +1 porque la frase 0 ya se cargó en speak()

      const results = await Promise.all(
        batch.map((s, j) => this.fetchAudioBuffer(s, startIdx + j))
      );

      for (const result of results) {
        if (this.isStopped) return;
        if (result) {
          this.audioQueue.push(result);
          // Si el reproductor ya paró esperando datos, reanudarlo
          if (!this.isPlayingQueue) {
            this.playNextInQueue();
          }
        }
      }
    }
  }

  /**
   * Reproductor de la cola. Al terminar cada frase, saca la siguiente
   * inmediatamente (sin setTimeout, sin gaps).
   */
  private playNextInQueue(): void {
    if (this.isStopped) return;

    if (this.audioQueue.length === 0) {
      // Cola vacía — el pipeline quizás aún está descargando
      this.isPlayingQueue = false;
      // Si ya no hay nada en vuelo, la reproducción terminó
      if (this.fetchPromises.length === 0) {
        this.isSpeaking$.next(false);
        this.currentSentenceIdx$.next(-1);
      }
      return;
    }

    this.isPlayingQueue = true;
    const item = this.audioQueue.shift()!;
    this.currentSentenceIdx$.next(item.sentenceIdx);

    // Crear o reutilizar el AudioContext del navegador
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = item.buffer;
    source.connect(this.audioCtx.destination);
    this.currentSource = source;

    // Al terminar ESTA frase → reproducir la SIGUIENTE inmediatamente
    source.onended = () => {
      if (!this.isStopped) {
        this.playNextInQueue();
      }
    };

    source.start(0);
  }

  private async fetchAudioBuffer(
    sentence: string,
    sentenceIdx: number
  ): Promise<{ buffer: AudioBuffer; sentenceIdx: number } | null> {
    if (!sentence.trim() || this.isStopped) return null;

    const hfApiUrl = 'https://josuejheymi-kokoro-api.hf.space/v1/audio/speech';

    const fetchPromise = fetch(hfApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "kokoro",
        input: sentence,
        voice: "af_bella", // Voz por defecto, puedes cambiarla
        response_format: "mp3",
        speed: 1.0
      })
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HF API error: ${response.status}`);
      }
      if (this.isStopped) return null;

      const arrayBuffer = await response.arrayBuffer();

      try {
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
          this.audioCtx = new AudioContext();
        }

        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        return { buffer: audioBuffer, sentenceIdx };
      } catch (decodeErr) {
        console.warn('[KokoroTTS] Error decodificando audio para frase:', sentence, decodeErr);
        return null;
      }
    }).catch((err) => {
      console.warn('[KokoroTTS] Error en frase:', sentence, err);
      return null;
    });

    return fetchPromise as Promise<{ buffer: AudioBuffer; sentenceIdx: number } | null>;
  }

  /**
   * Divide el texto completo del personaje en frases cortas y manejables.
   * Respeta puntuación natural del español y elimina artefactos de markdown.
   */
  private splitIntoSentences(text: string): string[] {
    // 1. Limpiar markdown y artefactos de LLM
    let clean = text
      .replace(/\*{1,2}(.*?)\*{1,2}/g, '$1')   // **bold** → bold
      .replace(/_{1,2}(.*?)_{1,2}/g, '$1')        // _italic_ → italic
      .replace(/\[.*?\]/g, '')                     // [acción] → vacío
      .replace(/^\s*#+\s*/gm, '')                 // # Títulos → vacío
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return [];

    // 2. Dividir por punto, exclamación, interrogación seguidos de espacio
    // Usar lookahead para no perder el signo de puntuación
    const raw = clean.split(/(?<=[.!?¿¡])\s+/);

    // 3. Filtrar y truncar frases muy largas o muy cortas
    return raw
      .map(s => s.trim())
      .filter(s => s.length >= 4)
      .flatMap(s => {
        // Si la frase sigue siendo muy larga (ej. sin puntuación), dividir por coma
        if (s.length > 350) {
          return s.split(/(?<=,)\s+/).map(sub => sub.trim()).filter(sub => sub.length >= 4);
        }
        return [s];
      })
      .map(s => s.length > 500 ? s.substring(0, 497) + '.' : s);
  }
}
