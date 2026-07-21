'use client';

import { useEffect, useRef } from 'react';
import { apiGet, apiPost, getPosition, isFemaleEmployee } from '@/lib/mobile-api';

const OFFICE_WATCH_MS = 45_000;
const HOME_WATCH_MS = 25_000;
/** Leave-office exit fence — never use check-in radiusMeters (75) for this. */
const EXIT_GEOFENCE_M = 300;
/** Ignore GPS samples worse than this (meters). */
const MAX_ACCURACY_M = 80;
/** Need this many consecutive "outside" ticks before prompting. */
const OUTSIDE_CONFIRM_TICKS = 2;

function distM(aLat: number, aLng: number, bLat: number, bLng: number) {
	const R = 6371000;
	const toR = (d: number) => (d * Math.PI) / 180;
	const dLat = toR(bLat - aLat);
	const dLng = toR(bLng - aLng);
	const x =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(x));
}

function exitRadiusM(o: { geofenceM?: number }) {
	const g = Number(o.geofenceM);
	// Only trust a positive geofenceM — never fall back to check-in radius (75m).
	return Number.isFinite(g) && g > 0 ? g : EXIT_GEOFENCE_M;
}

type Opts = {
	employee: any;
	enabled: boolean;
	onLeaveOffice?: () => void;
	onLocationError?: () => void;
};

/**
 * Foreground tracking while the mobile web app is open (PWA / Safari).
 * Leave-office prompt only after leaving the ~300m exit fence with good GPS.
 */
export function useMobileTracking({ employee, enabled, onLeaveOffice, onLocationError }: Opts) {
	const leavePrompted = useRef(false);
	const wasInsideExit = useRef(false);
	const outsideStreak = useRef(0);
	const officesRef = useRef<{ lat: number; lng: number; geofenceM?: number }[]>([]);
	const errorNotified = useRef(false);

	useEffect(() => {
		if (!enabled || !employee?.id) return;

		let alive = true;
		let officeTimer: number | undefined;
		let homeTimer: number | undefined;

		const failLoc = () => {
			if (!errorNotified.current) {
				errorNotified.current = true;
				onLocationError?.();
			}
		};

		const loadOffices = async () => {
			try {
				const data = await apiGet<{ offices?: any[] }>('/api/attendance/offices');
				officesRef.current = (data.offices || [])
					.map((o) => ({
						lat: Number(o.lat),
						lng: Number(o.lng),
						geofenceM: Number(o.geofenceM),
					}))
					.filter(
						(o) =>
							Number.isFinite(o.lat) &&
							Number.isFinite(o.lng) &&
							!(o.lat === 0 && o.lng === 0),
					);
			} catch {
				/* ignore */
			}
		};

		const tickOffice = async () => {
			if (!alive) return;
			try {
				const today = await apiGet<any>('/api/attendance/today');
				const att = today.attendance || today;
				const onShift =
					att?.checkIn && (!att?.checkOut || String(att.checkOut).trim() === '');
				if (!onShift) {
					leavePrompted.current = false;
					wasInsideExit.current = false;
					outsideStreak.current = 0;
					return;
				}

				const pos = await getPosition(15000);
				errorNotified.current = false;
				const { latitude: lat, longitude: lng, accuracy } = pos.coords;
				await apiPost('/api/attendance/location', { lat, lng }).catch(() => {});

				// Bad / coarse GPS — do not treat as left office (common indoors).
				if (typeof accuracy === 'number' && accuracy > MAX_ACCURACY_M) {
					return;
				}

				const offices = officesRef.current;
				if (!offices.length) return;

				const nearest = offices
					.map((o) => ({
						...o,
						d: distM(lat, lng, o.lat, o.lng),
						r: exitRadiusM(o),
					}))
					.sort((a, b) => a.d - b.d)[0];

				if (!nearest) return;

				// Buffer: accuracy circle must be fully outside fence before we count "outside".
				const acc = typeof accuracy === 'number' && accuracy > 0 ? accuracy : 25;
				const outside = nearest.d > nearest.r + Math.min(acc, 60);

				if (!outside) {
					wasInsideExit.current = true;
					outsideStreak.current = 0;
					leavePrompted.current = false;
					return;
				}

				// Must have been inside the fence at least once this shift (or confirm twice).
				outsideStreak.current += 1;
				const confirmed =
					outsideStreak.current >= OUTSIDE_CONFIRM_TICKS &&
					(wasInsideExit.current || nearest.d > nearest.r + 100);

				if (confirmed && !leavePrompted.current) {
					leavePrompted.current = true;
					wasInsideExit.current = false;
					await apiPost('/api/attendance/left-office', {}).catch(() => {});
					onLeaveOffice?.();
				}
			} catch {
				failLoc();
			}
		};

		const tickHome = async () => {
			if (!alive || !isFemaleEmployee(employee)) return;
			try {
				const trips = await apiGet<{ trips?: any[]; trip?: any }>('/api/safety/trips/home');
				const open =
					trips.trip ||
					(trips.trips || []).find((t: any) => t.status === 'IN_TRANSIT');
				if (!open?.id) return;
				const pos = await getPosition(12000);
				errorNotified.current = false;
				await apiPost(`/api/safety/trips/${open.id}/location`, {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
				});
			} catch {
				failLoc();
			}
		};

		void loadOffices().then(() => {
			void tickOffice();
			void tickHome();
		});
		officeTimer = window.setInterval(() => void tickOffice(), OFFICE_WATCH_MS);
		homeTimer = window.setInterval(() => void tickHome(), HOME_WATCH_MS);

		return () => {
			alive = false;
			if (officeTimer) window.clearInterval(officeTimer);
			if (homeTimer) window.clearInterval(homeTimer);
		};
	}, [employee, enabled, onLeaveOffice, onLocationError]);
}
