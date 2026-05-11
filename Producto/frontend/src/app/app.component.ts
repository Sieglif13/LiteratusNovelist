import { Component, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ChatService } from './core/services/chat.service';
import { filter } from 'rxjs/operators';
import { routeTransitionAnimations, shakeAnimation } from './core/animations';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  animations: [routeTransitionAnimations, shakeAnimation]
})
export class AppComponent implements OnInit {
  title = 'frontend';
  authService = inject(AuthService);
  chatService = inject(ChatService);
  router = inject(Router);
  
  menuOpen = false;
  isDashboard = false;
  
  // Profile data
  get userName(): string {
    const user = this.authService.currentUser();
    return user?.username || user?.email?.split('@')[0] || 'Viajero';
  }
  
  get userInitials(): string {
    const name = this.userName;
    return name ? name.charAt(0).toUpperCase() : 'V';
  }
  
  userAvatarUrl: string | null = null;
  
  // Animación Tinta
  shakeState = 'default';
  inkBalance$ = this.chatService.inkBalance$;

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.isDashboard = (e.urlAfterRedirects as string).startsWith('/dashboard');
      });
  }

  ngOnInit() {
    // Si estuviéramos en producción real, aquí cargaríamos los datos del usuario
    // desde el profile service:
    // this.profileService.getProfile().subscribe(...)
    // Por ahora, simulamos un balance inicial si está loggeado:
    if (this.isLoggedIn) {
      this.chatService.updateInkBalance(50); // Valor de prueba UI
    }

    // Suscribirse a cambios de tinta para animar
    this.inkBalance$.subscribe(val => {
      this.triggerShake();
    });
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  logout() {
    this.authService.clearTokens();
    this.toggleMenu();
    this.router.navigate(['/login']);
  }

  openTavern() {
    this.router.navigate(['/tavern']);
  }

  triggerShake() {
    this.shakeState = 'trigger';
    setTimeout(() => {
      this.shakeState = 'default';
    }, 400); // Duración de la animación
  }

  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }
}
