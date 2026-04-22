import { Component, OnInit, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-reader',
  templateUrl: './reader.component.html',
  styleUrl: './reader.component.css'
})
export class ReaderComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  inventoryId: string = '';
  currentPage: number = 1;
  totalPages: number = 200; // Mock until real PDF parser length hooks
  
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
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.saveProgressSubject.next(this.currentPage);
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.saveProgressSubject.next(this.currentPage);
    }
  }

  private syncProgressToBackend(page: number) {
    // El PATCH actualiza selectivamente {current_page} del ReadingProgress
    // Notarás que el backend recibe la solicitud si dejas de darle 'click' a next durante 3 segundos.
    console.log(`📡 [Debounce Cumplido] Salvando silenciosamente página ${page} en Backend DRF...`);
    // Descomentar para producción final asumiendo endpoint progress/
    /*
    this.api.patch(`library/progress/${this.inventoryId}/`, { current_page: page }).subscribe({
      next: () => console.log('Progreso guardado correctamente'),
      error: (err) => console.error('Error al guardar el progreso', err)
    });
    */
  }
}
