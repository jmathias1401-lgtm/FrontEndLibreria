import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Cliente, ClienteList } from '../models/cliente';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private readonly baseUrl = `${environment.apiUrl}/cliente`;

  constructor(private http: HttpClient) { }

  listar(page: number, xpage: number) {
    return this.http.get<ClienteList>(`${this.baseUrl}?page=${page}&xpage=${xpage}`);
  }
  
  listarByIdPersona(personaId: number) {
    return this.http.get<ClienteList>(`${this.baseUrl}?page=1&xpage=100&persona_idpersona=${personaId}`);
  }

  guardar(Cliente: any) {
    return this.http.post<any>(this.baseUrl, Cliente, {
      observe: 'response'
    });
  }

  getById(id: number) {
    return this.http.get<any>(`${this.baseUrl}?page=1&xpage=100&idcliente=${id}`);
  }

  eliminar(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  updateCliente(id: number, cliente: Cliente) {
    return this.http.put<Cliente>(`${this.baseUrl}/${id}`, cliente);
  }
}
