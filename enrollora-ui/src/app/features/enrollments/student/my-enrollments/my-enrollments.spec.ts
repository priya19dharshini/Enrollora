import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of } from 'rxjs';

import { CancellationService } from '../../cancellation.service';
import { EnrollmentResponse } from '../../enrollment.models';
import { EnrollmentService } from '../../enrollment.service';
import { MyEnrollments } from './my-enrollments';

describe('MyEnrollments', () => {
  let component: MyEnrollments;
  let fixture: ComponentFixture<MyEnrollments>;
  let submittedEnrollmentId: number | null;
  let submittedReason: string | null;

  const enrollment: EnrollmentResponse = {
    enrollmentId: 42,
    studentId: 7,
    studentName: 'Alex Student',
    studentEmail: 'alex@example.com',
    courseId: 3,
    courseName: 'Angular Fundamentals',
    enrolledAt: '2026-10-10T00:00:00Z',
    status: 0,
  };

  beforeEach(async () => {
    submittedEnrollmentId = null;
    submittedReason = null;

    await TestBed.configureTestingModule({
      imports: [MyEnrollments],
      providers: [
        {
          provide: EnrollmentService,
          useValue: {
            getMyEnrollments: () =>
              of({
                items: [enrollment],
                pageNumber: 1,
                pageSize: 10,
                totalRecords: 1,
                totalPages: 1,
              }),
          },
        },
        {
          provide: CancellationService,
          useValue: {
            getMyRequests: () =>
              of({
                items: [],
                pageNumber: 1,
                pageSize: 100,
                totalRecords: 0,
                totalPages: 0,
              }),
            createRequest: (enrollmentId: number, request: { reason: string }) => {
              submittedEnrollmentId = enrollmentId;
              submittedReason = request.reason;
              return of({});
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyEnrollments);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('offers cancellation only for active enrollment status', () => {
    expect(component.isEnrollmentActive(0)).toBe(true);
    expect(component.isEnrollmentActive(1)).toBe(false);
    expect(component.statusLabel(0)).toBe('Active');
    expect(component.statusLabel(1)).toBe('Cancelled');
  });

  it('submits the trimmed cancellation reason for the selected enrollment', () => {
    component.openCancellationRequest(enrollment);
    component.cancellationReason = '  Schedule change  ';

    component.submitCancellationRequest();

    expect(submittedEnrollmentId).toBe(enrollment.enrollmentId);
    expect(submittedReason).toBe('Schedule change');
    expect(component.hasPendingCancellation(enrollment.enrollmentId)).toBe(true);
    expect(component.selectedEnrollment()).toBeNull();
  });

  it('does not submit an empty cancellation reason', () => {
    component.openCancellationRequest(enrollment);

    component.submitCancellationRequest();

    expect(submittedEnrollmentId).toBeNull();
    expect(component.cancellationActionError()).toBe('Please enter a reason.');
  });
});
