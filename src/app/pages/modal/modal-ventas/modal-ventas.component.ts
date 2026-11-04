import { Component, Inject, OnInit } from '@angular/core';
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
import { RespuestaVenta } from '../../../models/RespuestaVenta';
import { ProductoService } from '../../../services/producto.service';
import { TicketService } from '../../../services/ticket.service';
import { Producto } from '../../../models/producto';
import { forkJoin } from 'rxjs';

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
export class ModalVentasComponent implements OnInit {
  idcliente: number = 4; // Por defecto Cliente Genérico / Anónimo (idcliente 4)
  dni: string = '';
  persona: Persona[] = [];
  ventas: Venta[] = [];
  personaTemporal: any[] = [];
  subtotal: number = 0;
  totalVenta: number = 0;
  igv: number = 0;
  cambio: number = 0;
  totalVentatemp: number = 0;
  metodoPago: string = 'efectivo';
  habilitarBotones: boolean = true;
  loading: boolean = false;
  loadingMessage: string = '';
  error: string = '';
  prodDetalle: any[] = [];
  clienteGenericoNombre: string = 'PÚBLICO GENERAL';

  constructor(
    public dialogRef: MatDialogRef<ModalVentasComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private BuscardniService: BuscarDniService,
    private Personasservice: PersonasService,
    private VentasService: VentasService,
    private ClienteService: ClienteService,
    private detalleventaservice: DetalleVentaService,
    private productoservice: ProductoService,
    private ticketService: TicketService
  ) {
    this.prodDetalle = data || [];
    this.totalVenta = this.prodDetalle.reduce((sum, item) => sum + item.subTotal, 0);
    this.igv = Number((this.totalVenta * 0.18).toFixed(2));
    this.subtotal = Number((this.totalVenta - this.igv).toFixed(2));
    this.totalVentatemp = this.cambio - this.totalVenta;
  }

  ngOnInit(): void {
    // Inicializa listo para venta rápida
    this.habilitarBotones = true;
  }

  get vueltoCalculado(): number {
    const recibido = this.cambio || 0;
    const total = this.totalVenta || 0;
    return recibido - total > 0 ? recibido - total : 0;
  }

  cambiarMetodoPago(event: any) {
    this.metodoPago = event.target.value;
    this.cambio = 0;
  }

  get mostrarQR(): boolean {
    return this.metodoPago === 'yape';
  }

  get nombreCompleto(): string {
    if (this.persona?.[0]) {
      return `${this.persona[0].nombre} ${this.persona[0].paterno} ${this.persona[0].materno || ''}`.trim();
    }
    return this.clienteGenericoNombre;
  }

  get mostrarCuenta(): boolean {
    return this.metodoPago === 'transferencia';
  }

  get mostrarInputNormal(): boolean {
    return this.metodoPago === 'efectivo';
  }

  get datosCuenta(): string {
    return 'BCP: 123-456789-01-23';
  }

  usarClienteGenerico(): void {
    this.dni = '11111111';
    this.idcliente = 4;
    this.persona = [];
    this.clienteGenericoNombre = 'PÚBLICO GENERAL';
    this.habilitarBotones = true;
  }

  BuscarPersona() { 
    if (!this.dni || this.dni.trim() === '') {
      this.usarClienteGenerico();
      return;
    }

    this.Personasservice.BuscarPersonaByDni(this.dni.trim()).subscribe({
      next: (response) => {
        if (response.list && response.list.length > 0) {
          this.persona = response.list;  
          this.habilitarBotones = true;      
         
          this.ClienteService.listarByIdPersona(this.persona[0].idpersona).subscribe({
            next: (responseCliente) => {
              if (responseCliente.list && responseCliente.list.length > 0) {
                this.idcliente = responseCliente.list[0].idcliente;
              } else {
                const Cliente = {
                  persona: { idpersona: this.persona[0].idpersona }
                };
                this.ClienteService.guardar(Cliente).subscribe({
                  next: () => this.BuscarPersona(),
                  error: (e) => console.error('Error guardando cliente:', e)
                });
              }
            },
            error: (e) => console.error('Error al listar cliente por persona:', e)
          });   
        } else {
          // Si no está en BD local pero tiene 8 dígitos, buscar en RENIEC/DNI service
          if (this.dni.length === 8) {
            this.BuscardniService.BuscarDni(this.dni).subscribe({
              next: (respDni: any) => {
                const dataDni = respDni;
                const personaNueva = {
                  dni: Number(dataDni['dni']), 
                  ruc: Number(dataDni['dni']),
                  nombre: dataDni['nombres'],
                  materno: dataDni['apellidoMaterno'] || '',
                  paterno: dataDni['apellidoPaterno'] || '',
                  fechanacimiento: '1990-01-01',
                  telefono: '000000000',
                  correo: (dataDni['nombres'] || 'cliente') + '@gmail.com',
                  sexo: '',
                  direccion: 'General',
                  tipoPersona: { idtipopersona: 1 } 
                };            
                this.Personasservice.CrearPersona(personaNueva).subscribe({
                  next: () => this.BuscarPersona(),
                  error: (e) => console.error('Error creando persona desde RENIEC:', e)
                });
              },
              error: (e) => {
                console.error('Error consultando RENIEC:', e);
                alert('No se encontró el DNI ingresado. Se usará Público General.');
                this.usarClienteGenerico();
              }
            });
          } else {
            alert('Ingrese un DNI válido de 8 dígitos o seleccione Público General.');
            this.usarClienteGenerico();
          }
        }
      },
      error: (err) => {
        console.error('Error al buscar persona por DNI:', err);
        this.usarClienteGenerico();
      }
    });
  }
 
