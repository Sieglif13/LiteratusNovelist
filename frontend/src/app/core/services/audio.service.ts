import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface AudioAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface SpanishVoice {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
}

@Injectable({ providedIn: 'root' })
export class AudioService {
  private api = inject(ApiService);

  // ── Streams públicos ────────────────────────────────────────────
  private isPlayingSubject   = new BehaviorSubject<boolean>(false);
  isPlaying$ = this.isPlayingSubject.asObservable();

  private isPausedSubject    = new BehaviorSubject<boolean>(false);
  isPaused$ = this.isPausedSubject.asObservable();
  get isPaused(): boolean { return this.isPausedSubject.getValue(); }

  private wordIndexSubject   = new BehaviorSubject<number>(-1);
  currentWordIndex$ = this.wordIndexSubject.asObservable();

  /** Emite `true` cuando un capítulo termina de forma natural (no por stop) */
  chapterEnd$ = new Subject<void>();

  // ── Config ──────────────────────────────────────────────────────
  voices: SpanishVoice[] = [];
  selectedVoiceIndex: number = 0;
  playbackRate: number = 1.0;

  // ── Internos ────────────────────────────────────────────────────
  private utterance:   SpeechSynthesisUtterance | null = null;
  private proAudio:    HTMLAudioElement | null = null;
  private proAlign:    AudioAlignment | null = null;
  private currentMode: 'native' | 'pro' = 'native';
  private lastCharIndex: number = 0;  // Para reanudar desde posición
  private currentText:   string = '';

  constructor() {
    this.loadVoices();
    window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
  }

  // ── Voces ────────────────────────────────────────────────────────
  private loadVoices() {
    const all = window.speechSynthesis.getVoices();
    let spanish = all.filter(v => v.lang.startsWith('es'));
    if (spanish.length === 0) spanish = all; // fallback

    this.voices = spanish.map(v => ({ name: v.name, lang: v.lang, voice: v }));

    // Auto-seleccionar Google o primera disponible
    const best = this.voices.findIndex(v =>
      v.name.toLowerCase().includes('google') ||
      v.name.toLowerCase().includes('natural')
    );
    this.selectedVoiceIndex = best >= 0 ? best : 0;
  }

  get selectedVoice(): SpeechSynthesisVoice | null {
    return this.voices[this.selectedVoiceIndex]?.voice ?? null;
  }

  setVoiceByIndex(index: number) {
    this.selectedVoiceIndex = index;
    // Si está reproduciendo, reiniciar desde la posición actual
    if (this.isPlayingSubject.getValue() && this.currentMode === 'native') {
      this.playNativeFrom(this.currentText, this.lastCharIndex);
    }
  }

  setSpeed(rate: number) {
    this.playbackRate = Math.min(2.0, Math.max(0.5, rate));
    // Aplicar en tiempo real
    if (this.currentMode === 'pro' && this.proAudio) {
      this.proAudio.playbackRate = this.playbackRate;
    }
    if (this.currentMode === 'native' && this.isPlayingSubject.getValue()) {
      // SpeechSynthesis no permite cambiar rate en vuelo → reiniciar desde posición guardada
      this.playNativeFrom(this.currentText, this.lastCharIndex);
    }
  }

  // ── MODO NATIVO ──────────────────────────────────────────────────
  playNative(text: string) {
    this.currentText = text;
    this.lastCharIndex = 0;
    this.playNativeFrom(text, 0);
  }

