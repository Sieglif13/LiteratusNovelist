import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../core/services/api.service';

export interface Category {
  name: string;
  slug: string;
  image: string;
  description: string;
  color: string;
  bookCount?: number;
}

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements OnInit {
  private router = inject(Router);
  private api = inject(ApiService);

  searchTerm = '';
  isLoading = false;

  categories: Category[] = [
    {
      name: 'Literatura y Ficción',
      slug: 'literatura-y-ficcion',
      image: 'assets/categories/literatura.png',
      description: 'Clásicos inmortales, cuentos y novelas que definieron la historia',
      color: '#a855f7',
      bookCount: 0
    },
    {
      name: 'Terror',
      slug: 'terror',
      image: 'assets/categories/terror.png',
      description: 'Historias que te quitarán el sueño y erizado la piel',
      color: '#ef4444',
      bookCount: 0
    },
    {
      name: 'Ciencia Ficción',
      slug: 'ciencia-ficcion',
      image: 'assets/categories/ciencia-ficcion.png',
      description: 'Viajes al futuro, mundos alienígenas y tecnología del mañana',
      color: '#06b6d4',
      bookCount: 0
    },
    {
      name: 'Fantasía',
      slug: 'fantasia',
      image: 'assets/categories/fantasia.png',
      description: 'Dragones, magia y reinos que desafían la imaginación',
      color: '#22c55e',
      bookCount: 0
    },
    {
      name: 'Filosofía',
      slug: 'filosofia',
      image: 'assets/categories/filosofia.png',
      description: 'Pensamientos que cambiaron el mundo y la forma de verlo',
      color: '#f59e0b',
      bookCount: 0
    },
    {
      name: 'Historia',
      slug: 'historia',
      image: 'assets/categories/historia.png',
      description: 'Civilizaciones, guerras y los grandes momentos de la humanidad',
      color: '#fb923c',
      bookCount: 0
    },
    {
      name: 'Poesía',
      slug: 'poesia',
      image: 'assets/categories/poesia.png',
      description: 'Palabras que llegan al alma y permanecen por siempre',
      color: '#ec4899',
      bookCount: 0
    },
    {
      name: 'Romántica',
      slug: 'romantica',
      image: 'assets/categories/romance.png',
      description: 'Historias de amor que trascienden el tiempo y el espacio',
      color: '#f43f5e',
      bookCount: 0
    }
  ];

  get filteredCategories(): Category[] {
    if (!this.searchTerm) return this.categories;
    return this.categories.filter(c =>
      c.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  ngOnInit(): void {
    this.loadCounts();
  }

  loadCounts(): void {
    // Cargar conteo total de libros por género
    this.api.get<any>('catalog/books/?page_size=1').subscribe({
      next: (res) => {
        // Enrich with counts via individual genre queries
        const genreMap: Record<string, string> = {
          'terror': 'Terror',
          'ciencia-ficcion': 'Ciencia ficción',
          'fantasia': 'Fantasía',
          'filosofia': 'Filosofía',
          'historia': 'Historia',
          'poesia': 'Poesía',
          'romantica': 'Romántica',
        };
        this.categories.forEach(cat => {
          const genre = genreMap[cat.slug];
          if (genre) {
            this.api.get<any>(`catalog/books/?genres__name=${encodeURIComponent(genre)}&page_size=1`).subscribe({
              next: (r) => cat.bookCount = r.count || 0
            });
          } else if (cat.slug === 'literatura-y-ficcion') {
            // Use total as approximation
            cat.bookCount = res.count || 0;
          }
        });
      }
    });
  }

  goToCategory(slug: string): void {
    this.router.navigate(['/categories', slug]);
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value;
  }

  clearSearch(): void {
    this.searchTerm = '';
  }
}
