import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CourseService } from '../../../admin/courses/course.service';
import { EnrollmentService } from '../../enrollment.service';
import { EnrollmentListComponent } from './enrollment-list';

describe('EnrollmentListComponent', () => {
  let component: EnrollmentListComponent;
  let fixture: ComponentFixture<EnrollmentListComponent>;
  let filtersUsed: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnrollmentListComponent],
      providers: [
        {
          provide: EnrollmentService,
          useValue: {
            getEnrollments: (
              pageNumber: number,
              pageSize: number,
              filters: any,
            ) => {
              filtersUsed = { pageNumber, pageSize, filters };
              return of({
                items: [],
                pageNumber,
                pageSize,
                totalRecords: 0,
                totalPages: 0,
              });
            },
          },
        },
        {
          provide: CourseService,
          useValue: {
            getCourses: () =>
              of({
                items: [],
                pageNumber: 1,
                pageSize: 100,
                totalRecords: 0,
                totalPages: 0,
              }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EnrollmentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads with backend sorting and default filters', () => {
    expect(filtersUsed.filters.sortBy).toBe('enrolledAt');
    expect(filtersUsed.filters.sortOrder).toBe('desc');
  });

  it('uses the backend active-status value', () => {
    expect(component.isActive(0)).toBe(true);
    expect(component.isActive(1)).toBe(false);
    expect(component.statusLabel(0)).toBe('Active');
    expect(component.statusLabel(1)).toBe('Cancelled');
  });

  it('changes sorting and reloads on a sort column', () => {
    component.sortBy('student');

    expect(component.filters.sortBy).toBe('student');
    expect(component.filters.sortOrder).toBe('asc');
    expect(filtersUsed.filters.sortBy).toBe('student');
  });
});