  private playNativeFrom(text: string, fromChar: number) {
    window.speechSynthesis.cancel();
    this.currentMode = 'native';

    const slicedText = fromChar > 0 ? text.substring(fromChar) : text;
    const baseWordOffset = fromChar > 0
      ? text.substring(0, fromChar).split(/\s+/).filter(w => w.length > 0).length
      : 0;

    this.utterance = new SpeechSynthesisUtterance(slicedText);
    this.utterance.lang  = this.selectedVoice?.lang ?? 'es-ES';
    this.utterance.rate  = this.playbackRate;
    if (this.selectedVoice) this.utterance.voice = this.selectedVoice;

    this.utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'word') {
        // Guardar posición global de caracter para posible reanudación
        this.lastCharIndex = fromChar + event.charIndex;

        // Calcular índice de palabra
        const before = slicedText.substring(0, event.charIndex);
        const localIdx = before.split(/\s+/).filter(w => w.length > 0).length;
        this.wordIndexSubject.next(baseWordOffset + localIdx);
      }
    };

    this.utterance.onend = () => {
      this.isPlayingSubject.next(false);
      this.wordIndexSubject.next(-1);
      this.lastCharIndex = 0;
      this.chapterEnd$.next(); // ← auto-avance
    };

    this.utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        this.isPlayingSubject.next(false);
      }
    };

    this.isPlayingSubject.next(true);
    window.speechSynthesis.speak(this.utterance);
  }

  // ── MODO GRABADO (Reemplaza a PRO) ────────────────────────────────
  playRecorded(audioUrl: string, alignment?: AudioAlignment): Observable<any> {
    this.cancelAll();
    this.currentMode = 'pro'; 
    this.currentText = '';

    return new Observable(observer => {
      console.log('AudioService: Cargando audio desde:', audioUrl);
      this.proAudio = new Audio();
      this.proAudio.crossOrigin = 'anonymous';
      this.proAudio.src = audioUrl;
      this.proAudio.playbackRate = this.playbackRate;
      this.proAlign = alignment || null;

      this.proAudio.ontimeupdate = () => {
        if (this.proAudio && this.proAlign) {
          const currentTime = this.proAudio.currentTime;
          const starts = this.proAlign.character_start_times_seconds;
          
          // Encontrar el último carácter que haya empezado antes de currentTime
          let lastCharIdx = -1;
          for (let i = 0; i < starts.length; i++) {
            if (starts[i] <= currentTime) {
              lastCharIdx = i;
            } else {
              break;
            }
          }

          if (lastCharIdx !== -1) {
            // Mapear de carácter a palabra
            // El texto completo se puede reconstruir de proAlign.characters
            const fullText = this.proAlign.characters.join('');
            const textBefore = fullText.substring(0, lastCharIdx + 1);
            // Contar palabras (separadas por espacio)
            const wordIdx = textBefore.trim().split(/\s+/).length - 1;
            this.wordIndexSubject.next(wordIdx);
          }
        }
      };

      this.proAudio.oncanplaythrough = () => {
        console.log('AudioService: Audio listo para reproducir');
      };

      this.proAudio.onended = () => {
        this.isPlayingSubject.next(false);
        this.wordIndexSubject.next(-1);
        this.chapterEnd$.next();
      };

      this.proAudio.onerror = (e) => {
        console.error('AudioService Error:', this.proAudio?.error);
        observer.error(e);
      };

      this.proAudio.play().then(() => {
        this.isPlayingSubject.next(true);
        observer.next({ success: true });
        observer.complete();
      }).catch(err => {
        console.error('AudioService Play Exception:', err);
        observer.error(err);
      });
    });
  }

  seekToWord(wordIndex: number, fullText: string) {
    if (!this.proAudio || !this.proAlign) return;
    
    // Encontrar el índice del carácter donde empieza la palabra N
    const words = fullText.split(/\s+/);
    let charIdx = 0;
    for (let i = 0; i < wordIndex && i < words.length; i++) {
      charIdx += words[i].length + 1; // +1 por el espacio
    }

    const seekTime = this.proAlign.character_start_times_seconds[charIdx] ?? 0;
    this.proAudio.currentTime = seekTime;
    
    if (this.isPausedSubject.getValue()) {
      this.resume();
    }
  }

  // ── Controles ────────────────────────────────────────────────────
  pause() {
    if (this.currentMode === 'native') {
      window.speechSynthesis.pause();
    } else if (this.proAudio) {
      this.proAudio.pause();
    }
    this.isPlayingSubject.next(false);
    this.isPausedSubject.next(true);  // ← marcar como PAUSADO (no detenido)
  }

  resume() {
    if (this.currentMode === 'native') {
      window.speechSynthesis.resume();
    } else if (this.proAudio) {
      this.proAudio.play();
    }
    this.isPlayingSubject.next(true);
    this.isPausedSubject.next(false);
  }

  stop() {
    this.cancelAll();
    this.wordIndexSubject.next(-1);
    this.lastCharIndex = 0;
    this.isPausedSubject.next(false); // ← al detener, resetear estado
  }

  private cancelAll() {
    window.speechSynthesis.cancel();
    if (this.proAudio) {
      this.proAudio.pause();
      this.proAudio = null;
    }
    this.isPlayingSubject.next(false);
  }
}