  ventaTiket() {
    this.procesarVenta(1, 'Ticket de Venta');
  }

  ventaBoleta() {
    this.procesarVenta(2, 'Boleta de Venta');
  }

  ventaFactura() {
    this.procesarVenta(3, 'Factura de Venta');
  }

  private procesarVenta(tipoComprobanteId: number, nombreComprobante: string): void {
    if (this.loading) return;
    this.loading = true;
    this.loadingMessage = 'Registrando venta e imprimiendo ' + nombreComprobante + '...';

    const clienteIdFinal = this.idcliente > 0 ? this.idcliente : 4;

    this.VentasService.List(1, 1).subscribe({
      next: (data: any) => {
        const correlativoNum = (data?.total || 0) + 1;
        const seriePrefix = tipoComprobanteId === 1 ? 'VW-' : (tipoComprobanteId === 2 ? 'BV-' : 'FV-');
        
        const venta: Venta = {
          serie: seriePrefix + correlativoNum,
          correlativo: String(correlativoNum),    
          fechaventa: new Date(),
          igv: this.igv,
          subtotal: this.subtotal,
          costoventa: this.totalVenta,
          cliente: { idcliente: clienteIdFinal },
          empleado: { idempleado: 1 },
          tipoComprobante: { idtipocomprobante: tipoComprobanteId },
        };

        this.VentasService.saveVenta(venta).subscribe({
          next: (response) => {
            const datosDelCuerpo: RespuestaVenta | null = response.body;
            if (datosDelCuerpo?.idVenta) {
              const idDeLaVenta = datosDelCuerpo.idVenta;
              this.guardarDetalleVenta(idDeLaVenta, venta, nombreComprobante);
            } else {
              this.loading = false;
              alert('Error: No se recibió confirmación de venta del servidor.');
            }
          },
          error: (error: any) => {
            this.loading = false;
            console.error('Error registrando venta:', error);
            alert('Error al registrar venta: ' + (error?.error?.message || error?.message || 'Error del servidor'));
          }
        });
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error al consultar lista de ventas:', error);
        alert('Error al consultar correlativo de venta.');
      }
    });
  }

  private guardarDetalleVenta(idventa: number, ventaData: Venta, nombreComprobante: string): void {
    const saveOperations = [];

    for (const producto of this.prodDetalle) {
      const detalleventa: DetalleVenta = {
        venta: { idventa: idventa },
        producto: { idproducto: producto.idproducto },
        codigodetalleventa: 'DV-W-' + Date.now() + '-' + producto.idproducto,
        unidades: producto.cantidadLlevar,
        costounidad: producto.precioventa,
        subtotal: producto.subTotal,
        descuentounidad: 0,
        total: producto.subTotal,
      };

      const vencimientoStr = producto.vencimiento ? String(producto.vencimiento) : '';
      let formattedVencimiento = '2030-01-01';
      if (vencimientoStr.includes('/')) {
        const parts = vencimientoStr.split('/');
        formattedVencimiento = parts[2] + '-' + parts[1] + '-' + parts[0];
      } else if (vencimientoStr.includes('-')) {
        formattedVencimiento = vencimientoStr;
      }

      const ModProducto: Producto = {
        idproducto: producto.idproducto,
        codigoproducto: producto.codigoproducto,
        nombre: producto.nombre,
        vencimiento: formattedVencimiento,
        estado: producto.estado,
        composicion: producto.composicion,
        ubicacion: producto.ubicacion,
        stock: producto.stock - producto.cantidadLlevar,
        precioventa: producto.precioventa,
        precioblister: producto.precioblister,
        preciocaja: producto.preciocaja,
        codbarra: producto.codbarra,
        laboratorio: producto.laboratorio,
        presentacion: producto.presentacion,
        unidadmedida: producto.unidadmedida,
      };

      const formData = new FormData();
      const productoBlob = new Blob([JSON.stringify(ModProducto)], { type: 'application/json' });
      formData.append('producto', productoBlob);

      const detalleObs$ = this.detalleventaservice.Save(detalleventa);
      const productoObs$ = this.productoservice.saveProducto(formData);

      saveOperations.push(
        forkJoin({
          detalle: detalleObs$,
          producto: productoObs$
        })
      );
    }

    forkJoin(saveOperations).subscribe({
      next: (results) => {
        console.log('Detalles y stock actualizados:', results);
        this.loading = false;

        // Impresión directa y automática sin pasos intermedios
        try {
          const clienteNombre = this.nombreCompleto || 'PÚBLICO GENERAL';
          const ticketHTML = this.ticketService.createTicketHTML(ventaData, this.prodDetalle, clienteNombre, nombreComprobante);
          this.ticketService.printDirect(ticketHTML);
        } catch (e) {
          console.warn('Error al imprimir ticket:', e);
        }

        // Cierra el modal y finaliza la venta de inmediato
        this.dialogRef.close('venta-finalizada');
      },
      error: (error) => {
        console.error('Error al guardar detalle de venta:', error);
        this.loading = false;
        alert('La venta se registró pero hubo un problema al actualizar el inventario.');

        // Imprimir y cerrar para no retener al cliente
        try {
          const clienteNombre = this.nombreCompleto || 'PÚBLICO GENERAL';
          const ticketHTML = this.ticketService.createTicketHTML(ventaData, this.prodDetalle, clienteNombre, nombreComprobante);
          this.ticketService.printDirect(ticketHTML);
        } catch (e) {
          console.warn('Error al imprimir ticket:', e);
        }

        this.dialogRef.close('venta-finalizada');
      }
    });
  }
}
