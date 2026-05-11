import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent implements OnInit {
  stats: any = null;
  loading = true;
  maxSale = 1;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>('http://localhost:8000/api/v1/dashboard/stats/').subscribe({
      next: (data) => {
        this.stats = data;
        // Calcular el máximo para normalizar el gráfico de barras
        this.maxSale = Math.max(...data.sales_chart.map((d: any) => d.amount), 1);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getBarHeight(amount: number): number {
    if (this.maxSale === 0) return 0;
    return Math.max((amount / this.maxSale) * 100, 4);
  }
}
