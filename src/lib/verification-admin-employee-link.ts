/**
 * Helpers for merging workspace Admin + Employee into one verification-portal
 * SUPER session (manage everyone + fill own professional profile).
 */
import { db } from '@/lib/db';
import { signEmployeeToken } from '@/lib/api-auth';

/** Full professional fields so My profile editor does not open empty / wipe on save. */
export const linkedEmployeeSelect = {
	id: true,
	email: true,
	firstName: true,
	middleName: true,
	lastName: true,
	phone: true,
	wingName: true,
	wingLeadName: true,
	role: true,
	photoUrl: true,
	gender: true,
	employmentStatus: true,
	professionalTitle: true,
	about: true,
	remarks: true,
	city: true,
	state: true,
	country: true,
	linkedinUrl: true,
	githubUrl: true,
	portfolioUrl: true,
	leetcodeUrl: true,
	codeforcesUrl: true,
	codechefUrl: true,
	hackerrankUrl: true,
	careerObjective: true,
	yearsOfExperience: true,
	industry: true,
	personalFileUrl: true,
	summaryFileUrl: true,
	skillsFileUrl: true,
	emergencyContactName: true,
	emergencyContactPhone: true,
	emergencyContactRelation: true,
	experience: true,
	education: true,
	skills: true,
	projects: true,
	certifications: true,
	achievements: true,
	internships: true,
	publications: true,
	customSections: true,
	qualifications: true,
} as const;

export type LinkedEmployeePayload = {
	id: string;
	email: string;
	firstName: string;
	middleName: string | null;
	lastName: string;
	phone: string;
	wingName: string;
	wingLeadName: string;
	role: string;
	photoUrl: string | null;
	professionalTitle: string | null;
	about: string | null;
	[key: string]: unknown;
};

/**
 * Find the Employee row for a workspace Admin (by employeeId link or same email),
 * and ensure Admin.employeeId is set so they stay merged going forward.
 * Also normalizes role label toward "Admin · Technical" when they hold both.
 */
export async function linkAdminToEmployee(admin: {
	id: string;
	email: string;
	employeeId?: string | null;
}): Promise<{ employee: LinkedEmployeePayload | null; employeeToken: string | null }> {
	const email = String(admin.email || '')
		.trim()
		.toLowerCase();

	let employee = admin.employeeId
		? await db.employee.findUnique({ where: { id: admin.employeeId }, select: linkedEmployeeSelect })
		: null;

	if (!employee && email) {
		employee = await db.employee.findUnique({ where: { email }, select: linkedEmployeeSelect });
	}

	if (!employee) {
		return { employee: null, employeeToken: null };
	}

	// Persist the merge on Admin if missing
	if (admin.employeeId !== employee.id) {
		try {
			await db.admin.update({
				where: { id: admin.id },
				data: { employeeId: employee.id },
			});
		} catch {
			/* unique conflict on employeeId — ignore; still use this employee for session */
		}
	}

	// Prefer a dual-role label so the directory shows Admin · Technical
	const roleLower = String(employee.role || '').toLowerCase().trim();
	const alreadyMerged =
		roleLower.includes('admin') && (roleLower.includes('technical') || roleLower.includes('tech'));
	const isGenericRole =
		!roleLower ||
		['employee', 'technical', 'tech', 'admin', 'team lead', 'teamlead'].includes(roleLower) ||
		roleLower === 'admin technical' ||
		roleLower === 'admin-technical';
	if (!alreadyMerged && isGenericRole) {
		try {
			employee = await db.employee.update({
				where: { id: employee.id },
				data: { role: 'Admin · Technical' },
				select: linkedEmployeeSelect,
			});
		} catch {
			/* keep existing role */
		}
	}

	const employeeToken = signEmployeeToken({
		id: employee.id,
		email: employee.email,
		role: employee.role || 'Employee',
	});

	return { employee: employee as LinkedEmployeePayload, employeeToken };
}

export function profileLooksIncomplete(emp: LinkedEmployeePayload | null | undefined) {
	if (!emp) return false;
	const hasTitle = Boolean(String(emp.professionalTitle || '').trim());
	const hasAbout = Boolean(String(emp.about || '').trim());
	return !(hasTitle && hasAbout);
}
