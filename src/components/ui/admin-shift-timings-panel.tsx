'use client';

import { useCallback, useEffect, useState } from 'react';
import { ensureAdminToken } from '@/lib/admin-client-auth';

type Emp = {
	id: string;
	firstName: string;
	middleName?: string | null;
	lastName: string;
	email: string;
	role?: string;
	wingName?: string;
	shiftCheckIn?: string | null;
	shiftCheckOut?: string | null;
};

function nameOf(e: Emp) {
	return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
}

export function AdminShiftTimingsPanel() {
	const [rows, setRows] = useState<Emp[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [msg, setMsg] = useState<string | null>(null);
	const [draft, setDraft] = useState<Record<string, { in: string; out: string }>>({});

	const load = useCallback(async () => {
		setLoading(true);
		setMsg(null);
		try {
			const token = await ensureAdminToken();
			const res = await fetch('/api/admin/shift-timings', {
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || `Load failed (${res.status})`);
			const list: Emp[] = data.employees || [];
			setRows(list);
			const d: Record<string, { in: string; out: string }> = {};
			for (const e of list) {
				d[e.id] = { in: e.shiftCheckIn || '', out: e.shiftCheckOut || '' };
			}
			setDraft(d);
			if (!list.length) setMsg('No employees found in database');
		} catch (e: any) {
			setRows([]);
			setMsg(e?.message || 'Failed to load employees');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const save = async (id: string) => {
		setSavingId(id);
		setMsg(null);
		try {
			const token = await ensureAdminToken();
			const d = draft[id] || { in: '', out: '' };
			const res = await fetch('/api/admin/shift-timings', {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id,
					shiftCheckIn: d.in.trim() || null,
					shiftCheckOut: d.out.trim() || null,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Save failed');
			setMsg('Saved');
			await load();
		} catch (e: any) {
			setMsg(e.message || 'Save failed');
		} finally {
			setSavingId(null);
		}
	};

	return (
		<div className="space-y-4 p-4 md:p-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold text-white">Shift timings</h2>
					<p className="mt-1 text-xs text-zinc-400">
						Set check-in / check-out (e.g. 04:30 PM). Leave blank for open check-in + auto-out at
						07:30 PM.
					</p>
				</div>
				<button
					type="button"
					onClick={() => void load()}
					className="border border-zinc-600 px-3 py-1.5 text-[11px] uppercase text-zinc-300"
				>
					Refresh
				</button>
			</div>
			{msg ? <p className="font-mono text-xs text-indigo-300">{msg}</p> : null}
			{loading ? (
				<p className="text-sm text-zinc-500">Loading…</p>
			) : (
				<div className="overflow-x-auto border border-zinc-800">
					<table className="w-full text-left text-xs">
						<thead className="bg-zinc-900 uppercase tracking-wider text-zinc-400">
							<tr>
								<th className="p-3">Employee</th>
								<th className="p-3">Check-in</th>
								<th className="p-3">Check-out</th>
								<th className="p-3">Action</th>
							</tr>
						</thead>
						<tbody>
							{rows.length === 0 ? (
								<tr>
									<td colSpan={4} className="p-6 text-center text-zinc-500">
										No employees loaded. Click Refresh or sign in again.
									</td>
								</tr>
							) : (
								rows.map((e) => (
									<tr key={e.id} className="border-t border-zinc-800">
										<td className="p-3 text-white">
											<div className="font-medium">{nameOf(e)}</div>
											<div className="text-zinc-500">{e.email}</div>
										</td>
										<td className="p-3">
											<input
												value={draft[e.id]?.in ?? ''}
												onChange={(ev) =>
													setDraft((prev) => ({
														...prev,
														[e.id]: { in: ev.target.value, out: prev[e.id]?.out ?? '' },
													}))
												}
												placeholder="any time"
												className="w-36 border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white"
											/>
										</td>
										<td className="p-3">
											<input
												value={draft[e.id]?.out ?? ''}
												onChange={(ev) =>
													setDraft((prev) => ({
														...prev,
														[e.id]: { in: prev[e.id]?.in ?? '', out: ev.target.value },
													}))
												}
												placeholder="07:30 PM default"
												className="w-36 border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white"
											/>
										</td>
										<td className="p-3">
											<button
												type="button"
												disabled={savingId === e.id}
												onClick={() => void save(e.id)}
												className="bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-500 disabled:opacity-50"
											>
												{savingId === e.id ? 'Saving…' : 'Save'}
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
