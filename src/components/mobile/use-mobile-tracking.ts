'use client';

import { useEffect, useRef } from 'react';
import { apiGet, apiPost, getPosition, isFemaleEmployee } from '@/lib/mobile-api';
import { shouldTrackLocationNow } from '@/lib/location-track-policy';

const OFFICE_WATCH_MS = 60_000;
const HOME_WATCH_MS = 25_000;

const EXIT_GEOFENCE_M = 500;
const MAX_ACCURACY_M = 55;

const OUTSIDE_CONFIRM_TICKS = 4;

const EXIT_HYSTERESIS_M = 120;

export const OFFICE_EXIT_KEY = 'wrkspace_office_exit_pending';
export const OFFICE_WORK_ACK_KEY = 'wrkspace_office_work_ack';

export function markOfficeExitPending() {
	try {
		sessionStorage.setItem(
			OFFICE_EXIT_KEY,
			JSON.stringify({ at: Date.now(), status: 'pending' }),
		);
	} catch {
		
	}
}

export function clearOfficeExitPending() {
	try {
		sessionStorage.removeItem(OFFICE_EXIT_KEY);
	} catch {
		
	}
}

export function markOfficeWorkAck(dateKey: string) {
	try {
		sessionStorage.setItem(OFFICE_WORK_ACK_KEY, dateKey);
	} catch {
		
	}
}

export function clearOfficeWorkAck() {
	try {
		sessionStorage.removeItem(OFFICE_WORK_ACK_KEY);
	} catch {
		
	}
}

export function hasOfficeWorkAck(dateKey: string): boolean {
	try {
		return sessionStorage.getItem(OFFICE_WORK_ACK_KEY) === dateKey;
	} catch {
		return false;
	}
}

export function readOfficeExitPending(): { at: number } | null {
	try {
		const raw = sessionStorage.getItem(OFFICE_EXIT_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { at?: number; status?: string };
		if (!parsed?.at || parsed.status === 'done') return null;
		return { at: Number(parsed.at) };
	} catch {
		return null;
	}
}

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
	return Number.isFinite(g) && g > 0 ? Math.max(g, EXIT_GEOFENCE_M) : EXIT_GEOFENCE_M;
}

type Opts = {
	employee: any;
	enabled: boolean;
	onLeaveOffice?: () => void;
	onBackInsideOffice?: () => void;
	/** Fired once when employee is at office while checked out (scan QR reminder). */
	onArriveOffice?: () => void;
	onLocationError?: () => void;
};

