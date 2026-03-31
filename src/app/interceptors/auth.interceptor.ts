import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    
    if (token) {
      const cleanToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const authRequest = request.clone({
        headers: request.headers.set('Authorization', cleanToken)
      });
    
      
      return next.handle(authRequest);
    }
    
    return next.handle(request);
  }
}