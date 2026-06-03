import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { HttpParams } from '@angular/common/http';
import { Category } from '../categories.component';

interface Book {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  cover_image: string | null;
  is_featured: boolean;
  created_at: string;
}

@Component({
  selector: 'app-category-detail',
  templateUrl: './category-detail.component.html',
  styleUrls: ['./category-detail.component.css']
})
export class CategoryDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);

  categorySlug = '';
  category: Category | null = null;
  books: Book[] = [];
  filteredBooks: Book[] = [];
  isLoading = true;
  searchTerm = '';
  totalCount = 0;
  private searchTimeout: any;

  // Map slug → genre name (same as in book-list)
  private slugToGenre: Record<string, string> = {
    'terror': 'Terror',
    'ciencia-ficcion': 'Ciencia ficción',
    'fantasia': 'Fantasía',
    'filosofia': 'Filosofía',
    'historia': 'Historia',
    'poesia': 'Poesía',
    'romantica': 'Romántica',
    'literatura-y-ficcion': '',  // No filter: show all
  };

  private categoryMeta: Record<string, Omit<Category, 'bookCount'>> = {
    'literatura-y-ficcion': { name: 'Literatura y Ficción', slug: 'literatura-y-ficcion', image: 'assets/categories/literatura.png', description: 'Clásicos inmortales, cuentos y novelas que definieron la historia', color: '#a855f7' },
    'terror': { name: 'Terror', slug: 'terror', image: 'assets/categories/terror.png', description: 'Historias que te quitarán el sueño', color: '#ef4444' },
    'ciencia-ficcion': { name: 'Ciencia Ficción', slug: 'ciencia-ficcion', image: 'assets/categories/ciencia-ficcion.png', description: 'Viajes al futuro, mundos alienígenas', color: '#06b6d4' },
    'fantasia': { name: 'Fantasía', slug: 'fantasia', image: 'assets/categories/fantasia.png', description: 'Dragones, magia y reinos épicos', color: '#22c55e' },
    'filosofia': { name: 'Filosofía', slug: 'filosofia', image: 'assets/categories/filosofia.png', description: 'Pensamientos que cambiaron el mundo', color: '#f59e0b' },
    'historia': { name: 'Historia', slug: 'historia', image: 'assets/categories/historia.png', description: 'Civilizaciones, guerras y grandes momentos', color: '#fb923c' },
    'poesia': { name: 'Poesía', slug: 'poesia', image: 'assets/categories/poesia.png', description: 'Palabras que llegan al alma', color: '#ec4899' },
    'romantica': { name: 'Romántica', slug: 'romantica', image: 'assets/categories/romance.png', description: 'Historias de amor que trascienden el tiempo', color: '#f43f5e' },
  };

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.categorySlug = params['slug'];
      this.category = this.categoryMeta[this.categorySlug] || null;
      this.fetchBooks();
    });
  }

  fetchBooks(): void {
    this.isLoading = true;
    let params = new HttpParams().set('page_size', '50');
    const genre = this.slugToGenre[this.categorySlug];
    if (genre) params = params.set('genres__name', genre);

    this.api.get<any>('catalog/books/', params).subscribe({
      next: (res) => {
        this.books = res.results || res;
        this.totalCount = res.count || this.books.length;
        this.applySearch();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.applySearch(), 300);
  }

  applySearch(): void {
    if (!this.searchTerm) {
      this.filteredBooks = this.books;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredBooks = this.books.filter(b =>
        b.title.toLowerCase().includes(term) ||
        b.synopsis?.toLowerCase().includes(term)
      );
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredBooks = this.books;
  }

  goToBook(slug: string): void {
    this.router.navigate(['/book', slug]);
  }

  goBack(): void {
    this.router.navigate(['/categories']);
  }
}
