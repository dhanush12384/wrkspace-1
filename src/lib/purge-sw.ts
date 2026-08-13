'use client';

const PURGE_FLAG = 'wrkspace_sw_purged_v4';






export async function purgeBrokenServiceWorkers() {
	if (typeof window === 'undefined') return;
	try {
		if (localStorage.getItem(PURGE_FLAG) === '1') return;
	} catch {
		
	}

	try {
		if ('serviceWorker' in navigator) {
			const regs = await navigator.serviceWorker.getRegistrations();
			await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
		}
		
		if (window.caches?.keys) {
			const keys = await caches.keys();
			await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
		}
		try {
			localStorage.setItem(PURGE_FLAG, '1');
		} catch {
			
		}
	} catch {
		
	}
}
