import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BuscarDniService } from '../../../services/buscar-dni.service';
import { PersonasService } from '../../../services/personas.service';
import { Persona } from '../../../models/persona';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { Venta } from '../../../models/venta.model';
import { VentasService } from '../../../services/ventas.service';
import { ClienteService } from '../../../services/cliente.service';
import { DetalleVentaService } from '../../../services/detalleventa.service';
import { DetalleVenta } from '../../../models/detalleventa';
//import { detalleventaservice } from '../../../services/detalleventa.service';
//import { detalleVenta } from '../../../models/detalleventa';
import { RespuestaVenta } from '../../../models/RespuestaVenta';
import { ProductoService } from '../../../services/producto.service';
import { TicketService } from '../../../services/ticket.service';
import { parse } from 'path';
import { Producto } from '../../../models/producto';
import { forkJoin, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-modal-ventas',
  imports: [
    FormsModule,
    CommonModule,
    MatInputModule,
  ],
  templateUrl: './modal-ventas.component.html',
  styleUrl: './modal-ventas.component.css'
})

export class ModalVentasComponent {
// idpersona:number=0;
idcliente:number=0;
 dni: string = '';
 persona:Persona[]=[];
 ventas: Venta[] = [];
 personaTemporal:any[]=[];
 subtotal:number=0;
 totalVenta:number=0;
 igv:number=0
 cambio:number=0;
 totalVentatemp:number=0;
 metodoPago: string = 'efectivo';
  habilitarBotones: boolean = false;
  loading = false;
    error = '';
  prodDetalle: any[] = [];
  mostrarTicket: boolean = false;
   constructor(
   public dialogRef: MatDialogRef<ModalVentasComponent>,
   @Inject(MAT_DIALOG_DATA) public data: any,
     private BuscardniService: BuscarDniService,
     private Personasservice: PersonasService,
     private VentasService: VentasService,
     private ClienteService:ClienteService,
     private detalleventaservice:DetalleVentaService,
     private productoservice:ProductoService,
     private ticketService: TicketService
   ) {
     ;
     //console.log("Datos recibidos en el constructor:------------------------", data);
     this.prodDetalle = data;
     this.totalVenta = this.prodDetalle.reduce((sum, item) => sum + item.subTotal, 0);
     this.igv =(this.totalVenta * 0.18).toFixed(2) as unknown as number;
     this.subtotal = this.totalVenta - this.igv;
     this.totalVentatemp=this.cambio-this.totalVenta;
    }
   get vueltoCalculado(): number 
   {
      const recibido = this.cambio || 0;
      const total = this.totalVenta || 0;
      return recibido - total > 0 ? recibido - total : 0;
  }

   // Método para cambiar el método de pago
cambiarMetodoPago(event: any) {
  this.metodoPago = event.target.value;
  this.cambio = 0; // Reiniciar monto al cambiar método
}

// Verificar si mostrar QR
get mostrarQR(): boolean {
  return this.metodoPago === 'yape';
}
get nombreCompleto(): string {
  return this.persona?.[0] ? `${this.persona[0].nombre} ${this.persona[0].paterno} ${this.persona[0].materno}` : '';
}
// Verificar si mostrar cuenta
get mostrarCuenta(): boolean {
  return this.metodoPago === 'transferencia';
}

// Verificar si mostrar input normal
get mostrarInputNormal(): boolean {
  return this.metodoPago === 'efectivo';
}

// Datos de cuenta
get datosCuenta(): string {
  return 'BCP: 123-456789-01-23';
}
  BuscarPersona() { 
    
    this.Personasservice.BuscarPersonaByDni(this.dni).subscribe(
      response=>{
          //si esta en la bd
        if(response.list.length>0 )
          {
            
              this.persona =response.list;  
              this.habilitarBotones = true;      
             
              this.ClienteService.listarByIdPersona(this.persona[0].idpersona).subscribe(responseCliente=>{
                
                if(responseCliente.list.length>0)
                {
                  this.idcliente=responseCliente.list[0].idcliente
                }
                else{
                  const Cliente={
                    persona:{
                      idpersona: this.persona[0].idpersona
                    }
                  }
                  this.ClienteService.guardar(Cliente).subscribe(()=>{});
                  this.BuscarPersona();
                }

              });   
          }
          //si no esta en la bd
        else
          {            
            if(this.dni.length==8)
            {
            this.BuscardniService.BuscarDni(this.dni).subscribe(
            response=>{
            this.data=response;
            this.personaTemporal=this.data;
            console.log(this.persona+"----desde response----");
            //realizar registro en la bd persona y cliente
            const persona = {
                  
                  dni: Number(this.data['dni']), 
                  ruc: Number(this.data['dni']),
                  nombre: this.data['nombres'],
                  materno: this.data['apellidoMaterno'],
                  paterno: this.data['apellidoPaterno'],
                  fechanacimiento: "1900-01-01",
                  telefono: "000000000",
                  correo: this.data['nombres']+"@gmail.com",
                  sexo: "",
                  direccion: "Anonimo",
                  tipoPersona:{idtipopersona:1} 
                };            
            this.Personasservice.CrearPersona(persona).subscribe(
              response=>
              {                
               
              }
            );
           

            });
            this.BuscarPersona();
            }
            else
            {
              alert("DNI no encontrado, Ingrese un DNI válido");
              this.dni='';
              this.persona=[];
              this.habilitarBotones = false; 
            }
          }
        
      })
  }
 
