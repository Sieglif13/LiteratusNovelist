import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as ort from 'onnxruntime-web';

@Injectable({
  providedIn: 'root'
})
export class PiperVoiceService {
  public modelPath = 'assets/voices/mx-voice-man/es_MX-ald-medium.onnx';
  public configPath = 'assets/voices/mx-voice-man/es_MX-ald-medium.onnx.json';
  
  private session: ort.InferenceSession | null = null;
  private config: any = null;
  private audioContext: AudioContext | null = null;

  private loadProgressSubject = new BehaviorSubject<number>(0);
  public loadProgress$ = this.loadProgressSubject.asObservable();

  public isReadySubject = new BehaviorSubject<boolean>(false);
  public isReady$ = this.isReadySubject.asObservable();

  private isSpeakingSubject = new BehaviorSubject<boolean>(false);
  public isSpeaking$ = this.isSpeakingSubject.asObservable();

  private isPausedSubject = new BehaviorSubject<boolean>(false);
  public isPaused$ = this.isPausedSubject.asObservable();

  public currentWordIndexSubject = new BehaviorSubject<number>(-1);
  public currentWordIndex$ = this.currentWordIndexSubject.asObservable();

  public voiceSpeed = 1.0;
  public voiceQuality = 0.667;

  private activeSource: AudioBufferSourceNode | null = null;
  private isStopped = false;

  constructor() {
    // Para simplificar la integración sin tener que modificar los assets de Angular JSON
    // y copiar los archivos wasm manualmente, utilizamos un CDN que sirve los archivos .wasm de la versión adecuada.
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
  }

