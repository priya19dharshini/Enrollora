import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import {
  CancellationResponse,
  CancellationStatus,
} from '../../enrollments/cancellation.models';
import { CancellationService } from '../../enrollments/cancellation.service';
import { AdminCancellationRequests } from './cancellation-requests';

describe('AdminCancellationRequests', () => {
  let component: AdminCancellationRequests;
  let fixture: ComponentFixture<AdminCancellationRequests>;
  let approvedRequestId: number | null;
  let approvalRemarks: string | undefined;
  let rejectedRequestId: number | null;

  const request: CancellationResponse = {
    cancellationRequestId: 9,
    enrollmentId: 42,
    studentId: 7,
    studentName: 'Alex Student',
    studentEmail: 'alex@example.com',
    courseName: 'Angular Fundamentals',
    reason: 'Schedule change',
    status: CancellationStatus.Pending,
    requestedAt: '2026-10-10T00:00:00Z',
    reviewedAt: null,
    adminRemarks: null,
  };

  beforeEach(async () => {
    approvedRequestId = null;
    approvalRemarks = undefined;
    rejectedRequestId = null;

    await TestBed.configureTestingModule({
      imports: [AdminCancellationRequests],
      providers: [
        {
          provide: CancellationService,
          useValue: {
            getRequests: () =>
              of({
                items: [request],
                pageNumber: 1,
                pageSize: 10,
                totalRecords: 1,
                totalPages: 1,
              }),
            approveRequest: (id: number, body: { adminRemarks?: string }) => {
              approvedRequestId = id;
              approvalRemarks = body.adminRemarks;
              return of(request);
            },
            rejectRequest: (id: number) => {
              rejectedRequestId = id;
              return of(request);
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCancellationRequests);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('approves a pending request and sends optional remarks', () => {
    component.openReview(request, 'approve');
    component.adminRemarks = '  Approved after review.  ';

    component.submitReview();

    expect(approvedRequestId).toBe(request.cancellationRequestId);
    expect(approvalRemarks).toBe('Approved after review.');
    expect(component.successMessage()).toBe('Cancellation request approved.');
    expect(component.selectedRequest()).toBeNull();
  });

  it('rejects a pending request', () => {
    component.openReview(request, 'reject');

    component.submitReview();

    expect(rejectedRequestId).toBe(request.cancellationRequestId);
    expect(component.successMessage()).toBe('Cancellation request rejected.');
  });
});
