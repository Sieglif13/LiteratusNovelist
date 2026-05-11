import { Component, OnInit, inject } from '@angular/core';
import { ChatService } from '../../core/services/chat.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-character-hub',
  templateUrl: './character-hub.component.html',
  styleUrls: ['./character-hub.component.css']
})
export class CharacterHubComponent implements OnInit {
  chatService = inject(ChatService);
  router = inject(Router);

  characters: any[] = [];
  isLoading = true;
  
  // Array fantasma para los esqueletos (Shimmer Effect)
  skeletonArray = Array(8).fill(0);

  ngOnInit() {
    this.chatService.getGlobalAvatars().subscribe({
      next: (data) => {
        this.characters = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        console.error("Error cargando personajes del Hub");
      }
    });
  }

  openChat(characterId: number) {
    this.router.navigate(['/chat', characterId]);
  }
}
