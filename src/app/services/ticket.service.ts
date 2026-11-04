import { Injectable } from '@angular/core';
import { Venta } from '../models/venta.model';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  constructor() { }

  /**
   * Imprime directamente mediante un iframe oculto.
   * No abre ventanas popup emergentes, evitando que se bloqueen o queden huérfanas.
   */
  public printDirect(ticketHTML: string): void {
    let iframe = document.getElementById('ticket-print-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.remove();
    }

    iframe = document.createElement('iframe');
    iframe.id = 'ticket-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Ticket de Venta</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                width: 80mm;
                margin: 0;
                padding: 4px;
                color: #000;
                background-color: #fff;
              }
              .ticket-container {
                width: 100%;
                background-color: #fff;
              }
              .header, .lema, .qr {
                text-align: center;
              }
              h2 {
                margin: 4px 0 2px 0;
                font-size: 13px;
                text-transform: uppercase;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 6px 0;
              }
              th, td {
                padding: 2px 1px;
                text-align: left;
                font-size: 11px;
              }
              td {
                border-bottom: 1px dashed #ccc;
              }
              th {
                border-bottom: 1px solid #000;
              }
              .resumen p {
                margin: 2px 0;
                text-align: right;
              }
              .resumen .subtotalalign strong {
                float: left;
              }
              .cliente {
                margin: 6px 0;
                font-size: 11px;
              }
              .lema {
                margin-top: 8px;
                font-size: 10px;
                font-style: italic;
              }
              @page {
                size: 80mm auto;
                margin: 0;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 2mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="ticket-container">
              ${ticketHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print falló, usando vista previa alternativa:', e);
          this.openPrintPreview(ticketHTML);
        }
      }, 350);
    }
  }

  /**
   * Vista previa emergente mejorada con auto-cierre tras imprimir o cancelar.
   */
  public openPrintPreview(ticketHTML: string): void {
    const printWindow = window.open('', '_blank', 'width=320,height=550');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Vista Previa de Ticket</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                width: 80mm;
                margin: 0;
                padding: 5px;
                background-color: #f0f0f0;
              }
              .ticket-container {
                background-color: #fff;
                border: 1px dashed #ccc;
                padding: 10px;
              }
              .header, .lema, .qr {
                text-align: center;
              }
              h2 {
                margin: 4px 0 2px 0;
                font-size: 13px;
                text-transform: uppercase;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 6px 0;
              }
              th, td {
                padding: 2px 1px;
                text-align: left;
                font-size: 11px;
              }
              td {
                border-bottom: 1px dashed #ccc;
              }
              th {
                border-bottom: 1px solid #000;
              }
              .resumen p {
                margin: 2px 0;
                text-align: right;
              }
              .resumen .subtotalalign strong {
                float: left;
              }
              .cliente {
                margin: 6px 0;
                font-size: 11px;
              }
              .lema {
                margin-top: 8px;
                font-size: 10px;
                font-style: italic;
              }
              @media print {
                body {
                  background-color: #fff;
                }
                .ticket-container {
                  border: none;
                  padding: 0;
                }
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="ticket-container">
              ${ticketHTML}
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
                setTimeout(function() {
                  window.close();
                }, 1500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }
  
  public createTicketHTML(
    venta: Partial<Venta>,
    detalles: any[],
    clienteNombre: string,
    tipoComprobante: string = 'Ticket de Venta'
  ): string {
    const serieCorrelativo = (venta.serie && venta.correlativo) 
      ? `<p style="margin:2px 0; font-size:11px;"><strong>${venta.serie}-${venta.correlativo}</strong></p>` 
      : '';
    const fechaActual = new Date().toLocaleString();

    return `
      <div class="header">
        <h2>${tipoComprobante}</h2>
        ${serieCorrelativo}
        <p style="margin:2px 0; font-size:10px;">${fechaActual}</p>
      </div>
      <div class="cliente">
        <strong>Cliente:</strong> ${clienteNombre || 'Público General'}
      </div>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cant.</th>
            <th>P.U.</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          ${detalles.map(item => `
            <tr>
              <td>${item.producto?.nombre || item.nombre}</td>
              <td>${item.unidades || item.cantidadLlevar}</td>
              <td>S/ ${Number(item.costounidad || item.precioventa).toFixed(2)}</td>
              <td>S/ ${Number(item.total || item.subTotal).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="resumen">
        <p class="subtotalalign"><strong>Subtotal:</strong> S/ ${Number(venta.subtotal || 0).toFixed(2)}</p>
        <p><strong>IGV (18%):</strong> S/ ${Number(venta.igv || 0).toFixed(2)}</p>
        <p><strong>Total:</strong> S/ ${Number(venta.costoventa || 0).toFixed(2)}</p>
      </div>
      <div class="lema">
        Cuidamos tu economía y el medio ambiente.
      </div>
    `;
  }
}
