import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface KokoroSentence {
  text: string;
  baseWordIdx: number;
  wordCount: number;
  sentenceIdx: number;
}

@Injectable({ providedIn: 'root' })
export class KokoroTtsService {

  // ── Estado público ────────────────────────────────────────────────────
  isSpeaking$ = new BehaviorSubject<boolean>(false);
  currentSentenceIdx$ = new BehaviorSubject<number>(-1);
  currentWordIndex$ = new BehaviorSubject<number>(-1);
  error$ = new BehaviorSubject<string | null>(null);

  // ── Estado interno ────────────────────────────────────────────────────
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  private audioQueue: Array<{ buffer: AudioBuffer; sentence: KokoroSentence }> = [];
  private fetchPromises: Promise<void>[] = [];

  private isStopped = false;
  private isPlayingQueue = false;
  private isPaused = false;
  private avatarId: number | null = null;

  // Estado de reproducción para Pause/Resume y Karaoke
  private currentBuffer: AudioBuffer | null = null;
  private currentSentence: KokoroSentence | null = null;
  private playbackStartTime: number = 0; 
  private playbackOffset: number = 0; // Tiempo pausado acumulado
  private karaokeInterval: any = null;

  // ── API Pública ───────────────────────────────────────────────────────

  async speak(fullText: string, avatarId: number, startWordIdx: number = 0): Promise<void> {
    this.stop();
    this.isStopped = false;
    this.avatarId = avatarId;
    this.error$.next(null);

    const allSentences = this.buildSentences(fullText);
    if (allSentences.length === 0) return;

    // Filtrar oraciones que ya pasaron
    const startIndex = allSentences.findIndex(s => s.baseWordIdx + s.wordCount > startWordIdx);
    const sentences = startIndex >= 0 ? allSentences.slice(startIndex) : allSentences;

    if (sentences.length === 0) return;

    this.isSpeaking$.next(true);

    const firstBuffer = await this.fetchAudioBuffer(sentences[0]);
    if (this.isStopped) return;

    if (firstBuffer) {
      this.audioQueue.push(firstBuffer);
      this.playNextInQueue();
    }

    this.prefetchPipeline(sentences.slice(1));
  }

  stop(): void {
    this.isStopped = true;
    this.isPlayingQueue = false;
    this.isPaused = false;
    this.audioQueue = [];
    this.fetchPromises = [];
    this.avatarId = null;

    this.stopCurrentAudio();

    this.isSpeaking$.next(false);
    this.currentSentenceIdx$.next(-1);
    this.currentWordIndex$.next(-1);
  }

  pause(): void {
    if (!this.isPlayingQueue || this.isPaused || !this.currentSource || !this.audioCtx) return;
    
    this.isPaused = true;
    this.isSpeaking$.next(false);
    
    // Guardar el tiempo transcurrido exacto
    this.playbackOffset += this.audioCtx.currentTime - this.playbackStartTime;
    
    try { this.currentSource.stop(); } catch (_) {}
    this.currentSource.onended = null;
    this.currentSource = null;
    
    this.stopKaraokeLoop();
  }

  resume(): void {
    if (!this.isPlayingQueue || !this.isPaused || !this.currentBuffer || !this.audioCtx) return;
    
    this.isPaused = false;
    this.isSpeaking$.next(true);
    
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    this.playbackStartTime = this.audioCtx.currentTime;
    
    this.currentSource = this.audioCtx.createBufferSource();
    this.currentSource.buffer = this.currentBuffer;
    this.currentSource.connect(this.audioCtx.destination);
    
    this.currentSource.onended = () => {
      if (!this.isStopped && !this.isPaused) {
        this.playNextInQueue();
      }
    };

    this.currentSource.start(0, this.playbackOffset);
    this.startKaraokeLoop();
  }

  // ── Lógica interna ────────────────────────────────────────────────────

