import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CourseResponse } from '../../../admin/courses/course.models';
import { CourseService } from '../../../admin/courses/course.service';
import { EnrollmentService } from '../../enrollment.service';
import { AvailableCourses } from './available-courses';

describe('AvailableCourses', () => {
  let component: AvailableCourses;
  let fixture: ComponentFixture<AvailableCourses>;
  let courseCalls: Array<{ pageNumber: number; pageSize: number; filters: unknown }>;

  const availableCourse: CourseResponse = {
    courseId: 1,
    courseName: 'Angular Fundamentals',
    duration: '8 weeks',
    fees: 1200,
    capacity: 30,
    enrolledCount: 20,
    availableSeats: 10,
    isActive: true,
  };

  const pagedCourses = (items: CourseResponse[], pageNumber: number, totalPages: number) => ({
    items,
    pageNumber,
    pageSize: 9,
    totalRecords: items.length,
    totalPages,
  });

  beforeEach(async () => {
    courseCalls = [];
    await TestBed.configureTestingModule({
      imports: [AvailableCourses],
      providers: [
        {
          provide: CourseService,
          useValue: {
            getCourses: (
              pageNumber: number,
              pageSize: number,
              filters: unknown,
            ) => {
              courseCalls.push({ pageNumber, pageSize, filters });
              return of(pagedCourses([availableCourse], pageNumber, 1));
            },
          },
        },
        {
          provide: EnrollmentService,
          useValue: {
            createEnrollment: () => of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AvailableCourses);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('requests only active courses with available seats', () => {
    expect(courseCalls[0].filters).toEqual({
      search: '',
      minFees: null,
      maxFees: null,
      isActive: true,
      availability: 'available',
    });
    expect(component.courses()).toEqual([availableCourse]);
  });

  it('applies search and fee filters from the first page', () => {
    component.pageNumber.set(3);
    component.filters.search = 'Angular';
    component.filters.minFees = 500;
    component.filters.maxFees = 2000;

    component.applyFilters();

    expect(component.pageNumber()).toBe(1);
    expect(courseCalls[courseCalls.length - 1]).toEqual({
      pageNumber: 1,
      pageSize: 9,
      filters: {
        search: 'Angular',
        minFees: 500,
        maxFees: 2000,
        isActive: true,
        availability: 'available',
      },
    });
  });

  it('moves back to the last available page when results shrink', () => {
    component.pageNumber.set(2);
    component.loadCourses();

    expect(courseCalls.slice(-2).map((call) => call.pageNumber)).toEqual([2, 1]);
    expect(component.pageNumber()).toBe(1);
  });

  it('clears search and fee filters', () => {
    component.filters.search = 'Angular';
    component.filters.minFees = 500;

    component.clearFilters();

    expect(component.filters.search).toBe('');
    expect(component.filters.minFees).toBeNull();
    expect(component.pageNumber()).toBe(1);
  });
});
