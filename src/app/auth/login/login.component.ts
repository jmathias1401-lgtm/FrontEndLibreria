import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { RegisterComponent } from '../register/register.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RegisterComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  @Input() isVisible: boolean = true;
  loginForm: FormGroup;
  showRegisterModal: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      usuario: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const credentials = this.loginForm.value;
      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.toastr.success('Login exitoso');
          console.log('Login response:', response);
          
          // Force a delay to ensure data is stored
          setTimeout(() => {
            const currentUser = this.authService.getUserFromToken();
            console.log('Usuario after login:', currentUser);
            this.router.navigate(['/home']);
          }, 100);
          
        },
        error: (err) => {
          console.error('Login failed', err);
          if (err.status === 401) {
            this.toastr.error('Credenciales incorrectas');
          } else {
            this.toastr.error('Error de conexión con el servidor');
          }
        }
      });
    } else {
      this.toastr.warning('Por favor, complete todos los campos');
    }
  }

  openRegisterModal(): void {
    this.showRegisterModal = true;
  }

  closeRegisterModal(): void {
    this.showRegisterModal = false;
  }

  closeModal(event: Event): void {
    if (event.target === event.currentTarget) {
      this.isVisible = false;
    }
  }
}
