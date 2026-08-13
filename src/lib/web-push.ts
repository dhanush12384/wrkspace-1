'use client';

import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { employeeToken } from '@/lib/mobile-api';
import { getFirebasePublicConfig } from '@/lib/firebase-public-config';

let officeExitUnsub: (() => void) | null = null;


export async function subscribeOfficeExitPush(onOfficeExit: () => void) {
	if (typeof window === 'undefined') return;
	try {
		const config = getFirebasePublicConfig();
		if (!config) return;
		const ok = await isSupported();
		if (!ok) return;
		const app = getApps().length ? getApp() : initializeApp(config);
		const messaging = getMessaging(app);
		officeExitUnsub?.();
		officeExitUnsub = onMessage(messaging, (payload) => {
			const type = String(payload.data?.type || '');
			if (type === 'office_exit') onOfficeExit();
		});
	} catch {
		
	}
}





export async function registerWebPush(_employeeId?: string) {
	if (typeof window === 'undefined') return;
	try {
		const config = getFirebasePublicConfig();
		if (!config) {
			console.warn('[web-push] Firebase public config missing');
			return { ok: false, reason: 'firebase_config' };
		}

		const ok = await isSupported();
		if (!ok) {
			console.info('[web-push] Messaging not supported in this browser');
			return { ok: false, reason: 'unsupported' };
		}

		if (isIosSafari() && !isStandalonePwa()) {
			console.info(
				'[web-push] iOS Safari tab cannot receive push — install Add to Home Screen (PWA) first',
			);
			return { ok: false, reason: 'ios_not_standalone' };
		}

		
		if ('serviceWorker' in navigator) {
			const regs = await navigator.serviceWorker.getRegistrations();
			await Promise.all(
				regs.map(async (reg) => {
					const script = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
					const isPlaceholder =
						script.includes('/firebase-messaging-sw.js') &&
						!script.includes('/api/firebase-messaging-sw');
					const isRootMessaging =
						reg.scope === `${window.location.origin}/` && script.includes('firebase-messaging');
					if (isPlaceholder || isRootMessaging) {
						try {
							await reg.unregister();
						} catch {
							
						}
					}
				}),
			);
		}

		let permission = Notification.permission;
		if (permission === 'default') {
			permission = await Notification.requestPermission();
		}
		if (permission !== 'granted') {
			console.info('[web-push] notification permission:', permission);
			return { ok: false, reason: 'permission_denied' };
		}

		const vapid = (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '').trim();
		if (!vapid) {
			console.warn(
				'[web-push] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — getToken will likely fail',
			);
			return { ok: false, reason: 'vapid_missing' };
		}

		
		const registration = await navigator.serviceWorker.register('/api/firebase-messaging-sw', {
			scope: '/api/firebase-messaging-sw/',
			updateViaCache: 'none',
		});
		await navigator.serviceWorker.ready;
		// iOS sometimes needs a beat after SW activate before getToken
		if (isIosSafari()) {
			await new Promise((r) => setTimeout(r, 400));
		}

		const app = getApps().length ? getApp() : initializeApp(config);
		const messaging = getMessaging(app);
		const token = await getToken(messaging, {
			vapidKey: vapid,
			serviceWorkerRegistration: registration,
		}).catch((e) => {
			console.warn('[web-push] getToken failed', e);
			return null;
		});
		if (!token) return { ok: false, reason: 'token_failed' };

		const auth = employeeToken();
		if (!auth) {
			console.warn('[web-push] no employee JWT — token not saved');
			return { ok: false, reason: 'no_auth' };
		}

		const res = await fetch('/api/devices/fcm-token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${auth}`,
			},
			body: JSON.stringify({
				token,
				platform: isIosSafari() ? 'ios-web' : 'web',
			}),
		});
		if (!res.ok) {
			console.warn('[web-push] save failed', res.status);
			return { ok: false, reason: 'save_failed' };
		}
		return { ok: true };
	} catch (e) {
		console.warn('[web-push] register failed', e);
		return { ok: false, reason: 'exception' };
	}
}
