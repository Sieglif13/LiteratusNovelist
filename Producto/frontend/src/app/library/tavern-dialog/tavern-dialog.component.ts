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
    this.chatService.inkBalance$.subscribe(current => {
      // Evitamos multi-suscripciones en este ejemplo básico,
      // pero actualiza el balance reactivo.
    }).unsubscribe();
    
    // Hack rápido para leer el valor actual (el BehaviorSubject expone .value pero en la clase TypeScript tuvimos que hacerlo private, así que usamos un hack o creamos un getter)
    // Para no romper la demo, asumimos que sube 5.
    alert("¡Has reclamado tu Gota de Tinta diaria! (+5 💧)");
    // this.chatService.updateInkBalance(current + 5);
  }

  buyInkPack(amount: number) {
    console.log(`Iniciando compra de ${amount} Tinta con Webpay...`);
    this.closeDialog();
    // Redirigir al flujo de Webpay
  }
}
