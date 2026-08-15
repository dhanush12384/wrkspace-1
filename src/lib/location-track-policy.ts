import { nowMinutesIST, parseTimeLabelToMinutes, OPEN_CHECKOUT_MINUTES } from '@/lib/shift-policy';
export const PRE_CHECKIN_TRACK_LEAD_MIN = 15;
export function shouldTrackLocationNow(opts: {
    onShift: boolean;
    shiftCheckIn?: string | null;
    shiftCheckOut?: string | null;
    hasOpenHomeTrip?: boolean;
    adminOverride?: boolean;
    nowMins?: number;
}): boolean {
    if (opts.adminOverride)
        return true;
    if (opts.hasOpenHomeTrip)
        return true;
    if (opts.onShift)
        return true;
    const checkIn = parseTimeLabelToMinutes(opts.shiftCheckIn);
    if (checkIn == null)
        return false;
    const checkOut = parseTimeLabelToMinutes(opts.shiftCheckOut) ?? OPEN_CHECKOUT_MINUTES;
    const now = opts.nowMins ?? nowMinutesIST();
    const start = checkIn - PRE_CHECKIN_TRACK_LEAD_MIN;
    return now >= start && now <= checkOut;
}
