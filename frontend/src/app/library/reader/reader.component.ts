import { Component, OnInit, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reader',
  templateUrl: './reader.component.html',
  styleUrl: './reader.component.css'
})
export class ReaderComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);

  inventoryId: string = '';
  currentPage: number = 1;
  totalPages: number = 1;
  chapters: any[] = [];
  safeChapterHtml: SafeHtml = '';
  chapterTitle: string = 'Cargando libro...';
  
  // Subject rx.js que actúa como el gatillo disparador del guardado
  private saveProgressSubject = new Subject<number>();

  ngOnInit() {
    this.inventoryId = this.route.snapshot.paramMap.get('id') || '';
    
    // Configuración robusta del Debounce para proteger el backend en Django
    this.saveProgressSubject.pipe(
      debounceTime(3000) // Espera 3 segundos sin que el usuario cambie de página activamente
    ).subscribe(pageNumber => {
      this.syncProgressToBackend(pageNumber);
    });

    this.loadChapters();
  }

  loadChapters() {
    this.api.get(`library/inventory/${this.inventoryId}/chapters/`).subscribe({
      next: (res: any) => {
        if (res && res.length > 0) {
          this.chapters = res;
          this.totalPages = res.length;
          this.renderCurrentChapter();
        } else {
          this.chapterTitle = "Sin contenido";
          this.safeChapterHtml = this.sanitizer.bypassSecurityTrustHtml('<p>El libro no tiene capítulos procesados.</p>');
        }
      },
      error: (err) => {
        console.error('Error al cargar capítulos', err);
        this.chapterTitle = 'Error';
        this.safeChapterHtml = this.sanitizer.bypassSecurityTrustHtml('<p>Hubo un error cargando el contenido.</p>');
      }
    });
  }

  renderCurrentChapter() {
    const chapter = this.chapters[this.currentPage - 1];
    if (chapter) {
      this.chapterTitle = chapter.title || `Capítulo ${this.currentPage}`;
      
      // Corregir rutas de imágenes para que apunten al backend
      let html = chapter.content_html;
      const backendUrl = environment.apiUrl.replace('/api/v1/', ''); // Obtener base http://localhost:8000
      html = html.replace(/src="\/media\//g, `src="${backendUrl}/media/`);
      
      this.safeChapterHtml = this.sanitizer.bypassSecurityTrustHtml(html);
      
      // Scroll al inicio cada vez que cambiamos capítulo
      const viewer = document.querySelector('.canvas-viewer');
      if (viewer) viewer.scrollTop = 0;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.renderCurrentChapter();
      this.saveProgressSubject.next(this.currentPage);
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderCurrentChapter();
      this.saveProgressSubject.next(this.currentPage);
    }
  }

  private syncProgressToBackend(page: number) {
    console.log(`📡 [Debounce Cumplido] Salvando silenciosamente página ${page} en Backend DRF...`);
    this.api.get(`library/inventory/${this.inventoryId}/`).subscribe({
      next: (inventory: any) => {
        if (inventory && inventory.progress && inventory.progress.id) {
            this.api.patch(`library/progress/${inventory.progress.id}/`, { current_page: page }).subscribe({
              next: () => console.log('Progreso guardado correctamente'),
              error: (err) => console.error('Error al guardar el progreso', err)
            });
        }
      }
    });
  }
}
