// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main(): Promise<void> {
  console.log("🌱 Seeding database with hashed passwords...");

  const hashedPassword = await hashPassword("12341234");

  const schoolId = "cmcvs90rp0000udzmfixz3ui9";

  const registrarAdmins: {
    email: string;
    firstName: string;
    branchId: string;
  }[] = [
    {
      email: "branchadminabado@yekamichael.edu",
      firstName: "Abado",
      branchId: "cmcvs90rv0002udzmd0asbdx6",
    },
    {
      email: "branchadminwossen@yekamichael.edu",
      firstName: "Wossen",
      branchId: "cmcvs90rx0004udzmd0asbdx8",
    },
    {
      email: "branchadminkotebe@yekamichael.edu",
      firstName: "Kotebe",
      branchId: "cmcvs90rw0003udzmd0asbdx7",
    },
    {
      email: "branchadminshola@yekamichael.edu",
      firstName: "Shola",
      branchId: "cmcvs90rw0003udsmd0asbd99",
    },
  ];

  for (const admin of registrarAdmins) {
    await prisma.user.create({
      data: {
        email: admin.email,
        password: hashedPassword,
        firstName: admin.firstName,
        lastName: "BranchAdmin",
        role: "BRANCH_ADMIN",
        schoolId: schoolId,
        branchId: admin.branchId,
      },
    });
  }
}

main()
  .then(async () => {
    console.log("✅ Seeding completed!");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding error:", e);
    await prisma.$disconnect();
    // process.exit(1);
  });

  // const { PrismaClient } = require("@prisma/client");
// const bcrypt = require("bcryptjs");

// const prisma = new PrismaClient();

// async function hashPassword(password) {
//     return bcrypt.hash(password, 12);
// }

// async function main() {
//     console.log("🌱 Seeding database with hashed passwords...");

//     const hashedPassword = await hashPassword("12341234");

//     // Create School
//     // const school = await prisma.school.create({
//     // 	data: {
//     // 		name: "Green Valley School",
//     // 		code: "GVS001",
//     // 		address: "123 Main Street",
//     // 		phone: "+251912345678",
//     // 		email: "info@greenvalley.edu",
//     // 	},
//     // });

//     // Create Branch
//     // const branch = await prisma.branch.create({
//     // 	data: {
//     // 		name: "Main Branch",
//     // 		code: "MB001",
//     // 		address: "Downtown",
//     // 		phone: "+251912345679",
//     // 		schoolId: school.id,
//     // 	},
//     // });

//     // Super Admin
//     // const superAdmin = await prisma.user.create({
//     //     data: {
//     //         email: "superadmin@yekamichael.edu",
//     //         password: hashedPassword,
//     //         firstName: "Super",
//     //         lastName: "Admin",
//     //         role: "SUPER_ADMIN",
//     //         schoolId: "cmcq6t32p0000ega0yz2lu807",
//     //     },
//     // });

//     // Branch Admin
//     // const branchAdmin = await prisma.user.create({
//     // 	data: {
//     // 		email: "branchadmin@greenvalley.edu",
//     // 		password: hashedPassword,
//     // 		firstName: "Branch",
//     // 		lastName: "Admin",
//     // 		role: "BRANCH_ADMIN",
//     // 		schoolId: school.id,
//     // 		branchId: branch.id,
//     // 	},
//     // });

//     // Registrar Admin
//     // const registrarAdmin = await prisma.user.create({
//     // 	data: {
//     // 		email: "registrarabado@yekamichael.edu",
//     // 		password: hashedPassword,
//     // 		firstName: "Registrar",
//     // 		lastName: "Admin",
//     // 		role: "REGISTRAR",
//     // 		schoolId: school.id,
//     // 		branchId: branch.id,
//     // 	},
//     // });

//     const schoolId = "cmcvs90rp0000udzmfixz3ui9";

