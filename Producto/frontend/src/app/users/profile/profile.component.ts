import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  authService = inject(AuthService);
  api = inject(ApiService);
  fb = inject(FormBuilder);
  snackBar = inject(MatSnackBar);

  loading = false;
  userInitials = 'V';

  constructor() {
    this.profileForm = this.fb.group({
      username: ['', Validators.required],
      email: [{value: '', disabled: true}],
      bio: ['']
    });
  }

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        username: user.username || user.email.split('@')[0],
        email: user.email
      });
      
      const name = this.profileForm.value.username;
      this.userInitials = name ? name.charAt(0).toUpperCase() : 'V';
    }
  }

  onSubmit() {
    if (this.profileForm.invalid) return;
    this.loading = true;

    // Aquí iría el update al backend:
    // this.api.put('auth/users/me/', this.profileForm.value).subscribe(...)
    setTimeout(() => {
      this.loading = false;
      this.snackBar.open('Perfil actualizado exitosamente', 'Cerrar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }, 1000);
  }
}
