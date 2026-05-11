import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
  isTyping?: boolean; // Para el efecto typing en la UI
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly API_URL = `${environment.apiUrl}/ai`;

  // Estado global reactivo
  private inkBalanceSubject = new BehaviorSubject<number>(0);
  public inkBalance$ = this.inkBalanceSubject.asObservable();

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Actualiza el balance de tinta (puede ser llamado por AuthService al hacer login)
  updateInkBalance(balance: number) {
    this.inkBalanceSubject.next(balance);
  }

  // Desencadena una animación en el navbar
  triggerInkAnimation() {
    // Aquí podríamos inyectar un estado temporal para la animación,
    // o simplemente el componente escucha los cambios del BehaviorSubject.
  }

  // Carga el historial de una sesión
  loadSessionMessages(sessionId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.API_URL}/sessions/${sessionId}/messages/`).pipe(
      tap(messages => this.messagesSubject.next(messages))
    );
  }

  // Iniciar o recuperar sesión con un personaje
  getSession(avatarId: number): Observable<any> {
    return this.http.get(`${this.API_URL}/sessions/?avatar_id=${avatarId}`);
  }

  // Obtener todos los personajes para el Hub
  getGlobalAvatars(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/hub/avatars/`);
  }

  // Enviar mensaje y manejar respuesta reactiva
  sendMessage(sessionId: string, text: string): Observable<any> {
    const userMsg: ChatMessage = { role: 'user', content: text };
    // Actualizar UI optimísticamente
    this.messagesSubject.next([...this.messagesSubject.value, userMsg]);

    // Añadir mensaje "vaciado" para el typing effect
    const tempAssistantMsg: ChatMessage = { role: 'assistant', content: '', isTyping: true };
    this.messagesSubject.next([...this.messagesSubject.value, tempAssistantMsg]);

    return this.http.post(`${this.API_URL}/chat/`, { session_id: sessionId, message: text }).pipe(
      tap((res: any) => {
        // Actualizar tinta
        if (res.ink_balance !== undefined) {
          this.inkBalanceSubject.next(res.ink_balance);
        }
        
        // Reemplazar mensaje temporal con la respuesta real
        const currentMessages = this.messagesSubject.value;
        currentMessages.pop(); // quitar tempAssistantMsg
        currentMessages.push({
          role: 'assistant',
          content: res.reply,
          created_at: res.timestamp
        });
        this.messagesSubject.next([...currentMessages]);
      }),
      catchError(err => {
        // Eliminar mensaje temporal en caso de error
        const currentMessages = this.messagesSubject.value;
        currentMessages.pop();
        this.messagesSubject.next([...currentMessages]);

        if (err.status === 402) {
          // Manejo específico de falta de tinta
          console.error("Sin tinta disponible", err.error);
        }
        return throwError(() => err);
      })
    );
  }
}
