import { Component, OnInit, AfterViewInit, OnDestroy, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-book-detail-page',
  templateUrl: './book-detail-page.component.html',
  styleUrls: ['./book-detail-page.component.css']
})
export class BookDetailPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private _avatarCarousel!: ElementRef;
  @ViewChild('avatarCarousel') set avatarCarousel(el: ElementRef) {
    this._avatarCarousel = el;
  }
  get avatarCarousel(): ElementRef {
    return this._avatarCarousel;
  }
  
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  public auth = inject(AuthService);

  slug: string | null = null;
  book: any = null;
  isLoading = true;
  errorMsg = '';
  isOwned = false;
  purchaseLoading = false;
  showPurchaseModal = false;
  purchaseErrorMsg = '';
  userInkBalance = 0;
  selectedAvatar: any = null;
  modalTop = 0;

  displayAvatars: any[] = [];
  private autoScrollInterval: any;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.slug = params.get('slug');
      if (this.slug) {
        this.loadBookDetails(this.slug);
      }
    });
  }

  ngAfterViewInit(): void {
    this.startAutoScroll();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
    document.body.style.overflow = '';
  }

  startAutoScroll(): void {
    if (this.autoScrollInterval) clearInterval(this.autoScrollInterval);
    
    this.autoScrollInterval = setInterval(() => {
      if (this.avatarCarousel && this.avatarCarousel.nativeElement && !this.selectedAvatar && !this.showPurchaseModal) {
        const carousel = this.avatarCarousel.nativeElement;
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        
        if (carousel.scrollLeft >= maxScroll - 50) {
          // Desactivar temporalmente el scroll suave en CSS para el salto
          carousel.style.scrollBehavior = 'auto';
          carousel.scrollLeft = carousel.scrollWidth / 4;
          
          setTimeout(() => {
             carousel.style.scrollBehavior = 'smooth';
             carousel.scrollLeft += 250;
          }, 50);
        } else {
          carousel.scrollLeft += 250;
        }
      }
    }, 2500); // Mover cada 2.5 segundos para que sea más dinámico
  }

  loadBookDetails(slug: string): void {
    this.isLoading = true;
    this.api.get<any>(`catalog/books/${slug}/details/`).subscribe({
      next: (data) => {
        this.book = data;
        this.isOwned = data.is_owned;
        this.userInkBalance = data.ink_balance;
        
        // Duplicar avatares para carrusel infinito (4 veces)
        if (data.avatars && data.avatars.length > 0) {
          this.displayAvatars = [...data.avatars, ...data.avatars, ...data.avatars, ...data.avatars];
        }
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading book details:', err);
        this.errorMsg = 'No se pudo cargar la información del libro.';
        this.isLoading = false;
      }
    });
  }

  handleAction(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.isOwned && this.book.inventory_id) {
      this.router.navigate(['/reader', this.book.inventory_id]);
    } else {
      // Redirigir al nuevo flujo de pago con Webpay Plus
      this.router.navigate(['/checkout', 'book', this.slug]);
    }
  }

  cancelPurchase(): void {
    this.showPurchaseModal = false;
    document.body.style.overflow = '';
  }

  confirmPurchase(): void {
    if (this.slug) {
      this.purchaseLoading = true;
      this.api.post<any>(`catalog/books/${this.slug}/purchase/`, {}).subscribe({
        next: (res) => {
          this.isOwned = true;
          this.book.inventory_id = res.inventory_id;
          this.userInkBalance = res.ink_balance;
          this.purchaseLoading = false;
          this.showPurchaseModal = false;
          document.body.style.overflow = '';
        },
        error: (err) => {
          console.error('Error purchasing book:', err);
          alert(err.error?.error || 'Hubo un error al procesar la compra.');
          this.purchaseLoading = false;
        }
      });
    }
  }

  selectAvatar(avatar: any): void {
    this.selectedAvatar = avatar;
    this.modalTop = window.scrollY || document.documentElement.scrollTop;
    document.body.style.overflow = 'hidden';
  }

  closeAvatarModal(): void {
    this.selectedAvatar = null;
    document.body.style.overflow = '';
  }

  downloadPDF(): void {
    if (this.book.inventory_id) {
      const endpoint = `library/inventory/${this.book.inventory_id}/download/`;
      this.api.getBlob(endpoint).subscribe({
        next: (blob: Blob) => {
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `${this.book.slug}.pdf`;
          link.click();
          window.URL.revokeObjectURL(downloadUrl);
        },
        error: (err) => {
          console.error('Error downloading PDF:', err);
          alert('No se pudo descargar el archivo. Es posible que esta edición no tenga un PDF adjunto.');
        }
      });
    }
  }

  scrollCarousel(direction: number): void {
    if (this.avatarCarousel) {
      const carousel = this.avatarCarousel.nativeElement;
      const scrollAmount = 300;
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      
      // Infinite scroll check for manual clicking
      if (direction === 1 && carousel.scrollLeft >= maxScroll - 50) {
        carousel.scrollTo({ left: carousel.scrollWidth / 4, behavior: 'auto' });
        setTimeout(() => carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' }), 50);
      } else if (direction === -1 && carousel.scrollLeft <= 50) {
        carousel.scrollTo({ left: (carousel.scrollWidth / 4) * 3, behavior: 'auto' });
        setTimeout(() => carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' }), 50);
      } else {
        carousel.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
      }
    }
  }
}
