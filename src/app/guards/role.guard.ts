import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.authService.isLoggedIn() || this.authService.isTokenExpired()) {
      this.router.navigate(['/login']);
      return false;
    }

    // Extract user data from JWT token
    const token = this.authService.getToken();
    let userFromToken = null;
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userFromToken = payload;
        
      } catch (e) {
        console.error('RoleGuard - Error al decodificar el token:', e);
      }
    }
    
    // Get cargo ID from token claims
    const cargoId = userFromToken?.idcargo || userFromToken?.cargo?.idcargo;
   

    // If user is VISITANTE (idcargo = 3), only allow home, cart, and client-form
    if (cargoId === 3) {
      const allowedRoutes = ['home', 'cart', 'client-form'];
      const currentRoute = route.routeConfig?.path;
      console.log('RoleGuard - Ruta actual:', currentRoute);
      console.log('RoleGuard - Rutas permitidas:', allowedRoutes);
      
      if (allowedRoutes.includes(currentRoute || '')) {
        console.log('RoleGuard - Acceso permitido para visitante');
        return true;
      }
      
      // Redirect to home if trying to access forbidden route
      console.log('RoleGuard - Acceso denegado para visitante, redirigiendo a home');
      this.router.navigate(['/home']);
      return false;
    }
    // If user is VISITANTE (idcargo = 2), only allow home, cart, and client-form
if (cargoId === 2) {
      const allowedRoutes = ['home', 'cart', 'client-form','ventas','clientes',,'reports/ventas'];
      const currentRoute = route.routeConfig?.path;
      console.log('RoleGuard - Ruta actual:', currentRoute);
      console.log('RoleGuard - Rutas permitidas:', allowedRoutes);
      
      if (allowedRoutes.includes(currentRoute || '')) {
        console.log('RoleGuard - Acceso permitido para vendedor');
        return true;
      }
      
      // Redirect to home if trying to access forbidden route
      console.log('RoleGuard - Acceso denegado para vendedor, redirigiendo a home');
      this.router.navigate(['/home']);
      return false;
    }
    // For other users, allow all routes
    console.log('RoleGuard - Usuario no es visitante, acceso permitido');
    return true;
  }
}