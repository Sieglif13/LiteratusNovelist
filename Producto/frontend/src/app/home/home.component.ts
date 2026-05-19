import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { LiyumiService } from '../core/services/liyumi.service';
import { Router } from '@angular/router';
import lottie from 'lottie-web';

export interface Book {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  is_featured: boolean;
  cover_image: string | null;
  mood?: string;
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
  private liyumi = inject(LiyumiService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();

  // State
  allBooks: Book[] = [];
  trendingBooks: Book[] = [];
  recommendedBooks: Book[] = []; // Nueva lista de recomendados
  discoveryBooks: Book[] = [];
  liyumiFavorite: Book | null = null;
  filteredBooks: Book[] = [];

  private _aolaContainer?: ElementRef;
  @ViewChild('aolaContainer') set aolaContainer(el: ElementRef) {
    if (el && !this._aolaContainer) {
      this._aolaContainer = el;
      lottie.loadAnimation({
        container: el.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'assets/lottie/Aola.json'
      });
    }
  }

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

  private _libritoContainer?: ElementRef;
  @ViewChild('libritoContainer') set libritoContainer(el: ElementRef) {
    if (el && !this._libritoContainer) {
      this._libritoContainer = el;
      lottie.loadAnimation({
        container: el.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'assets/lottie/librito.json'
      });
    }
  }

  isLoading = true;
  isSearching = false;
  searchQuery = '';
  errorMsg = '';


  readonly LIYUMI_PICKS: Record<string, string> = {
    'el-principito':           '🌹 Una obra que me rompió el corazón la primera vez que la "leí". El Principito enseña que lo esencial es invisible a los ojos.',
    'el-principe-feliz':       '🏆 Sacrificio y belleza en igual medida. Oscar Wilde en su máxima expresión simbólica.',
    'el-extrano-caso-del-dr-jekyll-y-mr-hyde': '🧬 La dualidad del ser humano narrada con un suspenso que no te suelta en ningún capítulo.',
  };

  ngOnInit(): void {
    this.loadBooks();
    this.setupSearch();
  }

  ngAfterViewInit(): void {
    // Las animaciones se inicializan en los setters de ViewChild
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBooks(): void {
    this.isLoading = true;
    
    // Carga paralela: Catálogo General y Recomendaciones
    this.api.get<any>('catalog/books/?ordering=-is_featured,-created_at&page_size=50').subscribe({
      next: (response) => {
        this.allBooks = response.results || response;
        this.buildSections();
        this.isLoading = false;
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

  private buildSections(): void {
    // Trending: libros destacados primero
    this.trendingBooks = this.allBooks.filter(b => b.is_featured).slice(0, 6);
    if (this.trendingBooks.length === 0) {
      this.trendingBooks = this.allBooks.slice(0, 6);
    }

    // Liyumi's Favorite: primer libro con texto personalizado
    this.liyumiFavorite = this.allBooks.find(b => this.LIYUMI_PICKS[b.slug]) || this.allBooks[0] || null;

    // Discovery: todos menos los trending
    const trendingSlugs = new Set(this.trendingBooks.map(b => b.slug));
    this.discoveryBooks = this.allBooks.filter(b => !trendingSlugs.has(b.slug));
    this.filteredBooks = this.discoveryBooks;
  }

  private applyFilters(): void {
    let base = this.discoveryBooks;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      base = base.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.synopsis?.toLowerCase().includes(q) ||
        b.tags?.some(t => t.name.toLowerCase().includes(q))
      );
    }
    this.filteredBooks = base;
  }

  // ── SEMANTIC SEARCH ──────────────────────────────────────────
  private setupSearch(): void {
    this.searchInput$.pipe(
      debounceTime(450),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery = query;
      this.applyFilters();
    });
  }

  onSearchChange(value: string): void {
    this.searchInput$.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchInput$.next('');
  }

  getLiyumiMessage(book: Book): string {
    return this.LIYUMI_PICKS[book.slug] || '📖 Este libro es especial. ¡Te lo recomiendo con el corazón!';
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
