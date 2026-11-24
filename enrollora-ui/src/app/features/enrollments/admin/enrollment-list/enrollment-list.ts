import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { EnrollmentService } from '../../enrollment.service';
import { EnrollmentFilter, EnrollmentResponse } from '../../enrollment.models';
import { CourseService } from '../../../admin/courses/course.service';
import { CourseResponse } from '../../../admin/courses/course.models';

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enrollment-list.html',
  styleUrl: './enrollment-list.css',
})
export class EnrollmentListComponent implements OnInit {
  private enrollmentService = inject(EnrollmentService);
  private courseService = inject(CourseService);

  enrollments = signal<EnrollmentResponse[]>([]);
  courses = signal<CourseResponse[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');
  coursesError = signal('');
  pageSizeOptions = [5, 10, 20, 50];

  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);
  filters: EnrollmentFilter = this.emptyFilters();

  ngOnInit(): void {
    this.loadEnrollments();
    this.loadCourses();
  }

  loadEnrollments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.enrollmentService
      .getEnrollments(this.pageNumber(), this.pageSize(), this.filters)
      .subscribe({
      next: (response) => {
        this.enrollments.set(response.items);
        this.totalRecords.set(response.totalRecords);
        this.totalPages.set(response.totalPages);
        this.pageNumber.set(response.pageNumber);
        this.pageSize.set(response.pageSize);
        this.isLoading.set(false);
      },

      error: (error: HttpErrorResponse) => {
        console.error('Error loading enrollments:', error);
        this.errorMessage.set(this.getErrorMessage(error, 'Unable to load enrollments.'));
        this.isLoading.set(false);
      },
    });
  }

  loadCourses(): void {
    this.coursesError.set('');
    this.courseService.getCourses(1, 100).subscribe({
      next: (response) => {
        this.courses.set(response.items);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading courses:', error);
        this.coursesError.set(this.getErrorMessage(error, 'Unable to load courses.'));
      },
    });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  clearFilters(): void {
    this.filters = this.emptyFilters();
    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  changePageSize(size: string): void {
    this.pageSize.set(Number(size));
    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  isActive(status: number): boolean {
    return status === 0;
  }

  statusLabel(status: number): string {
    return this.isActive(status) ? 'Active' : 'Cancelled';
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadEnrollments();
    }
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadEnrollments();
    }
  }

  sortBy(column: 'student' | 'course' | 'enrolledAt'): void {
    if (this.filters.sortBy === column) {
      this.filters.sortOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.filters.sortBy = column;
      this.filters.sortOrder = 'asc';
    }

    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  sortIcon(column: 'student' | 'course' | 'enrolledAt'): string {
    if (this.filters.sortBy !== column) {
      return '↕';
    }
    return this.filters.sortOrder === 'asc' ? '↑' : '↓';
  }

  private emptyFilters(): EnrollmentFilter {
    return {
      search: '',
      courseId: null,
      status: null,
      fromDate: '',
      toDate: '',
      sortBy: 'enrolledAt',
      sortOrder: 'desc',
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
    return fallback;
  }
}
