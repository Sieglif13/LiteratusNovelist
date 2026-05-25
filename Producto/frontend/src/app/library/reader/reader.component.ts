import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AudioService } from '../../core/services/audio.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { PiperVoiceService } from '../../core/services/piper-voice.service';
import { ChatService } from '../../core/services/chat.service';
import { SpeechRecognitionService } from '../../core/services/speech-recognition.service';
import { trigger, state, style, transition, animate } from '@angular/animations';


export interface ProgressData {
  percentage: number;
  wordId: string;
  timestamp: number;
  scrollPercent?: number;
}

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
  public piperVoice = inject(PiperVoiceService);
  public chatService = inject(ChatService);
  public speechService = inject(SpeechRecognitionService);

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
  currentFontFamily: 'sans' | 'serif' | 'dyslexic' | 'medieval' | 'garamond' | 'georgia' | 'palatino' | 'opensans' | 'helvetica' = 'serif';
  isTocOpen: boolean = false;
  lastScrollTop: number = 0;
  isToolbarHidden: boolean = false;
  hideProgressOnScroll: boolean = true;
  bionicReadingActive: boolean = false;

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
  inkBalance: number = 0;

  // Audio Control
  currentAudioMode: 'native' | 'pro' | 'piper' = 'native';
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
    tokens: Array<any>;
    sentences?: Array<{
      idx: number;
      tokens: Array<{
        text: string;
        isWord: boolean;
        isImg: boolean;
        isBr?: boolean;
        idx: number;
        src?: string;
        alt?: string;
        bionicBold?: string;
        bionicNormal?: string;
      }>;
    }>;
  }> = [];
  titleTokens: any[] = [];
  private totalWordCount: number = 0;

  // ── VOZ Y LLAMADA ────────────────────────────────────────────────
  isCallMode: boolean = false;
  audioLevel: number = 0;
  partialTranscript: string = '';

  private saveProgressSubject = new Subject<number>();
  private destroy$ = new Subject<void>();
  private savedProgressData: ProgressData | null = null;
  
  chapterScrollPercent: number = 0;
  isNearEnd: boolean = false;
  showBookmarkToast: boolean = false;

  // Modal para ver imágenes
  showImageModal: boolean = false;
  modalImageSrc: string = '';

  // Modal para reiniciar audio
  showRestartModal: boolean = false;
  lastAudioWordIndex: number = 0;

  // Video Avatar
  @ViewChild('avatarVideo') avatarVideoElement!: ElementRef<HTMLVideoElement>;
  showVideoAvatar: boolean = false;
  isVideoSpeaking: boolean = false;

  // Estado IA
  aiProvider: string = 'gemini'; // 'gemini', 'deepseek', 'none'
  aiStatus: 'ok' | 'warning' | 'error' = 'ok';

  private isInitialDataLoaded = false;
  private isLoadingInitialData = false;

  ngOnInit() {
    this.inventoryId = this.route.snapshot.paramMap.get('id') || '';

    this.saveProgressSubject.pipe(debounceTime(3000)).subscribe(p => this.syncProgressToBackend(p));

    this.loadInitialData();
    this.applyTheme();
    this.applyFontSize();
    this.loadInkBalance();

    const savedFont = localStorage.getItem('reader-font-family');
    const validFonts = ['sans', 'serif', 'dyslexic', 'medieval', 'garamond', 'georgia', 'palatino', 'opensans', 'helvetica'];
    if (savedFont && validFonts.includes(savedFont)) {
      this.currentFontFamily = savedFont as any;
    }

    const savedHide = localStorage.getItem('reader-hide-progress');
    if (savedHide !== null) {
      this.hideProgressOnScroll = savedHide === 'true';
    }

    const savedBionic = localStorage.getItem('reader-bionic-reading');
    if (savedBionic !== null) {
      this.bionicReadingActive = savedBionic === 'true';
    }

    // Auto-abrir chat si venimos redirigidos por un personaje
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const avatarId = params['chatWith'];
      if (avatarId) {
        // Esperar a que los avatares carguen para poder iniciar el chat
        const checkAvatars = setInterval(() => {
          if (this.avatars && this.avatars.length > 0) {
            const avatar = this.avatars.find(a => a.id == avatarId);
            if (avatar) {
              this.startChat(avatar);
            }
            clearInterval(checkAvatars);
          }
        }, 100);
        // Timeout de seguridad de 5 segundos
        setTimeout(() => clearInterval(checkAvatars), 5000);
      }
    });

    // Resaltado: escuchar el word index del AudioService
    this.audioService.currentWordIndex$.pipe(takeUntil(this.destroy$)).subscribe(idx => {
      if (this.currentAudioMode !== 'piper') {
        this.currentWordIndex = idx;
        if (idx !== -1) {
          this.lastAudioWordIndex = idx;
          this.saveAudioPosition();
        }
        this.cdr.detectChanges(); // Forzar re-render sin borrar el DOM
        if (idx !== -1) this.scrollWordIntoView(idx);
      }
    });

    // Suscripciones de Reconocimiento de Voz
    this.speechService.transcript$.pipe(takeUntil(this.destroy$)).subscribe(text => {
      if (text) {
        this.chatInput = text;
        this.sendMessage();
      }
    });

    this.speechService.partialTranscript$.pipe(takeUntil(this.destroy$)).subscribe(text => {
      this.partialTranscript = text;
      this.cdr.detectChanges();
    });

    this.speechService.audioLevel$.pipe(takeUntil(this.destroy$)).subscribe(level => {
      this.audioLevel = level;
      this.cdr.detectChanges();
    });

    // Sincronizar Avatar animado con PiperVoice
    this.piperVoice.isSpeaking$.pipe(takeUntil(this.destroy$)).subscribe(isSpeaking => {
      this.isVideoSpeaking = isSpeaking;
      if (isSpeaking) {
        this.activeTalkingFrame = Math.floor(Math.random() * 3) + 1;
      }
      
      if (this.isCallMode && this.avatarVideoElement?.nativeElement) {
         const video = this.avatarVideoElement.nativeElement;
         if (isSpeaking) {
           video.currentTime = 1;
           video.play();
           video.ontimeupdate = () => {
             if (video.currentTime >= 6) video.currentTime = 1;
           };
         } else {
           video.pause();
           video.currentTime = 0;
           video.ontimeupdate = null;
         }
      }
      this.cdr.detectChanges();
    });

    // Resaltado: escuchar el word index del PiperVoice

    this.piperVoice.currentWordIndex$.pipe(takeUntil(this.destroy$)).subscribe(idx => {
      if (this.currentAudioMode === 'piper') {
        this.currentWordIndex = idx;
        if (idx !== -1) {
          this.lastAudioWordIndex = idx;
          this.saveAudioPosition();
        }
        this.cdr.detectChanges();
        if (idx !== -1) this.scrollWordIntoView(idx);
      }
    });

    // Suscribirse a la tinta global
    this.chatService.inkBalance$.pipe(takeUntil(this.destroy$)).subscribe(balance => {
      this.inkBalance = balance;
      this.cdr.detectChanges();
    });


    // Auto-avance de capítulo cuando termina la narración
    this.audioService.chapterEnd$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.lastAudioWordIndex = 0;
      this.saveAudioPosition(); // Guardar antes de avanzar
      if (this.currentPage < this.totalPages) {
        setTimeout(() => {
          this.currentPage++;
          this.parseAndRenderChapter();
          this.saveProgressSubject.next(this.currentPage - 1);
          // Iniciar narración del siguiente capítulo automáticamente
          setTimeout(() => this.playAudio(), 600);
        }, 500);
      }
    });

    // Guardar posición al cerrar/salir
    window.addEventListener('beforeunload', () => this.saveAudioPosition());
  }

  loadInitialData() {
    if (this.isInitialDataLoaded || this.isLoadingInitialData) return;
    this.isLoadingInitialData = true;

    this.api.get<any>(`library/inventory/${this.inventoryId}/`).subscribe({
      next: (inventory) => {
        this.isLoadingInitialData = false;
        this.isInitialDataLoaded = true;
        if (inventory && inventory.progress) {
          this.currentPage = inventory.progress.current_page || 1;
          this.progressId = inventory.progress.id;
          this.bookSlug = inventory.book_slug;
          
          if (inventory.progress.current_cfi) {
            try {
              this.savedProgressData = JSON.parse(inventory.progress.current_cfi);
            } catch (e) {
              // Legacy cfi
            }
          }
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

  onCanvasScroll(event: any) {
    const el = event.target;
    const scrollTop = el.scrollTop;
    
    // Ocultar/mostrar barra superior al hacer scroll
    if (scrollTop > this.lastScrollTop && scrollTop > 80) {
      this.isToolbarHidden = true;
    } else {
      this.isToolbarHidden = false;
    }
    this.lastScrollTop = scrollTop;

    // Calcular porcentaje de scroll del contenedor actual
    const scrollHeight = el.scrollHeight - el.clientHeight;
    const scrollPercent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    
    // Actualizar barra de progreso visual y botón "Siguiente"
    this.chapterScrollPercent = Math.min(100, Math.max(0, scrollPercent * 100));
    this.isNearEnd = scrollPercent >= 0.98 || (scrollHeight - scrollTop) < 50;

    // Calcular página decimal exacta (ej. 1.5 significa mitad de capítulo 1)
    const exactPage = (this.currentPage - 1) + scrollPercent;
    
    // No guardamos palabra aquí, solo porcentaje exacto
    this.saveProgressSubject.next(exactPage);
  }

  // ── TEMA Y FUENTE ─────────────────────────────────────────────────
  changeFontSize(delta: number) {
    this.fontSize = Math.min(Math.max(this.fontSize + delta, 12), 32);
    this.applyFontSize();
  }

  setFontFamily(font: 'sans' | 'serif' | 'dyslexic' | 'medieval' | 'garamond' | 'georgia' | 'palatino' | 'opensans' | 'helvetica') {
    this.currentFontFamily = font;
    localStorage.setItem('reader-font-family', font);
  }

  setTheme(theme: 'dark' | 'light' | 'sepia') {
    this.currentTheme = theme;
    this.applyTheme();
  }

  setHideProgress(value: boolean) {
    this.hideProgressOnScroll = value;
    localStorage.setItem('reader-hide-progress', String(value));
  }

  setBionicReading(value: boolean) {
    this.bionicReadingActive = value;
    localStorage.setItem('reader-bionic-reading', String(value));
  }

  getBionicSplit(word: string): { bold: string; normal: string } {
    if (!word) return { bold: '', normal: '' };
    let cleanWord = word;
    let prefix = '';
    let suffix = '';
    const match = word.match(/^([^\w]*)(.*?)([^\w]*)$/);
    if (match) {
      prefix = match[1];
      cleanWord = match[2];
      suffix = match[3];
    }
    if (cleanWord.length === 0) {
      return { bold: prefix, normal: suffix };
    }
    let boldLength = 1;
    const len = cleanWord.length;
    if (len === 1) {
      boldLength = 1;
    } else if (len === 2) {
      boldLength = 1;
    } else if (len === 3) {
      boldLength = 2;
    } else {
      boldLength = Math.ceil(len * 0.45);
    }
    return {
      bold: prefix + cleanWord.substring(0, boldLength),
      normal: cleanWord.substring(boldLength) + suffix
    };
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
    this.saveProgressSubject.next(index);
    this.isTocOpen = false;
    // Recargar avatares con el nuevo capítulo para actualizar desbloqueos
    this.loadAvatars();
  }

  // ── CAPÍTULOS ─────────────────────────────────────────────────────
  loadChapters() {
    if (this.chapters && this.chapters.length > 0) return;
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

  isActiveSentence(sentence: any): boolean {
    if (this.currentWordIndex < 0 || !sentence || !sentence.tokens) return false;
    const words = sentence.tokens.filter((t: any) => t.isWord);
    if (words.length === 0) return false;
    const firstIdx = words[0].idx;
    const lastIdx = words[words.length - 1].idx;
    return this.currentWordIndex >= firstIdx && this.currentWordIndex <= lastIdx;
  }

  /** Parsea el HTML del capítulo y crea la estructura de bloques/tokens para el *ngFor */
  parseAndRenderChapter() {
    const chapter = this.chapters[this.currentPage - 1];
    if (!chapter) return;

    this.currentWordIndex = this.getSavedAudioWordIndex();

    this.chapterTitle = chapter.title || `Capítulo ${this.currentPage}`;

    // 1. Calcular backendUrl y limpiar HTML primero para evitar que el navegador
    // cargue imágenes relativas erróneas al procesar el texto plano.
    const backendUrl = environment.apiUrl.split('/api/v1/')[0];
    const cleanHtml = chapter.content_html.replace(/src=(["'])(\/?)media\//g, `src=$1${backendUrl}/media/`);

    // 2. Actualizar texto plano para SpeechSynthesis (usando HTML ya limpio)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHtml;
    this.currentChapterPlainText = tempDiv.textContent || '';

    // 3. Parsear el HTML limpio preservando la estructura
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanHtml, 'text/html');
    const blocks: typeof this.parsedBlocks = [];
    let wordIdx = 0;

    const tokenizeInline = (node: Node): typeof this.parsedBlocks[0]['tokens'] => {
      const tokens: typeof this.parsedBlocks[0]['tokens'] = [];
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = (child.textContent || '').split(/(\s+)/);
          parts.forEach(part => {
            if (part.trim().length > 0) {
              const split = this.getBionicSplit(part);
              tokens.push({
                text: part,
                isWord: true,
                isImg: false,
                isBr: false,
                idx: wordIdx++,
                bionicBold: split.bold,
                bionicNormal: split.normal
              });
            }
 else if (part.length > 0) {
              tokens.push({ text: part, isWord: false, isImg: false, isBr: false, idx: -1 });
            }
          });
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as Element;
          const tag = el.tagName.toLowerCase();
          if (tag === 'img') {
            const img = el as HTMLImageElement;
            tokens.push({
              text: '', isWord: false, isImg: true, isBr: false, idx: -1,
              src: img.src || img.getAttribute('src') || '', alt: img.alt || ''
            });
          } else if (tag === 'br') {
            tokens.push({ text: '', isWord: false, isImg: false, isBr: true, idx: -1 });
          } else {
            tokens.push(...tokenizeInline(child));
          }
        }
      });
      return tokens;
    };

    const blockTags = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li', 'ul', 'ol', 'section', 'article', 'figure']);

    const parseNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        
        if (tag === 'img') {
          const img = el as HTMLImageElement;
          blocks.push({
            tag: 'img-block',
            tokens: [{ text: '', isWord: false, isImg: true, idx: -1, src: img.src || img.getAttribute('src') || '', alt: img.alt || '' }]
          });
        } else if (blockTags.has(tag)) {
          let hasBlockChildren = false;
          for (let i = 0; i < el.children.length; i++) {
            if (blockTags.has(el.children[i].tagName.toLowerCase())) {
              hasBlockChildren = true;
              break;
            }
          }

          if (hasBlockChildren) {
            el.childNodes.forEach(child => parseNode(child));
          } else {
            const tokens = tokenizeInline(el);
            if (tokens.length > 0) {
              blocks.push({ tag: tag === 'div' || tag === 'figure' ? 'p' : tag, tokens });
            }
          }
        } else {
          const tokens = tokenizeInline(node);
          if (tokens.length > 0) blocks.push({ tag: 'p', tokens });
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const tokens = tokenizeInline(node);
        if (tokens.length > 0) blocks.push({ tag: 'p', tokens });
      }
    };

    doc.body.childNodes.forEach(child => parseNode(child));

    // 4. Agrupar tokens por oraciones (punto a punto) para resaltar como ReadEra
    let globalSentenceIdx = 0;
    blocks.forEach(block => {
      if (block.tag === 'img-block') return;
      
      const sentences = [];
      let currentTokens = [];
      
      for (let i = 0; i < block.tokens.length; i++) {
        const tok = block.tokens[i];
        currentTokens.push(tok);
        
        if (tok.isWord) {
          if (/[.!?]["'»”)]*$/.test(tok.text)) {
            sentences.push({ idx: globalSentenceIdx++, tokens: currentTokens });
            currentTokens = [];
          }
        } else if (tok.isBr) {
          sentences.push({ idx: globalSentenceIdx++, tokens: currentTokens });
          currentTokens = [];
        }
      }
      
      if (currentTokens.length > 0) {
        sentences.push({ idx: globalSentenceIdx++, tokens: currentTokens });
      }
      
      block.sentences = sentences;
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

    // Restaurar posición si hay datos guardados para esta página
    setTimeout(() => {
      if (this.savedProgressData) {
        if (this.savedProgressData.wordId) {
          const idx = parseInt(this.savedProgressData.wordId.split('-')[1]);
          if (!isNaN(idx)) this.scrollWordIntoView(idx, true);
        } else if (this.savedProgressData.scrollPercent && viewer) {
          viewer.scrollTop = this.savedProgressData.scrollPercent * (viewer.scrollHeight - viewer.clientHeight);
        }
        this.savedProgressData = null; // Limpiar después de restaurar
      } else if (this.currentWordIndex > 0) {
        this.scrollWordIntoView(this.currentWordIndex, true);
      }
    }, 500); // Dar tiempo a Angular a renderizar el *ngFor
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

  getFirstVisibleWordIndex(): number {
    // Obtenemos todas las palabras y buscamos la primera que esté visible
    // en la pantalla (viewport) debajo del header (aprox 80px).
    const words = document.querySelectorAll('.word');
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const rect = w.getBoundingClientRect();
      // rect.top es relativo a la pantalla del usuario. 
      // 80px es un margen seguro para saltarse el toolbar superior fijo.
      if (rect.top >= 80 && rect.top <= window.innerHeight) {
        const idStr = w.getAttribute('id');
        if (idStr) {
          return parseInt(idStr.replace('word-', ''), 10);
        }
      }
    }
    return -1;
  }

  resumeAudio() {
    const savedWordEl = document.getElementById(`word-${this.lastAudioWordIndex}`);
    if (savedWordEl) {
      const savedRect = savedWordEl.getBoundingClientRect();
      
      // Si el usuario scrolleó y la palabra pausada ya no se ve en pantalla, 
      // cancelamos el resume normal y forzamos a que inicie desde el scroll actual.
      if (savedRect.bottom <= 80 || savedRect.top >= window.innerHeight) {
        this.stopAudio(true);
        // Le damos un pequeño tiempo para que el stop haga efecto antes de iniciar
        setTimeout(() => this.playAudio(), 100);
        return;
      }
    }

    // Si sigue visible, simplemente reanuda donde se quedó
    if (this.currentAudioMode === 'piper') {
      this.piperVoice.resume();
    } else {
      this.audioService.resume();
    }
  }

  playAudio() {
    this.stopAudio(true); // Evitar que múltiples narradores hablen al mismo tiempo
    this.proErrorMessage = ''; 
    const chapter = this.chapters[this.currentPage - 1];

    // LÓGICA DE CONTINUACIÓN DE SCROLL: 
    // Si la palabra guardada está fuera de pantalla, reanudar desde lo que el usuario está viendo actualmente.
    const savedWordEl = document.getElementById(`word-${this.lastAudioWordIndex}`);
    if (savedWordEl) {
      const savedRect = savedWordEl.getBoundingClientRect();
      
      // Si el elemento guardado está completamente fuera del viewport (pantalla real)
      if (savedRect.bottom <= 80 || savedRect.top >= window.innerHeight) {
        const visibleIdx = this.getFirstVisibleWordIndex();
        if (visibleIdx !== -1) {
          this.lastAudioWordIndex = visibleIdx;
          this.currentWordIndex = visibleIdx;
        }
      }
    } else {
       // Si la palabra guardada ni siquiera existe en el DOM (ej. cap nuevo) o no se encuentra
       const visibleIdx = this.getFirstVisibleWordIndex();
       if (visibleIdx !== -1) {
         this.lastAudioWordIndex = visibleIdx;
         this.currentWordIndex = visibleIdx;
       }
    }

    if (this.currentAudioMode === 'native') {
      const startWord = this.lastAudioWordIndex >= 0 ? this.lastAudioWordIndex : 0;
      this.audioService.playNative(this.currentChapterPlainText, startWord);
    } else if (this.currentAudioMode === 'piper') {
      // MODO PIPER TTS (Local)
      if (!(this.piperVoice as any).isReadySubject?.value) {
        this.piperVoice.initModel().then(() => {
          this.piperVoice.speak(this.currentChapterPlainText);
        });
      } else {
        this.piperVoice.speak(this.currentChapterPlainText);
      }
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

      // 2. Fallbacks temporales sin JSON (MP3 crudo) para no complicar el modelo por ahora
      const backendUrl = environment.apiUrl.split('/api/v1/')[0];
      // Usamos el order real del capítulo en la BD, no el índice de página del lector
      const chapterOrder = chapter?.order ?? this.currentPage;
      const capNumStr = chapterOrder.toString().padStart(2, '0');
      let fallbackAudioUrl = '';

      console.log(`[Audio] Capítulo DB: order=${chapterOrder}, Construyendo URL con: Capitulo_${capNumStr}.mp3`);

      if (this.bookSlug === 'el-extrano-caso-del-dr-jekyll-y-mr-hyde' || this.bookSlug?.includes('jekyll')) {
        fallbackAudioUrl = `${backendUrl}/media/audio_narrations/El_extraño_caso/Capitulo_${capNumStr}.mp3`;
      } else if (this.bookSlug === 'el-principe-feliz' || this.bookSlug?.includes('principe')) {
        fallbackAudioUrl = `${backendUrl}/media/audio_narrations/Principe_Feliz/Capitulo_${capNumStr}.mp3`;
      } else if (this.bookSlug === 'el-principito' || this.bookSlug?.includes('principito')) {
        fallbackAudioUrl = `${backendUrl}/media/audio_narrations/principito/Capitulo_${capNumStr}.mp3`;
      }

      if (fallbackAudioUrl) {
        console.log('Usando fallback hardcodeado MP3:', fallbackAudioUrl);
        this.audioService.playRecorded(fallbackAudioUrl).subscribe({
          next: () => {
            this.isAudioLoading = false;
            // Modo fallback sin JSON: Limpiamos el resaltado ya que ahora usaremos Whisper para sincronizar de verdad.
            this.currentWordIndex = -1;
          },
          error: (err) => {
            this.isAudioLoading = false;
            this.proErrorMessage = '🔒 Audio no disponible o no encontrado para este capítulo.';
            this.currentAudioMode = 'native';
          }
        });
      } else {
        this.isAudioLoading = false;
        this.proErrorMessage = '🔒 La voz grabada no está disponible para este libro aún.';
        this.currentAudioMode = 'native';
      }
    }
  }

  stopAudio(preventScroll: boolean = false) {
    this.audioService.stop();
    this.piperVoice.stop();
    this.currentWordIndex = -1;

    if (!preventScroll) {
      // Volver al inicio del texto visualmente (solo cuando se detiene manual y definitivamente)
      const canvas = document.querySelector('.reading-canvas');
      if (canvas) {
        canvas.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  onWordClick(wordIdx: number) {
    if (this.currentAudioMode === 'pro') {
      this.audioService.seekToWord(wordIdx, this.currentChapterPlainText);
    }
    this.currentWordIndex = wordIdx;
  }

  getSavedAudioWordIndex(): number {
    if (!this.inventoryId) return 0;
    try {
      const saved = localStorage.getItem(`audio_pos_${this.inventoryId}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.page === this.currentPage && typeof data.wordIndex === 'number' && data.wordIndex >= 0) {
          this.lastAudioWordIndex = data.wordIndex;
          return data.wordIndex;
        }
      }
    } catch (e) {
      console.warn('Error reading saved audio position', e);
    }
    this.lastAudioWordIndex = 0;
    return 0;
  }

  confirmRestartAudio() {
    this.showRestartModal = true;
  }

  closeRestartModal() {
    this.showRestartModal = false;
  }

  restartAudio() {
    this.showRestartModal = false;
    this.stopAudio();
    this.currentWordIndex = 0;
    this.lastAudioWordIndex = 0;
    this.saveAudioPosition();
    setTimeout(() => {
      this.playAudio();
    }, 100);
  }

  private saveAudioPosition() {
    if (this.inventoryId) {
      localStorage.setItem(`audio_pos_${this.inventoryId}`, JSON.stringify({
        page: this.currentPage,
        wordIndex: this.lastAudioWordIndex
      }));
    }
  }

  private scrollWordIntoView(idx: number, highlightBookmark: boolean = false) {
    const el = document.getElementById(`word-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
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
      this.saveProgressSubject.next(this.currentPage - 1);
      this.loadAvatars();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderCurrentChapter();
      this.saveProgressSubject.next(this.currentPage - 1);
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

  toggleVideoAvatar() {
    this.showVideoAvatar = !this.showVideoAvatar;
    // Siempre reajustar el scroll después de cambiar el layout del video
    setTimeout(() => this.scrollChatToBottom(), 150);
  }

  activeTalkingFrame: number = 1;

  getMangaFrameUrl(): string | null {
    if (!this.selectedAvatar || !this.selectedAvatar.avatar_image_url) return null;
    const imgUrl = this.selectedAvatar.avatar_image_url;
    if (!imgUrl.includes('manga_assets')) {
      return imgUrl;
    }
    const lastSlashIndex = imgUrl.lastIndexOf('/');
    const basePath = imgUrl.substring(0, lastSlashIndex);
    if (this.isSendingMessage) {
      return `${basePath}/thinking.png`;
    } else if (this.isVideoSpeaking) {
      return `${basePath}/talking_${this.activeTalkingFrame}.png`;
    } else {
      return `${basePath}/calm.png`;
    }
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
        this.isCharPanelOpen = true; // sidebar siempre abierto
        this.showVideoAvatar = false; // El video es MANUAL (botón 📞)
        setTimeout(() => this.scrollChatToBottom(), 200);
      },
      error: (err) => console.error('Error iniciando sesión de chat', err)
    });
  }

  loadChatHistory(sessionId: number) {
    this.api.get(`ai/sessions/${sessionId}/messages/`).subscribe({
      next: (msgs: any) => { 
        this.chatMessages = msgs; 
        // Scroll al final después de cargar el historial
        setTimeout(() => this.scrollChatToBottom(), 150);
      },
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
      message: content
    }).subscribe({
      next: (res: any) => {
        this.chatMessages.push({
          role: 'assistant',
          content: res.reply,
          created_at: res.timestamp
        });
        
        // Actualizar balance de tinta
        if (res.ink_balance !== undefined) {
          this.inkBalance = res.ink_balance;
          this.chatService.updateInkBalance(res.ink_balance);
        }

        // Actualizar estado IA
        this.aiProvider = res.ai_provider || 'gemini';
        this.aiStatus = res.ai_status || 'ok';
        
        this.isSendingMessage = false;
        setTimeout(() => this.scrollChatToBottom(), 50);

        // Hablar respuesta si el avatar está visible o siempre (según preferencia)
        this.speakChatReply(res.reply);
      },
      error: (err) => {
        console.error('Error en el chat', err);
        this.isSendingMessage = false;
        this.aiStatus = 'error';
        // Eliminar mensaje optimista si hubo error
        this.chatMessages.pop();
        this.chatInput = content;
      }
    });
  }

  formatMessage(text: string): string {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  toggleCallMode() {
    this.isCallMode = !this.isCallMode;
    if (this.isCallMode) {
      this.speechService.startListening();
      // Asegurar que el modelo esté listo
      if (!this.piperVoice.isReadySubject.value) {
        this.piperVoice.initModel();
      }
    } else {
      this.speechService.stopListening();
      this.piperVoice.stop();
      // Pequeño delay para que el *ngIf restaure el DOM y podamos scrollear
      setTimeout(() => this.scrollChatToBottom(), 100);
    }
  }

  closeChat() {

    this.isChatOpen = false;
  }

  private scrollChatToBottom() {
    // Actualizado al nuevo selector del diseño Character.ai
    const chatBody = document.querySelector('.chat-messages-area');
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }


  private async speakChatReply(text: string) {
    if (this.isCallMode) {
      // Usar PiperVoice en Modo Llamada para inmersión
      if (!this.piperVoice.isReadySubject.value) {
        await this.piperVoice.initModel();
      }
      this.piperVoice.speak(text);
    } else {
      // Usar SpeechSynthesis nativo para el chat por ahora
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Intentar usar la voz seleccionada en el AudioService
      const selectedVoice = this.audioService.selectedVoice;
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = 'es-ES';
      }

      utterance.onstart = () => {
        this.isVideoSpeaking = true;
        this.activeTalkingFrame = Math.floor(Math.random() * 3) + 1;
        if (this.avatarVideoElement?.nativeElement) {
          const video = this.avatarVideoElement.nativeElement;
          video.currentTime = 1; // Empezar directamente donde abre la boca
          video.play();
          
          // Loop perfecto de 1 a 6 segundos
          video.ontimeupdate = () => {
            if (video.currentTime >= 6) {
              video.currentTime = 1;
            }
          };
        }
        this.cdr.detectChanges();
      };

      utterance.onend = () => {
        this.isVideoSpeaking = false;
        if (this.avatarVideoElement?.nativeElement) {
          this.avatarVideoElement.nativeElement.pause();
          this.avatarVideoElement.nativeElement.currentTime = 0;
        }
        this.cdr.detectChanges();
      };

      utterance.onerror = () => {
        this.isVideoSpeaking = false;
        if (this.avatarVideoElement?.nativeElement) {
          this.avatarVideoElement.nativeElement.pause();
          this.avatarVideoElement.nativeElement.currentTime = 0;
        }
        this.cdr.detectChanges();
      };

      window.speechSynthesis.speak(utterance);
    }
  }


  private loadInkBalance() {
    this.chatService.loadInitialInk();
  }

  // ── PERFORMANCE: trackBy para *ngFor ────────────────────────────
  /**
   * Evita re-renderizar bloques no modificados en capítulos largos.
   * Angular compara por referencia; trackBy le da una clave estable.
   */
  trackByBlock(index: number, block: any): number {
    return index;
  }

  trackByToken(index: number, token: any): number {
    return token.idx >= 0 ? token.idx : -(index + 1);
  }

  // ── MENU DE ACCIÓN DE PALABRA Y DICCIONARIO ───────────────────────
  showWordMenu: boolean = false;
  wordMenuX: number = 0;
  wordMenuY: number = 0;
  selectedText: string = '';
  isMenuBelow: boolean = false;

  // Diccionario Integrado
  showDictionaryModal: boolean = false;
  dictionaryResult: any = null;
  isDictionaryLoading: boolean = false;

  @HostListener('document:selectionchange', ['$event'])
  onSelectionChange() {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      
      // VERIFICAR QUE LA SELECCIÓN ESTÉ DENTRO DEL CONTENIDO DEL LIBRO (.reading-canvas)
      const anchorNode = selection.anchorNode;
      const readingCanvas = document.querySelector('.reading-canvas');
      if (anchorNode && readingCanvas && !readingCanvas.contains(anchorNode)) {
         this.showWordMenu = false;
         return;
      }

      // Usar setTimeout para dejar que el DOM se asiente
      setTimeout(() => {
        if (selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        this.selectedText = selection.toString().trim();
        
        // Coordenadas base
        this.wordMenuX = rect.left + (rect.width / 2);
        
        // Control de bordes (si está muy arriba, mostrar abajo)
        if (rect.top < 80) {
          this.wordMenuY = rect.bottom + 15;
          this.isMenuBelow = true;
        } else {
          this.wordMenuY = rect.top - 15;
          this.isMenuBelow = false;
        }
        
        this.showWordMenu = true;
      }, 50);
    } else {
      this.showWordMenu = false;
      this.selectedText = '';
    }
  }

  askCharacter() {
    if (!this.selectedText || this.characterAvatars.length === 0) {
      alert('No hay texto seleccionado o personajes disponibles.');
      return;
    }
    const defaultAvatar = this.characterAvatars[0];
    this.startChat(defaultAvatar);
    this.chatInput = `¿Qué significa esto en la historia?\n\n"${this.selectedText}"`;
    this.showWordMenu = false;
  }

  saveBookmark() {
    if (!this.selectedText) return;

    // Obtener el ID de la palabra seleccionada si existe
    const selection = window.getSelection();
    let wordId = '';
    
    if (selection && selection.rangeCount > 0) {
      const node = selection.anchorNode?.parentElement;
      // Buscar hacia arriba por si seleccionó un nodo de texto dentro del span
      const wordSpan = node?.closest('.word');
      if (wordSpan && wordSpan.id) {
        wordId = wordSpan.id;
      }
    }

    // Calcular la página exacta actual
    const viewer = document.querySelector('.reading-canvas');
    let exactPage = this.currentPage - 1;
    if (viewer) {
      const scrollHeight = viewer.scrollHeight - viewer.clientHeight;
      const scrollPercent = scrollHeight > 0 ? viewer.scrollTop / scrollHeight : 0;
      exactPage += scrollPercent;
    }

    this.syncProgressToBackend(exactPage, wordId);
    
    // Mostrar el toast en vez de alert
    this.showBookmarkToast = true;
    setTimeout(() => {
      this.showBookmarkToast = false;
    }, 2500);

    this.showWordMenu = false;
  }

  playAudioFromSelection() {
    if (!this.selectedText) return;
    
    const selection = window.getSelection();
    let wordIdx = -1;
    
    if (selection && selection.rangeCount > 0) {
      const node = selection.anchorNode?.parentElement;
      const wordSpan = node?.closest('.word');
      if (wordSpan && wordSpan.id) {
        wordIdx = parseInt(wordSpan.id.replace('word-', ''), 10);
      }
    }

    this.showWordMenu = false;
    
    if (wordIdx !== -1 && !isNaN(wordIdx)) {
      this.lastAudioWordIndex = wordIdx;
      this.currentWordIndex = wordIdx;
      this.saveAudioPosition();
      this.stopAudio(true);
      
      // Pequeño retardo para asegurar que stopAudio finalice antes de iniciar el nuevo
      setTimeout(() => {
        // Forzar panel de audio abierto si no lo estaba
        if (!this.isAudioPanelOpen) this.isAudioPanelOpen = true;
        this.playAudio();
      }, 150);
    } else {
      // Si no detectó bien la palabra (seleccionó un espacio vacío), iniciamos normal
      if (!this.isAudioPanelOpen) this.isAudioPanelOpen = true;
      this.playAudio();
    }
  }

  defineWord() {
    if (!this.selectedText) return;
    
    // Ocultar menú de acción y mostrar modal de diccionario
    this.showWordMenu = false;
    this.showDictionaryModal = true;
    this.isDictionaryLoading = true;
    this.dictionaryResult = null;

    // Obtener primera palabra limpia
    const wordToSearch = this.selectedText.split(/\s+/)[0].replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/g, '');

    // Llamada a API de diccionario abierta (Wiktionary / Google / Diccionario abierto)
    // Usamos la API pública de Free Dictionary API (español soportado de forma limitada, pero sirve de mockup/demo funcional)
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/es/${encodeURIComponent(wordToSearch.toLowerCase())}`)
      .then(res => {
        if (!res.ok) throw new Error('No encontrado');
        return res.json();
      })
      .then(data => {
        this.dictionaryResult = data[0];
        this.isDictionaryLoading = false;
      })
      .catch(err => {
        this.dictionaryResult = { error: 'No se encontró una definición exacta para esta palabra.' };
        this.isDictionaryLoading = false;
      });
  }

  closeDictionary() {
    this.showDictionaryModal = false;
    this.dictionaryResult = null;
  }

  private syncProgressToBackend(exactPage: number, wordId: string = '') {
    if (!this.progressId || this.totalPages === 0) return;

    const percentage = Math.round((exactPage / this.totalPages) * 100);
    const safePercentage = Math.min(Math.max(percentage, 0), 100); // Evitar > 100%
    const intPage = Math.floor(exactPage) + 1; // Capítulo actual como entero
    
    // Calcular el porcentaje de scroll dentro del capítulo (0 a 1)
    const scrollPercent = exactPage - Math.floor(exactPage);

    // Crear el objeto ProgressData tipado
    const progressData: ProgressData = {
      percentage: safePercentage,
      wordId: wordId,
      timestamp: Date.now(),
      scrollPercent: scrollPercent
    };

    this.api.patch(`library/progress/${this.progressId}/`, { 
      current_page: intPage,
      completion_percentage: safePercentage,
      current_cfi: JSON.stringify(progressData)
    }).subscribe({
      next: () => console.log(`✅ Progreso guardado: Cap ${intPage} (${safePercentage}%), Palabra: ${wordId}`),
      error: (err) => console.error('Error guardando progreso', err)
    });
  }

  // ── MODAL PARA IMÁGENES EN CAPÍTULO ──────────────────────────────
  openImageModal(src?: string) {
    if (!src) return;
    this.modalImageSrc = src;
    this.showImageModal = true;
  }

  closeImageModal() {
    this.showImageModal = false;
    this.modalImageSrc = '';
  }
}

