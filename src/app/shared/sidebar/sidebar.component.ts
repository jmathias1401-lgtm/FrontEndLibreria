import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  currentUser: any = null;
  isVisitante: boolean = false;

  constructor(private authService: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Check localStorage on init
    this.checkUserRole();
    
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      
      this.checkUserRole();
      this.cdr.detectChanges(); // Force change detection
    });
  }

  private checkUserRole(): void {
    // Extract user data from JWT token
    const token = this.authService.getToken();
    let userFromToken = null;
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userFromToken = payload;
        
      } catch (e) {
        console.error('Error al decodificar el token:', e);
      }
    }
    
    // Get cargo ID from token claims
    const cargoId = userFromToken?.idcargo || userFromToken?.cargo?.idcargo;
    
    
    // Get username from token
    const username = userFromToken?.nombreusuario || userFromToken?.sub || userFromToken?.user;
   
    
    // Update component data
    this.currentUser = {
      ...this.currentUser,
      nombreusuario: username,
      cargo: { idcargo: cargoId }
    };
    
    this.isVisitante = cargoId === 3;
    
  }
}
