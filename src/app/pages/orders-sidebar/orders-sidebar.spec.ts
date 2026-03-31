import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrdersSidebar } from './orders-sidebar';

describe('OrdersSidebar', () => {
  let component: OrdersSidebar;
  let fixture: ComponentFixture<OrdersSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersSidebar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrdersSidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
