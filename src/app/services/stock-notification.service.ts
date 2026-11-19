import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { ProductoService } from './producto.service';
import { Product } from '../models/product';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class StockNotificationService {
  // Umbral por defecto: productos con stock <= 5 se consideran con stock crítico/mínimo
  private readonly defaultThreshold: number = 5;
  private thresholdSubject = new BehaviorSubject<number>(this.defaultThreshold);
  public threshold$: Observable<number> = this.thresholdSubject.asObservable();

  private lowStockProductsSubject = new BehaviorSubject<Product[]>([]);
  public lowStockProducts$: Observable<Product[]> = this.lowStockProductsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  private autoRefreshSub?: Subscription;

  constructor(
    private productoService: ProductoService,
    private toastr: ToastrService
  ) {
    this.checkStock(false);

    // Revisión periódica en segundo plano cada 3 minutos (180,000 ms)
    this.autoRefreshSub = interval(180000).subscribe(() => {
      this.checkStock(false);
    });
  }

  setThreshold(val: number): void {
    if (val >= 0) {
      this.thresholdSubject.next(val);
      this.checkStock(false);
    }
  }

  getThreshold(): number {
    return this.thresholdSubject.value;
  }

  checkStock(showToastOnCritical: boolean = false): void {
    this.loadingSubject.next(true);

    // Consulta el catálogo para evaluar el stock en tiempo real
    this.productoService.getAllProductos(1, 1000).subscribe({
      next: (res: any) => {
        this.loadingSubject.next(false);
        const list: Product[] = res?.list || [];
        const threshold = this.getThreshold();

        // Filtrar productos cuyo stock sea menor o igual al umbral
        const critical = list.filter(p => {
          const s = Number(p.stock);
          return !isNaN(s) && s <= threshold;
        });

        // Ordenar: primero los de menor stock (0, 1, 2...)
        critical.sort((a, b) => Number(a.stock) - Number(b.stock));

        this.lowStockProductsSubject.next(critical);

        if (showToastOnCritical && critical.length > 0) {
          const outOfStock = critical.filter(p => Number(p.stock) <= 0).length;
          if (outOfStock > 0) {
            this.toastr.warning(
              `Hay ${critical.length} producto(s) con stock mínimo (${outOfStock} agotado(s))`,
              'Alerta de Inventario'
            );
          } else {
            this.toastr.info(
              `Hay ${critical.length} producto(s) por agotarse (stock ≤ ${threshold})`,
              'Alerta de Stock'
            );
          }
        }
      },
      error: (err) => {
        this.loadingSubject.next(false);
        console.warn('Error verificando stock crítico:', err);
      }
    });
  }
}

