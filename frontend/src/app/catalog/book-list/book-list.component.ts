import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';

// Tipos adaptados al BookListSerializer de Django
export interface Book {
  id: string;
  title: string;
  synopsis: string;
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

  books: Book[] = [];
  isLoading = true;
  errorMsg = '';

  ngOnInit(): void {
    this.fetchBooks();
  }

  fetchBooks() {
    this.isLoading = true;
    
    // Obtenemos del Catálogo con API Service
    this.api.get<PaginatedResponse>('catalog/books/').subscribe({
      next: (response) => {
        this.books = response.results;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'No pudimos cargar la biblioteca. Por favor, revisa tu conexión.';
        this.isLoading = false;
      }
    });
  }

  openReader(bookId: string) {
    // Para simplificar la demo, este dummy ID mapeará con el reader
    this.router.navigate(['/reader', bookId]);
  }
}
