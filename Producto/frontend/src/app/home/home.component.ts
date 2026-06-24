import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subject, interval, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { ChatService } from '../core/services/chat.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  featuredCharacters: any[] = [];
  isLoading = true;
  userQuestion = '';
  
  // Hero characters hardcoded for the epic look, we could load them from DB if preferred
  heroCharacters = [
    { name: 'Sherlock Holmes', role: 'El Detective', image: 'assets/characters/sherlock_hero.png' },
    { name: 'La Princesa', role: 'Realeza', image: 'assets/characters/princesa_hero.png' },
    { name: 'Drácula', role: 'El Vampiro', image: 'assets/characters/dracula_hero.png' }
  ];

  suggestedQuestions = [
    '¿Qué opinas del amor?',
    '¿Cómo resolverías un misterio?',
    '¿Cuál es el verdadero poder?'
  ];

  private carouselSub?: Subscription;

  ngOnInit(): void {
    this.loadCharacters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.carouselSub) this.carouselSub.unsubscribe();
  }

  private loadCharacters(): void {
    this.isLoading = true;
    // Load top 4 popular avatars for the "Conoce a los personajes" grid
    this.chatService.getGlobalAvatars('', 'popularity').subscribe({
      next: (data) => {
        this.featuredCharacters = data.slice(0, 4);
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  setQuestion(q: string) {
    this.userQuestion = q;
  }

  askQuestion() {
    if (!this.userQuestion.trim()) return;
    // For now, redirect to character hub or a specific character with the question
    // If we want to drop them into a random chat, we could pick the first featured character
    if (this.featuredCharacters.length > 0) {
      const char = this.featuredCharacters[0];
      this.goToChat(char, this.userQuestion);
    } else {
      this.router.navigate(['/characters'], { queryParams: { q: this.userQuestion } });
    }
  }

  goToChat(character: any, prefilledQuestion?: string) {
    if (!character || !character.book_slug) return;
    
    // Simplification for the teaser: just go to the book detail page or reader
    // In the future, we will implement the anonymous teaser chat here
    const queryParams: any = { chatWith: character.id };
    if (prefilledQuestion) {
      queryParams.initialMsg = prefilledQuestion;
    }
    this.router.navigate(['/book', character.book_slug], { queryParams });
  }
}

