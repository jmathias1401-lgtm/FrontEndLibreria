import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoService } from '../../services/producto.service';
import { CartService } from '../../services/cart.service';
import { ProductList, Product } from '../../models/product';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { CartSidebarComponent } from '../cart-sidebar/cart-sidebar';
import { LoginComponent } from '../../auth/login/login.component';
import { RegisterComponent } from '../../auth/register/register.component';
import { OrdersSidebarComponent } from '../orders-sidebar/orders-sidebar';

interface Promo {
  title: string;
  description: string;
  icon: string;
  bgColor: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, CartSidebarComponent, LoginComponent, RegisterComponent, OrdersSidebarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  currentPage = 1;
  total = 0;
  loading = false;
  quantities: { [key: number]: number } = {};
  addedProducts: Set<number> = new Set();
  itemsPerPage = 20;
  totalPages = 0;
  @ViewChild('productsGrid', { static: false }) productsGrid!: ElementRef;
  @ViewChild('promoReel', { static: false }) promoReel!: ElementRef;
  @ViewChild('ordersSidebar', { static: false }) ordersSidebar!: OrdersSidebarComponent;
  private autoScrollInterval: any;
  searchQuery: string = '';
  private searchSubject: Subject<string> = new Subject<string>();
  isSearching: boolean = false;
  showRegisterModal: boolean = false;
  showLoginModal: boolean = false;

