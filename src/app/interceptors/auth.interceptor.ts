import { inject, Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpInterceptorFn,
  HttpHandlerFn
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Modern Functional HTTP Interceptor for Angular 19+
 * Inyecta automáticamente el token Bearer en cada petición HTTP
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    const cleanToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    const authRequest = req.clone({
      headers: req.headers.set('Authorization', cleanToken)
    });
    return next(authRequest);
  }

  return next(req);
};

/**
 * Compatible con inyección DI clásica basada en clase
 */
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