  private stopCurrentAudio() {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch (_) {}
      this.currentSource.onended = null;
      this.currentSource = null;
    }
    this.currentBuffer = null;
    this.currentSentence = null;
    this.stopKaraokeLoop();
  }

  private async prefetchPipeline(sentences: KokoroSentence[]): Promise<void> {
    const BATCH_SIZE = 2;
    for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
      if (this.isStopped) return;

      const batch = sentences.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(s => this.fetchAudioBuffer(s))
      );

      for (const result of results) {
        if (this.isStopped) return;
        if (result) {
          this.audioQueue.push(result);
          if (!this.isPlayingQueue) {
            this.playNextInQueue();
          }
        }
      }
    }
  }

  private playNextInQueue(): void {
    if (this.isStopped || this.isPaused) return;

    this.stopCurrentAudio();

    if (this.audioQueue.length === 0) {
      this.isPlayingQueue = false;
      this.isSpeaking$.next(false);
      this.currentSentenceIdx$.next(-1);
      this.currentWordIndex$.next(-1);
      return;
    }

    this.isPlayingQueue = true;
    const item = this.audioQueue.shift()!;
    
    this.currentBuffer = item.buffer;
    this.currentSentence = item.sentence;
    this.playbackOffset = 0;
    
    this.currentSentenceIdx$.next(item.sentence.sentenceIdx);
    this.currentWordIndex$.next(item.sentence.baseWordIdx);

    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    this.playbackStartTime = this.audioCtx.currentTime;

    const source = this.audioCtx.createBufferSource();
    source.buffer = this.currentBuffer;
    source.connect(this.audioCtx.destination);
    this.currentSource = source;

    source.onended = () => {
      if (!this.isStopped && !this.isPaused) {
        this.playNextInQueue();
      }
    };

    source.start(0);
    this.startKaraokeLoop();
  }

  private startKaraokeLoop() {
    this.stopKaraokeLoop();
    
    this.karaokeInterval = setInterval(() => {
      if (this.isStopped || this.isPaused || !this.currentSentence || !this.currentBuffer || !this.audioCtx) return;
      
      const elapsedTime = (this.audioCtx.currentTime - this.playbackStartTime) + this.playbackOffset;
      const totalTime = this.currentBuffer.duration;
      
      // Asegurar que no excedemos el límite
      let progress = Math.min(1, elapsedTime / totalTime);
      
      // Karaoke estricto estimando el progreso por caracteres
      const words = this.currentSentence.text.split(/\s+/).filter(w => w.length > 0);
      const totalChars = words.reduce((sum, w) => sum + w.length, 0);
      
      let accumulatedChars = 0;
      let targetWordLocalIdx = 0;
      
      for (let i = 0; i < words.length; i++) {
         const wordCharWeight = words[i].length / totalChars;
         const wordEndProgress = accumulatedChars / totalChars + wordCharWeight;
         
         if (progress <= wordEndProgress || i === words.length - 1) {
             targetWordLocalIdx = i;
             break;
         }
         accumulatedChars += words[i].length;
      }

      this.currentWordIndex$.next(this.currentSentence.baseWordIdx + targetWordLocalIdx);
      
    }, 50); // Actualiza cada 50ms para suavidad en el karaoke
  }

  private stopKaraokeLoop() {
    if (this.karaokeInterval) {
      clearInterval(this.karaokeInterval);
      this.karaokeInterval = null;
    }
  }

  private async fetchAudioBuffer(
    sentence: KokoroSentence
  ): Promise<{ buffer: AudioBuffer; sentence: KokoroSentence } | null> {
    if (!sentence.text.trim() || this.isStopped) return null;

    const hfApiUrl = 'https://josuejheymi-kokoro-api.hf.space/v1/audio/speech';

    const fetchPromise = fetch(hfApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "kokoro",
        input: sentence.text.replace(/[*_\[\]]/g, ''), // Limpiar markdown básico para TTS
        voice: "ef_dora", // VOZ FEMENINA ESPAÑOLA (ef_dora o em_alex)
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
        return { buffer: audioBuffer, sentence };
      } catch (decodeErr) {
        console.warn('[KokoroTTS] Error decodificando audio para frase:', sentence.text, decodeErr);
        return null;
      }
    }).catch((err) => {
      console.warn('[KokoroTTS] Error en frase:', sentence.text, err);
      return null;
    });

    return fetchPromise as Promise<{ buffer: AudioBuffer; sentence: KokoroSentence } | null>;
  }

  private buildSentences(text: string): KokoroSentence[] {
    const rawWords = text.split(/\s+/).filter(w => w.length > 0);
    const sentences: KokoroSentence[] = [];
    
    let currentWords: string[] = [];
    let baseIdx = 0;
    let sentenceIdxCounter = 0;
    
    for (let i = 0; i < rawWords.length; i++) {
      currentWords.push(rawWords[i]);
      // Si termina en puntuacion o es la ultima palabra
      if (/[.!?¿¡"]$/.test(rawWords[i]) || i === rawWords.length - 1) {
        // Agrupar oraciones muy cortas (menor a 4 palabras) si no es el final
        if (currentWords.length < 4 && i !== rawWords.length - 1) {
          continue;
        }
        
        sentences.push({
          text: currentWords.join(' '),
          baseWordIdx: baseIdx,
          wordCount: currentWords.length,
          sentenceIdx: sentenceIdxCounter++
        });
        
        baseIdx += currentWords.length;
        currentWords = [];
      }
    }
    return sentences;
  }
}
