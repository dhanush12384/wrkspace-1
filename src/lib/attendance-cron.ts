import { processShiftCheckoutJobs } from '@/lib/shift-jobs';
import { checkoutDue, getShiftPolicy } from '@/lib/shift-policy';

/** @deprecated use processShiftCheckoutJobs — kept for imports */
export async function processAttendanceCheckoutJobs(opts?: { notify?: boolean }) {
	return processShiftCheckoutJobs(opts);
}

export function checkoutDecisionForLog(
	log: { checkIn?: string | null; date: string; employeeId?: string },
	todayStr: string,
	nowMins: number,
) {
	// Without employee shift fields this cannot decide — callers should use shift jobs.
	void log;
	void todayStr;
	void nowMins;
	return null;
}

export function checkoutPolicyForLog(log: { shiftCheckIn?: string | null; shiftCheckOut?: string | null }) {
	return getShiftPolicy(log);
}

export { checkoutDue, getShiftPolicy };
