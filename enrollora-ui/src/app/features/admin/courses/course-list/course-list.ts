import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { CourseService } from '../course.service';
import { CourseFilter, CourseResponse, SaveCourseRequest } from '../course.models';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './course-list.html',
  styleUrl: './course-list.css',
})
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);

  courses = signal<CourseResponse[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');
  actionError = signal('');
  successMessage = signal('');

  pageNumber = signal(1);
  pageSize = signal(10);

  totalRecords = signal(0);
  totalPages = signal(0);

  filters: CourseFilter = this.emptyFilters();
  isEditorOpen = signal(false);
  isEditorLoading = signal(false);
  isSaving = signal(false);
  editorError = signal('');
  editingCourseId: number | null = null;
  deactivatingCourseId = signal<number | null>(null);

  courseForm = new FormGroup({
    courseName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    duration: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    fees: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    capacity: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(100000)],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.courseService.getCourses(this.pageNumber(), this.pageSize(), this.filters).subscribe({
      next: (response) => {
        this.courses.set(response.items);
        this.totalRecords.set(response.totalRecords);
        this.totalPages.set(response.totalPages);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.errorMessage.set(this.getErrorMessage(error, 'Unable to load courses.'));
        this.isLoading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadCourses();
  }

  clearFilters(): void {
    this.filters = this.emptyFilters();
    this.pageNumber.set(1);
    this.loadCourses();
  }

  openCreateForm(): void {
    this.editingCourseId = null;
    this.editorError.set('');
    this.courseForm.reset({
      courseName: '',
      duration: '',
      fees: 0,
      capacity: 1,
      isActive: true,
    });
    this.isEditorOpen.set(true);
  }

  editCourse(course: CourseResponse): void {
    this.editingCourseId = course.courseId;
    this.editorError.set('');
    this.isEditorOpen.set(true);
    this.isEditorLoading.set(true);

    this.courseService.getCourseById(course.courseId).subscribe({
      next: (response) => {
        this.courseForm.reset({
          courseName: response.courseName,
          duration: response.duration,
          fees: response.fees,
          capacity: response.capacity,
          isActive: response.isActive,
        });
        this.isEditorLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading course details:', error);
        this.editorError.set(this.getErrorMessage(error, 'Unable to load course details.'));
        this.isEditorLoading.set(false);
      },
    });
  }

  closeEditor(): void {
    if (this.isSaving()) {
      return;
    }

    this.isEditorOpen.set(false);
    this.editingCourseId = null;
    this.editorError.set('');
  }

  saveCourse(): void {
    if (this.courseForm.invalid || this.isSaving() || this.isEditorLoading()) {
      this.courseForm.markAllAsTouched();
      return;
    }

    const request: SaveCourseRequest = this.courseForm.getRawValue();
    this.isSaving.set(true);
    this.editorError.set('');
    this.successMessage.set('');

    const saveRequest =
      this.editingCourseId === null
        ? this.courseService.createCourse(request)
        : this.courseService.updateCourse(this.editingCourseId, request);

    saveRequest.subscribe({
      next: () => {
        this.successMessage.set(
          this.editingCourseId === null ? 'Course created successfully.' : 'Course updated successfully.',
        );
        this.isSaving.set(false);
        this.isEditorOpen.set(false);
        this.editingCourseId = null;
        this.pageNumber.set(1);
        this.loadCourses();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error saving course:', error);
        this.editorError.set(this.getErrorMessage(error, 'Unable to save course.'));
        this.isSaving.set(false);
      },
    });
  }

  deactivateCourse(course: CourseResponse): void {
    if (
      !course.isActive ||
      this.deactivatingCourseId() !== null ||
      !confirm(`Deactivate "${course.courseName}"? Existing enrollment history will be preserved.`)
    ) {
      return;
    }

    this.deactivatingCourseId.set(course.courseId);
    this.successMessage.set('');
    this.actionError.set('');

    this.courseService.deactivateCourse(course.courseId).subscribe({
      next: (response) => {
        this.successMessage.set(response.message || 'Course deactivated successfully.');
        this.deactivatingCourseId.set(null);
        this.loadCourses();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error deactivating course:', error);
        this.actionError.set(this.getErrorMessage(error, 'Unable to deactivate course.'));
        this.deactivatingCourseId.set(null);
      },
    });
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadCourses();
    }
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadCourses();
    }
  }

  private emptyFilters(): CourseFilter {
    return {
      search: '',
      isActive: null,
      availability: '',
      minFees: null,
      maxFees: null,
      minCapacity: null,
      maxCapacity: null,
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
