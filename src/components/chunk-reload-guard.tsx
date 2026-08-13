'use client';

import { useEffect } from 'react';

const FLAG = 'wrkspace_chunk_reload_v2';

function isChunkFailure(reason: unknown): boolean {
	const msg =
		reason instanceof Error
			? `${reason.name} ${reason.message}`
			: String(reason ?? '');
	return /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
		msg,
	);
}

function takeReloadSlot(): boolean {
	try {
		const n = Number(sessionStorage.getItem(FLAG) || '0');
		if (n >= 2) return false;
		sessionStorage.setItem(FLAG, String(n + 1));
		return true;
	} catch {
		return true;
	}
}





export function ChunkReloadGuard() {
	useEffect(() => {
		const onRejection = (ev: PromiseRejectionEvent) => {
			if (isChunkFailure(ev.reason) && takeReloadSlot()) {
				try {
					(window as any).StudentForgeMonitor?.trackCustomMetric?.('chunk_failure_reload', 1, {
						kind: 'unhandledrejection',
					});
				} catch {
					/* no-op */
				}
				ev.preventDefault();
				window.location.reload();
			}
		};
		const onError = (ev: ErrorEvent) => {
			if (isChunkFailure(ev.error ?? ev.message) && takeReloadSlot()) {
				try {
					(window as any).StudentForgeMonitor?.trackCustomMetric?.('chunk_failure_reload', 1, {
						kind: 'window_error',
					});
				} catch {
					/* no-op */
				}
				window.location.reload();
			}
		};
		window.addEventListener('unhandledrejection', onRejection);
		window.addEventListener('error', onError);
		const t = window.setTimeout(() => {
			try {
				sessionStorage.removeItem(FLAG);
			} catch {
				
			}
		}, 20_000);
		return () => {
			window.clearTimeout(t);
			window.removeEventListener('unhandledrejection', onRejection);
			window.removeEventListener('error', onError);
		};
	}, []);

	return null;
}
