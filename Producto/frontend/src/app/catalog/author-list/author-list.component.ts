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

  ngOnInit() {
    this.api.get<any[]>('catalog/authors/').subscribe({
      next: (data) => {
        this.authors = data;
        this.filteredAuthors = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading authors', err);
        this.loading = false;
      }
    });
  }

  filterAuthors() {
    let filtered = this.authors;

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(a => a.full_name.toLowerCase().includes(term));
    }

    this.filteredAuthors = filtered;
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value;
    this.filterAuthors();
  }
}
