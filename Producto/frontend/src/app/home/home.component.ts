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

  ngOnInit(): void {
    this.loadBooks();
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
