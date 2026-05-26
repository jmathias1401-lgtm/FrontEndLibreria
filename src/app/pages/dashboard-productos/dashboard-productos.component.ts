import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DetalleVentaService } from '../../services/detalleventa.service';
import { VentasService } from '../../services/ventas.service';
import { DetalleVenta } from '../../models/detalleventa';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

@Component({
  selector: 'app-dashboard-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-productos.component.html',
  styleUrl: './dashboard-productos.component.css'
})
export class DashboardProductosComponent implements OnInit, AfterViewInit {
  filteredDetails: DetalleVenta[] = [];
  selectedMonth: number;
  selectedYear: number;
  selectedProductName: string = '';
  totalUnitsSold: number = 0;
  totalRevenue: number = 0;
  avgProductPrice: number = 0;

  months = [
    { value: 1, name: 'Enero' }, { value: 2, name: 'Febrero' }, { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' }, { value: 5, name: 'Mayo' }, { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' }, { value: 8, name: 'Agosto' }, { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' }, { value: 11, name: 'Noviembre' }, { value: 12, name: 'Diciembre' }
  ];
  years: number[] = [2025, 2024];

  topProducts: { name: string, quantity: number, revenue: number }[] = [];
  bottomProducts: { name: string, quantity: number, revenue: number }[] = [];
  chartMostSold: any;
  chartLeastSold: any;
  chartProductHistory: any;

  constructor(
    private detalleVentaService: DetalleVentaService,
    private ventasService: VentasService
  ) {
    const now = new Date();
    // Inicializar en Septiembre 2025 que es donde sabemos que hay datos reales
    this.selectedMonth = 9; 
    this.selectedYear = 2025;
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
  }

  parseDate(dateInput: any): Date {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date) return dateInput;
    let dateStr = String(dateInput).replace(/-/g, '/').replace('T', ' ');
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  loadInitialData(): void {
    // Usamos xpage=10 para que sea una petición ligera y el backend no la bloquee (403)
    this.ventasService.ListWithFilters(1, 10, {}).subscribe({
      next: (data) => {
        const ventas = data.list || [];
        if (ventas.length > 0) {
          const availableYears = new Set<number>();
          ventas.forEach(v => {
            if (v.fechaventa) availableYears.add(this.parseDate(v.fechaventa).getFullYear());
          });
          availableYears.add(2024);
          availableYears.add(2025);
          this.years = Array.from(availableYears).sort((a, b) => b - a);
        }
        this.fetchVentasMes();
      },
      error: () => {
        // Si el backend da 403, no nos detenemos, usamos los años 2024/2025 por defecto
        this.fetchVentasMes();
      }
    });
  }

  fetchVentasMes(): void {
    this.detalleVentaService.getVentasMes(this.selectedMonth, this.selectedYear).subscribe({
      next: (data) => {
        this.filteredDetails = data.list || [];
        this.processData();
        this.createCharts();
        this.updateProductHistory();
      },
      error: (error) => {
        console.error('Error 403 al llamar a ventasMes. Verifique permisos en el Backend.', error);
        this.filteredDetails = [];
        this.processData();
      }
    });
  }

  applyFilters(): void {
    this.fetchVentasMes();
  }

  processData(): void {
    const stats: { [key: string]: { qty: number, rev: number } } = {};
    let runningUnits = 0;
    let runningRevenue = 0;

    this.filteredDetails.forEach(d => {
      const name = d.producto?.nombre || 'Art. ' + (d.codigodetalleventa || d.iddetalleventa);
      const qty = Number(d.unidades) || 0;
      const rev = Number(d.total) || 0;
      if (!stats[name]) stats[name] = { qty: 0, rev: 0 };
      stats[name].qty += qty;
      stats[name].rev += rev;
      runningUnits += qty;
      runningRevenue += rev;
    });

    this.totalUnitsSold = runningUnits;
    this.totalRevenue = runningRevenue;
    this.avgProductPrice = runningUnits > 0 ? (runningRevenue / runningUnits) : 0;

    const sorted = Object.keys(stats).map(name => ({
      name,
      quantity: stats[name].qty,
      revenue: stats[name].rev
    })).sort((a, b) => b.quantity - a.quantity);

    this.topProducts = sorted.slice(0, 10);
    this.bottomProducts = [...sorted].reverse().slice(0, 10);
    if (this.topProducts.length > 0) {
      this.selectedProductName = this.topProducts[0].name;
    } else {
      this.selectedProductName = 'Sin datos';
    }
  }

  updateProductHistory(): void {
    if (!this.selectedProductName || this.selectedProductName === 'Sin datos') return;
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    const dailyData: { [key: number]: number } = {};
    for (let i = 1; i <= daysInMonth; i++) dailyData[i] = 0;

    this.filteredDetails.filter(d => {
      const name = d.producto?.nombre || 'Art. ' + (d.codigodetalleventa || d.iddetalleventa);
      return name === this.selectedProductName;
    }).forEach(d => {
      if (d.venta?.fechaventa) {
        const day = this.parseDate(d.venta.fechaventa).getDate();
        dailyData[day] += Number(d.unidades) || 0;
      }
    });
    this.createHistoryChart(dailyData, daysInMonth);
  }

  createHistoryChart(dailyData: { [key: number]: number }, daysInMonth: number): void {
    const ctx = document.getElementById('chartProductHistory') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.chartProductHistory) this.chartProductHistory.destroy();
    const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    const data = labels.map(day => dailyData[Number(day)]);
    this.chartProductHistory = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `Unidades de ${this.selectedProductName}`,
          data: data,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          datalabels: {
            display: (context) => Number(context.dataset.data[context.dataIndex]) > 0,
            anchor: 'end', align: 'top', font: { weight: 'bold' }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  createCharts(): void {
    this.createBarChart('chartMostSold', this.topProducts, 'Más Vendidos', 'rgba(75, 192, 192, 0.6)');
    this.createBarChart('chartLeastSold', this.bottomProducts, 'Menos Vendidos', 'rgba(255, 99, 132, 0.6)');
  }

  createBarChart(elementId: string, data: any[], label: string, color: string): void {
    const ctx = document.getElementById(elementId) as HTMLCanvasElement;
    if (!ctx) return;
    if (elementId === 'chartMostSold' && this.chartMostSold) this.chartMostSold.destroy();
    if (elementId === 'chartLeastSold' && this.chartLeastSold) this.chartLeastSold.destroy();
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.name),
        datasets: [{
          label: label,
          data: data.map(d => d.quantity),
          backgroundColor: color,
          borderColor: color.replace('0.6', '1'),
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: { anchor: 'end', align: 'right' }
        }
      },
      plugins: [ChartDataLabels]
    });
    if (elementId === 'chartMostSold') this.chartMostSold = chart;
    if (elementId === 'chartLeastSold') this.chartLeastSold = chart;
  }
}
