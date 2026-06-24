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
  author_name?: string;  // Nombre del autor para mostrar en las tarjetas
}

@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  styleUrls: ['./discover.component.css']
})
export class DiscoverComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // State
  allBooks: Book[] = [];
  trendingBooks: Book[] = [];
  recommendedBooks: Book[] = []; // Nueva lista de recomendados
  discoveryBooks: Book[] = [];
  randomDiscoveryBooks: Book[] = []; // Para el carrusel aleatorio
  totalBooksCount: number = 1854; // Fallback exact count

  // Search & Category State
  searchQuery: string = '';
  filteredBooks: Book[] = [];
  categories: string[] = ['Explorar', 'Tendencias', 'Ficción', 'Romance', 'Clásicos', 'Terror', 'Fantasía', 'Misterio', 'Drama'];
  selectedCategory: string = 'Explorar';

  onSearchChange(): void {
    this.applyFilters();
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  private applyFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();
    const cat = this.selectedCategory !== 'Explorar' ? this.selectedCategory.toLowerCase() : '';

    this.filteredBooks = this.allBooks.filter(b => {
      let matchesQuery = true;
      let matchesCat = true;

      if (q) {
        matchesQuery = (b.title || '').toLowerCase().includes(q) || 
                       (b.author_name?.toLowerCase() || '').includes(q);
      }

      if (cat && cat !== 'tendencias') {
        const tagsString = (b.tags?.map(t => t.name).join(' ') || '').toLowerCase();
        matchesCat = tagsString.includes(cat) || (b.synopsis || '').toLowerCase().includes(cat);
      } else if (cat === 'tendencias') {
        matchesCat = b.is_featured;
      }

      return matchesQuery && matchesCat;
    });
  }

  // Libros con personajes IA activos
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
  }

  ngAfterViewInit(): void {
    // Observar secciones que ya existen al iniciar (chat demo)
    this.initRevealObserver();
  }

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
    // Observa TODAS las reveal-section presentes en el DOM en este momento
    document.querySelectorAll('.reveal-section:not(.visible)').forEach(el => revealObserver.observe(el));

    // Animaci├│n de contadores de stats
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
    
    // Carga paralela: Catálogo General y Recomendaciones
    this.api.get<any>('catalog/books/?ordering=-is_featured,-created_at&page_size=200').subscribe({
      next: (response) => {
        if (response && response.count) {
          this.totalBooksCount = response.count;
        }
        this.allBooks = response.results || response;
        this.buildSections();
        this.isLoading = false;
        // Re-observar las secciones que se acaban de renderizar (dentro de *ngIf)
        setTimeout(() => {
          if (this.destroy$.isStopped) return; // FIX: Prevenir memory leaks
          this.initAutoScroll();
          this.initRevealObserver();
        }, 150);
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar el cat├ílogo.';
        this.isLoading = false;
      }
    });

    this.api.get<any>('catalog/books/recommendations/').subscribe({
      next: (response) => {
        this.recommendedBooks = response.results || response;
        setTimeout(() => {
          if (!this.destroy$.isStopped) {
            this.initRevealObserver();
            this.initAutoScroll(); // Tambi├®n inicializar auto scroll para los recomendados si es necesario
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
    // Trending: libros destacados primero
    this.trendingBooks = this.allBooks.filter(b => b.is_featured).slice(0, 6);
    if (this.trendingBooks.length === 0) {
      this.trendingBooks = this.allBooks.slice(0, 6);
    }

    // Discovery: todos menos los trending
    const trendingSlugs = new Set(this.trendingBooks.map(b => b.slug));
    this.discoveryBooks = this.allBooks.filter(b => !trendingSlugs.has(b.slug));
    
    // Shuffle array para el carrusel aleatorio
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


}
