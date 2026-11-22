import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CourseService } from '../course.service';
import { CourseResponse, SaveCourseRequest } from '../course.models';
import { CourseListComponent } from './course-list';

describe('CourseListComponent', () => {
  let component: CourseListComponent;
  let fixture: ComponentFixture<CourseListComponent>;
  let createdRequest: SaveCourseRequest | null;
  let updatedCourseId: number | null;
  let updatedRequest: SaveCourseRequest | null;

  const savedCourse: CourseResponse = {
    courseId: 1,
    courseName: 'Angular Fundamentals',
    duration: '8 weeks',
    fees: 1200,
    capacity: 30,
    enrolledCount: 0,
    availableSeats: 30,
    isActive: true,
  };

  beforeEach(async () => {
    createdRequest = null;
    updatedCourseId = null;
    updatedRequest = null;
    const courseService = {
      getCourses: () =>
        of({
          items: [],
          pageNumber: 1,
          pageSize: 10,
          totalRecords: 0,
          totalPages: 0,
        }),
      getCourseById: () => of(savedCourse),
      createCourse: (request: SaveCourseRequest) => {
        createdRequest = request;
        return of(savedCourse);
      },
      updateCourse: (id: number, request: SaveCourseRequest) => {
        updatedCourseId = id;
        updatedRequest = request;
        return of(savedCourse);
      },
      deactivateCourse: () => of({ message: 'Course deactivated.' }),
    };

    await TestBed.configureTestingModule({
      imports: [CourseListComponent],
      providers: [{ provide: CourseService, useValue: courseService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CourseListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('creates a course with the form values', () => {
    component.openCreateForm();
    component.courseForm.setValue({
      courseName: 'Angular Fundamentals',
      duration: '8 weeks',
      fees: 1200,
      capacity: 30,
      isActive: true,
    });

    component.saveCourse();

    expect(createdRequest).toEqual({
      courseName: 'Angular Fundamentals',
      duration: '8 weeks',
      fees: 1200,
      capacity: 30,
      isActive: true,
    });
    expect(component.isEditorOpen()).toBe(false);
  });

  it('does not submit an invalid course form', () => {
    component.openCreateForm();

    component.saveCourse();

    expect(createdRequest).toBeNull();
    expect(component.isEditorOpen()).toBe(true);
  });

  it('updates the selected course with the edited values', () => {
    component.editCourse(savedCourse);
    component.courseForm.controls.courseName.setValue('Angular Advanced');

    component.saveCourse();

    expect(updatedCourseId).toBe(savedCourse.courseId);
    expect(updatedRequest?.courseName).toBe('Angular Advanced');
    expect(component.isEditorOpen()).toBe(false);
  });
});
