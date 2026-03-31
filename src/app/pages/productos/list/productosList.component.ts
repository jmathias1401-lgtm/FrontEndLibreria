import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { PaginateComponent } from '../../../shared/paginate/paginate.component';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { Producto } from '../../../models/producto';
import { DatosService } from '../../../services/datos.service';
import { ProductoService } from '../../../services/producto.service';
import { FiltroPipe } from "../../../shared/pipes/filtro.pipe";
import { MatDialog } from '@angular/material/dialog';
import { CartService } from '../../../services/cart.service';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';


@Component({
    selector: 'app-productos',
    standalone: true,
    templateUrl: './productosList.component.html',
    styleUrl: './productosList.component.css',
    imports: [PaginateComponent,CommonModule, FormsModule, DialogModule, RouterModule, FiltroPipe],
    
   
})
export class ProductosListComponent implements OnInit{
  
  constructor(
    private productoService: ProductoService,
    private Datosservice:DatosService,
    private cartService: CartService,
    private toastr: ToastrService
  )
  {
    
  }
  modificado: Producto[] = [];
  @Output() borrado:EventEmitter<number>=new EventEmitter();

  prod: any[] = [];
  total:number=0;
  xpage:number = 0;
  current:number = 0;
  pages : any[] = [];
  index:number = 0;
  search:string = "";
  codBarra:string = "";
  modalEditar:boolean = false;
 public pagesNumber:number=1;
 public nextCount:number=1;
  ngOnInit(): void {
  this.vertodos(1);  
  this.pages = this.generatePageRange(1,30);

  }
  onindexClic(index:number){
    this.vertodos(index);
  }
  vertodos(index:number):void{
  this.productoService.getProductos(index).subscribe(
    response=>{
      this.prod=response.list;
      this.total=response.total;
      this.xpage=response.xpage;
      
    }
    );
  }
  modificarProducto(productIndex:number){
   //console.log("LIST-----"+productIndex);
    this.Datosservice.disparadorProducto.emit({
      data:productIndex
    });
  }
  eliminarProducto(index:number){


    this.productoService.deleteProducto(index).subscribe(o=>{
      this.borrado.emit(index);
    });
  }

  addToCart(product: any): void {
    this.cartService.addToCart(product);
    this.toastr.success(`${product.nombre} agregado al carrito`);
  }
 
  
  generatePageRange(star:number,end:number) {
    //console.log(star, ",", end);
    let pages_ = [];
    const visiblePages = end-star; // Número de páginas visibles en la paginación

    const totalPages = Math.ceil(this.total / this.xpage);
    const middlePage = Math.ceil(visiblePages / 2);
    let startPage = this.current - middlePage + 1;
    let endPage = this.current + middlePage - 1;
    if (startPage <= 0) {
      startPage = star;
      endPage = Math.min(end, totalPages);
    } else if (endPage >= totalPages) {
      startPage =1;// Math.max(totalPages - visiblePages + 1, 1);
      endPage = 30;
       
    }
    for (let i = startPage; i <= endPage; i++) 
    {
      pages_.push(i);
    }
   

    return pages_;
  }
  buscar():void {
    if(this.search.length>0){
      this.productoService.getProductosBySearch(this.search).subscribe(
        response=>{
          this.prod=response.list;
          this.total=response.total;
          this.xpage=response.xpage;
        }
      );
    }
    if(this.codBarra.length>0){
      this.productoService.getProductosByCodBarra(this.codBarra).subscribe(
        response=>{
          this.prod=response.list;
          this.total=response.total;
          this.xpage=response.xpage;
        }
      );
    }
    else{
      this.vertodos(1); 
    }

    
  }
 previoPage(){
  if(this.pagesNumber>1)
  {
    this.pagesNumber-=1;
    this.onindexClic(this.pagesNumber);
    if(this.nextCount>30){
      this.pages = this.generatePageRange(this.nextCount-30,this.nextCount);
     
      this.nextCount+=this.pagesNumber-28;
    }
    else
    {
      this.pages = this.generatePageRange(1,30);
    }
  }else{
    this.onindexClic(1);
    
    if(this.nextCount>30){
      this.pages = this.generatePageRange(this.nextCount-30,this.nextCount);
      
      this.nextCount+=this.pagesNumber-28;
    }
    else
    {
      this.pages = this.generatePageRange(1,30);
    }
  }
 }
  nextPage(){
    this.pagesNumber +=1;
    this.onindexClic(this.pagesNumber);
    if (this.nextCount<=Math.ceil(this.total / this.xpage)-31) {
     this.nextCount+=this.pagesNumber+28;
    this.pages = this.generatePageRange(this.nextCount,this.nextCount+30);
    }
    else{
     this.pages = this.generatePageRange(1,30);
    }
  }

  exportToExcel(): void {
    // Preparar los datos para exportar
    
    this.productoService.getAllProductos(1, this.total).subscribe(response=>{
     const dataToExport = response.list.map(producto => ({
      'ID': producto.idproducto,
      'Nombre': producto.nombre,
      'Composición': producto.composicion,
      'Vencimiento': producto.vencimiento,
      'Ubicación': producto.ubicacion,
      'Presentación': producto.presentacion?.nombrepresentacion || '',
      'Unidad de Medida': producto.unidadmedida?.nombreunidad || '',
      'Laboratorio': producto.laboratorio?.nombrelaboratorio || '',
      'Precio Venta': producto.precioventa,
      'Precio Blister': producto.precioblister,
      'Precio Caja': producto.preciocaja,
      'Stock': producto.stock
    }));
    // Crear el libro de trabajo
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    // Generar el archivo y descargarlo
    const fileName = `productos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    this.toastr.success('Archivo Excel exportado correctamente');
    });
    

    
  }
}
 