import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CancellationService } from './cancellation.service';
import { CancellationStatus } from './cancellation.models';

describe('CancellationService', () => {
  let service: CancellationService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CancellationService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('submits a cancellation request for the selected enrollment', () => {
    const requestBody = { reason: 'Schedule change' };

    service.createRequest(42, requestBody).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/enrollments/42/cancellation-request`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(requestBody);
    request.flush({});
  });

  it('loads admin requests with the supplied filters', () => {
    service
      .getRequests(2, 15, {
        search: 'student@example.com',
        status: CancellationStatus.Pending,
        fromDate: '2026-01-01',
        toDate: '2026-12-31',
      })
      .subscribe();

    const request = httpTestingController.expectOne(
      (req) => req.url === `${environment.apiUrl}/cancellation-requests`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('pageNumber')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('15');
    expect(request.request.params.get('search')).toBe('student@example.com');
    expect(request.request.params.get('status')).toBe('0');
    expect(request.request.params.get('fromDate')).toBe('2026-01-01');
    expect(request.request.params.get('toDate')).toBe('2026-12-31');
    request.flush({});
  });

  it('uses the correct decision endpoint for approval and rejection', () => {
    service.approveRequest(7, { adminRemarks: 'Approved.' }).subscribe();
    const approval = httpTestingController.expectOne(
      `${environment.apiUrl}/cancellation-requests/7/approve`,
    );
    expect(approval.request.method).toBe('PUT');
    expect(approval.request.body).toEqual({ adminRemarks: 'Approved.' });
    approval.flush({});

    service.rejectRequest(8, { adminRemarks: 'Please contact the office.' }).subscribe();
    const rejection = httpTestingController.expectOne(
      `${environment.apiUrl}/cancellation-requests/8/reject`,
    );
    expect(rejection.request.method).toBe('PUT');
    expect(rejection.request.body).toEqual({ adminRemarks: 'Please contact the office.' });
    rejection.flush({});
  });
});
