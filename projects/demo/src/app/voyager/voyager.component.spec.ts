import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoyagerComponent } from './voyager.component';

describe('VoyagerComponent', () => {
  let component: VoyagerComponent;
  let fixture: ComponentFixture<VoyagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VoyagerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VoyagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
