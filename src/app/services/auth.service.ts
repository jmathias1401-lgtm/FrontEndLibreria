import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { usuario } from '../models/usuario';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'authToken';
  private userKey = 'currentUser';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const token = localStorage.getItem(this.tokenKey);
    const userData = localStorage.getItem(this.userKey);
    
    if (token && !this.isTokenExpired()) {
      
      const user = userData ? JSON.parse(userData) : { token };
      this.currentUserSubject.next(user);
    } else {
      console.log('No hay token válido, limpiando localStorage');
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      this.currentUserSubject.next(null);
    }
  }

  login(credentials: { usuario: string; password: string }): Observable<any> {
    const url = '/api/auth/login';
    return this.http.post<any>(url, credentials).pipe(
      tap(response => {
       
        
        if (response.access_token) {
         
          localStorage.setItem(this.tokenKey, response.access_token);
          
          // Store user data including cargo information
          const userData = {
            token: response.access_token,
            ...response.user // Assuming the API returns user data with cargo
          };
          
         
          localStorage.setItem(this.userKey, JSON.stringify(userData));
          this.currentUserSubject.next(userData);
        } else {
          throw new Error('Token no recibido en la respuesta');
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp < now;
    } catch (e) {
      return true;
    }
  }

  getUserFromToken(): any {
    // Try to get user data from localStorage first (more complete info)
    const userData = localStorage.getItem(this.userKey);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    }
    
    // Fallback to token payload
    const token = this.getToken();
    if (!token) return null;
    
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  register(usuarioData: Partial<usuario>): Observable<any> {
    return this.http.post('/api/auth/register', usuarioData);
  }
}