  promos: Promo[] = [
    { title: 'Envío Gratis', description: 'En compras mayores a S/. 150.00', icon: 'fas fa-truck', bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { title: '20% DSCTO', description: 'En vitaminas y suplementos', icon: 'fas fa-percentage', bgColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { title: '3x2', description: 'En productos de cuidado personal', icon: 'fas fa-gift', bgColor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { title: 'Delivery 24h', description: 'Entrega rápida en Lima Metropolitana', icon: 'fas fa-clock', bgColor: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { title: 'Precio Especial', description: 'En medicamentos genéricos', icon: 'fas fa-tags', bgColor: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { title: 'Atención 24/7', description: 'Farmacéuticos disponibles', icon: 'fas fa-user-md', bgColor: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
    { title: 'Tarjeta de Descuento', description: 'Acumula puntos en cada compra', icon: 'fas fa-id-card', bgColor: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
    { title: 'Productos Naturales', description: 'Variedad en medicina natural', icon: 'fas fa-leaf', bgColor: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }
  ];

  constructor(private productoService: ProductoService, private cartService: CartService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.loadProducts();
    this.startAutoScroll();
    this.setupSearchListener();
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
    this.searchSubject.unsubscribe();
  }

  setupSearchListener(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((query: string) => {
      this.searchProducts(query);
    });
  }

  searchProducts(query: string): void {
    if (!query.trim()) {
      this.isSearching = false;
      this.currentPage = 1;
      this.loadProducts();
      return;
    }

    this.isSearching = true;
    this.loading = true;
    this.productoService.getProductosBySearch(query).subscribe({
      next: (data: any) => {
        this.products = data.list || [];
        this.total = data.total || 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error searching products:', error);
        this.loading = false;
      }
    });
  }

  loadProducts(): void {
    if (this.loading) return;
    this.loading = true;
    this.productoService.getProductos(this.currentPage, this.itemsPerPage).subscribe({
      next: (data: any) => {

        if (this.currentPage === 1) {
          this.products = data.list || [];
        } else {
          this.products = [...this.products, ...(data.list || [])];
        }
        this.total = data.total || 0;
        this.totalPages = Math.ceil(this.total / this.itemsPerPage);
        this.loading = false;
        // Scroll to top of products section
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.loading = false;
      }
    });
  }

  previousPage(event: Event): void {
    event.preventDefault();
    if (this.currentPage > 1 && !this.isSearching) {
      this.currentPage--;
      this.products = [];
      this.loadProducts();
    }
  }

  nextPage(event: Event): void {
    event.preventDefault();
    if (this.currentPage < this.totalPages && !this.isSearching) {
      this.currentPage++;
      this.products = [];
      this.loadProducts();
    }
  }

  scrollReelLeft(): void {
    if (this.promoReel) {
      this.promoReel.nativeElement.scrollBy({ left: -400, behavior: 'smooth' });
      this.resetAutoScroll();
    }
  }

  scrollReelRight(): void {
    if (this.promoReel) {
      this.promoReel.nativeElement.scrollBy({ left: 400, behavior: 'smooth' });
      this.resetAutoScroll();
    }
  }

  resetAutoScroll(): void {
    this.stopAutoScroll();
    this.startAutoScroll();
  }

  onSearch(): void {
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  openWhatsApp(): void {
    window.open('https://wa.me/51926424814', '_blank');
  }

  startAutoScroll(): void {
    this.autoScrollInterval = setInterval(() => {
      if (this.promoReel) {
        const reel = this.promoReel.nativeElement;
        const maxScrollLeft = reel.scrollWidth - reel.clientWidth;
        
        if (reel.scrollLeft >= maxScrollLeft) {
          reel.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          reel.scrollBy({ left: 400, behavior: 'smooth' });
        }
      }
    }, 3000);
  }

  stopAutoScroll(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
  }

  getProductImage(product: Product, index: number): string {
    const nombre = product.nombre
    ? product.nombre.toUpperCase().split(/[\s\/]+/).filter(Boolean).join('-')
    : '';
    if (index === 0) {
      return '/assets/img/' + nombre + '.png';
    } else if (index === 1) {
      return '/assets/img/GRAVDAN 50MG-5ML.png';
    } else if (index === 2) {
      return '/assets/img/TRAMADOL CLORHIDRATO 100MG-2ML.png';}
    else if (index === 3) {
      return '/assets/img/OXACILINA 1G.png';}
    else if (index === 4) {
      return '/assets/img/AMITRIPTILINA 25 MG.png';
    }
    return '/assets/img/default.png';
  }

  getQuantity(productId: number): number {
    if (this.addedProducts.has(productId)) {
      const item = this.cartService.getCartItems().find(item => item.product.idproducto === productId);
      return item ? item.quantity : 1;
    }
    return this.quantities[productId] || 1;
  }

  updateQuantity(productId: number, value: string): void {
    const qty = parseInt(value, 10);
    if (qty > 0) {
      if (this.addedProducts.has(productId)) {
        this.cartService.updateQuantity(productId, qty);
      } else {
        this.quantities[productId] = qty;
      }
    }
  }

  incrementQuantity(productId: number): void {
    const currentQty = this.getQuantity(productId);
    const newQty = currentQty + 1;
    if (this.addedProducts.has(productId)) {
      this.cartService.updateQuantity(productId, newQty);
    } else {
      this.quantities[productId] = newQty;
    }
  }

  decrementQuantity(productId: number): void {
    const currentQty = this.getQuantity(productId);
    if (currentQty > 1) {
      const newQty = currentQty - 1;
      if (this.addedProducts.has(productId)) {
        this.cartService.updateQuantity(productId, newQty);
      } else {
        this.quantities[productId] = newQty;
      }
    }
  }

  addToCart(product: Product): void {
    const quantity = this.getQuantity(product.idproducto);
    for (let i = 0; i < quantity; i++) {
      this.cartService.addToCart(product);
    }
    this.toastr.success(`${quantity} ${product.nombre} agregado(s) al carrito`);
    // Mark as added
    this.addedProducts.add(product.idproducto);
    // Reset quantity after adding
    this.quantities[product.idproducto] = 1;
  }



  getCartItemCount(): number {
    return this.cartService.getCartItems().reduce((total, item) => total + item.quantity, 0);
  }

  openLoginModal(): void {
    this.showLoginModal = true;
  }

  openRegisterModal(): void {
    this.showRegisterModal = true;
  }

  openOrdersSidebar(): void {
    if (this.ordersSidebar) {
      this.ordersSidebar.openOrders();
    }
  }
}
