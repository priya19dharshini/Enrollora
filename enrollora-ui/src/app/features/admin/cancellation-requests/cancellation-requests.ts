import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CancellationFilter,
  CancellationResponse,
  CancellationStatus,
} from '../../enrollments/cancellation.models';
import { CancellationService } from '../../enrollments/cancellation.service';

type ReviewAction = 'approve' | 'reject';

@Component({
  selector: 'app-admin-cancellation-requests',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './cancellation-requests.html',
  styleUrl: './cancellation-requests.css',
})
export class AdminCancellationRequests implements OnInit {
  private readonly cancellationService = inject(CancellationService);

  readonly statuses = CancellationStatus;
  requests = signal<CancellationResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  actionError = signal('');
  successMessage = signal('');
  pageNumber = signal(1);
  readonly pageSize = 10;
  totalRecords = signal(0);
  totalPages = signal(0);
  filters: CancellationFilter = this.defaultFilters();
  selectedRequest = signal<CancellationResponse | null>(null);
  reviewAction = signal<ReviewAction | null>(null);
  adminRemarks = '';
  isReviewing = signal(false);

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.cancellationService
      .getRequests(this.pageNumber(), this.pageSize, this.filters)
      .subscribe({
        next: (response) => {
          this.requests.set(response.items);
          this.pageNumber.set(response.pageNumber);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Failed to load cancellation requests:', error);
          this.errorMessage.set(
            this.getErrorMessage(error, 'Unable to load cancellation requests.'),
          );
          this.isLoading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadRequests();
  }

  clearFilters(): void {
    this.filters = this.defaultFilters();
    this.pageNumber.set(1);
    this.loadRequests();
  }

  statusLabel(status: CancellationStatus): string {
    switch (status) {
      case CancellationStatus.Pending:
        return 'Pending';
      case CancellationStatus.Approved:
        return 'Approved';
      case CancellationStatus.Rejected:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  statusClass(status: CancellationStatus): string {
    switch (status) {
      case CancellationStatus.Pending:
        return 'pending';
      case CancellationStatus.Approved:
        return 'approved';
      case CancellationStatus.Rejected:
        return 'rejected';
      default:
        return 'unknown';
    }
  }

  openReview(request: CancellationResponse, action: ReviewAction): void {
    if (request.status !== CancellationStatus.Pending || this.isReviewing()) {
      return;
    }

    this.selectedRequest.set(request);
    this.reviewAction.set(action);
    this.adminRemarks = '';
    this.actionError.set('');
  }

  closeReview(): void {
    if (this.isReviewing()) {
      return;
    }

    this.selectedRequest.set(null);
    this.reviewAction.set(null);
    this.adminRemarks = '';
    this.actionError.set('');
  }

  submitReview(): void {
    const request = this.selectedRequest();
    const action = this.reviewAction();
    const remarks = this.adminRemarks.trim();

    if (!request || !action || this.isReviewing()) {
      return;
    }
    if (remarks.length > 1000) {
      this.actionError.set('Administrator remarks must be 1,000 characters or fewer.');
      return;
    }

    this.isReviewing.set(true);
    this.actionError.set('');
    this.successMessage.set('');
    const reviewRequest = { adminRemarks: remarks || undefined };
    const review =
      action === 'approve'
        ? this.cancellationService.approveRequest(request.cancellationRequestId, reviewRequest)
        : this.cancellationService.rejectRequest(request.cancellationRequestId, reviewRequest);

    review.subscribe({
      next: () => {
        this.successMessage.set(
          action === 'approve'
            ? 'Cancellation request approved.'
            : 'Cancellation request rejected.',
        );
        this.isReviewing.set(false);
        this.closeReview();
        this.loadRequests();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to review cancellation request:', error);
        this.actionError.set(this.getErrorMessage(error, 'Unable to review this request.'));
        this.isReviewing.set(false);
      },
    });
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadRequests();
    }
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadRequests();
    }
  }

  private defaultFilters(): CancellationFilter {
    return {
      search: '',
      status: CancellationStatus.Pending,
      fromDate: '',
      toDate: '',
    };
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
    if (body?.errors) {
      const messages = Object.values(body.errors).flat();
      if (messages.length > 0) {
        return messages.map((message) => String(message)).join(' ');
      }
    }
    return fallback;
  }
}
