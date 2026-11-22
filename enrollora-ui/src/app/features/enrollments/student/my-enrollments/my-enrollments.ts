import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CancellationStatus } from '../../cancellation.models';
import { CancellationService } from '../../cancellation.service';
import { EnrollmentResponse } from '../../enrollment.models';
import { EnrollmentService } from '../../enrollment.service';

@Component({
  selector: 'app-my-enrollments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './my-enrollments.css',
  templateUrl: './my-enrollments.html',
})
export class MyEnrollments implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly cancellationService = inject(CancellationService);

  enrollments = signal<EnrollmentResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  pendingCancellationIds = signal<number[]>([]);
  cancellationRequestsLoading = signal(false);
  cancellationRequestsError = signal('');
  cancellationMessage = signal('');
  cancellationActionError = signal('');
  selectedEnrollment = signal<EnrollmentResponse | null>(null);
  cancellationReason = '';
  isSubmittingCancellation = signal(false);
  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);

  ngOnInit(): void {
    this.loadEnrollments();
  }

  loadEnrollments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.loadPendingCancellationRequests();

    this.enrollmentService
      .getMyEnrollments(this.pageNumber(), this.pageSize())
      .subscribe({
        next: (response) => {
          this.enrollments.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const body = error.error;
          this.errorMessage.set(
            body?.detail || body?.message || body?.title ||
            'Unable to load your enrollments.',
          );
          this.isLoading.set(false);
        },
      });
  }

  loadPendingCancellationRequests(): void {
    this.cancellationRequestsLoading.set(true);
    this.cancellationRequestsError.set('');

    this.cancellationService
      .getMyRequests(1, 100, { status: CancellationStatus.Pending })
      .subscribe({
        next: (response) => {
          this.pendingCancellationIds.set(response.items.map((request) => request.enrollmentId));
          this.cancellationRequestsLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Failed to load pending cancellation requests:', error);
          this.cancellationRequestsError.set(
            this.getErrorMessage(error, 'Unable to check pending cancellation requests.'),
          );
          this.cancellationRequestsLoading.set(false);
        },
      });
  }

  isEnrollmentActive(status: number): boolean {
    return status === 0;
  }

  hasPendingCancellation(enrollmentId: number): boolean {
    return this.pendingCancellationIds().includes(enrollmentId);
  }

  openCancellationRequest(enrollment: EnrollmentResponse): void {
    this.selectedEnrollment.set(enrollment);
    this.cancellationReason = '';
    this.cancellationActionError.set('');
  }

  closeCancellationRequest(): void {
    if (this.isSubmittingCancellation()) {
      return;
    }

    this.selectedEnrollment.set(null);
    this.cancellationReason = '';
    this.cancellationActionError.set('');
  }

  submitCancellationRequest(): void {
    const enrollment = this.selectedEnrollment();
    const reason = this.cancellationReason.trim();

    if (!enrollment || this.isSubmittingCancellation()) {
      return;
    }
    if (!reason || reason.length > 1000) {
      this.cancellationActionError.set(
        reason ? 'Reason must be 1,000 characters or fewer.' : 'Please enter a reason.',
      );
      return;
    }

    this.isSubmittingCancellation.set(true);
    this.cancellationActionError.set('');
    this.cancellationMessage.set('');

    this.cancellationService.createRequest(enrollment.enrollmentId, { reason }).subscribe({
      next: () => {
        this.pendingCancellationIds.update((ids) =>
          ids.includes(enrollment.enrollmentId) ? ids : [...ids, enrollment.enrollmentId],
        );
        this.cancellationMessage.set(
          `Cancellation request submitted for ${enrollment.courseName}.`,
        );
        this.isSubmittingCancellation.set(false);
        this.selectedEnrollment.set(null);
        this.cancellationReason = '';
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to submit cancellation request:', error);
        this.cancellationActionError.set(
          this.getErrorMessage(error, 'Unable to submit cancellation request.'),
        );
        this.isSubmittingCancellation.set(false);
      },
    });
  }

  statusLabel(status: number): string {
    return status === 0 ? 'Active' : 'Cancelled';
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadEnrollments();
    }
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadEnrollments();
    }
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const body = error.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (body?.detail) {
      return body.detail;
    }
    if (body?.message) {
      return body.message;
    }
    if (body?.title) {
      return body.title;
    }
    return fallback;
  }
}
