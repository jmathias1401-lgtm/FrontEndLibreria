import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-paginate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paginate.component.html',
  styleUrl: './paginate.component.css'
})
export class PaginateComponent implements OnInit, OnChanges {
  private _currentPage: number = 1;

  @Input() total: number = 0;
  @Input() pageSize: number = 10;
  @Input() pageSizeOptions: number[] = [5, 10, 20, 50, 100];
  @Input() npage: any[] = [];

  @Input() 
  set currentPage(val: number) {
    if (val && val > 0) {
      this._currentPage = Number(val);
      this.inputPage = Number(val);
    }
  }
  get currentPage(): number {
    return this._currentPage;
  }

  @Input() 
  set page(val: number) {
    if (val && val > 0) {
      this._currentPage = Number(val);
      this.inputPage = Number(val);
    }
  }

  @Input() 
  set xpage(val: number) {
    if (val && val > 0) {
      this.pageSize = Number(val);
    }
  }

  @Output() SendIndex: EventEmitter<number> = new EventEmitter<number>();
  @Output() pageChange: EventEmitter<number> = new EventEmitter<number>();
  @Output() pageSizeChange: EventEmitter<number> = new EventEmitter<number>();

  inputPage: number = 1;

  ngOnInit(): void {
    this.inputPage = this._currentPage;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['total'] || changes['pageSize'] || changes['npage']) {
      if (this._currentPage > this.totalPages) {
        this._currentPage = Math.max(1, this.totalPages);
        this.inputPage = this._currentPage;
      }
    }
  }

  get totalPages(): number {
    if (this.total > 0 && this.pageSize > 0) {
      return Math.ceil(this.total / this.pageSize);
    }
    if (this.npage && this.npage.length > 0) {
      return Math.max(...this.npage.map(n => Number(n) || 1));
    }
    return 1;
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this._currentPage;
    const pages: number[] = [];

    if (total <= 1) {
      return [];
    }

    let start = Math.max(2, current - 2);
    let end = Math.min(total - 1, current + 2);

    if (current <= 3) {
      start = 2;
      end = Math.min(total - 1, 5);
    } else if (current >= total - 2) {
      start = Math.max(2, total - 4);
      end = total - 1;
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  get showLeftEllipsis(): boolean {
    const visible = this.visiblePages;
    return visible.length > 0 && visible[0] > 2;
  }

  get showRightEllipsis(): boolean {
    const visible = this.visiblePages;
    return visible.length > 0 && visible[visible.length - 1] < this.totalPages - 1;
  }

  goToPage(page: number): void {
    const targetPage = Math.max(1, Math.min(page, this.totalPages));
    if (targetPage !== this._currentPage) {
      this._currentPage = targetPage;
      this.inputPage = targetPage;
      this.SendIndex.emit(targetPage);
      this.pageChange.emit(targetPage);
    }
  }

  goToInputPage(): void {
    let val = Number(this.inputPage);
    if (isNaN(val) || val < 1) {
      val = 1;
    } else if (val > this.totalPages) {
      val = this.totalPages;
    }
    this.goToPage(val);
  }

  onPageSizeChange(): void {
    this.pageSize = Number(this.pageSize);
    this.pageSizeChange.emit(this.pageSize);

    if (this._currentPage > this.totalPages) {
      this._currentPage = Math.max(1, this.totalPages);
      this.inputPage = this._currentPage;
    }
    this.SendIndex.emit(this._currentPage);
    this.pageChange.emit(this._currentPage);
  }
}

