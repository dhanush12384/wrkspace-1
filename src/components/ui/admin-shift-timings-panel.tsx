'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { ensureAdminToken } from '@/lib/admin-client-auth';
import { ClockIcon, SearchIcon, RefreshCwIcon, CheckIcon, AlertCircleIcon, UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface AdminShiftTimingsPanelProps {
	adminEmail?: string;
}

export function AdminShiftTimingsPanel({ adminEmail }: AdminShiftTimingsPanelProps) {
	const [rows, setRows] = useState<Emp[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const [draft, setDraft] = useState<Record<string, { in: string; out: string }>>({});
	const [searchQuery, setSearchQuery] = useState('');

	const load = useCallback(async (isSilent = false) => {
		if (!isSilent) setLoading(true);
		setMsg(null);
		try {
			const token = await ensureAdminToken(adminEmail);
			const res = await fetch('/api/admin/shift-timings', {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
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
		} catch (e: any) {
			setMsg({ type: 'error', text: e?.message || 'Failed to load employees' });
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
			const token = await ensureAdminToken(adminEmail);
			const d = draft[id] || { in: '', out: '' };
			const res = await fetch('/api/admin/shift-timings', {
				method: 'PATCH',
				headers: {
					Authorization: token ? `Bearer ${token}` : '',
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
			setMsg({ type: 'success', text: `Shift timings updated for ${rows.find(r => r.id === id)?.firstName || 'employee'}` });
			await load(true);
		} catch (e: any) {
			setMsg({ type: 'error', text: e.message || 'Save failed' });
		} finally {
			setSavingId(null);
		}
	};

	const applyPresetToAll = (inTime: string, outTime: string) => {
		const next: Record<string, { in: string; out: string }> = {};
		for (const r of rows) {
			next[r.id] = { in: inTime, out: outTime };
		}
		setDraft(next);
		setMsg({ type: 'success', text: `Preset (${inTime} - ${outTime}) applied to local drafts. Click "Save" on any row to persist.` });
	};

	const filteredRows = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return rows;
		return rows.filter(e => 
			nameOf(e).toLowerCase().includes(q) ||
			e.id.toLowerCase().includes(q) ||
			e.email.toLowerCase().includes(q) ||
			(e.wingName || '').toLowerCase().includes(q) ||
			(e.role || '').toLowerCase().includes(q)
		);
	}, [rows, searchQuery]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Shift & Hours Config</h2>
					<p className="text-xs text-slate-500 mt-0.5">
						Define corporate shift hours, grace period buffers, and custom check-in/out policies per employee
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => applyPresetToAll('09:30 AM', '06:30 PM')}
						className="text-xs px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer shadow-2xs transition-all"
					>
						Preset: 9:30 AM – 6:30 PM
					</button>
					<button
						type="button"
						onClick={() => void load()}
						className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all rounded-xl cursor-pointer shadow-2xs"
						title="Refresh Shift Timings"
					>
						<RefreshCwIcon className="size-4" />
					</button>
				</div>
			</div>

			{/* Status Banner */}
			{msg && (
				<div className={cn(
					"p-3.5 rounded-xl text-xs flex items-center gap-2 border shadow-2xs",
					msg.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
				)}>
					{msg.type === 'success' ? <CheckIcon className="size-4 text-emerald-600 shrink-0" /> : <AlertCircleIcon className="size-4 text-rose-600 shrink-0" />}
					<span>{msg.text}</span>
				</div>
			)}

			{/* Search Bar */}
			<div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
				<div className="relative flex-1 max-w-md">
					<SearchIcon className="absolute left-3 top-2.5 size-4 text-slate-400" />
					<input
						type="text"
						placeholder="Search employee by name, ID, wing, or email..."
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors"
					/>
				</div>
				<span className="text-xs text-slate-500 font-medium mr-2">
					{filteredRows.length} employee{filteredRows.length !== 1 ? 's' : ''}
				</span>
			</div>

			{/* Loading State */}
			{loading ? (
				<div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-2xs">
					<div className="size-10 border-3 border-[#E61E32]/20 border-t-[#E61E32] rounded-full animate-spin mx-auto mb-3" />
					<p className="text-sm font-medium text-slate-600">Loading shift configurations...</p>
					<p className="text-xs text-slate-400 mt-1">Fetching employee roster and timing policies</p>
				</div>
			) : filteredRows.length === 0 ? (
				<div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
					<div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
						<UsersIcon className="size-6" />
					</div>
					<h3 className="text-sm font-semibold text-slate-800">No Employees Found</h3>
					<p className="text-xs text-slate-500 mt-1">
						{searchQuery ? 'No employees match your search query.' : 'No employee records are available in the system.'}
					</p>
				</div>
			) : (
				<div className="overflow-x-auto bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-medium text-[11px] uppercase tracking-wider">
								<th className="py-3.5 px-4">Employee</th>
								<th className="py-3.5 px-4">Wing / Role</th>
								<th className="py-3.5 px-4">Shift Check-In</th>
								<th className="py-3.5 px-4">Shift Check-Out</th>
								<th className="py-3.5 px-4 text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-slate-700">
							{filteredRows.map((e) => (
								<tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
									<td className="py-3.5 px-4">
										<div className="font-medium text-slate-900">{nameOf(e)}</div>
										<div className="flex items-center gap-2 mt-0.5">
											<span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
												{e.id}
											</span>
											<span className="text-[11px] text-slate-400">{e.email}</span>
										</div>
									</td>
									<td className="py-3.5 px-4">
										<span className="inline-block text-[11px] font-medium text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-lg border border-slate-200/60">
											{e.wingName || 'General'} · {e.role || 'Member'}
										</span>
									</td>
									<td className="py-3.5 px-4">
										<div className="flex items-center gap-1.5 max-w-[160px]">
											<ClockIcon className="size-3.5 text-slate-400 shrink-0" />
											<input
												value={draft[e.id]?.in ?? ''}
												onChange={(ev) =>
													setDraft((prev) => ({
														...prev,
														[e.id]: { in: ev.target.value, out: prev[e.id]?.out ?? '' },
													}))
												}
												placeholder="Open (any time)"
												className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors"
											/>
										</div>
									</td>
									<td className="py-3.5 px-4">
										<div className="flex items-center gap-1.5 max-w-[160px]">
											<ClockIcon className="size-3.5 text-slate-400 shrink-0" />
											<input
												value={draft[e.id]?.out ?? ''}
												onChange={(ev) =>
													setDraft((prev) => ({
														...prev,
														[e.id]: { in: prev[e.id]?.in ?? '', out: ev.target.value },
													}))
												}
												placeholder="07:30 PM default"
												className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors"
											/>
										</div>
									</td>
									<td className="py-3.5 px-4 text-right whitespace-nowrap">
										<button
											type="button"
											disabled={savingId === e.id}
											onClick={() => void save(e.id)}
											className="inline-flex items-center gap-1.5 bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl cursor-pointer transition-all shadow-2xs"
										>
											{savingId === e.id ? 'Saving…' : 'Save'}
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
