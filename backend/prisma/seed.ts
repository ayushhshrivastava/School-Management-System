import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { config } from '../src/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Kids World School ERP Seeder...');

  // 1. Seed School Root Tenant
  const school = await prisma.school.upsert({
    where: { code: 'KWS-MP' },
    update: {},
    create: {
      code: 'KWS-MP',
      name: 'Kids World School',
      affiliationNumber: 'MP-SCH-2026-001',
      board: 'State Board',
      address: 'Station Road, Civil Lines',
      city: 'Madhya Pradesh',
      state: 'Madhya Pradesh',
      country: 'India',
      postalCode: '482001',
      phone: '+91 761 2450000',
      email: 'info@kidsworldschool.com',
      website: 'https://kidsworldschool.com',
    },
  });
  console.log(`✅ School record established: ${school.name} (${school.code})`);

  // 2. Seed Default Academic Session
  const academicSession = await prisma.academicSession.upsert({
    where: {
      schoolId_code: {
        schoolId: school.id,
        code: 'AY-2026-27',
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      name: '2026-2027',
      code: 'AY-2026-27',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.000Z'),
      isCurrent: true,
      isLocked: false,
      description: 'Academic Session 2026-2027',
    },
  });
  console.log(`✅ Active Academic Session established: ${academicSession.name}`);

  // 3. Seed Granular Permissions
  const permissionsData = [
    // Students & Admissions
    { code: 'students:view', module: 'students', action: 'view', description: 'View student profiles and rosters' },
    { code: 'students:create', module: 'students', action: 'create', description: 'Register new student admissions' },
    { code: 'students:update', module: 'students', action: 'update', description: 'Edit student records and parent info' },
    { code: 'students:delete', module: 'students', action: 'delete', description: 'Archive or remove student records' },
    { code: 'students:export', module: 'students', action: 'export', description: 'Export student lists to Excel/CSV' },

    // Fees & Billing
    { code: 'fees:view', module: 'fees', action: 'view', description: 'View fee structures and payment invoices' },
    { code: 'fees:collect', module: 'fees', action: 'collect', description: 'Record fee collections and print receipts' },
    { code: 'fees:update', module: 'fees', action: 'update', description: 'Modify fee concessions and discounts' },
    { code: 'fees:delete', module: 'fees', action: 'delete', description: 'Cancel fee payments or void receipts' },
    { code: 'fees:export', module: 'fees', action: 'export', description: 'Export financial reports and defaulter lists' },

    // Attendance
    { code: 'attendance:view', module: 'attendance', action: 'view', description: 'View daily attendance registers' },
    { code: 'attendance:mark', module: 'attendance', action: 'mark', description: 'Mark student attendance for assigned classes' },
    { code: 'attendance:update', module: 'attendance', action: 'update', description: 'Alter past attendance records' },

    // Examinations & Marks
    { code: 'exams:view', module: 'exams', action: 'view', description: 'View exam schedules and gradebooks' },
    { code: 'exams:create', module: 'exams', action: 'create', description: 'Create terms and exam schedules' },
    { code: 'marks:enter', module: 'exams', action: 'enter', description: 'Enter subject marks for students' },
    { code: 'marks:update', module: 'exams', action: 'update', description: 'Modify existing student marks' },
    { code: 'marks:approve', module: 'exams', action: 'approve', description: 'Approve marks and generate report cards' },

    // Academics & Classes
    { code: 'academics:view', module: 'academics', action: 'view', description: 'View classes, sections, and subjects' },
    { code: 'academics:manage', module: 'academics', action: 'manage', description: 'Configure classes, sections, and subjects' },

    // Academic Sessions (Step 3)
    { code: 'academic_sessions:view', module: 'academics', action: 'view', description: 'View academic session details and statuses' },
    { code: 'academic_sessions:create', module: 'academics', action: 'create', description: 'Create new academic sessions' },
    { code: 'academic_sessions:update', module: 'academics', action: 'update', description: 'Modify academic session metadata and date ranges' },
    { code: 'academic_sessions:activate', module: 'academics', action: 'activate', description: 'Set current active academic session' },
    { code: 'academic_sessions:lock', module: 'academics', action: 'lock', description: 'Archive and lock historical academic sessions' },

    // Classes & Sections (Step 3)
    { code: 'classes:view', module: 'academics', action: 'view', description: 'View classes and grade roster' },
    { code: 'classes:create', module: 'academics', action: 'create', description: 'Create new academic classes' },
    { code: 'classes:update', module: 'academics', action: 'update', description: 'Update class details and sequence' },
    { code: 'classes:delete', module: 'academics', action: 'delete', description: 'Deactivate or delete academic classes' },

    { code: 'sections:view', module: 'academics', action: 'view', description: 'View class sections' },
    { code: 'sections:create', module: 'academics', action: 'create', description: 'Create sections under classes' },
    { code: 'sections:update', module: 'academics', action: 'update', description: 'Modify class sections and capacities' },
    { code: 'sections:delete', module: 'academics', action: 'delete', description: 'Deactivate or delete class sections' },

    // Subjects & Class-Subject Mapping (Step 3)
    { code: 'subjects:view', module: 'academics', action: 'view', description: 'View subject catalog' },
    { code: 'subjects:create', module: 'academics', action: 'create', description: 'Create new subjects' },
    { code: 'subjects:update', module: 'academics', action: 'update', description: 'Modify subject catalog items' },
    { code: 'subjects:delete', module: 'academics', action: 'delete', description: 'Deactivate or delete subjects' },

    { code: 'class_subjects:view', module: 'academics', action: 'view', description: 'View class-subject mappings' },
    { code: 'class_subjects:manage', module: 'academics', action: 'manage', description: 'Map subjects to classes and set core/elective flags' },

    // Staff
    { code: 'staff:view', module: 'staff', action: 'view', description: 'View staff directory' },
    { code: 'staff:manage', module: 'staff', action: 'manage', description: 'Manage staff profiles and assignments' },

    // Reports
    { code: 'reports:view', module: 'reports', action: 'view', description: 'View school operational reports' },
    { code: 'reports:export', module: 'reports', action: 'export', description: 'Download school analytic summaries' },

    // System Administration
    { code: 'users:view', module: 'users', action: 'view', description: 'View internal staff user accounts' },
    { code: 'users:create', module: 'users', action: 'create', description: 'Create internal user accounts' },
    { code: 'users:update', module: 'users', action: 'update', description: 'Update user accounts and lock status' },
    { code: 'users:delete', module: 'users', action: 'delete', description: 'Deactivate user accounts' },
    { code: 'roles:manage', module: 'roles', action: 'manage', description: 'Assign roles and configure permissions' },
    { code: 'audit:view', module: 'audit', action: 'view', description: 'Inspect audit trail logs' },
    { code: 'system:config', module: 'system', action: 'config', description: 'Modify school-wide system settings' },
    { code: 'system:config:view', module: 'system', action: 'view', description: 'View system and school configuration' },
    { code: 'system:config:edit', module: 'system', action: 'edit', description: 'Modify school-wide system settings and preferences' },
  ];

  const permissionsMap = new Map<string, string>();
  for (const perm of permissionsData) {
    const record = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description, module: perm.module, action: perm.action },
      create: perm,
    });
    permissionsMap.set(perm.code, record.id);
  }
  console.log(`✅ Seeded ${permissionsData.length} granular system permissions.`);

  // 4. Seed Standard Roles
  const rolesData = [
    { code: 'SUPER_ADMIN', name: 'Super Administrator', description: 'Full system control, security, and audits' },
    { code: 'PRINCIPAL', name: 'Principal / Admin', description: 'Broad administrative oversight, academics, and reports' },
    { code: 'ACCOUNTANT', name: 'School Accountant', description: 'Fee management, billing, dues collection, receipts' },
    { code: 'OFFICE_STAFF', name: 'Office / Admission Staff', description: 'Student admissions, guardian records, document handling' },
    { code: 'TEACHER', name: 'Teacher', description: 'Class attendance and examination marks entry' },
    { code: 'CLASS_TEACHER', name: 'Class Teacher', description: 'Section master attendance and student remarks' },
  ];

  const rolesMap = new Map<string, string>();
  for (const r of rolesData) {
    const roleRecord = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: { ...r, isSystem: true },
    });
    rolesMap.set(r.code, roleRecord.id);
  }
  console.log(`✅ Seeded ${rolesData.length} foundational system roles.`);

  // 5. Map Roles to Permissions
  const rolePermissionAssignments: Record<string, string[]> = {
    SUPER_ADMIN: permissionsData.map((p) => p.code), // Full system access
    PRINCIPAL: [
      'students:view', 'students:create', 'students:update', 'students:export',
      'fees:view', 'fees:export',
      'attendance:view',
      'exams:view', 'exams:create', 'marks:enter', 'marks:update', 'marks:approve',
      'academics:view', 'academics:manage',
      'academic_sessions:view',
      'classes:view', 'classes:create', 'classes:update', 'classes:delete',
      'sections:view', 'sections:create', 'sections:update', 'sections:delete',
      'subjects:view', 'subjects:create', 'subjects:update', 'subjects:delete',
      'class_subjects:view', 'class_subjects:manage',
      'staff:view', 'staff:manage',
      'reports:view', 'reports:export',
      'users:view', 'audit:view',
      'system:config:view',
    ],
    ACCOUNTANT: [
      'fees:view', 'fees:collect', 'fees:update', 'fees:export',
      'students:view',
      'academic_sessions:view',
      'classes:view', 'sections:view',
      'reports:view', 'reports:export',
    ],
    OFFICE_STAFF: [
      'students:view', 'students:create', 'students:update', 'students:export',
      'fees:view',
      'attendance:view',
      'staff:view',
      'academics:view',
      'academic_sessions:view',
      'classes:view', 'sections:view', 'subjects:view', 'class_subjects:view',
      'reports:view',
    ],
    TEACHER: [
      'students:view',
      'attendance:view', 'attendance:mark',
      'exams:view', 'marks:enter', 'marks:update',
      'academics:view',
      'academic_sessions:view',
      'classes:view', 'sections:view', 'subjects:view', 'class_subjects:view',
    ],
    CLASS_TEACHER: [
      'students:view',
      'attendance:view', 'attendance:mark', 'attendance:update',
      'exams:view', 'marks:enter', 'marks:update',
      'academics:view',
      'academic_sessions:view',
      'classes:view', 'sections:view', 'subjects:view', 'class_subjects:view',
      'reports:view',
    ],
  };

  for (const [roleCode, permCodes] of Object.entries(rolePermissionAssignments)) {
    const roleId = rolesMap.get(roleCode);
    if (!roleId) continue;

    for (const code of permCodes) {
      const permId = permissionsMap.get(code);
      if (!permId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId: permId,
        },
      });
    }
  }
  console.log('✅ Role-Permission relationship mappings established.');

  // 6. Provision Super Admin Account
  const superAdminRole = rolesMap.get('SUPER_ADMIN');
  if (!superAdminRole) throw new Error('SUPER_ADMIN role not found');

  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: config.SUPER_ADMIN_EMAIL },
        { username: config.SUPER_ADMIN_USERNAME },
        { isSuperAdmin: true },
      ],
    },
  });

  let superAdminId: string;
  if (!existingSuperAdmin) {
    const passwordHash = await bcrypt.hash(config.SUPER_ADMIN_PASSWORD, 12);
    const createdAdmin = await prisma.user.create({
      data: {
        schoolId: school.id,
        username: config.SUPER_ADMIN_USERNAME,
        email: config.SUPER_ADMIN_EMAIL,
        fullName: config.SUPER_ADMIN_NAME,
        passwordHash,
        isActive: true,
        isSuperAdmin: true,
      },
    });
    superAdminId = createdAdmin.id;

    // Attach SUPER_ADMIN role
    await prisma.userRole.create({
      data: {
        userId: createdAdmin.id,
        roleId: superAdminRole,
        assignedBy: 'SYSTEM_INITIALIZER',
      },
    });

    console.log(`✅ Super Admin account created: ${config.SUPER_ADMIN_EMAIL}`);
  } else {
    superAdminId = existingSuperAdmin.id;
    console.log(`ℹ️ Super Admin account already exists: ${existingSuperAdmin.email}`);
  }

  // 7. Provision Default Demonstration Staff for RBAC Testing
  const demoUsers = [
    { username: 'principal', email: 'principal@kidsworldschool.com', name: 'Dr. Ramesh Sharma', role: 'PRINCIPAL' },
    { username: 'accountant', email: 'accountant@kidsworldschool.com', name: 'Sanjay Verma', role: 'ACCOUNTANT' },
    { username: 'teacher', email: 'teacher@kidsworldschool.com', name: 'Pooja Tiwari', role: 'TEACHER' },
  ];

  for (const demo of demoUsers) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: demo.email }, { username: demo.username }] },
    });
    const roleId = rolesMap.get(demo.role);

    if (!existing && roleId) {
      const passwordHash = await bcrypt.hash('Staff@KWS2026#', 12);
      const user = await prisma.user.create({
        data: {
          schoolId: school.id,
          username: demo.username,
          email: demo.email,
          fullName: demo.name,
          passwordHash,
          isActive: true,
          isSuperAdmin: false,
        },
      });

      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId,
          assignedBy: superAdminId,
        },
      });
      console.log(`✅ Demo staff provisioned: ${demo.name} (${demo.role})`);
    }
  }

  // 8. Seed Master Academic Classes & Sections
  const classDefs = [
    { name: 'Nursery', code: 'NUR', displayOrder: 1, sections: ['A'] },
    { name: 'LKG', code: 'LKG', displayOrder: 2, sections: ['A'] },
    { name: 'UKG', code: 'UKG', displayOrder: 3, sections: ['A'] },
    { name: 'Class 1', code: 'CLS-01', displayOrder: 4, sections: ['A', 'B'] },
    { name: 'Class 2', code: 'CLS-02', displayOrder: 5, sections: ['A', 'B'] },
    { name: 'Class 3', code: 'CLS-03', displayOrder: 6, sections: ['A', 'B'] },
    { name: 'Class 4', code: 'CLS-04', displayOrder: 7, sections: ['A', 'B'] },
    { name: 'Class 5', code: 'CLS-05', displayOrder: 8, sections: ['A', 'B'] },
    { name: 'Class 6', code: 'CLS-06', displayOrder: 9, sections: ['A', 'B'] },
    { name: 'Class 7', code: 'CLS-07', displayOrder: 10, sections: ['A', 'B'] },
    { name: 'Class 8', code: 'CLS-08', displayOrder: 11, sections: ['A', 'B'] },
    { name: 'Class 9', code: 'CLS-09', displayOrder: 12, sections: ['A', 'B'] },
    { name: 'Class 10', code: 'CLS-10', displayOrder: 13, sections: ['A', 'B'] },
    { name: 'Class 11', code: 'CLS-11', displayOrder: 14, sections: ['A', 'B'] },
    { name: 'Class 12', code: 'CLS-12', displayOrder: 15, sections: ['A', 'B'] },
  ];

  const classMap = new Map<string, string>();
  for (const cDef of classDefs) {
    const classRecord = await prisma.class.upsert({
      where: {
        schoolId_code: {
          schoolId: school.id,
          code: cDef.code,
        },
      },
      update: { name: cDef.name, displayOrder: cDef.displayOrder, isActive: true },
      create: {
        schoolId: school.id,
        name: cDef.name,
        code: cDef.code,
        displayOrder: cDef.displayOrder,
        isActive: true,
      },
    });
    classMap.set(cDef.code, classRecord.id);

    // Create sections under this class
    for (let i = 0; i < cDef.sections.length; i++) {
      const secName = cDef.sections[i];
      const sectionRecord = await prisma.section.upsert({
        where: {
          classId_code: {
            classId: classRecord.id,
            code: secName,
          },
        },
        update: { name: secName, displayOrder: i + 1, isActive: true },
        create: {
          classId: classRecord.id,
          name: secName,
          code: secName,
          displayOrder: i + 1,
          capacity: 40,
          isActive: true,
        },
      });

      // Map into current academic session (SessionClassSection)
      await prisma.sessionClassSection.upsert({
        where: {
          academicSessionId_classId_sectionId: {
            academicSessionId: academicSession.id,
            classId: classRecord.id,
            sectionId: sectionRecord.id,
          },
        },
        update: { isActive: true },
        create: {
          academicSessionId: academicSession.id,
          classId: classRecord.id,
          sectionId: sectionRecord.id,
          capacity: 40,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ Seeded ${classDefs.length} classes and sections mapped to ${academicSession.name}.`);

  // 9. Seed Subject Master
  const subjectDefs = [
    { name: 'English', code: 'ENG', type: 'THEORY', displayOrder: 1 },
    { name: 'Hindi', code: 'HIN', type: 'THEORY', displayOrder: 2 },
    { name: 'Mathematics', code: 'MATH', type: 'THEORY', displayOrder: 3 },
    { name: 'Environmental Studies', code: 'EVS', type: 'THEORY', displayOrder: 4 },
    { name: 'Science', code: 'SCI', type: 'BOTH', displayOrder: 5 },
    { name: 'Social Science', code: 'SST', type: 'THEORY', displayOrder: 6 },
    { name: 'Computer Science', code: 'COMP', type: 'BOTH', displayOrder: 7 },
    { name: 'Sanskrit', code: 'SKT', type: 'THEORY', displayOrder: 8 },
    { name: 'Physics', code: 'PHY', type: 'BOTH', displayOrder: 9 },
    { name: 'Chemistry', code: 'CHEM', type: 'BOTH', displayOrder: 10 },
    { name: 'Biology', code: 'BIO', type: 'BOTH', displayOrder: 11 },
    { name: 'Physical Education', code: 'PE', type: 'PRACTICAL', displayOrder: 12 },
  ];

  const subjectMap = new Map<string, string>();
  for (const sDef of subjectDefs) {
    const subRecord = await prisma.subject.upsert({
      where: {
        schoolId_code: {
          schoolId: school.id,
          code: sDef.code,
        },
      },
      update: { name: sDef.name, type: sDef.type, displayOrder: sDef.displayOrder, isActive: true },
      create: {
        schoolId: school.id,
        name: sDef.name,
        code: sDef.code,
        type: sDef.type,
        displayOrder: sDef.displayOrder,
        isActive: true,
      },
    });
    subjectMap.set(sDef.code, subRecord.id);
  }
  console.log(`✅ Seeded ${subjectDefs.length} foundational subjects.`);

  // 10. Seed Class-Subject Mappings (Class 1 & Class 10)
  const class1Id = classMap.get('CLS-01');
  if (class1Id) {
    const class1Subjects = ['ENG', 'HIN', 'MATH', 'EVS'];
    for (const code of class1Subjects) {
      const subId = subjectMap.get(code);
      if (subId) {
        await prisma.classSubject.upsert({
          where: {
            academicSessionId_classId_subjectId: {
              academicSessionId: academicSession.id,
              classId: class1Id,
              subjectId: subId,
            },
          },
          update: { isCompulsory: true, isActive: true },
          create: {
            schoolId: school.id,
            academicSessionId: academicSession.id,
            classId: class1Id,
            subjectId: subId,
            isCompulsory: true,
            totalMarks: 100,
            passingMarks: 33,
            weeklyPeriods: 6,
            isActive: true,
          },
        });
      }
    }
  }

  const class10Id = classMap.get('CLS-10');
  if (class10Id) {
    const class10Subjects = [
      { code: 'ENG', compulsory: true },
      { code: 'HIN', compulsory: true },
      { code: 'MATH', compulsory: true },
      { code: 'SCI', compulsory: true },
      { code: 'SST', compulsory: true },
      { code: 'SKT', compulsory: false }, // Elective/Optional
    ];
    for (const item of class10Subjects) {
      const subId = subjectMap.get(item.code);
      if (subId) {
        await prisma.classSubject.upsert({
          where: {
            academicSessionId_classId_subjectId: {
              academicSessionId: academicSession.id,
              classId: class10Id,
              subjectId: subId,
            },
          },
          update: { isCompulsory: item.compulsory, isActive: true },
          create: {
            schoolId: school.id,
            academicSessionId: academicSession.id,
            classId: class10Id,
            subjectId: subId,
            isCompulsory: item.compulsory,
            totalMarks: 100,
            passingMarks: 33,
            weeklyPeriods: 5,
            isActive: true,
          },
        });
      }
    }
  }
  console.log(`✅ Seeded Class-Subject mappings with core and elective flags.`);

  // 11. Seed Centralized System Configuration
  const defaultConfigs = [
    { category: 'general', key: 'school_name', value: 'Kids World School', dataType: 'string', isPublic: true, description: 'Official institution display name' },
    { category: 'general', key: 'school_affiliation', value: 'MP-SCH-2026-001', dataType: 'string', isPublic: true, description: 'Affiliation or recognition board code' },
    { category: 'general', key: 'school_board', value: 'Madhya Pradesh State Board', dataType: 'string', isPublic: true, description: 'Education board curriculum' },
    { category: 'general', key: 'contact_phone', value: '+91 761 2450000', dataType: 'string', isPublic: true, description: 'Primary contact helpline' },
    { category: 'general', key: 'contact_email', value: 'info@kidsworldschool.com', dataType: 'string', isPublic: true, description: 'Official communication inbox' },
    { category: 'general', key: 'address', value: 'Station Road, Civil Lines, Madhya Pradesh - 482001', dataType: 'string', isPublic: true, description: 'Postal address' },
    { category: 'academic', key: 'current_session_code', value: 'AY-2026-27', dataType: 'string', isPublic: true, description: 'Active academic session code' },
    { category: 'academic', key: 'passing_percentage', value: '33', dataType: 'number', isPublic: false, description: 'Minimum passing percentage threshold' },
    { category: 'academic', key: 'attendance_threshold', value: '75', dataType: 'number', isPublic: false, description: 'Minimum attendance percentage required for exams' },
    { category: 'academic', key: 'term_count', value: '2', dataType: 'number', isPublic: false, description: 'Number of terms per academic year' },
    { category: 'fees', key: 'receipt_prefix', value: 'KWS/REC/2026-27/', dataType: 'string', isPublic: false, description: 'Receipt numbering sequence prefix' },
    { category: 'fees', key: 'currency_code', value: 'INR', dataType: 'string', isPublic: true, description: 'Currency standard code' },
    { category: 'fees', key: 'currency_symbol', value: '₹', dataType: 'string', isPublic: true, description: 'Currency display symbol' },
    { category: 'grading', key: 'system_type', value: 'GRADE_POINTS_AND_PERCENTAGE', dataType: 'string', isPublic: false, description: 'Grading scale evaluation structure' },
  ];

  for (const cfg of defaultConfigs) {
    await prisma.systemConfig.upsert({
      where: {
        schoolId_category_key: {
          schoolId: school.id,
          category: cfg.category,
          key: cfg.key,
        },
      },
      update: {
        value: cfg.value,
        dataType: cfg.dataType,
        isPublic: cfg.isPublic,
        description: cfg.description,
      },
      create: {
        schoolId: school.id,
        category: cfg.category,
        key: cfg.key,
        value: cfg.value,
        dataType: cfg.dataType,
        isPublic: cfg.isPublic,
        description: cfg.description,
      },
    });
  }
  console.log(`✅ Seeded ${defaultConfigs.length} master system configurations.`);

  // 12. Record Seeding Audit Event
  await prisma.auditLog.create({
    data: {
      schoolId: school.id,
      userId: superAdminId,
      action: 'SYSTEM_INITIALIZATION_SEEDED',
      module: 'SYSTEM',
      entityType: 'User',
      entityId: superAdminId,
      details: 'Initial system permissions, roles, academic structures (classes, sections, subjects, session mappings), and configuration seeded successfully.',
      status: 'SUCCESS',
    },
  });

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
