/** Per-employee shift windows (IST). Untimed → open check-in, out at 07:30 PM. */

export const OPEN_CHECKOUT_LABEL = '07:30 PM';
export const OPEN_CHECKOUT_MINUTES = 19 * 60 + 30;
export const MIDNIGHT_LABEL = '12:00 AM';

export const LATE_PERMISSION_APPROVER_IDS = ['8H1F00', '77CMT0'];

export function todayKeyIST(d = new Date()) {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Kolkata',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(d);
}

export function nowMinutesIST(d = new Date()) {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Kolkata',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	})
		.formatToParts(d)
		.reduce(
			(acc, p) => {
				if (p.type === 'hour' || p.type === 'minute') acc[p.type] = Number(p.value);
				return acc;
			},
			{} as Record<string, number>,
		);
	const hour = Number(parts.hour);
	const minute = Number(parts.minute);
	if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
	return hour * 60 + minute;
}

export function nowTimeLabelIST(d = new Date()) {
	return new Intl.DateTimeFormat('en-US', {
		timeZone: 'Asia/Kolkata',
		hour: '2-digit',
		minute: '2-digit',
		hour12: true,
	}).format(d);
}

export function parseTimeLabelToMinutes(label: string | null | undefined): number | null {
	if (!label) return null;
	const m = String(label)
		.trim()
		.toUpperCase()
		.replace(/\s+/g, ' ')
		.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
	if (!m) return null;
	let h = Number(m[1]);
	const min = Number(m[2]);
	const ap = m[3];
	if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
	if (ap === 'PM' && h !== 12) h += 12;
	if (ap === 'AM' && h === 12) h = 0;
	return h * 60 + min;
}

export function formatMinsLabel(mins: number) {
	const clamped = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
	let h = Math.floor(clamped / 60);
	const m = clamped % 60;
	const ap = h >= 12 ? 'PM' : 'AM';
	h = h % 12;
	if (h === 0) h = 12;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
}

export function normalizeTimeLabel(raw: unknown): string | null {
	if (raw == null) return null;
	const s = String(raw).trim();
	if (!s) return null;
	const mins = parseTimeLabelToMinutes(s);
	if (mins == null) return null;
	return formatMinsLabel(mins);
}

export type ShiftPolicy = {
	kind: 'timed' | 'open';
	checkInLabel: string | null;
	checkOutLabel: string;
	checkInMins: number | null;
	checkOutMins: number;
};

export function getShiftPolicy(employee: {
	shiftCheckIn?: string | null;
	shiftCheckOut?: string | null;
}): ShiftPolicy {
	const checkInLabel = employee?.shiftCheckIn ? String(employee.shiftCheckIn).trim() : '';
	const checkOutLabel = employee?.shiftCheckOut ? String(employee.shiftCheckOut).trim() : '';
	const checkInMins = parseTimeLabelToMinutes(checkInLabel);
	const checkOutMins = parseTimeLabelToMinutes(checkOutLabel);

	if (checkInMins == null && checkOutMins == null) {
		return {
			kind: 'open',
			checkInLabel: null,
			checkOutLabel: OPEN_CHECKOUT_LABEL,
			checkInMins: null,
			checkOutMins: OPEN_CHECKOUT_MINUTES,
		};
	}

	return {
		kind: 'timed',
		checkInLabel: checkInMins != null ? formatMinsLabel(checkInMins) : checkInLabel || null,
		checkOutLabel: checkOutMins != null ? formatMinsLabel(checkOutMins) : OPEN_CHECKOUT_LABEL,
		checkInMins,
		checkOutMins: checkOutMins != null ? checkOutMins : OPEN_CHECKOUT_MINUTES,
	};
}

export function canCheckInNow(
	employee: { shiftCheckIn?: string | null; shiftCheckOut?: string | null },
	opts?: { approvedLateForToday?: boolean; nowMins?: number },
) {
	const nowMins = opts?.nowMins ?? nowMinutesIST();
	const approvedLateForToday = Boolean(opts?.approvedLateForToday);
	const policy = getShiftPolicy(employee);
	if (policy.kind === 'open') {
		return { ok: true as const, policy, reason: 'open' };
	}
	if (approvedLateForToday) {
		return { ok: true as const, policy, reason: 'late_permission' };
	}
	if (policy.checkInMins == null) {
		return { ok: true as const, policy, reason: 'no_checkin_deadline' };
	}
	if (nowMins <= policy.checkInMins) {
		return { ok: true as const, policy, reason: 'within_window' };
	}
	return {
		ok: false as const,
		policy,
		reason: 'CHECKIN_WINDOW_CLOSED' as const,
		checkInBy: policy.checkInLabel,
		canRequestPermission: true as const,
	};
}

export function checkoutDue(
	employee: { shiftCheckIn?: string | null; shiftCheckOut?: string | null },
	row: { date: string; checkOut?: string | null; status?: string | null } | null,
	opts?: { nowMins?: number; today?: string },
) {
	if (!row) return null;
	const nowMins = opts?.nowMins ?? nowMinutesIST();
	const today = opts?.today ?? todayKeyIST();
	const out = row.checkOut;
	const open = out == null || String(out).trim() === '' || String(row.status || '') === 'Checked In';
	if (!open) return null;

	if (row.date < today) {
		return { due: true as const, label: MIDNIGHT_LABEL, reason: 'force_midnight' };
	}
	if (row.date !== today) return null;

	const policy = getShiftPolicy(employee);
	if (nowMins >= policy.checkOutMins) {
		return {
			due: true as const,
			label: policy.checkOutLabel,
			reason: policy.kind === 'open' ? 'open_730' : 'shift_checkout',
		};
	}
	return null;
}

export const CHECKIN_REMINDER_OFFSETS = [
	{ kind: 'checkin_15', lead: 15 },
	{ kind: 'checkin_5', lead: 5 },
	{ kind: 'checkin_1', lead: 1 },
] as const;
