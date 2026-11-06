import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { HeaderComponent } from '../shared/header/header.component';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { FooterComponent } from '../shared/footer/footer.component';

@Component({
  selector: 'app-pages',
  standalone: true,
  templateUrl: './pages.component.html',
  styleUrl: './pages.component.css',
  imports: [CommonModule, HeaderComponent, SidebarComponent, FooterComponent, RouterOutlet]
})
export class PagesComponent implements OnInit {
  isPosMode: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkIfPos(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkIfPos(event.urlAfterRedirects || event.url);
    });
  }

  private checkIfPos(url: string): void {
    this.isPosMode = !!url && url.includes('/pos');
  }
}
