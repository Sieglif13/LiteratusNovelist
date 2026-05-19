import { Injectable, NgZone } from '@angular/core';
import { Subject, BehaviorSubject, Subscription } from 'rxjs';
import { PiperVoiceService } from './piper-voice.service';

// Tipos para la API nativa del navegador
declare var window: any;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {
  private recognition: any;
  private isListeningSubject = new BehaviorSubject<boolean>(false);
  public isListening$ = this.isListeningSubject.asObservable();

  private transcriptSubject = new Subject<string>();
  public transcript$ = this.transcriptSubject.asObservable();

  private partialTranscriptSubject = new BehaviorSubject<string>('');
  public partialTranscript$ = this.partialTranscriptSubject.asObservable();

  private audioLevelSubject = new BehaviorSubject<number>(0);
  public audioLevel$ = this.audioLevelSubject.asObservable();

  private isHybridMode = false;
  private silenceTimer: any;
  private currentTranscript = '';
  private isSimulatedMode = false; // Evita bucles infinitos de reinicio

  
  // Audio Context variables para el visualizador
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number = 0;

  private piperSub: Subscription | null = null;
  private wasListeningBeforePiper = false;

  constructor(
    private zone: NgZone,
    private piperVoice: PiperVoiceService
  ) {
    this.checkPlatform();
    this.initBrowserSpeechRecognition();
    this.setupPiperSync();
  }

  private checkPlatform() {
    // Detectar si estamos en Capacitor / móvil
    if (window?.Capacitor?.isNativePlatform()) {
      this.isHybridMode = true;
      console.log('Entorno Híbrido/Nativo detectado (Capacitor). Placeholder activado.');
    } else {
      this.isHybridMode = false;
      console.log('Entorno de navegador estándar detectado.');
    }
  }

  private initBrowserSpeechRecognition() {
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API no está soportada en este navegador.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'es-ES'; // Podría ser configurable

    this.recognition.onstart = () => {
      this.zone.run(() => {
        this.isListeningSubject.next(true);
      });
    };

    this.recognition.onresult = (event: any) => {
      this.zone.run(() => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          this.currentTranscript += (this.currentTranscript ? ' ' : '') + finalTranscript.trim();
        }

        this.partialTranscriptSubject.next(this.currentTranscript + ' ' + interimTranscript);
        this.resetSilenceTimer();
      });
    };

    this.recognition.onerror = (event: any) => {
      console.error('Error en reconocimiento de voz:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
         this.stopListening();
      } else if (event.error === 'network') {
         // Para propósitos de demostración inmersiva, si la red falla, 
         // ignoramos el error y mantenemos el visualizador simulado activo.
         if (!this.isSimulatedMode) {
           console.warn("Modo de escucha simulada activo (falla de red ignorada).");
           this.isSimulatedMode = true;
           if (!this.isListeningSubject.value) {
             this.isListeningSubject.next(true);
             this.updateAudioLevel();
           }
         }
      }

    };

    this.recognition.onend = () => {
      this.zone.run(() => {
        // En modo continuo, si se corta inesperadamente y deberíamos seguir escuchando, reiniciamos.
        if (this.isListeningSubject.value) {
            if (!this.isSimulatedMode) {
                try {
                   this.recognition.start();
                } catch(e) {
                   this.isListeningSubject.next(false);
                   this.stopAudioVisualizer();
                }
            }
            // Si está en isSimulatedMode, no hacemos nada (mantiene el UI activo)
        } else {
           this.isListeningSubject.next(false);
           this.stopAudioVisualizer();
        }
      });
    };
  }

  private setupPiperSync() {
    // Sincronización: silenciar el micrófono mientras Piper habla
    this.piperSub = this.piperVoice.isSpeaking$.subscribe(isSpeaking => {
      if (isSpeaking) {
        if (this.isListeningSubject.value) {
          this.wasListeningBeforePiper = true;
          this.pauseListening();
        }
      } else {
        if (this.wasListeningBeforePiper) {
          this.wasListeningBeforePiper = false;
          // Pequeño delay para no captar la cola del audio
          setTimeout(() => this.resumeListening(), 500); 
        }
      }
    });
  }

  public toggleListening() {
    if (this.isListeningSubject.value) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  public async startListening() {
    if (this.isHybridMode) {
      this.startNativeListening();
      return;
    }

    if (!this.recognition) return;
    
    this.currentTranscript = '';
    this.partialTranscriptSubject.next('');
    this.isListeningSubject.next(true); // Evitar onend restart bug
    this.isSimulatedMode = false;

    try {
      if (!this.mediaStream) {
        await this.startAudioVisualizer();
      }
      this.recognition.start();
      this.resetSilenceTimer();
    } catch (e) {
      console.warn("Recognition ya había iniciado", e);
    }
  }

  public stopListening() {
    if (this.isHybridMode) {
      this.stopNativeListening();
      return;
    }

    this.isListeningSubject.next(false);
    this.isSimulatedMode = false;
    
    if (this.recognition) {
      this.recognition.stop();
    }
    this.clearSilenceTimer();
    this.stopAudioVisualizer();
    
    if (this.currentTranscript.trim()) {
      this.transcriptSubject.next(this.currentTranscript.trim());
      this.currentTranscript = '';
      this.partialTranscriptSubject.next('');
    }
  }

  private pauseListening() {
     this.isListeningSubject.next(false);
     if (this.recognition) {
         this.recognition.stop();
     }
  }

  private resumeListening() {
      this.startListening();
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    // 2 segundos de pausa envían el mensaje
    this.silenceTimer = setTimeout(() => {
      this.zone.run(() => {
        if (this.currentTranscript.trim()) {
          this.transcriptSubject.next(this.currentTranscript.trim());
          this.currentTranscript = '';
          this.partialTranscriptSubject.next('');
        }
      });
    }, 2000);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  // --- AUDIO VISUALIZER (Simulado para evitar bugs de red en Chrome) ---
  private async startAudioVisualizer() {
    // Chrome suele arrojar error 'network' si SpeechRecognition y getUserMedia
    // intentan usar el micrófono a la vez. Para la inmersión visual,
    // simulamos las ondas basándonos en el estado de 'isListening'.
    this.updateAudioLevel();
  }

  private stopAudioVisualizer() {
    cancelAnimationFrame(this.animationFrameId);
    this.audioLevelSubject.next(0);
  }

  private updateAudioLevel = () => {
    if (!this.isListeningSubject.value) return;

    // Generar un nivel de audio aleatorio y fluido (simulando voz)
    const baseLevel = Math.random() > 0.5 ? Math.random() * 80 + 20 : Math.random() * 30;
    this.audioLevelSubject.next(Math.min(100, Math.round(baseLevel)));

    // Bajar la velocidad de la animación para que se vea natural
    setTimeout(() => {
      if (this.isListeningSubject.value) {
        this.animationFrameId = requestAnimationFrame(this.updateAudioLevel);
      }
    }, 100);
  }

  // --- NATIVE PLUGINS PLACEHOLDER ---
  private startNativeListening() {
    console.log('Invocando plugin nativo de Speech Recognition (Capacitor)...');
    // Implementación futura:
    // await SpeechRecognitionPlugin.start({...});
  }

  private stopNativeListening() {
    console.log('Deteniendo plugin nativo de Speech Recognition (Capacitor)...');
    // Implementación futura:
    // await SpeechRecognitionPlugin.stop();
  }

  ngOnDestroy() {
    this.stopListening();
    if (this.piperSub) this.piperSub.unsubscribe();
  }
}
