import { TestBed } from '@angular/core/testing';

import { ProvenanceWidgetsService } from './provenance-widgets.service';

describe('ProvenanceWidgetsService', () => {
  let service: ProvenanceWidgetsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProvenanceWidgetsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
