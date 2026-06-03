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
  recommendedBooks: Book[] = []; // Nueva lista de recomendados
  discoveryBooks: Book[] = [];
  randomDiscoveryBooks: Book[] = []; // Para el carrusel aleatorio

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
  }

  ngAfterViewInit(): void {
    // Las animaciones se inicializan en los setters de ViewChild
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
    this.api.get<any>('catalog/books/?ordering=-is_featured,-created_at&page_size=50').subscribe({
      next: (response) => {
        this.allBooks = response.results || response;
        this.buildSections();
        this.isLoading = false;
        setTimeout(() => this.initAutoScroll(), 500);
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar el catálogo.';
        this.isLoading = false;
      }
    });

    this.api.get<any>('catalog/books/recommendations/').subscribe({
      next: (response) => {
        this.recommendedBooks = response.results || response;
      }
    });
  }

  private initAutoScroll(): void {
    const tracks = document.querySelectorAll('.trending-track, .recommended-track');
    tracks.forEach((track: any) => {
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
