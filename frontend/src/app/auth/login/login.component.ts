import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMsg = '';
  isLoading = false;

  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMsg = '';

    this.api.post<{access: string, refresh: string}>('users/login/', this.loginForm.value)
      .subscribe({
        next: (res) => {
          this.auth.setTokens(res.access, res.refresh);
          this.router.navigate(['/catalog']);
        },
        error: (err) => {
          this.errorMsg = 'Credenciales inválidas. Verifica tu usuario o contraseña.';
          this.isLoading = false;
        }
      });
  }
}
