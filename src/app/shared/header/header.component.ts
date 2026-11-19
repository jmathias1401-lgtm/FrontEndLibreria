import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { StockNotificationService } from '../../services/stock-notification.service';
import { Product } from '../../models/product';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  cartItemCount: number = 0;
  currentUser: any = null;

  lowStockProducts: Product[] = [];
  lowStockCount: number = 0;
  loadingStock: boolean = false;
  notificationOpen: boolean = false;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private stockNotificationService: StockNotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cartService.cart$.subscribe(items => {
      this.cartItemCount = items.reduce((total, item) => total + item.quantity, 0);
    });
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.stockNotificationService.lowStockProducts$.subscribe(products => {
      this.lowStockProducts = products;
      this.lowStockCount = products.length;
    });

    this.stockNotificationService.loading$.subscribe(loading => {
      this.loadingStock = loading;
    });
  }

  toggleNotificationDropdown(event: Event): void {
    event.stopPropagation();
    this.notificationOpen = !this.notificationOpen;
  }

  closeNotificationDropdown(): void {
    this.notificationOpen = false;
  }

  refreshStockNotifications(event: Event): void {
    event.stopPropagation();
    this.stockNotificationService.checkStock(true);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-notifications-container')) {
      this.notificationOpen = false;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
