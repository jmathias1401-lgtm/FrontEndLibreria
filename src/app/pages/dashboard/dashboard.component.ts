import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../../services/ventas.service';
import { Venta } from '../../models/venta.model';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { DetalleVentaService } from '../../services/detalleventa.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  totalSales: number = 0;
  currentMonthSales: number = 0;
  todaySales: number = 0;
  growthPercentage: number = 0;
  totalClients: number = 0;
  totalProductsSold: number = 0;
  latestSales: Venta[] = [];
  allSales: Venta[] = [];
  salesData: { [key: string]: number } = {};
  currentMode: 'day' | 'month' | 'year' = 'month';
  startDate: string = '';
  endDate: string = '';
  chart: any;

  // Product properties
  topProducts: { name: string, quantity: number }[] = [];
  bottomProducts: { name: string, quantity: number }[] = [];
  productChart: any;

  constructor(
    private ventasService: VentasService,
    private detalleVentaService: DetalleVentaService
  ) {}

  ngOnInit(): void {
    this.loadSalesData();
    this.loadProductPerformance();
  }

  ngAfterViewInit(): void {
  }

  loadSalesData(): void {
    this.ventasService.List(1, 1000).subscribe({
      next: (data) => {
        this.allSales = data.list;
        this.processSalesOverview(this.allSales);
        this.updateReportMode(this.currentMode);
      },
      error: (error) => {
        console.error('Error loading sales data:', error);
      }
    });
  }

  loadProductPerformance(): void {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Primero intentamos con el mes actual
    this.detalleVentaService.getVentasMes(currentMonth, currentYear).subscribe({
      next: (data) => {
        if (data.list && data.list.length > 0) {
          this.processProductData(data.list);
          this.createProductChart();
        } else {
          // Si el mes actual está vacío, buscamos en los últimos meses (ej. Septiembre 2025)
          this.detalleVentaService.List(1, 500).subscribe(allData => {
            const details = allData.list || [];
            if (details.length > 0) {
              const latest = [...details].sort((a, b) => 
                new Date(b.venta?.fechaventa!).getTime() - new Date(a.venta?.fechaventa!).getTime()
              )[0];
              
              if (latest && latest.venta?.fechaventa) {
                const lDate = new Date(latest.venta.fechaventa);
                this.detalleVentaService.getVentasMes(lDate.getMonth() + 1, lDate.getFullYear()).subscribe(res => {
                  this.processProductData(res.list || []);
                  this.createProductChart();
                });
              }
            }
          });
        }
      },
      error: (error) => {
        console.error('Error loading product data:', error);
      }
    });
  }

  processProductData(detalles: any[]): void {
    const productStats: { [key: string]: number } = {};
    let totalItems = 0;

    detalles.forEach(d => {
      const name = d.producto?.nombre || 'Producto Desconocido';
      const qty = Number(d.unidades) || 0;
      productStats[name] = (productStats[name] || 0) + qty;
      totalItems += qty;
    });

    this.totalProductsSold = totalItems;

    const sortedProducts = Object.keys(productStats)
      .map(name => ({ name, quantity: productStats[name] }))
      .sort((a, b) => b.quantity - a.quantity);

    this.topProducts = sortedProducts.slice(0, 5);
    this.bottomProducts = sortedProducts.reverse().slice(0, 5);
  }

  createProductChart(): void {
    const ctx = document.getElementById('productChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.productChart) {
      this.productChart.destroy();
    }

    const labels = this.topProducts.map(p => p.name);
    const data = this.topProducts.map(p => p.quantity);

    this.productChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cantidad Vendida',
          data: data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: 'Top 5 Productos Más Vendidos'
          }
        }
      }
    });
  }

  processSalesOverview(ventas: Venta[]): void {
    const now = new Date();
    const todayStr = this.formatDateLocal(now);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    let total = 0;
    let currentMonthTotal = 0;
    let lastMonthTotal = 0;
    let todayTotal = 0;
    const clients = new Set<number>();

    ventas.forEach(venta => {
      if (!venta.fechaventa) return;
      
      const fecha = new Date(venta.fechaventa);
      const amount = Number(venta.costoventa) || 0;
      const fechaStr = this.formatDateLocal(fecha);
       
      total += amount;

      if (fechaStr === todayStr) {
        todayTotal += amount;
      }

      if (fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear) {
        currentMonthTotal += amount;
      }

      if (fecha.getMonth() === lastMonth && fecha.getFullYear() === lastMonthYear) {
        lastMonthTotal += amount;
      }

      if (venta.cliente?.idcliente) {
        clients.add(venta.cliente.idcliente);
      }
    });

    this.totalSales = total;
    this.currentMonthSales = currentMonthTotal;
    this.todaySales = todayTotal;
    this.totalClients = clients.size;

    if (lastMonthTotal > 0) {
      this.growthPercentage = ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    }

    this.latestSales = ventas.slice(0, 5);
  }

  updateReportMode(mode: 'day' | 'month' | 'year'): void {
    this.currentMode = mode;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.allSales];

    if (this.startDate) {
      const start = new Date(this.startDate + 'T00:00:00');
      filtered = filtered.filter(v => new Date(v.fechaventa!) >= start);
    }
    if (this.endDate) {
      const end = new Date(this.endDate + 'T23:59:59');
      filtered = filtered.filter(v => new Date(v.fechaventa!) <= end);
    }

    this.processSalesDataByMode(filtered, this.currentMode);
    this.createChart();
  }

  processSalesDataByMode(ventas: Venta[], mode: 'day' | 'month' | 'year'): void {
    const groupedSales: { [key: string]: number } = {};
    const now = new Date();

    if (mode === 'day') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        groupedSales[key] = 0;
      }
    } else if (mode === 'month') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        groupedSales[key] = 0;
      }
    } else if (mode === 'year') {
      for (let i = 4; i >= 0; i--) {
        const key = `${now.getFullYear() - i}`;
        groupedSales[key] = 0;
      }
    }

    ventas.forEach(venta => {
      const fecha = new Date(venta.fechaventa!);
      let key = '';

      if (mode === 'day') {
        key = this.formatDateLocal(fecha);
      } else if (mode === 'month') {
        key = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
      } else if (mode === 'year') {
        key = `${fecha.getFullYear()}`;
      }

      const amount = Number(venta.costoventa) || 0;
      if (groupedSales.hasOwnProperty(key)) {
        groupedSales[key] += amount;
      } else if (!this.startDate && !this.endDate) {
         // Si no estamos en el rango "fijo" y no hay filtros, no lo agregamos
         // Pero si hay filtros, quizás deberíamos permitir cualquier fecha
      } else {
        groupedSales[key] = (groupedSales[key] || 0) + amount;
      }
    });

    this.salesData = groupedSales;
  }

  formatDateLocal(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  createChart(): void {
    const ctx = document.getElementById('salesChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = Object.keys(this.salesData).sort();
    const data = labels.map(label => this.salesData[label]);

    Chart.register(ChartDataLabels);

    this.chart = new Chart(ctx, {
      data: {
        labels: labels,
        datasets: [{
          type: 'bar',
          label: `Ventas por ${this.getModeLabel()}`,
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }, {
          type: 'line',
          label: 'Tendencia',
          data: data,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointBackgroundColor: 'rgba(255, 99, 132, 1)',
          pointRadius: labels.length > 15 ? 2 : 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          datalabels: {
            display: (context) => context.dataset.type === 'bar' && labels.length <= 12,
            anchor: 'end',
            align: 'top',
            formatter: (value) => value > 0 ? value.toLocaleString('es-PE', { minimumFractionDigits: 1 }) : ''
          }
        },
        scales: {
          x: {
            ticks: {
              callback: function(val, index) {
                const label = labels[index];
                return labels.length > 20 ? label.split('-')[2] : label;
              }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => 'S/ ' + value
            }
          }
        }
      }
    });
  }

  getModeLabel(): string {
    switch (this.currentMode) {
      case 'day': return 'Día';
      case 'month': return 'Mes';
      case 'year': return 'Año';
      default: return 'Mes';
    }
  }
}
