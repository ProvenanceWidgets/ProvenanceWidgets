import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProvenanceWidgetsComponent } from './provenance-widgets.component';

describe('ProvenanceWidgetsComponent', () => {
  let component: ProvenanceWidgetsComponent;
  let fixture: ComponentFixture<ProvenanceWidgetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProvenanceWidgetsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProvenanceWidgetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
