'use client';

type Handler = (payload: Record<string, unknown>) => void;





export function connectRealtime(opts: {
	token: string;
	onAttendance?: Handler;
	onSafety?: Handler;
	onMessage?: Handler;
	backendUrl?: string;
}): () => void {
	const base = (opts.backendUrl || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://wrkspace-api.onrender.com').replace(
		/\/$/,
		'',
	);
	let socket: any = null;
	let stopped = false;

	(async () => {
		try {
			const { io } = await import('socket.io-client');
			if (stopped) return;
			socket = io(base, {
				path: '/socket.io',
				transports: ['polling', 'websocket'],
				upgrade: true,
				auth: { token: opts.token },
				query: { token: opts.token },
				reconnection: true,
				reconnectionAttempts: Infinity,
				reconnectionDelay: 1000,
				reconnectionDelayMax: 8000,
				timeout: 20000,
			});
			socket.on('connect', () => console.info('[realtime] connected', socket.id));
			socket.on('connect_error', (err: Error) => console.warn('[realtime] connect_error', err?.message || err));
			socket.on('attendance:update', (p: Record<string, unknown>) => opts.onAttendance?.(p));
			socket.on('late_permission', (p: Record<string, unknown>) =>
				opts.onAttendance?.({ ...p, action: p.action || 'late-permission' }),
			);
			socket.on('shift:reminder', (p: Record<string, unknown>) =>
				opts.onAttendance?.({ ...p, action: p.action || 'checkin_reminder' }),
			);
			socket.on('payout:update', (p: Record<string, unknown>) =>
				opts.onAttendance?.({ ...p, action: p.action || 'payout-update' }),
			);
			socket.on('safety:update', (p: Record<string, unknown>) => opts.onSafety?.(p));
			socket.on('message:update', (p: Record<string, unknown>) => opts.onMessage?.(p));
		} catch (e) {
			console.warn('[realtime] connect failed', e);
		}
	})();

	return () => {
		stopped = true;
		try {
			socket?.disconnect();
		} catch (_) {}
		socket = null;
	};
}
