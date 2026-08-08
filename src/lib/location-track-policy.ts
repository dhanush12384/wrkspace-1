import { nowMinutesIST, parseTimeLabelToMinutes, OPEN_CHECKOUT_MINUTES } from '@/lib/shift-policy';

/** Minutes before personal check-in when attendance GPS turns on (office-arrive push). */
export const PRE_CHECKIN_TRACK_LEAD_MIN = 15;

/**
 * Continuous GPS rules:
 * 1. Checked in (on shift) → track fully
 * 2. Open girl-safety home trip after checkout → track until home (girls only)
 * 3. Timed + not checked in → GPS ON from checkIn−15m through checkOut
 *    so we can detect office arrival and push “scan QR to check in”
 * 4. Untimed + not on shift + no home trip → off
 * Boys after checkout with no home trip → off
 */
export function shouldTrackLocationNow(opts: {
	onShift: boolean;
	shiftCheckIn?: string | null;
	shiftCheckOut?: string | null;
	hasOpenHomeTrip?: boolean;
	adminOverride?: boolean;
	nowMins?: number;
}): boolean {
	if (opts.adminOverride) return true;
	if (opts.hasOpenHomeTrip) return true;
	if (opts.onShift) return true;

	const checkIn = parseTimeLabelToMinutes(opts.shiftCheckIn);
	if (checkIn == null) return false;

	const checkOut =
		parseTimeLabelToMinutes(opts.shiftCheckOut) ?? OPEN_CHECKOUT_MINUTES;
	const now = opts.nowMins ?? nowMinutesIST();
	const start = checkIn - PRE_CHECKIN_TRACK_LEAD_MIN;
	// Keep GPS on through the arrival window so office-arrive FCM can fire
	return now >= start && now <= checkOut;
}
