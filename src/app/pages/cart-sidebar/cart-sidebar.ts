import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/cart-item';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-cart-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart-sidebar.html',
  styleUrl: './cart-sidebar.css'
})
export class CartSidebarComponent implements OnInit {
  cartItems: CartItem[] = [];
  total: number = 0;
  isOpen: boolean = false;
  @Output() openLoginModal: EventEmitter<void> = new EventEmitter<void>();
  @Output() openRegisterModal: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private cartService: CartService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.cartService.cart$.subscribe(items => {
      this.cartItems = items;
      this.total = this.cartService.getTotal();
    });
  }

  openCart(): void {
    this.isOpen = true;
  }

  closeCart(): void {
    this.isOpen = false;
  }

  removeFromCart(productId: number): void {
    this.cartService.removeFromCart(productId);
    this.toastr.info('Producto eliminado del carrito');
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity > 0) {
      this.cartService.updateQuantity(productId, quantity);
    }
  }

  incrementQuantity(productId: number): void {
    const item = this.cartItems.find(item => item.product.idproducto === productId);
    if (item) {
      this.cartService.updateQuantity(productId, item.quantity + 1);
    }
  }

  decrementQuantity(productId: number): void {
    const item = this.cartItems.find(item => item.product.idproducto === productId);
    if (item && item.quantity > 1) {
      this.cartService.updateQuantity(productId, item.quantity - 1);
    }
  }

  checkoutViaWhatsApp(): void {
    if (this.cartItems.length === 0) {
      this.toastr.warning('El carrito está vacío');
      return;
    }

    let message = 'Hola! Quiero realizar el siguiente pedido:\n\n';
    this.cartItems.forEach((item, index) => {
      message += `${index + 1}. ${item.product.nombre} - ${item.product.presentacion?.nombrepresentacion || ''}\n`;
      message += `   Cantidad: ${item.quantity} - S/. ${item.subtotal.toFixed(2)}\n\n`;
    });
    message += `*Total: S/. ${this.total.toFixed(2)}*`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/51926424814?text=${encodedMessage}`, '_blank');
  }

  goToLogin(): void {
    this.closeCart();
    this.openLoginModal.emit();
  }

  goToRegister(): void {
    this.closeCart();
    this.openRegisterModal.emit();
  }

  getCartItemCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }
}
