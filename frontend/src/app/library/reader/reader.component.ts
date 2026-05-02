import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AudioService } from '../../core/services/audio.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-reader',
  templateUrl: './reader.component.html',
  styleUrl: './reader.component.css',
  animations: [
    // Panel TOC (derecha) y Panel de Personajes (izquierda)
    trigger('slideFromRight', [
      state('in',  style({ transform: 'translateX(0%)' })),
      state('out', style({ transform: 'translateX(100%)' })),
      transition('in <=> out', animate('350ms ease-in-out')),
    ]),
    trigger('slideFromLeft', [
      state('in',  style({ transform: 'translateX(0%)' })),
      state('out', style({ transform: 'translateX(-100%)' })),
      transition('in <=> out', animate('350ms ease-in-out')),
    ]),
  ]
})
export class ReaderComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  public audioService = inject(AudioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  // ── LECTURA ──────────────────────────────────────────────────────
  inventoryId: string = '';
  currentPage: number = 1;
  totalPages: number = 1;
  chapters: any[] = [];
  safeChapterHtml: SafeHtml = '';
  chapterTitle: string = 'Cargando libro...';
  bookSlug: string = '';
  hasPremiumNarration: boolean = false;
  progressId: number | null = null;

  // ── UX ───────────────────────────────────────────────────────────
  fontSize: number = 18;
  currentTheme: 'dark' | 'light' | 'sepia' = 'dark';
  isTocOpen: boolean = false;

  // ── PERSONAJES / CHAT ─────────────────────────────────────────────
  isCharPanelOpen: boolean = false;
  avatars: any[] = [];
  selectedAvatar: any = null;
  showCharProfile: boolean = false;

  // Getters para separar autor de personajes en el panel
  get authorAvatar(): any {
    return this.avatars.find(a => a.is_author) || null;
  }
  get characterAvatars(): any[] {
    return this.avatars.filter(a => !a.is_author);
  }

  // Chat
  isChatOpen: boolean = false;
  chatSession: any = null;
  chatMessages: any[] = [];
  chatInput: string = '';
  isSendingMessage: boolean = false;
  chatMode: 'roleplay' | 'tutor' | 'critical' = 'roleplay';
  inkBalance: number = 50;

  // Audio Control
  currentAudioMode: 'native' | 'pro' = 'native';
  currentWordIndex: number = -1;
  isAudioLoading: boolean = false;
  isAudioPanelOpen: boolean = false;
  currentChapterPlainText: string = '';
  proErrorMessage: string = '';  // Mensaje de error Pro (no usa alert)

  // Economía de Tinta: desbloqueo PERMANENTE de Voz Premium
  readonly PREMIUM_VOICE_INK_COST = 200;  // Coste único de desbloqueo
  isUnlocking: boolean = false;          // Spinner durante transacción

  // Renderizado de palabras (para highlighting nativo de Angular)
  parsedBlocks: Array<{
    tag: string;
    tokens: Array<{
      text: string;
      isWord: boolean;
      isImg: boolean;
      idx: number;
      src?: string;
      alt?: string;
    }>;
  }> = [];
  titleTokens: any[] = [];
  private totalWordCount: number = 0;

  private saveProgressSubject = new Subject<number>();
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.inventoryId = this.route.snapshot.paramMap.get('id') || '';

    this.saveProgressSubject.pipe(debounceTime(3000)).subscribe(p => this.syncProgressToBackend(p));

    this.loadInitialData();
    this.applyTheme();
    this.applyFontSize();
    this.loadInkBalance();

    // Resaltado: escuchar el word index del AudioService
    this.audioService.currentWordIndex$.pipe(takeUntil(this.destroy$)).subscribe(idx => {
      this.currentWordIndex = idx;
      this.cdr.detectChanges(); // Forzar re-render sin borrar el DOM
      if (idx !== -1) this.scrollWordIntoView(idx);
    });

    // Auto-avance de capítulo cuando termina la narración
    this.audioService.chapterEnd$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveAudioPosition(); // Guardar antes de avanzar
      if (this.currentPage < this.totalPages) {
        setTimeout(() => {
          this.currentPage++;
          this.parseAndRenderChapter();
          this.saveProgressSubject.next(this.currentPage);
          // Iniciar narración del siguiente capítulo automáticamente
          setTimeout(() => this.playAudio(), 600);
        }, 500);
      }
    });

    // Guardar posición al cerrar/salir
    window.addEventListener('beforeunload', () => this.saveAudioPosition());
  }

  loadInitialData() {
    // 1. Cargar metadatos e inventario para obtener el progreso guardado
    this.api.get<any>(`library/inventory/${this.inventoryId}/`).subscribe({
      next: (inventory) => {
        if (inventory && inventory.progress) {
          this.currentPage = inventory.progress.current_page || 1;
          this.progressId = inventory.progress.id;
          this.bookSlug = inventory.book_slug;
        }
        this.loadChapters();
      },
      error: (err) => {
        console.error('Error cargando inventario', err);
        this.router.navigate(['/catalog']);
      }
    });
  }

  ngOnDestroy() {
    this.audioService.stop();
    this.saveAudioPosition();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── TEMA Y FUENTE ─────────────────────────────────────────────────
  changeFontSize(delta: number) {
    this.fontSize = Math.min(Math.max(this.fontSize + delta, 12), 32);
    this.applyFontSize();
  }

  setTheme(theme: 'dark' | 'light' | 'sepia') {
    this.currentTheme = theme;
    this.applyTheme();
  }

  private applyFontSize() {
    document.documentElement.style.setProperty('--font-size-reader', `${this.fontSize}px`);
  }

  private applyTheme() {
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-sepia');
    document.body.classList.add(`theme-${this.currentTheme}`);
  }

  // ── TOC ───────────────────────────────────────────────────────────
  toggleToc() {
    this.isTocOpen = !this.isTocOpen;
    if (this.isTocOpen) this.isCharPanelOpen = false;
  }

  goToChapter(index: number) {
    this.currentPage = index + 1;
    this.renderCurrentChapter();
    this.saveProgressSubject.next(this.currentPage);
    this.isTocOpen = false;
    // Recargar avatares con el nuevo capítulo para actualizar desbloqueos
    this.loadAvatars();
  }

  // ── CAPÍTULOS ─────────────────────────────────────────────────────
  loadChapters() {
    this.api.get(`library/inventory/${this.inventoryId}/chapters/`).subscribe({
      next: (res: any) => {
        if (res && res.chapters && res.chapters.length > 0) {
          this.chapters = res.chapters;
          this.hasPremiumNarration = res.has_premium_narration;
          this.totalPages = res.chapters.length;
          this.renderCurrentChapter();
          this.loadAvatars(); // Cargar personajes una vez tenemos el inventario
        } else {
          this.chapterTitle = 'Sin contenido';
          this.safeChapterHtml = this.sanitizer.bypassSecurityTrustHtml('<p>El libro no tiene capítulos procesados.</p>');
        }
      },
      error: (err) => {
        console.error('Error al cargar capítulos', err);
        this.chapterTitle = 'Error';
        // Si el inventario no pertenece al usuario o no existe (404), redirigir
        if (err.status === 404 || err.status === 401) {
          setTimeout(() => this.router.navigate(['/catalog']), 2000);
        }
        this.safeChapterHtml = this.sanitizer.bypassSecurityTrustHtml('<p>Hubo un error cargando el contenido.</p>');
      }
    });
  }

  renderCurrentChapter() {
    this.parseAndRenderChapter();
  }

  /** Parsea el HTML del capítulo y crea la estructura de bloques/tokens para el *ngFor */
  parseAndRenderChapter() {
    const chapter = this.chapters[this.currentPage - 1];
    if (!chapter) return;

    this.chapterTitle = chapter.title || `Capítulo ${this.currentPage}`;

    // 1. Calcular backendUrl y limpiar HTML primero para evitar que el navegador
    // cargue imágenes relativas erróneas al procesar el texto plano.
    const backendUrl = environment.apiUrl.split('/api/v1/')[0];
    const cleanHtml = chapter.content_html.replace(/src=(["'])(\/?)media\//g, `src=$1${backendUrl}/media/`);

    // 2. Actualizar texto plano para SpeechSynthesis (usando HTML ya limpio)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHtml;
    this.currentChapterPlainText = tempDiv.textContent || '';

    // 3. Parsear el HTML limpio en bloques + tokens
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanHtml, 'text/html');
    const blocks: typeof this.parsedBlocks = [];
    let wordIdx = 0;

    const tokenize = (node: Node): typeof this.parsedBlocks[0]['tokens'] => {
      const tokens: typeof this.parsedBlocks[0]['tokens'] = [];
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = (child.textContent || '').split(/(\s+)/);
          parts.forEach(part => {
            if (part.trim().length > 0) {
              tokens.push({ text: part, isWord: true, isImg: false, idx: wordIdx++ });
            } else if (part.length > 0) {
              tokens.push({ text: part, isWord: false, isImg: false, idx: -1 });
            }
          });
        } else if ((child as Element).tagName?.toLowerCase() === 'img') {
          // Preservar imágenes como token especial (no se leen en voz alta)
          const img = child as HTMLImageElement;
          tokens.push({
            text: '',
            isWord: false,
            isImg: true,
            idx: -1,
            src: img.src || img.getAttribute('src') || '',
            alt: img.alt || ''
          });
        } else {
          tokens.push(...tokenize(child));
        }
      });
      return tokens;
    };

    doc.body.childNodes.forEach(node => {
      const el = node as Element;
      const tag = el.tagName?.toLowerCase() || '';

      // Imágenes a nivel raíz (fuera de párrafos) → bloque especial de imagen
      if (tag === 'img') {
        const img = el as HTMLImageElement;
        blocks.push({
          tag: 'img-block',
          tokens: [{ text: '', isWord: false, isImg: true, idx: -1,
            src: img.getAttribute('src') || '', alt: img.alt || '' }]
        });
      } else if (['p', 'h1', 'h2', 'h3', 'blockquote', 'div'].includes(tag)) {
        blocks.push({ tag, tokens: tokenize(el) });
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const parts = node.textContent.split(/(\s+)/);
        const tokens = parts
          .filter(p => p.length > 0)
          .map(p => p.trim().length > 0
            ? { text: p, isWord: true, isImg: false, idx: wordIdx++ }
            : { text: p, isWord: false, isImg: false, idx: -1 });
        if (tokens.length > 0) blocks.push({ tag: 'p', tokens });
      }
    });

    this.parsedBlocks = blocks;
    this.titleTokens = [];

    // 4. GESTIÓN DEL TÍTULO: Evitar duplicación y permitir sincronización.
    // Si el primer bloque contiene el título del capítulo, lo extraemos para el encabezado premium.
    if (this.parsedBlocks.length > 0) {
      const firstBlock = this.parsedBlocks[0];
      const titleToCompare = this.chapterTitle.toLowerCase().replace(/\s+/g, ' ').trim();
      
      let accumulatedText = '';
      let splitIndex = -1;

      for (let i = 0; i < firstBlock.tokens.length; i++) {
        accumulatedText += firstBlock.tokens[i].text;
        const normalizedAccumulated = accumulatedText.toLowerCase().replace(/\s+/g, ' ').trim();
        
        if (normalizedAccumulated === titleToCompare) {
          splitIndex = i + 1;
          break;
        }
        // Si nos pasamos mucho del largo, abortamos búsqueda
        if (normalizedAccumulated.length > titleToCompare.length + 5) break;
      }

      if (splitIndex !== -1) {
        // Extraer los tokens del título
        this.titleTokens = firstBlock.tokens.splice(0, splitIndex);
        
        // Limpiar espacios en blanco sobrantes al inicio del párrafo restante
        while (firstBlock.tokens.length > 0 && !firstBlock.tokens[0].isWord && !firstBlock.tokens[0].isImg) {
          firstBlock.tokens.shift();
        }
        
        // Si el bloque quedó vacío (era solo el título), lo eliminamos
        if (firstBlock.tokens.length === 0) {
          this.parsedBlocks.shift();
        }
      }
    }

    this.totalWordCount = wordIdx;
    this.safeChapterHtml = this.sanitizer.bypassSecurityTrustHtml(''); // vaciar el fallback

    const viewer = document.querySelector('.reading-canvas');
    if (viewer) viewer.scrollTop = 0;
  }

  /**
   * Envuelve cada palabra del HTML en un span con ID secuencial para el resaltado.
   */
  processContentForAudio(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let wordCount = 0;

    const traverse = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const words = text.split(/(\s+)/); // Preservar espacios
        const fragment = document.createDocumentFragment();

        words.forEach(w => {
          if (w.trim().length > 0) {
            const span = document.createElement('span');
            span.className = 'word';
            span.id = `word-${wordCount}`;
            span.textContent = w;
            fragment.appendChild(span);
            wordCount++;
          } else {
            fragment.appendChild(document.createTextNode(w));
          }
        });

        node.parentNode?.replaceChild(fragment, node);
      } else {
        node.childNodes.forEach(child => traverse(child));
      }
    };

    traverse(doc.body);
    return doc.body.innerHTML;
  }

  toggleAudioPanel() {
    this.isAudioPanelOpen = !this.isAudioPanelOpen;
  }

  // ── ECONOMÍA DE TINTA: desbloqueo permanente de Voz Premium (REMOVED) ──────
  purchaseNarration() {
    if (this.isUnlocking || !this.bookSlug) return;
    
    if (this.inkBalance < this.PREMIUM_VOICE_INK_COST) {
      alert(`No tienes tinta suficiente. Necesitas ${this.PREMIUM_VOICE_INK_COST} Ink.`);
      return;
    }

    this.isUnlocking = true;
    this.api.post(`catalog/books/${this.bookSlug}/purchase_narration/`, {}).subscribe({
      next: (res: any) => {
        this.isUnlocking = false;
        this.hasPremiumNarration = true;
        this.inkBalance = res.ink_balance;
        alert('¡Narración premium desbloqueada para todo el libro!');
      },
      error: (err) => {
        this.isUnlocking = false;
        console.error('Error al comprar narración', err);
        alert(err.error?.message || 'Error al procesar la compra.');
      }
    });
  }

  playAudio() {
    this.proErrorMessage = ''; 
    const chapter = this.chapters[this.currentPage - 1];

    if (this.currentAudioMode === 'native') {
      this.audioService.playNative(this.currentChapterPlainText);
    } else {
      // MODO GRABADO
      if (!this.hasPremiumNarration) {
        this.proErrorMessage = '🔒 Debes desbloquear "Otras opciones" para escuchar la voz grabada.';
        this.currentAudioMode = 'native';
        return;
      }

      this.isAudioLoading = true;
      
      // 1. Intentar obtener audio de la base de datos (ChapterAudio)
      if (chapter && chapter.audios && chapter.audios.length > 0) {
        const audio = chapter.audios[0];
        console.log('Reproduciendo audio desde base de datos:', audio.voice_name);
        
        this.audioService.playRecorded(audio.audio_url, audio.alignment_data).subscribe({
          next: () => this.isAudioLoading = false,
          error: (err) => {
            this.isAudioLoading = false;
            console.error('Error en AudioService (DB):', err);
            this.proErrorMessage = 'Error al reproducir el audio de la base de datos.';
          }
        });
        return;
      }

      // 2. Fallback a la ruta hardcodeada para el Principito Cap 1 si no hay registro en DB
      if (this.currentPage === 2) { // 2 es el Cap 1 (el 1 es Dedicatoria)
        const backendUrl = environment.apiUrl.split('/api/v1/')[0];
        const audioUrl = `${backendUrl}/media/audio_narrations/principito/cap_1_voz_caro.mp3`;

        console.log('Usando fallback hardcodeado para Principito Cap 1:', audioUrl);

        this.audioService.playRecorded(audioUrl).subscribe({
          next: () => this.isAudioLoading = false,
          error: (err) => {
            this.isAudioLoading = false;
            this.proErrorMessage = 'Error al reproducir el audio grabado local.';
          }
        });
      } else {
        this.isAudioLoading = false;
        this.proErrorMessage = '🔒 La voz grabada no está disponible para este capítulo.';
        this.currentAudioMode = 'native';
      }
    }
  }

  stopAudio() {
    this.audioService.stop();
    this.currentWordIndex = -1;
  }

  onWordClick(wordIdx: number) {
    if (this.currentAudioMode === 'pro') {
      this.audioService.seekToWord(wordIdx, this.currentChapterPlainText);
    }
    this.currentWordIndex = wordIdx;
  }

  // ── Persistencia de posición de audio ────────────────────────────
  private saveAudioPosition() {
    if (this.inventoryId) {
      localStorage.setItem(`audio_pos_${this.inventoryId}`, JSON.stringify({
        page: this.currentPage,
        wordIndex: this.currentWordIndex
      }));
    }
  }

  private scrollWordIntoView(idx: number) {
    const el = document.getElementById(`word-${idx}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }

  private highlightWord(index: number) {
    // Quitar clase anterior
    if (this.currentWordIndex !== -1) {
      const prevWord = document.getElementById(`word-${this.currentWordIndex}`);
      if (prevWord) prevWord.classList.remove('active-word');
    }

    // Añadir clase nueva
    if (index !== -1) {
      const currentWord = document.getElementById(`word-${index}`);
      if (currentWord) {
        currentWord.classList.add('active-word');
        // Scroll suave si la palabra se sale del viewport
        currentWord.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.renderCurrentChapter();
      this.saveProgressSubject.next(this.currentPage);
      this.loadAvatars();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderCurrentChapter();
      this.saveProgressSubject.next(this.currentPage);
      this.loadAvatars();
    }
  }

  // ── PERSONAJES ────────────────────────────────────────────────────
  toggleCharPanel() {
    this.isCharPanelOpen = !this.isCharPanelOpen;
    if (this.isCharPanelOpen) {
      this.isTocOpen = false;
      if (this.avatars.length === 0) this.loadAvatars();
    }
    // Cerrar perfil y chat al cerrar el panel
    if (!this.isCharPanelOpen) {
      this.showCharProfile = false;
    }
  }

  loadAvatars() {
    this.api.get(`ai/avatars/?inventory_id=${this.inventoryId}`).subscribe({
      next: (res: any) => { this.avatars = res; },
      error: (err) => console.warn('No hay personajes para este libro:', err)
    });
  }

  openCharProfile(avatar: any) {
    this.selectedAvatar = avatar;
    this.showCharProfile = true;
    this.isChatOpen = false;
  }

  closeCharProfile() {
    this.showCharProfile = false;
    this.selectedAvatar = null;
  }

  // ── CHAT ──────────────────────────────────────────────────────────
  startChat(avatar: any) {
    if (!avatar.is_unlocked) return;
    this.selectedAvatar = avatar;
    this.showCharProfile = false;

    this.api.get(`ai/sessions/?avatar_id=${avatar.id}`).subscribe({
      next: (session: any) => {
        this.chatSession = session;
        this.loadChatHistory(session.id);
        this.isChatOpen = true;
      },
      error: (err) => console.error('Error iniciando sesión de chat', err)
    });
  }

  loadChatHistory(sessionId: number) {
    this.api.get(`ai/sessions/${sessionId}/messages/`).subscribe({
      next: (msgs: any) => { this.chatMessages = msgs; },
      error: (err) => console.error('Error cargando historial', err)
    });
  }

  sendMessage() {
    if (!this.chatInput.trim() || this.isSendingMessage || !this.chatSession) return;
    if (this.inkBalance <= 0) return;

    const content = this.chatInput.trim();
    this.chatInput = '';
    this.isSendingMessage = true;

    // Añadir mensaje optimista del usuario
    this.chatMessages.push({
      role: 'user',
      content,
      created_at: new Date().toISOString()
    });

    this.api.post('ai/chat/', {
      session_id: this.chatSession.id,
      message: content,
      mode: this.chatMode
    }).subscribe({
      next: (res: any) => {
        this.chatMessages.push({
          role: 'assistant',
          content: res.reply,
          created_at: res.timestamp
        });
        this.inkBalance = res.ink_balance;
        this.isSendingMessage = false;
        setTimeout(() => this.scrollChatToBottom(), 50);
      },
      error: (err) => {
        console.error('Error en el chat', err);
        this.isSendingMessage = false;
        // Eliminar mensaje optimista si hubo error
        this.chatMessages.pop();
        this.chatInput = content;
      }
    });
  }

  closeChat() {
    this.isChatOpen = false;
  }

  private scrollChatToBottom() {
    const chatBody = document.querySelector('.chat-body');
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
  }

  setMode(mode: 'roleplay' | 'tutor' | 'critical') {
    this.chatMode = mode;
  }

  private loadInkBalance() {
    // Cargar el balance de tinta del usuario (desde perfil)
    this.api.get('users/profile/').subscribe({
      next: (profile: any) => {
        if (profile && profile.ink_balance !== undefined) {
          this.inkBalance = profile.ink_balance;
        }
      },
      error: () => {} // No crítico, usamos el default de 50
    });
  }

  // ── PERFORMANCE: trackBy para *ngFor ────────────────────────────
  /**
   * Evita re-renderizar bloques no modificados en capítulos largos.
   * Angular compara por referencia; trackBy le da una clave estable.
   */
  trackByBlock(index: number, block: any): number {
    // Usamos el índice del bloque como clave primaria (bloques no cambian dentro del capítulo)
    return index;
  }

  trackByToken(index: number, token: any): number {
    // El idx del token es único por capítulo; -1 es espacio/imagen (usar índice)
    return token.idx >= 0 ? token.idx : -(index + 1);
  }

  private syncProgressToBackend(page: number) {
    if (!this.progressId || this.totalPages === 0) return;

    const percentage = Math.round((page / this.totalPages) * 100);

    this.api.patch(`library/progress/${this.progressId}/`, { 
      current_page: page,
      completion_percentage: percentage
    }).subscribe({
      next: () => console.log(`✅ Progreso guardado: ${page} (${percentage}%)`),
      error: (err) => console.error('Error guardando progreso', err)
    });
  }
}
