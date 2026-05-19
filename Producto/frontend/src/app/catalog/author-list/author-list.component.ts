import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-author-list',
  templateUrl: './author-list.component.html',
  styleUrls: ['./author-list.component.css']
})
export class AuthorListComponent implements OnInit {
  authors: any[] = [];
  filteredAuthors: any[] = [];
  loading = true;
  api = inject(ApiService);

  searchTerm = '';
  activeFilter = 'a-z';
  onlyWithPhoto = false;

  ngOnInit() {
    this.api.get<any[]>('catalog/authors/').subscribe({
      next: (data) => {
        this.authors = data;
        this.filteredAuthors = data;
        this.filterAuthors(); // Aplicar el orden inicial A-Z
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading authors', err);
        this.loading = false;
      }
    });
  }

  filterAuthors() {
    let filtered = [...this.authors];

    // 1. Filtrar por foto
    if (this.onlyWithPhoto) {
      filtered = filtered.filter(a => a.photo);
    }

    // 2. Filtrar por búsqueda de texto
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(a => a.full_name.toLowerCase().includes(term));
    }

    // 3. Ordenar según el filtro activo
    if (this.activeFilter === 'a-z') {
      filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (this.activeFilter === 'z-a') {
      filtered.sort((a, b) => b.full_name.localeCompare(a.full_name));
    } else if (this.activeFilter === 'books') {
      filtered.sort((a, b) => {
        const countA = a.book_count || a.books?.length || 0;
        const countB = b.book_count || b.books?.length || 0;
        return countB - countA;
      });
    }

    this.filteredAuthors = filtered;
  }

  setFilter(event: any) {
    this.activeFilter = event.target.value;
    this.filterAuthors();
  }

  togglePhotoFilter() {
    this.onlyWithPhoto = !this.onlyWithPhoto;
    this.filterAuthors();
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value;
    this.filterAuthors();
  }
}
