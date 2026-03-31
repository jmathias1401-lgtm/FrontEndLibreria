import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CargoService } from '../../services/cargo.service';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { usuario } from '../../models/usuario';
import { cargo } from '../../models/cargo';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  @Input() isVisible: boolean = false;
  @Output() closeRegister: EventEmitter<void> = new EventEmitter<void>();
  registerForm: FormGroup;
  cargos: cargo[] = [];
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private cargoService: CargoService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.registerForm = this.fb.group({
      nombreusuario: ['', [Validators.required, Validators.minLength(3)]],
      clave: ['', [Validators.required, Validators.minLength(6)]],
      fechacreacion: [new Date().toISOString().split('T')[0], Validators.required],
      idcargo: ['', Validators.required]
    });

    this.loadCargos();
  }

  loadCargos(): void {
    this.cargoService.List().subscribe({
      next: (data) => {
        // Filtrar solo el cargo VISITANTE
        this.cargos = data.list.filter(cargo => 
          cargo.nombrecargo.toUpperCase() === 'VISITANTE'
        );
        
        // Si solo hay un cargo, seleccionarlo automáticamente
        if (this.cargos.length === 1) {
          this.registerForm.patchValue({ idcargo: this.cargos[0].idcargo });
        }
      },
      error: (error) => {
        console.error('Error cargando cargos:', error);
        this.toastr.error('Error al cargar los cargos disponibles');
      }
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      const formValue = this.registerForm.value;
      
      const usuarioData: Partial<usuario> = {
        nombreusuario: formValue.nombreusuario,
        clave: formValue.clave,
        fechacreacion: new Date(formValue.fechacreacion),
        cargo: {
          idcargo: formValue.idcargo,
          nombrecargo: this.cargos.find(c => c.idcargo === formValue.idcargo)?.nombrecargo || ''
        }
      };

      this.authService.register(usuarioData).subscribe({
        next: (response) => {
          this.toastr.success('Usuario registrado exitosamente');
          this.registerForm.reset();
          this.registerForm.patchValue({
            fechacreacion: new Date().toISOString().split('T')[0]
          });
          this.closeModal();
        },
        error: (error) => {
          console.error('Error en registro:', error);
          if (error.status === 400) {
            this.toastr.error('El usuario ya existe o los datos son inválidos');
          } else {
            this.toastr.error('Error al registrar usuario');
          }
        }
      }).add(() => {
        this.isLoading = false;
      });
    } else {
      this.toastr.warning('Por favor, complete todos los campos correctamente');
    }
  }

  closeModal(): void {
    this.isVisible = false;
    this.closeRegister.emit();
  }
}
