import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CancellationResponse,
  CancellationStatus,
} from '../../enrollments/cancellation.models';
import { CancellationService } from '../../enrollments/cancellation.service';

@Component({
  selector: 'app-student-cancellation-requests',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './cancellation-requests.html',
  styleUrl: './cancellation-requests.css',
})
export class StudentCancellationRequests implements OnInit {
  private readonly cancellationService = inject(CancellationService);

  readonly statuses = CancellationStatus;
  requests = signal<CancellationResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  pageNumber = signal(1);
  readonly pageSize = 10;
  totalRecords = signal(0);
  totalPages = signal(0);
  statusFilter: CancellationStatus | null = null;

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.cancellationService
      .getMyRequests(this.pageNumber(), this.pageSize, { status: this.statusFilter })
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

  applyStatusFilter(): void {
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
