import { Component, OnInit, Input, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';

// Tipos adaptados al BookListSerializer de Django
export interface Book {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  is_featured: boolean;
  cover_image: string | null;
  created_at: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Book[];
}

@Component({
  selector: 'app-book-list',
  templateUrl: './book-list.component.html',
  styleUrl: './book-list.component.css'
})
export class BookListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  @Input() isHome: boolean = false;

  books: Book[] = [];
  isLoading = true;
  errorMsg = '';
  totalCount = 0;

  searchTerm = '';
  activeCategory: string | null = null;
  private searchTimeout: any;

  // Mapeo: Nombre en la píldora → Nombre exacto guardado en la DB por el sync script
  // El sync script usa Python's .title() que capitaliza TODAS las palabras incluyendo tildes
  genreDbMap: Record<string, string> = {
    'Acción y aventura':        'Acción Y Aventura',
    'Ciencia ficción':          'Ciencia Ficción',
    'Cuentos':                  'Cuentos',
    'Fantasía':                 'Fantasía',
    'Ficción clásica':          'Ficción Clásica',
    'Ficción contemporánea':    'Ficción Contemporánea',
    'Poesía':                   'Poesía',
    'Romántica':                'Romántica',
    'Terror':                   'Terror',
    'Antologías':               'Antologías',
    'Novela corta':             'Novela Corta',
    'Teatro':                   'Teatro',
    'Ficción histórica':        'Ficción Histórica',
    'Ficción erótica':          'Ficción Erótica',
    'Ficción religiosa y espiritual': 'Ficción Religiosa Y Espiritual',
    'Mitos, leyendas y sagas':  'Mitos, Leyendas Y Sagas',
    'Policíaca, negra y suspense': 'Policíaca, Negra Y Suspense',
    'Sátira':                   'Sátira',
    'Literatura de viaje':      'Literatura De Viaje',
    // No ficción — se sincronizarán tras re-scrapear
    'Filosofía':                'Filosofía',
    'Historia':                 'Historia',
    'Psicología':               'Psicología',
    'Biografías, diarios y hechos reales': 'Biografías, Diarios Y Hechos Reales',
    'Ensayos':                  'Ensayos',
    'Sociedad y ciencias sociales': 'Sociedad Y Ciencias Sociales',
  };

  categories = [
    { name: 'Literatura y ficción', sub: [
      'Acción y aventura', 'Antologías', 'Ciencia ficción', 'Cuentos', 'Fantasía',
      'Ficción clásica', 'Ficción contemporánea', 'Ficción erótica', 'Ficción histórica',
      'Ficción religiosa y espiritual', 'Literatura de viaje', 'Mitos, leyendas y sagas',
      'Novela corta', 'Poesía', 'Policíaca, negra y suspense', 'Romántica',
      'Sátira', 'Teatro', 'Terror'
    ]},
    { name: 'No ficción', sub: [
      'Biografías, diarios y hechos reales', 'Ensayos', 'Filosofía',
      'Historia', 'Psicología', 'Sociedad y ciencias sociales'
    ]}
  ];
  allSubcategories: string[] = [];

  ngOnInit(): void {
    this.categories.forEach(cat => this.allSubcategories.push(...cat.sub));
    this.fetchBooks();
  }

  fetchBooks() {
    this.isLoading = true;
    this.errorMsg = '';

    // Construimos los query params para el backend
    let params = new HttpParams();
    if (this.searchTerm) {
      params = params.set('search', this.searchTerm);
    }
    if (this.activeCategory) {
      // Usar el mapa para enviar el nombre exacto como está en la DB
      const dbName = this.genreDbMap[this.activeCategory] || this.activeCategory;
      params = params.set('genres__name', dbName);
    }
    // Traer más resultados por página cuando hay filtro activo
    params = params.set('page_size', this.activeCategory || this.searchTerm ? '100' : '20');

    this.api.get<PaginatedResponse>('catalog/books/', params).subscribe({
      next: (response) => {
        this.books = response.results;
        this.totalCount = response.count;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'No pudimos cargar la biblioteca. Por favor, revisa tu conexión.';
        this.isLoading = false;
      }
    });
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.fetchBooks(), 400);
  }

  setCategory(cat: string) {
    this.activeCategory = this.activeCategory === cat ? null : cat;
    this.fetchBooks();
  }
}
