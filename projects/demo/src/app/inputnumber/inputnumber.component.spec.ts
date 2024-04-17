import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputnumberComponent } from './inputnumber.component';

describe('InputnumberComponent', () => {
  let component: InputnumberComponent;
  let fixture: ComponentFixture<InputnumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InputnumberComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputnumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
