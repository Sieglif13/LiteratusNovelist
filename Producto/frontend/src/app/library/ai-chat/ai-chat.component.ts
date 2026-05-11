import { Component, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { PiperVoiceService } from '../../core/services/piper-voice.service';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.css'
})
export class AiChatComponent {
  private api = inject(ApiService);
  public piperVoice = inject(PiperVoiceService);
  
  messages: ChatMessage[] = [
    { sender: 'ai', text: 'Saludos, viajero. Pareces tener una duda sobre mis andanzas.' }
  ];
  
  newMessage: string = '';
  session_id: number = 1; // Fijo para demo
  activeMode: 'roleplay' | 'tutor' | 'critical' = 'roleplay';
  isWriting: boolean = false;

  realTimeVoiceActive: boolean = false;
  
  // Observables para la UI
  piperReady$ = this.piperVoice.isReady$;
  piperProgress$ = this.piperVoice.loadProgress$;
  piperSpeaking$ = this.piperVoice.isSpeaking$;

  setMode(mode: 'roleplay' | 'tutor' | 'critical') {
    this.activeMode = mode;
  }

  async toggleVoice() {
    this.realTimeVoiceActive = !this.realTimeVoiceActive;
    if (this.realTimeVoiceActive) {
      await this.piperVoice.initModel();
    }
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    this.messages.push({ sender: 'user', text: this.newMessage });
    const payload = {
      session_id: this.session_id,
      message: this.newMessage,
      mode: this.activeMode
    };
    
    this.newMessage = ''; // Reset
    this.isWriting = true;

    // Conectando con API DRF de Fase 3
    /*
    this.api.post<{reply: string}>('ai/chat/', payload).subscribe({
      next: (res) => {
        this.messages.push({ sender: 'ai', text: res.reply });
        this.isWriting = false;
      },
      error: () => {
        this.messages.push({ sender: 'ai', text: 'Perdona, he perdido momentáneamente mi hilo de pensamiento (Error de Conexión).' });
        this.isWriting = false;
      }
    });
    */

    // Simulación Frontend por velocidad de demo:
    setTimeout(() => {
      let mockReply = '';
      if (this.activeMode === 'roleplay') mockReply = 'A fe mía que hablas con gran extrañeza. No entiendo vuestras palabras del futuro.';
      if (this.activeMode === 'tutor') mockReply = '[Modo Tutor] Esta obra fue escrita en el Siglo XVII por Cervantes, reflejando el declive de la novela de caballerías.';
      if (this.activeMode === 'critical') mockReply = '¿Acaso mis aspas de molino no son el reflejo de tu propia locura sistémica impuesta por la sociedad capitalista?';

      this.messages.push({ sender: 'ai', text: mockReply });
      this.isWriting = false;

      // Si la voz está activada, generar audio
      if (this.realTimeVoiceActive) {
        // Llamada asíncrona no-bloqueante
        this.piperVoice.speak(mockReply);
      }
    }, 1500);
  }
}
