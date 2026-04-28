import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-book-detail-page',
  templateUrl: './book-detail-page.component.html',
  styleUrls: ['./book-detail-page.component.css']
})
export class BookDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  public auth = inject(AuthService);

  slug: string | null = null;
  book: any = null;
  isLoading = true;
  errorMsg = '';

  isOwned = false;
  userInkBalance = 0;
  purchaseLoading = false;
  purchaseErrorMsg = '';

  showPurchaseModal = false;
  selectedAvatar: any = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.slug = params.get('slug');
      if (this.slug) {
        this.loadBookDetails();
      }
    });

    // Reactively refresh when auth state changes (login/logout)
    this.auth.isLoggedIn$.subscribe(() => {
      if (this.slug && !this.isLoading) {
        this.loadBookDetails();
      }
    });
  }

  loadBookDetails(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.api.get<any>(`catalog/books/${this.slug}/details/`).subscribe({
      next: (res: any) => {
        this.book = res;
        this.isOwned = res.is_owned;
        this.userInkBalance = res.ink_balance;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.errorMsg = 'Error al cargar los detalles del libro. Es posible que no exista o no tengas conexión.';
        this.isLoading = false;
      }
    });
  }

  handleAction(): void {
    if (!this.auth.isLoggedIn()) {
      // Redirect to login with returnUrl
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (this.isOwned && this.book.inventory_id) {
      this.router.navigate(['/reader', this.book.inventory_id]);
    } else {
      this.showPurchaseModal = true;
    }
  }

  confirmPurchase(): void {
    this.showPurchaseModal = false;
    this.purchaseLoading = true;
    this.purchaseErrorMsg = '';
    
    this.api.post<any>(`catalog/books/${this.slug}/purchase/`, {}).subscribe({
      next: (res: any) => {
        this.purchaseLoading = false;
        this.isOwned = true;
        this.userInkBalance = res.ink_balance;
        // Optionally refresh details to update is_owned in UI
        this.loadBookDetails();
      },
      error: (err: any) => {
        this.purchaseLoading = false;
        this.purchaseErrorMsg = err.error?.message || err.error?.error || 'Error al procesar la compra.';
      }
    });
  }

  cancelPurchase(): void {
    this.showPurchaseModal = false;
  }

  selectAvatar(avatar: any): void {
    this.selectedAvatar = avatar;
  }

  closeAvatarModal(): void {
    this.selectedAvatar = null;
  }
}
