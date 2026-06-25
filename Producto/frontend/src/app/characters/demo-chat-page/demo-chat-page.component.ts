import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

export interface DemoMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-demo-chat-page',
  templateUrl: './demo-chat-page.component.html',
  styleUrls: ['./demo-chat-page.component.css']
})
export class DemoChatPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  public auth = inject(AuthService);
  private destroy$ = new Subject<void>();

  avatarId: number | null = null;
  avatar: any = null;
  avatarLoading = true;

  messages: DemoMessage[] = [];
  inputText = '';
  isSending = false;
  remainingMessages = 3;
  limitReached = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('avatarId');
    this.avatarId = idParam ? parseInt(idParam, 10) : null;
    this.loadAvatar();
  }

  private loadAvatar(): void {
    const url = this.avatarId
      ? `ai/demo-chat/?avatar_id=${this.avatarId}`
      : `ai/demo-chat/`;

    this.api.get<any>(url).subscribe({
      next: (data) => {
        this.avatar = data;
        this.remainingMessages = data.remaining_messages ?? 3;
        this.limitReached = this.remainingMessages <= 0;
        // Start with greeting
        if (data.greeting_message) {
          this.messages = [{ role: 'assistant', content: data.greeting_message }];
        }
        this.avatarLoading = false;
      },
      error: () => {
        this.avatarLoading = false;
        this.router.navigate(['/characters']);
      }
    });
  }

  sendMessage(): void {
    const msg = this.inputText.trim();
    if (!msg || this.isSending || this.limitReached) return;

    this.messages.push({ role: 'user', content: msg });
    this.inputText = '';
    this.isSending = true;

    const payload: any = { message: msg };
    if (this.avatarId) payload.avatar_id = this.avatarId;

    this.api.post<any>('ai/demo-chat/', payload).subscribe({
      next: (res) => {
        this.messages.push({ role: 'assistant', content: res.reply });
        this.remainingMessages = res.remaining_messages ?? 0;
        if (this.remainingMessages <= 0) this.limitReached = true;
        this.isSending = false;
        setTimeout(() => this.scrollToBottom(), 60);
      },
      error: (err) => {
        const errData = err?.error;
        if (errData?.error === 'DEMO_LIMIT_REACHED') {
          this.limitReached = true;
          this.remainingMessages = 0;
          this.messages.push({ role: 'assistant', content: errData.message });
        } else {
          this.messages.push({
            role: 'assistant',
            content: 'El viento sopla fuerte hoy y mi voz se pierde. Intenta de nuevo.'
          });
        }
        this.isSending = false;
        setTimeout(() => this.scrollToBottom(), 60);
      }
    });
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
  }

  private scrollToBottom(): void {
    const el = document.querySelector('.dchat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  goBack(): void { this.router.navigate(['/characters']); }
  goToRegister(): void { this.router.navigate(['/register']); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
