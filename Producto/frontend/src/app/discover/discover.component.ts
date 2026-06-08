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
    this.api.get<any>('catalog/books/?format=json').subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res.results ?? []);
        this.books = data.filter((b: any) => b.cover_image || b.synopsis);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
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
