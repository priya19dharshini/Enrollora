import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { StudentResponse, UpdateMyProfileRequest } from '../../admin/students/student.models';
import { StudentService } from '../../admin/students/student.service';
import { StudentProfile } from './profile';

describe('StudentProfile', () => {
  let component: StudentProfile;
  let fixture: ComponentFixture<StudentProfile>;
  let updatedRequest: UpdateMyProfileRequest | null;

  const profile: StudentResponse = {
    studentId: 7,
    name: 'Alex Student',
    email: 'alex@example.com',
    department: 'CSE',
    age: 21,
    cgpa: 8.4,
    status: 1,
    registeredAt: '2026-10-10T00:00:00Z',
    reviewedAt: '2026-10-11T00:00:00Z',
  };

  beforeEach(async () => {
    updatedRequest = null;

    await TestBed.configureTestingModule({
      imports: [StudentProfile],
      providers: [
        {
          provide: StudentService,
          useValue: {
            getMyProfile: () => of(profile),
            updateMyProfile: (request: UpdateMyProfileRequest) => {
              updatedRequest = request;
              return of({ ...profile, ...request });
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads the signed-in student profile', () => {
    expect(component.profile()?.email).toBe('alex@example.com');
    expect(component.profileForm.controls.name.value).toBe('Alex Student');
  });

  it('submits only the editable profile fields', () => {
    component.profileForm.setValue({
      name: 'Alex Updated',
      department: 'ECE',
      age: 22,
      cgpa: 8.8,
    });

    component.saveProfile();

    expect(updatedRequest).toEqual({
      name: 'Alex Updated',
      department: 'ECE',
      age: 22,
      cgpa: 8.8,
    });
    expect(component.successMessage()).toBe('Your profile has been updated.');
  });

  it('does not submit an invalid profile', () => {
    component.profileForm.controls.age.setValue(16);

    component.saveProfile();

    expect(updatedRequest).toBeNull();
  });
});
