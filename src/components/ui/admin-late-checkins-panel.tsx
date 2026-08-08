'use client';

import { useCallback, useEffect, useState } from 'react';
import { connectRealtime } from '@/lib/realtime-client';
import { ensureAdminToken } from '@/lib/admin-client-auth';

type Req = {
	id: string;
	employeeId: string;
	employeeName?: string;
	date: string;
	reason?: string | null;
	status: string;
	createdAt: string;
	employee?: { shiftCheckIn?: string | null; shiftCheckOut?: string | null };
};

export function AdminLateCheckinsPanel() {
	const [rows, setRows] = useState<Req[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');

	const [token, setToken] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const t = await ensureAdminToken();
			setToken(t);
			const q = filter === 'PENDING' ? '?status=PENDING' : '';
			const res = await fetch(`/api/admin/late-permissions${q}`, {
				headers: { Authorization: `Bearer ${t}` },
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Load failed');
			setRows(data.requests || []);
		} catch {
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, [filter]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		if (!token) return;
		const stop = connectRealtime({
			token,
			onAttendance: (p) => {
				if (p.action === 'late-permission') void load();
			},
		});
		return () => stop();
	}, [token, load]);

	const act = async (id: string, action: 'approve' | 'deny') => {
		setBusyId(id);
		try {
			const t = await ensureAdminToken();
			await fetch('/api/admin/late-permissions', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${t}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ id, action }),
			});
			await load();
		} finally {
			setBusyId(null);
		}
	};

	return (
		<div className="space-y-4 p-4 md:p-6">
			<div className="flex items-end justify-between gap-4 flex-wrap">
				<div>
					<h2 className="text-lg font-semibold text-white">Late check-ins</h2>
					<p className="text-xs text-zinc-400 mt-1">
						Approve so the employee can check in after their personal window.
					</p>
				</div>
				<select
					value={filter}
					onChange={(e) => setFilter(e.target.value as 'PENDING' | 'ALL')}
					className="bg-zinc-950 border border-zinc-700 text-white text-xs px-2 py-1.5"
				>
					<option value="PENDING">Pending</option>
					<option value="ALL">All</option>
				</select>
			</div>
			{loading ? (
				<p className="text-zinc-500 text-sm">Loading…</p>
			) : rows.length === 0 ? (
				<p className="text-zinc-500 text-sm italic">No requests.</p>
			) : (
				<div className="space-y-2">
					{rows.map((r) => (
						<div
							key={r.id}
							className="border border-zinc-800 bg-zinc-900/40 p-4 flex flex-wrap items-center justify-between gap-3"
						>
							<div>
								<p className="text-white text-sm font-semibold">{r.employeeName || r.employeeId}</p>
								<p className="text-zinc-500 text-xs font-mono">
									{r.date} · window {r.employee?.shiftCheckIn || '—'} → {r.employee?.shiftCheckOut || '—'} ·{' '}
									{r.status}
								</p>
								{r.reason && <p className="text-zinc-400 text-xs mt-1">{r.reason}</p>}
							</div>
							{r.status === 'PENDING' && (
								<div className="flex gap-2">
									<button
										type="button"
										disabled={busyId === r.id}
										onClick={() => void act(r.id, 'approve')}
										className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 disabled:opacity-50"
									>
										Approve
									</button>
									<button
										type="button"
										disabled={busyId === r.id}
										onClick={() => void act(r.id, 'deny')}
										className="bg-rose-800 hover:bg-rose-700 text-white text-xs px-3 py-1.5 disabled:opacity-50"
									>
										Deny
									</button>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
