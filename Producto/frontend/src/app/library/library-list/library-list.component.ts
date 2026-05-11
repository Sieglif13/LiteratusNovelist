import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-library-list',
  templateUrl: './library-list.component.html',
  styleUrls: ['./library-list.component.css']
})
export class LibraryListComponent implements OnInit {
  private api = inject(ApiService);

  inventoryItems: any[] = [];
  isLoading = true;
  errorMsg = '';

  ngOnInit(): void {
    this.fetchInventory();
  }

  fetchInventory(): void {
    this.isLoading = true;
    this.api.get<any[]>('library/inventory/').subscribe({
      next: (res) => {
        this.inventoryItems = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'No pudimos cargar tu biblioteca. Intenta de nuevo más tarde.';
        this.isLoading = false;
      }
    });
  }
}
