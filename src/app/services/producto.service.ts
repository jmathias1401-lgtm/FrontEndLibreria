import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductList } from '../models/product';
import { Producto } from '../models/producto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private readonly baseUrl = `${environment.apiUrl}/producto`;
  private url: string = `${this.baseUrl}?page=1&xpage=10`;
  private urlEndpoint: string = `${this.baseUrl}?page=`;

  constructor(private http: HttpClient) { }

  list() {
    return this.http.get(`${this.baseUrl}?page=1&xpage=10`);
  }

  get(codBarra: number) {
    return this.http.get<ProductList>(`${this.urlEndpoint}1&xpage=10&codbarra=${codBarra}`);
  }

  getProductById(id: number) {
    return this.http.get<ProductList>(`${this.baseUrl}/${id}`);
  }

  getProductos(index: number, xpage: number = 5) {
    return this.http.get<ProductList>(`${this.urlEndpoint}${index}&xpage=${xpage}`);
  }

  getAllProductos(index: number, xpage: number) {
    return this.http.get<ProductList>(`${this.urlEndpoint}${index}&xpage=${xpage}`);
  }

  getProductosBySearch(search: string) {
    return this.http.get<ProductList>(`${this.url}&search=${search}`);
  }

  getProductosByCodBarra(codBarra: string) {
    return this.http.get<ProductList>(`${this.url}&codbarra=${codBarra}`);
  }

  changeProducto(index: number, product: any) {
    return this.http.put(`${this.baseUrl}/${index}`, product);
  }

  saveProducto(data: FormData) {
    return this.http.post<any>(this.baseUrl, data, {
      observe: 'response'
    });
  }

  deleteProducto(index: number) {
    console.log("---------------", index);
    return this.http.delete<ProductList>(`${this.baseUrl}/${index}`);
  }

  createProducto(product: any, imagen?: File | null) {
    const formData = new FormData();

    formData.append(
      'producto',
      new Blob([JSON.stringify(product)], { type: 'application/json' })
    );

    if (imagen) {
      formData.append('imagen', imagen, product.imagen_path || imagen.name);
    }

    return this.http.post<any>(this.baseUrl, formData, {
      observe: 'response'
    });
  }
}
