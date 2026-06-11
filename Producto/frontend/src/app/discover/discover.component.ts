import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  styleUrl: './discover.component.css'
})
export class DiscoverComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);

  books: any[] = [];
  isLoading = true;
  currentIndex = 0;
  private ttsUtterance: SpeechSynthesisUtterance | null = null;
  isPlaying = false;

  ngOnInit(): void {
    // Evitar '?' sin codificar en la URL que puede dar error 400 en algunos servidores
    // Mejor pedimos los más populares/recientes y los mezclamos en el frontend.
    this.api.get<any>('catalog/books/?ordering=-view_count,-created_at&page_size=50').subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res.results ?? []);
        // Filtramos los que tienen sinopsis (esencial para el text-to-speech)
        let validBooks = data.filter((b: any) => b.synopsis && b.synopsis.trim().length > 0);
        
        // Shuffle aleatorio en el frontend
        validBooks.sort(() => 0.5 - Math.random());
        
        // Tomamos los primeros 24
        this.books = validBooks.slice(0, 24);
        this.isLoading = false;
      },
      error: (err) => { 
        console.error('Error al cargar descubrir:', err);
        this.isLoading = false; 
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAudio();
  }

  get current() {
    return this.books[this.currentIndex] ?? null;
  }

  prev(): void {
    this.stopAudio();
    this.currentIndex = (this.currentIndex - 1 + this.books.length) % this.books.length;
  }

  next(): void {
    this.stopAudio();
    this.currentIndex = (this.currentIndex + 1) % this.books.length;
  }

  goToBook(): void {
    if (this.current) {
      this.router.navigate(['/book', this.current.slug]);
    }
  }

  toggleAudio(): void {
    if (this.isPlaying) {
      this.stopAudio();
      return;
    }
    const text = this.current?.synopsis?.slice(0, 350);
    if (!text) return;
    this.ttsUtterance = new SpeechSynthesisUtterance(text);
    this.ttsUtterance.lang = 'es-ES';
    this.ttsUtterance.rate = 0.92;
    this.ttsUtterance.onstart = () => this.isPlaying = true;
    this.ttsUtterance.onend = () => this.isPlaying = false;
    this.ttsUtterance.onerror = () => this.isPlaying = false;
    window.speechSynthesis.speak(this.ttsUtterance);
  }

  stopAudio(): void {
    window.speechSynthesis.cancel();
    this.isPlaying = false;
    this.ttsUtterance = null;
  }

  getHook(book: any): string {
    if (!book?.synopsis) return '';
    const sentences = book.synopsis.split(/[.!?]/);
    return (sentences[0] ?? '').trim() + (sentences[1] ? '. ' + sentences[1].trim() : '') + '.';
  }
}