//     const registrarAdmins = [
//         {
//             email: "branchadminabado@yekamichael.edu",
//             firstName: "Abado",
//             branchId: "cmcvs90rv0002udzmd0asbdx6",
//         },
//         {
//             email: "branchadminwossen@yekamichael.edu",
//             firstName: "Wossen",
//             branchId: "cmcvs90rx0004udzmd0asbdx8",
//         },
//         {
//             email: "branchadminkotebe@yekamichael.edu",
//             firstName: "Kotebe",
//             branchId: "cmcvs90rw0003udzmd0asbdx7",
//         },
//         {
//             email: "branchadminshola@yekamichael.edu",
//             firstName: "Shola",
//             branchId: "cmcvs90rw0003udsmd0asbd99",
//         },
//     ];

//     for (const admin of registrarAdmins) {
//         await prisma.user.create({
//             data: {
//                 email: admin.email,
//                 password: hashedPassword,
//                 firstName: admin.firstName,
//                 lastName: "BrnchAdmin",
//                 role: "BRANCH_ADMIN",
//                 schoolId: schoolId,
//                 branchId: admin.branchId,
//             },
//         });
//     }


    // const schoolId = "cmcvs90rp0000udzmfixz3ui9";

    // const registrarAdmins = [
    //     {
    //         email: "registrarabado@yekamichael.edu",
    //         firstName: "Abado",
    //         branchId: "cmcvs90rv0002udzmd0asbdx6",
    //     },
    //     {
    //         email: "registrarwossen@yekamichael.edu",
    //         firstName: "Wossen",
    //         branchId: "cmcvs90rx0004udzmd0asbdx8",
    //     },
    //     {
    //         email: "registrarkotebe@yekamichael.edu",
    //         firstName: "Kotebe",
    //         branchId: "cmcvs90rw0003udzmd0asbdx7",
    //     },
    //     {
    //         email: "registrarshola@yekamichael.edu",
    //         firstName: "Shola",
    //         branchId: "cmcvs90rw0003udsmd0asbd99",
    //     },
    // ];

    // for (const admin of registrarAdmins) {
    //     await prisma.user.create({
    //         data: {
    //             email: admin.email,
    //             password: hashedPassword,
    //             firstName: admin.firstName,
    //             lastName: "Registrar",
    //             role: "REGISTRAR",
    //             schoolId: schoolId,
    //             branchId: admin.branchId,
    //         },
    //     });
    // }

    // Teacher User + Teacher Profile
    // const teacherUser = await prisma.user.create({
    // 	data: {
    // 		email: "teacher1@greenvalley.edu",
    // 		password: hashedPassword,
    // 		firstName: "Alice",
    // 		lastName: "Teacher",
    // 		role: "TEACHER",
    // 		schoolId: school.id,
    // 		branchId: branch.id,
    // 		teacherProfile: {
    // 			create: {
    // 				employeeId: "EMP001",
    // 				subject: "Mathematics",
    // 				qualification: "BSc Mathematics",
    // 				experience: 5,
    // 				salary: 15000.0,
    // 				joinDate: new Date(),
    // 			},
    // 		},
    // 	},
    // 	include: {
    // 		teacherProfile: true,
    // 	},
    // });

    // Student User + Student Profile
    // const studentUser = await prisma.user.create({
    // 	data: {
    // 		email: "student1@greenvalley.edu",
    // 		password: hashedPassword,
    // 		firstName: "John",
    // 		lastName: "Doe",
    // 		role: "STUDENT",
    // 		schoolId: school.id,
    // 		branchId: branch.id,
    // 		studentProfile: {
    // 			create: {
    // 				studentId: "STU001",
    // 				branchId: branch.id,
    // 				admissionDate: new Date(),
    // 				bloodGroup: "A+",
    // 				address: "123 Student Street",
    // 				emergencyContact: "+251911112222",
    // 			},
    // 		},
    // 	},
    // 	include: {
    // 		studentProfile: true,
    // 	},
    // });

    // // Parent User + Parent Profile
    // const parentUser = await prisma.user.create({
    // 	data: {
    // 		email: "parent1@greenvalley.edu",
    // 		password: hashedPassword,
    // 		firstName: "Jane",
    // 		lastName: "Doe",
    // 		role: "PARENT",
    // 		schoolId: school.id,
    // 		parentProfile: {
    // 			create: {
    // 				occupation: "Engineer",
    // 				address: "123 Parent Street",
    // 			},
    // 		},
    // 	},
    // 	include: {
    // 		parentProfile: true,
    // 	},
    // });

    // Link Parent to Student
    // await prisma.studentParent.create({
    // 	data: {
    // 		studentId: studentUser.studentProfile.id,
    // 		parentId: parentUser.parentProfile.id,
    // 		relationship: "mother",
    // 	},
    // });

    // Academic Year
    // const academicYear = await prisma.academicYear.create({
    // 	data: {
    // 		name: "2025/2026",
    // 		startDate: new Date("2025-09-01"),
    // 		endDate: new Date("2026-06-30"),
    // 		isActive: true,
    // 	},
    // });

    // Grade
    // const grade = await prisma.grade.create({
    // 	data: {
    // 		name: "Grade 1",
    // 		level: 1,
    // 	},
    // });

    // // Class
    // const classObj = await prisma.class.create({
    // 	data: {
    // 		name: "1A",
    // 		section: "A",
    // 		branchId: branch.id,
    // 		gradeId: grade.id,
    // 		academicYearId: academicYear.id,
    // 		capacity: 30,
    // 	},
    // });

    // // ClassTeacher
    // await prisma.classTeacher.create({
    // 	data: {
    // 		classId: classObj.id,
    // 		teacherId: teacherUser.teacherProfile.id,
    // 		isClassTeacher: true,
    // 	},
    // });

    // // Subject
    // const subject = await prisma.subject.create({
    // 	data: {
    // 		name: "Mathematics",
    // 		code: "MATH101",
    // 		classId: classObj.id,
    // 	},
    // });

    // // SubjectTeacher
    // await prisma.subjectTeacher.create({
    // 	data: {
    // 		subjectId: subject.id,
    // 		teacherId: teacherUser.teacherProfile.id,
    // 	},
    // });

    // // Enroll Student
    // await prisma.enrollment.create({
    // 	data: {
    // 		studentId: studentUser.studentProfile.id,
    // 		classId: classObj.id,
    // 		branchId: branch.id,
    // 		academicYearId: academicYear.id,
    // 	},
    // });

    // // FeeType
    // const feeType = await prisma.feeType.create({
    // 	data: {
    // 		name: "Tuition Fee",
    // 		description: "Monthly tuition fee",
    // 		isRecurring: true,
    // 	},
    // });

    // // Invoice
    // const invoice = await prisma.invoice.create({
    // 	data: {
    // 		invoiceNumber: "INV001",
    // 		studentId: studentUser.studentProfile.id,
    // 		branchId: branch.id,
    // 		totalAmount: 5000.0,
    // 		dueDate: new Date("2025-10-01"),
    // 		createdById: branchAdmin.id,
    // 		items: {
    // 			create: [
    // 				{
    // 					feeTypeId: feeType.id,
    // 					description: "September Tuition",
    // 					amount: 5000.0,
    // 					quantity: 1,
    // 				},
    // 			],
    // 		},
    // 	},
    // });

    // // Payment
    // await prisma.payment.create({
    // 	data: {
    // 		paymentNumber: "PAY001",
    // 		invoiceId: invoice.id,
    // 		studentId: studentUser.studentProfile.id,
    // 		amount: 5000.0,
    // 		paymentMethod: "CASH",
    // 		status: "COMPLETED",
    // 	},
    // });

//     console.log("✅ Seeding complete with hashed passwords!");
// }

// main()
//     .catch((e) => {
//         console.error(e);
//         process.exit(1);
//     })
//     .finally(async () => {
//         await prisma.$disconnect();
//     });