  async initModel() {
    if (this.session) return;
    
    try {
      this.loadProgressSubject.next(10);
      
      // Load config
      const configRes = await fetch(this.configPath);
      this.config = await configRes.json();
      this.loadProgressSubject.next(30);

      // Descargamos el modelo .onnx calculando el progreso
      const response = await fetch(this.modelPath);
      if (!response.ok) throw new Error("No se pudo descargar el modelo ONNX.");
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 66000000;
      
      const reader = response.body?.getReader();
      let received = 0;
      const chunks: Uint8Array[] = [];
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            const progress = 30 + Math.floor((received / total) * 60);
            this.loadProgressSubject.next(Math.min(progress, 90));
          }
        }
      }
      
      // Consolidar fragmentos en un ArrayBuffer
      const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
      const modelBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        modelBuffer.set(chunk, offset);
        offset += chunk.length;
      }
      
      this.loadProgressSubject.next(95);

      // Inicializar Inference Session en WebAssembly
      this.session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['wasm']
      });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: this.config.audio.sample_rate });
      
      this.loadProgressSubject.next(100);
      this.isReadySubject.next(true);
      
    } catch (error) {
      console.error("Error al cargar el modelo Piper:", error);
      this.loadProgressSubject.next(0);
    }
  }

  public stop() {
    this.isStopped = true;
    if (this.activeSource) {
      try {
        this.activeSource.stop();
      } catch (e) {}
      this.activeSource = null;
    }
    this.isSpeakingSubject.next(false);
    this.isPausedSubject.next(false);
    this.currentWordIndexSubject.next(-1);
  }

  public pause() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
      this.isPausedSubject.next(true);
    }
  }

  public resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
      this.isPausedSubject.next(false);
    }
  }

  async setVoice(model: string, config: string) {
    this.modelPath = model;
    this.configPath = config;
    this.session = null;
    this.isReadySubject.next(false);
    await this.initModel();
  }

  async speak(text: string) {
    if (!this.session || !this.config) {
      console.warn("El modelo no está listo todavía.");
      return;
    }

    this.stop(); // Detener reproducción anterior
    this.isStopped = false;
    this.isSpeakingSubject.next(true);

    try {
      // Chunk sentences to avoid WASM integer overflow and memory crashes
      const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
      
      let currentWordIdx = 0;
      const isSpain = this.modelPath.includes('es_ES');

      for (const sentence of sentences) {
        if (this.isStopped) break;

        this.currentWordIndexSubject.next(currentWordIdx);
        // Contar las palabras de la oración actual (aproximado basado en espacios)
        const wordCount = sentence.trim().split(/\s+/).filter(w => w.length > 0).length;

        // 1. Convertir texto a fonemas
        const phonemes = this.phonemizeSpanish(sentence, isSpain);
        
        // 2. Mapear a IDs
        const idMap = this.config.phoneme_id_map;
        const inputIds: number[] = [0]; // Piper usa pad=0 al inicio
        
        for (const p of phonemes) {
          if (idMap[p]) {
            inputIds.push(idMap[p][0], 0);
          } else if (p === ' ') {
            inputIds.push(idMap[' '][0], 0);
          }
        }

        if (inputIds.length > 1500) {
          console.warn("Oración excepcionalmente larga omitida para prevenir crash.");
          currentWordIdx += wordCount;
          continue;
        }

        const inputIdsBigInt = inputIds.map(id => BigInt(id));
        const inputTensor = new ort.Tensor('int64', new BigInt64Array(inputIdsBigInt), [1, inputIds.length]);
        const inputLengthsTensor = new ort.Tensor('int64', new BigInt64Array([BigInt(inputIds.length)]), [1]);
        
        // Ajustamos la velocidad según lo configurado en la UI (length_scale = 1.0 / speed)
        const lengthScale = 1.0 / this.voiceSpeed;
        const scales = new Float32Array([
          this.voiceQuality,  // noise_scale
          lengthScale,        // length_scale
          this.config.inference.noise_w
        ]);
        const scalesTensor = new ort.Tensor('float32', scales, [3]);

        const feeds = {
          input: inputTensor,
          input_lengths: inputLengthsTensor,
          scales: scalesTensor
        };

        const results = await this.session.run(feeds);
        if (this.isStopped) break;
        
        const audioData = results['output'].data as Float32Array;
        await this.playAudio(audioData);
        
        currentWordIdx += wordCount;
      }
    } catch (e) {
      console.error("Error durante la síntesis de voz:", e);
    } finally {
      if (!this.isStopped) {
        this.isSpeakingSubject.next(false);
        this.currentWordIndexSubject.next(-1);
      }
    }
  }

  private async playAudio(audioData: Float32Array): Promise<void> {
    if (!this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    const sampleRate = this.config.audio.sample_rate;
    const audioBuffer = this.audioContext.createBuffer(1, audioData.length, sampleRate);
    audioBuffer.getChannelData(0).set(audioData);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    this.activeSource = source;

    return new Promise<void>((resolve) => {
      source.onended = () => {
        this.activeSource = null;
        resolve();
      };
      source.start();
    });
  }

  // Fonetizador IPA mejorado para que la voz no suene robótica
  private phonemizeSpanish(text: string, isSpain: boolean = false): string[] {
    let t = text.toLowerCase();
    
    // Preservar puntuación para que Piper haga pausas naturales (. , ! ? ;)
    t = t.replace(/[*_~`"()\[\]]/g, '')
         // Añadir acento tónico (ˈ) a las vocales con tilde mejora la prosodia enormemente
         .replace(/[áäâà]/g, 'ˈa')
         .replace(/[éëêè]/g, 'ˈe')
         .replace(/[íïîì]/g, 'ˈi')
         .replace(/[óöôò]/g, 'ˈo')
         .replace(/[úüûù]/g, 'ˈu')
         .replace(/ñ/g, 'ɲ')
         .replace(/ch/g, 'tʃ')
         .replace(/ll/g, 'ʝ')
         .replace(/qu([eiˈ])/g, 'k$1')
         .replace(/gu([eiˈ])/g, 'g$1')
         .replace(/gü([eiˈ])/g, 'gw$1')
         .replace(/c([eiˈ])/g, isSpain ? 'θ$1' : 's$1')
         .replace(/z/g, isSpain ? 'θ' : 's')
         .replace(/c/g, 'k')
         .replace(/h/g, '')
         .replace(/v/g, 'b')
         .replace(/y([aeiouˈ])/g, 'ʝ$1')
         .replace(/y/g, 'i')
         .replace(/j/g, 'x')
         .replace(/g([eiˈ])/g, 'x$1')
         .replace(/x/g, 'ks')
         .replace(/rr/g, 'r');
    
    // r inicial es fuerte 'r', entre vocales es tap 'ɾ'
    t = t.replace(/\br/g, 'r').replace(/([aeiouˈ])r([aeiouˈ])/g, '$1ɾ$2');

    const phonemes: string[] = [];
    let i = 0;
    while(i < t.length) {
      if (t.slice(i, i+2) === 'tʃ') {
        phonemes.push('t', 'ʃ');
        i += 2;
      } else {
        phonemes.push(t[i]);
        i++;
      }
    }
    return phonemes;
  }
}
