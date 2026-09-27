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
      'staff:view', 'staff:manage',
      'reports:view', 'reports:export',
      'users:view', 'audit:view',
    ],
    ACCOUNTANT: [
      'fees:view', 'fees:collect', 'fees:update', 'fees:export',
      'students:view',
      'reports:view', 'reports:export',
    ],
    OFFICE_STAFF: [
      'students:view', 'students:create', 'students:update', 'students:export',
      'fees:view',
      'attendance:view',
      'staff:view',
      'academics:view',
      'reports:view',
    ],
    TEACHER: [
      'students:view',
      'attendance:view', 'attendance:mark',
      'exams:view', 'marks:enter', 'marks:update',
      'academics:view',
    ],
    CLASS_TEACHER: [
      'students:view',
      'attendance:view', 'attendance:mark', 'attendance:update',
      'exams:view', 'marks:enter', 'marks:update',
      'academics:view',
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

  // 8. Record Seeding Audit Event
  await prisma.auditLog.create({
    data: {
      schoolId: school.id,
      userId: superAdminId,
      action: 'SYSTEM_INITIALIZATION_SEEDED',
      module: 'AUTH',
      entityType: 'User',
      entityId: superAdminId,
      details: 'Initial system permissions, roles, and administrative accounts seeded successfully.',
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
