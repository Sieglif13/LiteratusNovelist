import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-tavern-dialog',
  templateUrl: './tavern-dialog.component.html',
  styleUrls: ['./tavern-dialog.component.css']
})
export class TavernDialogComponent {
  dialogRef = inject(MatDialogRef<TavernDialogComponent>);
  chatService = inject(ChatService);
  inkBalance$ = this.chatService.inkBalance$;

  closeDialog() {
    this.dialogRef.close();
  }

  claimDailyDrop() {
    // Simulamos el reclamo de la Tinta Diaria
    // En producción esto haría un POST a Django DRF
    alert("¡Has reclamado tu Gota de Tinta diaria! (+5 💧)");
    
    // Forzamos una recarga desde el servidor para sincronizar todo
    this.chatService.loadInitialInk();
    this.closeDialog();
  }

  buyInkPack(amount: number) {
    console.log(`Iniciando compra de ${amount} Tinta con Webpay...`);
    this.closeDialog();
    // Redirigir al flujo de Webpay
  }
}
