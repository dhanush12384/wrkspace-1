import { processShiftCheckoutJobs } from '@/lib/shift-jobs';
import { checkoutDue, getShiftPolicy } from '@/lib/shift-policy';

const DAY_CHECKOUT_LABEL = '07:00 PM';
const DAY_CHECKOUT_MINUTES = 19 * 60; 
const LATE_START_MINUTES = 21 * 60 + 30; 
const FORCE_CLOSE_MINUTES = 24 * 60; 

const REMINDER_LEAD_MINUTES = 15;

function todayStrIST() {
	return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function nowMinutesIST() {
	const istTimeStr = new Date().toLocaleTimeString('en-US', {
		timeZone: 'Asia/Kolkata',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
	const [h, m] = istTimeStr.split(':').map(Number);
	return h * 60 + m;
}

function parseTimeLabelToMinutes(label: string | null | undefined): number | null {
	if (!label) return null;
	const m = String(label)
		.trim()
		.toUpperCase()
		.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
	if (!m) return null;
	let h = Number(m[1]);
	const min = Number(m[2]);
	const ap = m[3];
	if (ap === 'PM' && h !== 12) h += 12;
	if (ap === 'AM' && h === 12) h = 0;
	return h * 60 + min;
}

function formatMinsLabel(mins: number) {
	const clamped = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
	let h = Math.floor(clamped / 60);
	const m = clamped % 60;
	const ap = h >= 12 ? 'PM' : 'AM';
	h = h % 12;
	if (h === 0) h = 12;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
}







export function checkoutDecisionForLog(
	log: { checkIn?: string | null; date: string; employeeId?: string },
	todayStr: string,
	nowMins: number,
): { shouldClose: boolean; label: string; reason: string } | null {
	const checkInMins = parseTimeLabelToMinutes(log.checkIn);
	const eveningCheckIn = checkInMins != null && checkInMins >= DAY_CHECKOUT_MINUTES;

	
	if (log.date < todayStr) {
		return { shouldClose: true, label: '12:00 AM', reason: 'force_midnight_prev' };
	}

	if (log.date !== todayStr) return null;

	
	if (nowMins >= LATE_START_MINUTES) {
		const hourBucket = Math.floor(nowMins / 60) * 60 + 30; 
		const labelMins = Math.max(LATE_START_MINUTES, Math.min(hourBucket, 23 * 60 + 30));
		return {
			shouldClose: true,
			label: formatMinsLabel(labelMins),
			reason: 'late_hourly',
		};
	}

	
	if (!eveningCheckIn && nowMins >= DAY_CHECKOUT_MINUTES) {
		return { shouldClose: true, label: DAY_CHECKOUT_LABEL, reason: 'day_700' };
	}

	return null;
}

export function checkoutPolicyForLog(log: { shiftCheckIn?: string | null; shiftCheckOut?: string | null }) {
	return getShiftPolicy(log);
}




export async function processAttendanceCheckoutJobs(opts?: { notify?: boolean }) {
	const notify = opts?.notify !== false;
	const todayStr = todayStrIST();
	const nowMins = nowMinutesIST();
	const result = {
		reminded: 0,
		autoCheckedOut: 0,
		skipped: 0,
		nowMins,
		todayStr,
	};

	const activeLogs = await db.attendance.findMany({
		where: {
			OR: [{ checkOut: null }, { checkOut: '' }, { status: 'Checked In' }],
		},
		take: 800,
	});

	for (const log of activeLogs) {
		if (!isOpenSession(log)) {
			result.skipped++;
			continue;
		}

		const decision = checkoutDecisionForLog(log, todayStr, nowMins);
		if (decision?.shouldClose) {
			const row = await db.attendance.update({
				where: { id: log.id },
				data: {
					checkOut: decision.label,
					status: 'Present',
					checkoutReminderSent: true,
				},
			});
			result.autoCheckedOut++;
			void emitAttendanceUpdate(log.employeeId, row, 'auto-check-out');
			if (notify) {
				void notifyPush({
					title: 'Auto checked out',
					body: `You were checked out at ${decision.label} (${log.date}).`,
					employeeId: log.employeeId,
					data: {
						type: 'attendance',
						action: 'auto_checkout',
						date: log.date,
						checkOut: decision.label,
						reason: decision.reason,
					},
				}).catch((e) => console.error('[attendance] auto-checkout push', e));
			}
			continue;
		}

		
		const checkInMins = parseTimeLabelToMinutes(log.checkIn);
		const eveningCheckIn = checkInMins != null && checkInMins >= DAY_CHECKOUT_MINUTES;
		const remindAt = DAY_CHECKOUT_MINUTES - REMINDER_LEAD_MINUTES;
		const inReminderWindow =
			log.date === todayStr &&
			!eveningCheckIn &&
			nowMins >= remindAt &&
			nowMins < DAY_CHECKOUT_MINUTES;

		if (!inReminderWindow) continue;
		if (log.checkoutReminderSent) continue;

		await db.attendance.update({
			where: { id: log.id },
			data: { checkoutReminderSent: true },
		});
		result.reminded++;
		if (notify) {
			void notifyPush({
				title: 'Checkout reminder',
				body: `Still checked in — checkout by ${DAY_CHECKOUT_LABEL} (in ~${REMINDER_LEAD_MINUTES} min).`,
				employeeId: log.employeeId,
				data: {
					type: 'attendance',
					action: 'checkout_reminder',
					date: log.date,
					checkOutDue: DAY_CHECKOUT_LABEL,
				},
			}).catch((e) => console.error('[attendance] reminder push', e));
		}
	}

	return result;
}
