import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.css']
})
export class PaymentSuccessComponent implements OnInit {
  buyOrder = '';
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.buyOrder = params.get('buy_order') || '';
    });
  }

  goToCatalog(): void { this.router.navigate(['/catalog']); }
  goToLibrary(): void { this.router.navigate(['/library']); }
}
