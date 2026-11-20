import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductoService } from '../../services/producto.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { CartSidebarComponent } from '../cart-sidebar/cart-sidebar';
import { LoginComponent } from '../../auth/login/login.component';
import { RegisterComponent } from '../../auth/register/register.component';
import { OrdersSidebarComponent } from '../orders-sidebar/orders-sidebar';

export interface PromoItem {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  searchTerm?: string;
  action?: 'search' | 'cotizar';
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  query: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CartSidebarComponent, LoginComponent, RegisterComponent, OrdersSidebarComponent],
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
  @ViewChild('cartSidebar', { static: false }) cartSidebar!: CartSidebarComponent;
  @ViewChild('productsAnchor', { static: false }) productsAnchor!: ElementRef;

  private autoScrollInterval: any;
  searchQuery: string = '';
  private searchSubject: Subject<string> = new Subject<string>();
  isSearching: boolean = false;
  selectedCategory: string = '';

  showRegisterModal: boolean = false;
  showLoginModal: boolean = false;
  isLoggedIn: boolean = false;
  currentUser: any = null;

  // Promociones y beneficios con paleta armoniosa de librería
  promos: PromoItem[] = [
    { title: 'Envío Gratis', description: 'En compras mayores a S/. 150', icon: 'fas fa-truck', iconColor: '#2563eb', iconBg: '#eff6ff', searchTerm: '' },
    { title: 'Cuadernos y Lapiceros', description: 'Campaña escolar con descuento', icon: 'fas fa-pencil-alt', iconColor: '#ea580c', iconBg: '#fff7ed', searchTerm: 'cuaderno' },
    { title: 'Juguetería y Regalos', description: 'Novedades para todas las edades', icon: 'fas fa-gamepad', iconColor: '#7c3aed', iconBg: '#f5f3ff', searchTerm: 'juguete' },
    { title: 'Delivery Rápido', description: 'En Baños y Huanuco', icon: 'fas fa-bolt', iconColor: '#059669', iconBg: '#ecfdf5', action: 'cotizar' },
    { title: 'Marcas Reconocidas', description: 'Faber-Castell, Artesco, Layconsa', icon: 'fas fa-check-circle', iconColor: '#d97706', iconBg: '#fefce8', searchTerm: 'artesco' },
    { title: 'Cotiza tu Lista', description: 'Envía tu foto por WhatsApp', icon: 'fas fa-file-invoice', iconColor: '#0284c7', iconBg: '#f0f9ff', action: 'cotizar' },
    { title: 'Papelería y Oficina', description: 'Papel bond, archivadores y más', icon: 'fas fa-folder-open', iconColor: '#0891b2', iconBg: '#ecfeff', searchTerm: 'papel' }
  ];

  // 6 Tarjetas de acceso rápido por categoría
  categories: CategoryItem[] = [
    { id: 'cuadernos', name: 'Cuadernos y Libretas', icon: 'fas fa-book', query: 'cuaderno' },
    { id: 'escritura', name: 'Escritura y Arte', icon: 'fas fa-pen-nib', query: 'bolígrafo' },
    { id: 'mochilas', name: 'Mochilas y Cartucheras', icon: 'fas fa-briefcase', query: 'mochila' },
    { id: 'oficina', name: 'Oficina y Papelería', icon: 'fas fa-paste', query: 'papel' },
    { id: 'jugueteria', name: 'Juguetería y Regalos', icon: 'fas fa-puzzle-piece', query: 'juguete' },
    { id: 'arte', name: 'Pintura y Manualidades', icon: 'fas fa-palette', query: 'témpera' }
  ];

  // Búsquedas populares / inteligentes
  popularSearches: string[] = [
    'Faber-Castell',
    'Artesco',
    'Cuadernos Stanford',
    'Papel Bond A4',
    'Témperas',
    'Plumones',
    'Acuarelas',
    'Mochilas'
  ];

  constructor(
    private productoService: ProductoService,
    private cartService: CartService,
    private toastr: ToastrService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLoggedIn = !!user && !this.authService.isTokenExpired();
    });
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
      this.selectedCategory = '';
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
      this.scrollToProducts();
    }
  }

  nextPage(event: Event): void {
    event.preventDefault();
    if (this.currentPage < this.totalPages && !this.isSearching) {
      this.currentPage++;
      this.products = [];
      this.loadProducts();
      this.scrollToProducts();
    }
  }

  scrollReelLeft(): void {
    if (this.promoReel) {
      this.promoReel.nativeElement.scrollBy({ left: -320, behavior: 'smooth' });
      this.resetAutoScroll();
    }
  }

  scrollReelRight(): void {
    if (this.promoReel) {
      this.promoReel.nativeElement.scrollBy({ left: 320, behavior: 'smooth' });
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
    this.selectedCategory = '';
    this.isSearching = false;
    this.currentPage = 1;
    this.loadProducts();
  }

  onSearchTag(tag: string): void {
    this.searchQuery = tag;
    this.selectedCategory = '';
    this.onSearch();
    this.scrollToProducts();
  }

  selectCategory(category: CategoryItem): void {
    if (this.selectedCategory === category.id) {
      this.clearSearch();
    } else {
      this.selectedCategory = category.id;
      this.searchQuery = category.query;
      this.onSearch();
      this.scrollToProducts();
    }
  }

  onPromoClick(promo: PromoItem): void {
    if (promo.action === 'cotizar') {
      this.cotizarListaEscolar();
    } else if (promo.searchTerm) {
      this.onSearchTag(promo.searchTerm);
    }
  }

  cotizarListaEscolar(): void {
    const text = encodeURIComponent('¡Hola Libreria Mathias! Deseo cotizar mi lista escolar por favor.');
    window.open(`https://wa.me/51926424814?text=${text}`, '_blank');
  }

  openWhatsApp(): void {
    window.open('https://wa.me/51926424814', '_blank');
  }

  scrollToProducts(): void {
    if (this.productsAnchor) {
      this.productsAnchor.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  startAutoScroll(): void {
    this.autoScrollInterval = setInterval(() => {
      if (this.promoReel) {
        const reel = this.promoReel.nativeElement;
        const maxScrollLeft = reel.scrollWidth - reel.clientWidth;

        if (reel.scrollLeft >= maxScrollLeft - 10) {
          reel.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          reel.scrollBy({ left: 320, behavior: 'smooth' });
        }
      }
    }, 4000);
  }

  stopAutoScroll(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
  }

  getProductImage(product: Product, index: number): string {
    const nombre = product.imagen_path;
    if (nombre && index >= 0) {
      return '/assets/img/imagenes/' + nombre;
    }
    return '/assets/img/imagenes/default.png';
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
    this.addedProducts.add(product.idproducto);
    this.quantities[product.idproducto] = 1;
  }

  getCartItemCount(): number {
    return this.cartService.getCartItems().reduce((total, item) => total + item.quantity, 0);
  }

  openCart(): void {
    if (this.cartSidebar) {
      this.cartSidebar.openCart();
    }
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
