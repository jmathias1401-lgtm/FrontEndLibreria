import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PersonaList } from '../models/persona';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PersonasService {
  private readonly baseUrl = `${environment.apiUrl}/persona`;

  constructor(private http: HttpClient) { }

  List() {
    return this.http.get<PersonaList>(`${this.baseUrl}?page=1&xpage=10`);
  }

  BuscarPersonaByNombre(nombre: string) {
    return this.http.get<PersonaList>(`${this.baseUrl}?page=1&xpage=10&nombre=${nombre}`);
  }

  BuscarPersonaByDni(dni: string) {
    return this.http.get<PersonaList>(`${this.baseUrl}?page=1&xpage=10&dni=${dni}`);
  }

  CrearPersona(persona: any) {
    return this.http.post<any>(this.baseUrl, persona);
  }
}
