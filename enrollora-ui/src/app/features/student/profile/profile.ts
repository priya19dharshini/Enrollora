import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  StudentResponse,
  UpdateMyProfileRequest,
} from '../../admin/students/student.models';
import { StudentService } from '../../admin/students/student.service';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class StudentProfile implements OnInit {
  private readonly studentService = inject(StudentService);

  profile = signal<StudentResponse | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  profileForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    department: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    age: new FormControl(17, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(17), Validators.max(60)],
    }),
    cgpa: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(10)],
    }),
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.studentService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.profileForm.reset({
          name: profile.name,
          department: profile.department,
          age: profile.age,
          cgpa: profile.cgpa,
        });
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to load student profile:', error);
        this.errorMessage.set(this.getErrorMessage(error, 'Unable to load your profile.'));
        this.isLoading.set(false);
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.isSaving()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const request: UpdateMyProfileRequest = this.profileForm.getRawValue();
    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.studentService.updateMyProfile(request).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.profileForm.reset({
          name: profile.name,
          department: profile.department,
          age: profile.age,
          cgpa: profile.cgpa,
        });
        this.successMessage.set('Your profile has been updated.');
        this.isSaving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to update student profile:', error);
        this.errorMessage.set(this.getErrorMessage(error, 'Unable to update your profile.'));
        this.isSaving.set(false);
      },
    });
  }

  resetProfile(): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }

    this.profileForm.reset({
      name: profile.name,
      department: profile.department,
      age: profile.age,
      cgpa: profile.cgpa,
    });
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  statusLabel(status: number): string {
    switch (status) {
      case 0:
        return 'Pending';
      case 1:
        return 'Approved';
      case 2:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  statusClass(status: number): string {
    switch (status) {
      case 0:
        return 'pending';
      case 1:
        return 'approved';
      case 2:
        return 'rejected';
      default:
        return 'unknown';
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
    if (body?.errors) {
      const messages = Object.values(body.errors).flat();
      if (messages.length > 0) {
        return messages.map((message) => String(message)).join(' ');
      }
    }
    return fallback;
  }
}
