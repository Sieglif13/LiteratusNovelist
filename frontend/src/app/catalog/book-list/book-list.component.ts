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
    // Buscamos el inventario del usuario para este libro
    this.api.get<any>('library/inventory/').subscribe({
      next: (res: any) => {
        // Manejamos si viene como array directo o paginado con .results
        const inventoryList = Array.isArray(res) ? res : (res.results || []);
        
        // Encontramos el item de inventario que corresponde al libro clickeado
        const invItem = inventoryList.find((item: any) => 
          item.book_id === bookId || 
          (item.edition && item.edition.book && item.edition.book.id === bookId)
        );

        if (invItem) {
          this.router.navigate(['/reader', invItem.id]);
        } else {
          console.warn('El usuario no posee este libro en su inventario.');
          alert('Debes adquirir esta obra para leerla.');
        }
      },
      error: (err) => console.error('Error verificando inventario', err)
    });
  }
}
