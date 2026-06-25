import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { Router } from '@angular/router';
import lottie from 'lottie-web';

export interface Book {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  is_featured: boolean;
  cover_image: string | null;
  tags?: { name: string; slug: string }[];
  price?: number;
  author_name?: string;
}

export interface DemoAvatar {
  id: number;
  name: string;
  description: string;
  avatar_image_url: string | null;
  chat_count: number;
  book_title?: string;
  book_slug?: string;
}

export interface DemoChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // State
  allBooks: Book[] = [];
  trendingBooks: Book[] = [];
  recommendedBooks: Book[] = [];
  discoveryBooks: Book[] = [];
  randomDiscoveryBooks: Book[] = [];
  totalBooksCount: number = 1854;

  // Avatars showcase (from API)
  showcaseAvatars: DemoAvatar[] = [];
  avatarsLoading = false;

  // Demo Chat state
  demoMessages: DemoChatMessage[] = [
    { role: 'user', content: '¿Por qué luchas contra molinos?' },
    { role: 'assistant', content: 'Porque donde otros ven molinos, yo veo gigantes. El valor no reside en la victoria, sino en no bajar la espada.' }
  ];
  demoInput = '';
  demoSending = false;
  demoRemainingMessages = 3;
  demoChatLimitReached = false;
  demoAvatarName = 'Don Quijote';
  demoAvatarImage: string | null = null;

  // Libros con personajes IA activos (hardcoded — ya tienen AIAvatars configurados)
  featuredWithCharacters = [
    {
      slug: 'el-gato-negro-allan-poe-edgar',
      title: 'El Gato Negro',
      author: 'Edgar Allan Poe',
      cover: 'https://srbmswjsbkpftjabcurg.supabase.co/storage/v1/object/public/literatus-media/book_covers/el-gato-negro-allan-poe-edgar.jpg',
      genre: 'Terror · Gótico',
      characterCount: 3
    },
    {
      slug: 'el-principe-feliz-y-otros-cuentos-wilde-oscar',
      title: 'El Príncipe Feliz',
      author: 'Oscar Wilde',
      cover: 'https://srbmswjsbkpftjabcurg.supabase.co/storage/v1/object/public/literatus-media/book_covers/el-principe-feliz-y-otros-cuentos-wilde-oscar.jpg',
      genre: 'Cuento · Clásico',
      characterCount: 4
    },
    {
      slug: 'la-metamorfosis-kafka-franz',
      title: 'La Metamorfosis',
      author: 'Franz Kafka',
      cover: 'https://srbmswjsbkpftjabcurg.supabase.co/storage/v1/object/public/literatus-media/book_covers/la-metamorfosis-kafka-franz.jpg',
      genre: 'Ficción · Absurdismo',
      characterCount: 5
    },
    {
      slug: 'las-metamorfosis-ovidio',
      title: 'Metamorfosis',
      author: 'Ovidio',
      cover: 'https://srbmswjsbkpftjabcurg.supabase.co/storage/v1/object/public/literatus-media/book_covers/las-metamorfosis-ovidio.jpg',
      genre: 'Mitos · Clásico',
      characterCount: 6
    }
  ];

  activeCharacterIndex = 0;
  private charCarouselInterval: any;

  @ViewChild('avatarsCarousel') avatarsCarousel!: ElementRef;

  private _readingContainer?: ElementRef;
  @ViewChild('readingContainer') set readingContainer(el: ElementRef) {
    if (el && !this._readingContainer) {
      this._readingContainer = el;
      lottie.loadAnimation({
        container: el.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'assets/lottie/magic.json'
      });
    }
  }

  private _saludoContainer?: ElementRef;
  @ViewChild('saludoContainer') set saludoContainer(el: ElementRef) {
    if (el && !this._saludoContainer) {
      this._saludoContainer = el;
      lottie.loadAnimation({
        container: el.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'assets/lottie/saludo.json'
      });
    }
  }

  isLoading = true;
  errorMsg = '';

  private scrollIntervals: any[] = [];

  ngOnInit(): void {
    this.loadBooks();
    this.loadShowcaseAvatars();
  }

  ngAfterViewInit(): void {
    this.initRevealObserver();
  }

  // ─── Avatar Showcase ─────────────────────────────────────────────────────────

  private loadShowcaseAvatars(): void {
    this.avatarsLoading = true;
    this.api.get<any>('ai/hub/avatars/?sort=popularity').subscribe({
      next: (response: any) => {
        const avatars = Array.isArray(response) ? response : (response.results || []);
        this.showcaseAvatars = avatars.slice(0, 8);
        this.avatarsLoading = false;
      },
      error: () => {
        this.avatarsLoading = false;
      }
    });
  }

  goToCharactersHub(): void {
    this.router.navigate(['/characters']);
  }

  goToCharacterChat(avatar: DemoAvatar): void {
    if (!avatar) return;

    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/demo-chat', avatar.id]);
      return;
    }

    if (!avatar.book_slug) {
      this.router.navigate(['/demo-chat', avatar.id]);
      return;
    }

    // Si está logueado, verificar propiedad
    this.api.get<any>(`library/inventory/check/?slug=${avatar.book_slug}`).subscribe({
      next: (res: any) => {
        if (res.owned) {
          // Va al lector con el chat IA abierto
          this.router.navigate(['/reader', res.inventory_id], { 
            queryParams: { chatWith: avatar.id } 
          });
        } else {
          // Va a la página del libro para adquirirlo
          this.router.navigate(['/book', avatar.book_slug]);
        }
      },
      error: () => {
        // Fallback
        this.router.navigate(['/book', avatar.book_slug]);
      }
    });
  }

  scrollCarousel(direction: number): void {
    if (this.avatarsCarousel) {
      const el = this.avatarsCarousel.nativeElement;
      const scrollAmount = 320 * direction; // width of card (220px) + gap (24px) approx
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  // ─── Demo Chat ───────────────────────────────────────────────────────────────

  sendDemoMessage(): void {
    const msg = this.demoInput.trim();
    if (!msg || this.demoSending || this.demoChatLimitReached) return;

    this.demoMessages.push({ role: 'user', content: msg });
    this.demoInput = '';
    this.demoSending = true;

    this.api.post<any>('ai/demo-chat/', { message: msg }).subscribe({
      next: (res: any) => {
        this.demoMessages.push({ role: 'assistant', content: res.reply });
        this.demoRemainingMessages = res.remaining_messages ?? 0;
        if (res.avatar_name) this.demoAvatarName = res.avatar_name;
        if (res.avatar_image) this.demoAvatarImage = res.avatar_image;
        if (this.demoRemainingMessages <= 0) {
          this.demoChatLimitReached = true;
        }
        this.demoSending = false;
        setTimeout(() => this.scrollDemoToBottom(), 50);
      },
      error: (err: any) => {
        const errData = err?.error;
        if (errData?.error === 'DEMO_LIMIT_REACHED') {
          this.demoChatLimitReached = true;
          this.demoRemainingMessages = 0;
          this.demoMessages.push({
            role: 'assistant',
            content: errData.message || 'Has alcanzado el límite de mensajes de prueba. ¡Regístrate para continuar!'
          });
        } else {
          this.demoMessages.push({
            role: 'assistant',
            content: 'El viento sopla fuerte hoy y mi conexión es débil. Intenta de nuevo en un momento.'
          });
        }
        this.demoSending = false;
        setTimeout(() => this.scrollDemoToBottom(), 50);
      }
    });
  }

  onDemoKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendDemoMessage();
    }
  }

  private scrollDemoToBottom(): void {
    const el = document.querySelector('.demo-chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  // ─── Existing logic ───────────────────────────────────────────────────────────

  private initRevealObserver(): void {
    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObserver.unobserve(e.target);
        }
      }),
      { threshold: 0.05 }
    );
    document.querySelectorAll('.reveal-section:not(.visible)').forEach(el => revealObserver.observe(el));

    const statsEl = document.querySelector('.stats-section');
    if (statsEl) {
      const statsObserver = new IntersectionObserver(
        (entries) => entries.forEach(e => {
          if (e.isIntersecting) {
            this.animateCounters();
            statsObserver.unobserve(e.target);
          }
        }),
        { threshold: 0.3 }
      );
      statsObserver.observe(statsEl);
    }
  }

  private animateCounters(): void {
    const counters = [
      { id: 'stat-books', target: this.totalBooksCount },
      { id: 'stat-chars', target: 25 },
      { id: 'stat-convs', target: 150 },
      { id: 'stat-authors', target: 10 }
    ];
    counters.forEach(({ id, target }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const duration = 1800;
      const start = performance.now();
      const update = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(ease * target).toLocaleString('es-CL');
        if (progress < 1) requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.scrollIntervals.forEach(interval => clearInterval(interval));
    if (this.charCarouselInterval) clearInterval(this.charCarouselInterval);
  }

  goToCharBook(slug: string): void {
    this.router.navigate(['/book', slug]);
  }

  setCharacterSlide(index: number): void {
    this.activeCharacterIndex = index;
  }

  private loadBooks(): void {
    this.isLoading = true;

    this.api.get<any>('catalog/books/?ordering=-is_featured,-created_at&page_size=50').subscribe({
      next: (response) => {
        if (response && response.count) {
          this.totalBooksCount = response.count;
        }
        this.allBooks = response.results || response;
        this.buildSections();
        this.isLoading = false;
        setTimeout(() => {
          if (this.destroy$.isStopped) return;
          this.initAutoScroll();
          this.initRevealObserver();
        }, 150);
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar el catálogo.';
        this.isLoading = false;
      }
    });

    this.api.get<any>('catalog/books/recommendations/').subscribe({
      next: (response) => {
        this.recommendedBooks = response.results || response;
        setTimeout(() => {
          if (!this.destroy$.isStopped) {
            this.initRevealObserver();
            this.initAutoScroll();
          }
        }, 100);
      }
    });
  }

  private initAutoScroll(): void {
    const tracks = document.querySelectorAll('.trending-track:not(.scroll-init), .recommended-track:not(.scroll-init)');
    tracks.forEach((track: any) => {
      track.classList.add('scroll-init');
      let isInteracting = false;

      track.addEventListener('mouseenter', () => isInteracting = true);
      track.addEventListener('mouseleave', () => isInteracting = false);
      track.addEventListener('touchstart', () => isInteracting = true, { passive: true });
      track.addEventListener('touchend', () => { setTimeout(() => isInteracting = false, 2000); }, { passive: true });

      const interval = setInterval(() => {
        if (!isInteracting) {
          const cardWidth = track.firstElementChild ? track.firstElementChild.clientWidth + 24 : 250;
          if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            track.scrollBy({ left: cardWidth, behavior: 'smooth' });
          }
        }
      }, 4000);

      this.scrollIntervals.push(interval);
    });
  }

  private buildSections(): void {
    this.trendingBooks = this.allBooks.filter(b => b.is_featured).slice(0, 6);
    if (this.trendingBooks.length === 0) {
      this.trendingBooks = this.allBooks.slice(0, 6);
    }

    const trendingSlugs = new Set(this.trendingBooks.map(b => b.slug));
    this.discoveryBooks = this.allBooks.filter(b => !trendingSlugs.has(b.slug));
    this.randomDiscoveryBooks = [...this.allBooks].sort(() => 0.5 - Math.random());
  }

  scrollToCatalog(): void {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  }

  goToBook(slug: string): void {
    this.router.navigate(['/book', slug]);
  }

  trackBySlug(_: number, book: Book): string {
    return book.slug;
  }

  trackById(_: number, avatar: DemoAvatar): number {
    return avatar.id;
  }
}