export function useMobileTracking({
	employee,
	enabled,
	onLeaveOffice,
	onBackInsideOffice,
	onArriveOffice,
	onLocationError,
}: Opts) {
	const leavePrompted = useRef(false);
	const enterPrompted = useRef(false);
	const wasInsideExit = useRef(false);
	const outsideStreak = useRef(0);
	const officesRef = useRef<{ lat: number; lng: number; geofenceM?: number; radiusMeters?: number }[]>([]);
	const errorNotified = useRef(false);
	const lastOfficesFetch = useRef(0);

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

		const loadOffices = async (force = false) => {
			const now = Date.now();
			if (!force && now - lastOfficesFetch.current < 5 * 60_000 && officesRef.current.length) {
				return;
			}
			try {
				const data = await apiGet<{ offices?: any[] }>('/api/attendance/offices');
				officesRef.current = (data.offices || [])
					.map((o) => ({
						lat: Number(o.lat),
						lng: Number(o.lng),
						geofenceM: Number(o.geofenceM),
						radiusMeters: Number(o.radiusMeters),
					}))
					.filter(
						(o) =>
							Number.isFinite(o.lat) &&
							Number.isFinite(o.lng) &&
							!(o.lat === 0 && o.lng === 0),
					);
				lastOfficesFetch.current = now;
			} catch {
				
			}
		};

		const dismissLeave = () => {
			clearOfficeExitPending();
			if (leavePrompted.current) {
				leavePrompted.current = false;
				onBackInsideOffice?.();
			}
		};

		const fireLeavePrompt = async (dateKey: string, lat: number, lng: number) => {
			if (hasOfficeWorkAck(dateKey)) return;
			if (leavePrompted.current) return;

			
			const res = await apiPost<{ ok?: boolean; skipped?: string }>('/api/attendance/left-office', {
				lat,
				lng,
			}).catch(() => null);

			if (!res || res.ok === false || res.skipped) {
				outsideStreak.current = 0;
				dismissLeave();
				return;
			}

			leavePrompted.current = true;
			wasInsideExit.current = false;
			markOfficeExitPending();
			onLeaveOffice?.();
		};

		const tickOffice = async () => {
			if (!alive) return;
			try {
				await loadOffices();
				const today = await apiGet<any>('/api/attendance/today');
				const att = today.attendance || today;
				const dateKey = String(att?.date || today?.date || '');
				const onShift = Boolean(
					att?.checkIn && (!att?.checkOut || String(att.checkOut).trim() === ''),
				);

				// GPS: pre-check-in window OR full track while on shift (home trip uses tickHome).
				const wantGps = shouldTrackLocationNow({
					onShift,
					shiftCheckIn: employee?.shiftCheckIn,
					shiftCheckOut: employee?.shiftCheckOut,
					hasOpenHomeTrip: false,
				});
				if (!wantGps) {
					leavePrompted.current = false;
					outsideStreak.current = 0;
					return;
				}

				const pos = await getPosition(15000);
				errorNotified.current = false;
				const { latitude: lat, longitude: lng, accuracy } = pos.coords;
				await apiPost('/api/attendance/location', { lat, lng }).catch(() => {});

				
				if (typeof accuracy === 'number' && accuracy > MAX_ACCURACY_M) {
					outsideStreak.current = 0;
					return;
				}

				const offices = officesRef.current;
				if (!offices.length) return;

				const nearest = offices
					.map((o) => ({
						...o,
						d: distM(lat, lng, o.lat, o.lng),
						r: exitRadiusM(o),
						checkInR:
							Number.isFinite(o.radiusMeters) && (o.radiusMeters as number) > 0
								? Math.max(o.radiusMeters as number, 150)
								: 300,
					}))
					.sort((a, b) => a.d - b.d)[0];

				if (!nearest) return;

				const insideCheckIn = nearest.d <= nearest.checkInR;
				const insideExit = nearest.d <= nearest.r + 80;

				// Checked out + at office → remind to scan QR (parity with Flutter)
				if (!onShift) {
					leavePrompted.current = false;
					outsideStreak.current = 0;
					clearOfficeExitPending();
					if (insideCheckIn) {
						if (!enterPrompted.current) {
							enterPrompted.current = true;
							onArriveOffice?.();
						}
						wasInsideExit.current = true;
						return;
					}
					if (wasInsideExit.current && !insideExit) {
						enterPrompted.current = false;
					}
					wasInsideExit.current = insideExit;
					return;
				}

				enterPrompted.current = false;

				// Coarse indoor / Wi‑Fi fixes — never count as leaving.
				if (typeof accuracy === 'number' && accuracy > MAX_ACCURACY_M) {
					outsideStreak.current = 0;
					return;
				}

				const acc = typeof accuracy === 'number' && accuracy > 0 ? accuracy : 40;
				const outside = nearest.d > nearest.r + Math.min(acc, 80) + EXIT_HYSTERESIS_M;

				if (!outside) {
					wasInsideExit.current = true;
					outsideStreak.current = 0;
					
					dismissLeave();
					return;
				}

				outsideStreak.current += 1;
				const confirmed =
					wasInsideExit.current && outsideStreak.current >= OUTSIDE_CONFIRM_TICKS;

				if (confirmed && !leavePrompted.current) {
					await fireLeavePrompt(dateKey, lat, lng);
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

		
		clearOfficeExitPending();
		leavePrompted.current = false;
		enterPrompted.current = false;

		void loadOffices(true).then(() => {
			void tickOffice();
			void tickHome();
		});
		// Schedule poll: only runs GPS when pre-check-in window / policy allows.
		officeTimer = window.setInterval(() => void tickOffice(), OFFICE_WATCH_MS);
		homeTimer = window.setInterval(() => void tickHome(), HOME_WATCH_MS);

		return () => {
			alive = false;
			if (officeTimer) window.clearInterval(officeTimer);
			if (homeTimer) window.clearInterval(homeTimer);
		};
	}, [employee, enabled, onLeaveOffice, onBackInsideOffice, onArriveOffice, onLocationError]);

	useEffect(() => {
		if (!employee?.id) return;

		let alive = true;
		let shouldTrack = false;
		let statusTimer: number | undefined;
		let watchId: number | undefined;
		let lastPostedAt = 0;

		const stopWatch = () => {
			if (watchId != null && navigator.geolocation?.clearWatch) {
				navigator.geolocation.clearWatch(watchId);
				watchId = undefined;
			}
		};

		const postFix = async (lat: number, lng: number) => {
			if (!alive || !shouldTrack) return;
			const now = Date.now();
			if (now - lastPostedAt < 8_000) return;
			lastPostedAt = now;
			try {
				await apiPost('/api/attendance/location', { lat, lng });
			} catch {
				
			}
		};

		const startWatch = () => {
			if (!alive || !shouldTrack || !navigator.geolocation) return;
			if (watchId != null) return;
			watchId = navigator.geolocation.watchPosition(
				(pos) => {
					errorNotified.current = false;
					void postFix(pos.coords.latitude, pos.coords.longitude);
				},
				() => {},
				{ enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
			);
		};

		const refreshFlag = async () => {
			if (!alive) return;
			try {
				const st = await apiGet<{ shouldTrack?: boolean }>('/api/attendance/live-track-status');
				const next = Boolean(st.shouldTrack);
				if (next && !shouldTrack) {
					shouldTrack = true;
					startWatch();
					try {
						const pos = await getPosition(12000);
						lastPostedAt = 0;
						await postFix(pos.coords.latitude, pos.coords.longitude);
					} catch {
						
					}
				} else if (!next && shouldTrack) {
					shouldTrack = false;
					stopWatch();
				} else if (next) {
					shouldTrack = true;
					startWatch();
				}
			} catch {
				
			}
		};

		void refreshFlag();
		statusTimer = window.setInterval(() => void refreshFlag(), 10_000);

		return () => {
			alive = false;
			if (statusTimer) window.clearInterval(statusTimer);
			stopWatch();
		};
	}, [employee?.id]);
}