  ventaTiket() {
  
    this.loading = true;
    this.VentasService.List(1, 1).subscribe({
      next: (data:any) => 
      {
       
        const venta:Venta=
        {
          serie : "VW-"+data.total+1,
          correlativo : data.total+1,    
          fechaventa : new Date(),
          igv:   this.igv,
          subtotal:  this.subtotal,
          costoventa:  this.totalVenta,
          cliente: {idcliente:this.idcliente},
          empleado:{idempleado:1},
          tipoComprobante: {idtipocomprobante:1},
        }
        this.VentasService.saveVenta(venta).subscribe({
          next: (response) => {
            const datosDelCuerpo: RespuestaVenta | null = response.body;
            if (datosDelCuerpo) {
              
              const idDeLaVenta = datosDelCuerpo.idVenta;
              this.guardarDetalleVenta(idDeLaVenta);
            }
          }
        });
      },
      error: (error:any) => {
        this.error = 'Error loading ventas';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }
   guardarDetalleVenta(idventa:number)
   {
     this.loading = true;
     const saveOperations = [];

     for (const producto of this.prodDetalle) {
      const detalleventa:DetalleVenta={
       venta:{idventa:idventa},
       producto : { idproducto :producto.idproducto},
       codigodetalleventa:"DV-W"+"-"+Date.now(),
       unidades : producto.cantidadLlevar,
       costounidad : producto.precioventa,
       subtotal : producto.subTotal,
       descuentounidad: 0,
       total: producto.subTotal,
       }

      const vencimientoDate = producto.vencimiento.split("/");

      const ModProducto:Producto={
        idproducto:producto.idproducto,
        codigoproducto:producto.codigoproducto,
        nombre:producto.nombre,
        vencimiento:vencimientoDate[2]+"-"+vencimientoDate[1]+"-"+vencimientoDate[0],
        estado:producto.estado,
        composicion:producto.composicion,
        ubicacion:producto.ubicacion,
        stock:producto.stock - producto.cantidadLlevar,
        precioventa:producto.precioventa,
        precioblister:producto.precioblister,
        preciocaja:producto.preciocaja,
        codbarra:producto.codbarra,
        laboratorio:producto.laboratorio,
        presentacion:producto.presentacion,
        unidadmedida:producto.unidadMedida,
      }

      // Create observables for each save operation
      const detalleObs$ = this.detalleventaservice.Save(detalleventa);
      debugger
      const productoObs$ = this.productoservice.saveProducto(ModProducto);

      // Add to array using forkJoin to wait for both to complete
      saveOperations.push(
        forkJoin({
          detalle: detalleObs$,
          producto: productoObs$
        })
      );
     }

     // Execute all save operations in parallel
     forkJoin(saveOperations).subscribe({
       next: (results) => {
         console.log('Detalle venta y productos guardados exitosamente:', results);
         //generar tiket de impresion
         this.mostrarTicket = true;
         this.loading = false;
       },
       error: (error) => {
         console.error('Error al guardar detalle de venta:', error);
         this.loading = false;
         // Mostrar mensaje de error pero permitir continuar
         alert('La venta se registró pero hubo un error al guardar el detalle. Contacte al administrador.');
         this.mostrarTicket = true;
         this.loading = false;
       }
     });
   }
  ventaBoleta(){
    //sacar comprobante de la base de datos boleta=2
  }
   ventaFactura(){}

  imprimirTicket() {
    try {
      if (!this.prodDetalle || !Array.isArray(this.prodDetalle) || this.prodDetalle.length === 0) {
        console.error('No hay productos válidos para imprimir');
        return;
      }
      
      const ventaParcial: Partial<Venta> = {
        subtotal: this.subtotal,
        igv: this.igv,
        costoventa: this.totalVenta
      };

      const ticketHTML = this.ticketService.createTicketHTML(ventaParcial, this.prodDetalle, this.nombreCompleto || 'Cliente Genérico');
      this.ticketService.openPrintPreview(ticketHTML);
      this.dialogRef.close();

    } catch (error) {
      console.error('Error al imprimir ticket:', error);
      alert('Error al generar el ticket. Revisa la consola para más detalles.');
    }
  }
}
