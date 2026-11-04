import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoPersona } from '../models/tipopersona';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TipoPersonaService {
  private readonly apiUrl = `${environment.apiUrl}/tipopersona`;

  constructor(private http: HttpClient) { }

  listar(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?page=1&xpage=10`);
  }
}
