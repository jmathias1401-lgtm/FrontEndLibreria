import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductList } from '../models/product';
import { Producto } from '../models/producto';


@Injectable({
  providedIn: 'root'
})

export class ProductoService {
 
  //private url: string="https://newfarmabak.azurewebsites.net/api/producto?page=1&xpage=10";
  private url: string="/api/producto?page=1&xpage=10";

  private urlEndpoint: string="/api/producto?page=";
  constructor(private http: HttpClient) { }

  list(){
    return this.http.get(`/api/producto?page=1&xpage=10`);
  }
  //devuelve un solo producto por codigo de barra
  get(codBarra: number){
  return this.http.get<ProductList>(this.urlEndpoint + '1&xpage=10&codbarra=' + codBarra);
}
  //devuelve un solo producto por Id
  getProductById(id:number){
    let ListUrlProducto="/api/producto/"+id;
    return this.http.get<ProductList>(ListUrlProducto);
  }

  getProductos(index:number, xpage:number = 5){
    return this.http.get<ProductList>(this.urlEndpoint+index+"&xpage="+xpage);
  }
  getAllProductos(index:number,xpage:number){
    return this.http.get<ProductList>(this.urlEndpoint+index+"&xpage="+xpage);
  }
  getProductosBySearch(search:string){
    return this.http.get<ProductList>(this.url+"&search="+search);
  }
  getProductosByCodBarra(codBarra:string){
    return this.http.get<ProductList>(this.url+"&codbarra="+codBarra);
  }
 
  changeProducto(index:number,product:any){
    return this.http.put(`/api/producto/${index}`,product);
  }
  saveProducto(data:Producto){
    let save_url="/api/producto";
    return this.http.post<Producto>(save_url, data,{
      observe:'response'
    });
  }
  deleteProducto(index:number){
    console.log("---------------",index);
    let del_url="/api/producto/"+index;
    return this.http.delete<ProductList>(del_url);
  }
  createProducto(product:any){
   //return this.http.post('/api',product);
   let save_url="/api/producto";

   return this.http.post<any>(save_url, product,{
     observe:'response'
   });

  }
}
