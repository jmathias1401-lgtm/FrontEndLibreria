import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VentasService } from '../../services/ventas.service';
import { Venta } from '../../models/venta.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-orders-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders-sidebar.html',
  styleUrl: './orders-sidebar.css'
})
export class OrdersSidebarComponent implements OnInit {
  orders: Venta[] = [];
  isOpen: boolean = false;
  loading: boolean = false;
  currentUser: any;

  constructor(
    private ventasService: VentasService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUserFromToken();
  }

  openOrders(): void {
    this.isOpen = true;
    this.loadOrders();
  }

  closeOrders(): void {
    this.isOpen = false;
  }

  loadOrders(): void {
    this.loading = true;
    this.ventasService.List(1, 50).subscribe({
      next: (data: any) => {
        // Filter orders by current user if available
        if (this.currentUser) {
          this.orders = data.list?.filter((order: any) => 
            order.cliente?.nombre?.toLowerCase().includes(this.currentUser.nombreusuario?.toLowerCase())
          ) || [];
        } else {
          this.orders = data.list || [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loading = false;
      }
    });
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(value: number): string {
    return `S/. ${value?.toFixed(2) || '0.00'}`;
  }
}
