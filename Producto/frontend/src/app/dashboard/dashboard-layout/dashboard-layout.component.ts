import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.css']
})
export class DashboardLayoutComponent implements OnInit {
  sidebarCollapsed = false;
  pageTitle = 'Visión General';
  currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  private pageTitles: Record<string, string> = {
    '/dashboard/overview': 'Visión General',
    '/dashboard/books': 'Gestión de Libros',
    '/dashboard/books/new': 'Añadir Libro',
    '/dashboard/authors': 'Gestión de Autores',
  };

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.pageTitle = this.pageTitles[e.urlAfterRedirects] || 'Dashboard';
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.auth.clearTokens();
    this.router.navigate(['/']);
  }
}
