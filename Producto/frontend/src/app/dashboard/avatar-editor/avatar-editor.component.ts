import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardBooksService } from '../services/dashboard-books.service';

@Component({
  selector: 'app-avatar-editor',
  templateUrl: './avatar-editor.component.html',
  styleUrls: ['./avatar-editor.component.css']
})
export class AvatarEditorComponent implements OnInit {
  // IDs de contexto
  avatarId: string | null = null;
  bookId: string | null = null;
  editionId: string | null = null;
  isNew = false;

  // Estado de carga y guardado
  loading = true;
  saving = false;
  errorMsg = '';
  successMsg = '';

  // Archivos multimedia
  avatarFile: File | null = null;
  avatarPreview: string | null = null;
  videoFile: File | null = null;
  videoPreview: string | null = null;
  isMuted = true;

  // Modelo completo del personaje — todos los campos del modelo AIAvatar
  avatar: any = {
    name: '',
    description: '',
    system_prompt: '',
    behavioral_context: '',
    sample_dialogues: '',
    greeting_message: '¡Hola!',
    temperature: 0.70,
    model_name: 'gemini-2.5-flash',
    unlock_at_chapter: 0,
    is_major_character: true,
    is_author: false,
    // Estadísticas (solo lectura)
    chat_count: 0,
    video_avatar: null,
  };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private bookService: DashboardBooksService
  ) {}

  ngOnInit(): void {
    this.avatarId = this.route.snapshot.paramMap.get('avatarId');
    this.bookId = this.route.snapshot.paramMap.get('id');

    if (this.avatarId && this.avatarId !== 'new') {
      this.isNew = false;
      this.loadAvatarData();
    } else {
      this.isNew = true;
      this.loading = false;
      // Para personajes nuevos, necesitamos la editionId del libro padre
      this.loadEditionId();
    }
  }

  /** Carga la edición del libro para poder crear personajes nuevos. */
  loadEditionId(): void {
    if (!this.bookId) return;
    this.bookService.getBookDetail(this.bookId).subscribe({
      next: (book) => {
        this.editionId = book.edition?.id || null;
      }
    });
  }

  /** Carga los datos de un personaje existente directamente desde la API. */
  loadAvatarData(): void {
    this.loading = true;
    console.log('[AvatarEditor] Cargando avatarId:', this.avatarId);
    this.bookService.getAvatarDetail(this.avatarId!).subscribe({
      next: (av) => {
        console.log('[AvatarEditor] Respuesta de la API:', av);
        console.log('[AvatarEditor] system_prompt recibido:', av.system_prompt);
        this.avatar = {
          id: av.id,
          edition_id: av.edition_id,
          name: av.name || '',
          description: av.description || '',
          system_prompt: av.system_prompt || '',
          behavioral_context: av.behavioral_context || '',
          sample_dialogues: av.sample_dialogues || '',
          greeting_message: av.greeting_message || '¡Hola!',
          temperature: av.temperature ?? 0.70,
          model_name: av.model_name || 'gemini-2.5-flash',
          unlock_at_chapter: av.unlock_at_chapter ?? 0,
          is_major_character: av.is_major_character ?? true,
          is_author: av.is_author ?? false,
          chat_count: av.chat_count || 0,
          avatar_image: av.avatar_image || null,
          video_avatar: av.video_avatar || null,
        };
        console.log('[AvatarEditor] avatar.system_prompt mapeado:', this.avatar.system_prompt);
        this.avatarPreview = av.avatar_image || null;
        this.videoPreview = av.video_avatar || null;
        this.editionId = av.edition_id || null;
        this.loading = false;
      },
      error: (err) => {
        console.error('[AvatarEditor] Error al cargar:', err);
        this.errorMsg = 'No se pudo cargar el personaje. Error: ' + (err.status || 'desconocido');
        this.loading = false;
      }
    });
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.avatarFile = file;
      const reader = new FileReader();
      reader.onload = () => this.avatarPreview = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  onVideoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.videoFile = file;
      this.videoPreview = URL.createObjectURL(file);
    }
  }

  removeVideo(): void {
    this.videoFile = null;
    this.videoPreview = null;
  }

  removeImage(): void {
    this.avatarFile = null;
    this.avatarPreview = null;
  }

  save(): void {
    if (!this.avatar.name.trim()) {
      this.errorMsg = 'El nombre del personaje es obligatorio.';
      return;
    }
    const targetEditionId = this.editionId || this.avatar.edition_id;
    if (!targetEditionId && this.isNew) {
      this.errorMsg = 'No se encontró la edición del libro. Guarda el libro primero.';
      return;
    }

    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.bookService.saveAvatar(
      this.avatar,
      this.avatarFile || undefined,
      targetEditionId,
      this.isNew ? undefined : this.avatarId!,
      this.videoFile || undefined
    ).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = '¡Personaje guardado correctamente!';
        setTimeout(() => this.router.navigate(['/dashboard/books', this.bookId, 'edit']), 1500);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = 'Error al guardar: ' + (err.error?.error || 'Desconocido');
      }
    });
  }

  deleteAvatar(): void {
    if (!this.avatarId || this.isNew) return;
    if (confirm(`¿Estás seguro de que quieres eliminar a "${this.avatar.name}"? Esta acción es irreversible.`)) {
      this.saving = true;
      this.bookService.deleteAvatar(this.avatarId).subscribe({
        next: () => {
          this.saving = false;
          alert('Personaje eliminado correctamente.');
          this.goBack();
        },
        error: (err) => {
          this.saving = false;
          alert('Error al eliminar: ' + (err.error?.error || 'Desconocido'));
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/books', this.bookId, 'edit']);
  }
}
