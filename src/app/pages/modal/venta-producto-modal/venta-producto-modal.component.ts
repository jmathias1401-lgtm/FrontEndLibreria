import { Component, Inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Producto } from '../../../models/producto';
import { CantidadComponent } from '../cantidad/cantidad.component';

@Component({
  selector: 'app-venta-producto-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './venta-producto-modal.component.html',
  styleUrls: ['./venta-producto-modal.component.css']
})
export class VentaProductoModalComponent implements OnInit, AfterViewInit {
  producto: Producto;
  quantity: number = 1;
  selectedPriceType: 'precioventa' | 'precioblister' | 'preciocaja' = 'precioventa';
  unitsPerBlister: number | null = null;
  unitsPerBox: number | null = null;
  pricePerUnit: number;

  @ViewChild('quantityInput') quantityInput!: ElementRef;

  constructor(
    public dialogRef: MatDialogRef<VentaProductoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { producto: Producto },
    private dialog: MatDialog
  ) {
    this.producto = data.producto;
    this.pricePerUnit = this.producto.precioventa || 0;
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Set focus to quantity input after view is initialized
    setTimeout(() => {
      if (this.quantityInput) {
        this.quantityInput.nativeElement.focus();
        this.quantityInput.nativeElement.select();
      }
    }, 100);
  }

  selectPrice(type: 'precioventa' | 'precioblister' | 'preciocaja'): void {
    this.selectedPriceType = type;
    if (type === 'precioblister') {
      const dialogRef = this.dialog.open(CantidadComponent, {
        data: { etiqueta: 'unidades por Blister', cantidad: this.unitsPerBlister || 10 }
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.unitsPerBlister = result.cantidad;
          this.calculatePricePerUnit();
        }
      });
    } else if (type === 'preciocaja') {
      const dialogRef = this.dialog.open(CantidadComponent, {
        data: { etiqueta: 'unidades por Caja', cantidad: this.unitsPerBox || 100 }
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.unitsPerBox = result.cantidad;
          this.calculatePricePerUnit();
        }
      });
    } else {
      this.calculatePricePerUnit();
    }
  }

  calculatePricePerUnit(): void {
    switch (this.selectedPriceType) {
      case 'precioventa':
        this.pricePerUnit = this.producto.precioventa || 0;
        break;
      case 'precioblister':
        if (this.unitsPerBlister && this.producto.precioblister) {
          this.pricePerUnit = this.producto.precioblister / this.unitsPerBlister;
        }
        break;
      case 'preciocaja':
        if (this.unitsPerBox && this.producto.preciocaja) {
          this.pricePerUnit = this.producto.preciocaja / this.unitsPerBox;
        }
        break;
    }
  }

  incrementQuantity(): void {
    if (this.producto.stock && this.quantity < this.producto.stock) {
      this.quantity++;
    }
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToSale(): void {
    this.calculatePricePerUnit(); // Ensure price is calculated before adding
    const subTotal = this.quantity * this.pricePerUnit;

    this.dialogRef.close({
      ...this.producto,
      cantidadLlevar: this.quantity,
      precioventa: this.pricePerUnit,
      tipoPrecioSeleccionado: this.selectedPriceType,
      subTotal: subTotal
    });
  }
}
