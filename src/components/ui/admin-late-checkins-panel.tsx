'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { connectRealtime } from '@/lib/realtime-client';
import { ensureAdminToken } from '@/lib/admin-client-auth';
import { ClockIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon, AlertCircleIcon, CalendarIcon, UserCheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface AdminLateCheckinsPanelProps {
	adminEmail?: string;
}

export function AdminLateCheckinsPanel({ adminEmail }: AdminLateCheckinsPanelProps) {
	const [rows, setRows] = useState<Req[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
	const [token, setToken] = useState('');
	const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	const load = useCallback(async (isSilent = false) => {
		if (!isSilent) setLoading(true);
		try {
			const t = await ensureAdminToken(adminEmail);
			setToken(t);
			const q = filter === 'PENDING' ? '?status=PENDING' : '';
			const res = await fetch(`/api/admin/late-permissions${q}`, {
				headers: t ? { Authorization: `Bearer ${t}` } : {},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Load failed');
			setRows(data.requests || []);
		} catch (err: any) {
			setRows([]);
			setMsg({ type: 'error', text: err?.message || 'Failed to load late check-in requests' });
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
				if (p.action === 'late-permission') void load(true);
			},
		});
		return () => stop();
	}, [token, load]);

	const act = async (id: string, action: 'approve' | 'deny') => {
		setBusyId(id);
		setMsg(null);
		try {
			const t = await ensureAdminToken(adminEmail);
			const res = await fetch('/api/admin/late-permissions', {
				method: 'POST',
				headers: {
					Authorization: t ? `Bearer ${t}` : '',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ id, action }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Action failed');
			setMsg({ type: 'success', text: `Late check-in request ${action === 'approve' ? 'approved' : 'declined'} successfully` });
			await load(true);
		} catch (err: any) {
			setMsg({ type: 'error', text: err?.message || 'Action failed' });
		} finally {
			setBusyId(null);
		}
	};

	const pendingCount = rows.filter(r => r.status === 'PENDING').length;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Late Check-in Requests</h2>
					<p className="text-xs text-slate-500 mt-0.5">
						Audit employee excuse explanations, approve override permissions, or decline late check-in requests
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
						<button
							type="button"
							onClick={() => setFilter('PENDING')}
							className={cn(
								"text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer",
								filter === 'PENDING'
									? "bg-[#E61E32] text-white shadow-xs font-semibold"
									: "text-slate-600 hover:text-slate-900 hover:bg-white/80"
							)}
						>
							Pending ({filter === 'PENDING' ? rows.length : pendingCount})
						</button>
						<button
							type="button"
							onClick={() => setFilter('ALL')}
							className={cn(
								"text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer",
								filter === 'ALL'
									? "bg-[#E61E32] text-white shadow-xs font-semibold"
									: "text-slate-600 hover:text-slate-900 hover:bg-white/80"
							)}
						>
							All Requests
						</button>
					</div>
					<button
						type="button"
						onClick={() => void load()}
						className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all rounded-xl cursor-pointer shadow-2xs"
						title="Refresh Requests"
					>
						<RefreshCwIcon className="size-4" />
					</button>
				</div>
			</div>

			{/* Status Toast */}
			{msg && (
				<div className={cn(
					"p-3.5 rounded-xl text-xs flex items-center gap-2 border shadow-2xs",
					msg.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
				)}>
					{msg.type === 'success' ? <CheckCircleIcon className="size-4 text-emerald-600 shrink-0" /> : <AlertCircleIcon className="size-4 text-rose-600 shrink-0" />}
					<span>{msg.text}</span>
				</div>
			)}

			{/* Content */}
			{loading ? (
				<div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-2xs">
					<div className="size-10 border-3 border-[#E61E32]/20 border-t-[#E61E32] rounded-full animate-spin mx-auto mb-3" />
					<p className="text-sm font-medium text-slate-600">Loading late check-in requests...</p>
					<p className="text-xs text-slate-400 mt-1">Retrieving pending employee permissions</p>
				</div>
			) : rows.length === 0 ? (
				<div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
					<div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
						<UserCheckIcon className="size-6" />
					</div>
					<h3 className="text-sm font-semibold text-slate-800">No Requests Found</h3>
					<p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
						{filter === 'PENDING' ? 'There are currently no pending late check-in requests to review.' : 'No late check-in history found.'}
					</p>
				</div>
			) : (
				<div className="space-y-3.5">
					{rows.map((r) => {
						const isPending = r.status === 'PENDING';
						const isApproved = r.status === 'APPROVED';
						const isDenied = r.status === 'DENIED' || r.status === 'REJECTED';

						return (
							<div
								key={r.id}
								className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-3.5"
							>
								<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
									<div className="space-y-2 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="font-semibold text-slate-900 text-sm">{r.employeeName || r.employeeId}</span>
											<span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
												{r.employeeId}
											</span>
										</div>

										<div className="flex items-center flex-wrap gap-2 text-xs text-slate-500">
											<span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 text-[11px]">
												<CalendarIcon className="size-3 text-slate-400" />
												{r.date}
											</span>
											<span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 text-[11px]">
												<ClockIcon className="size-3 text-slate-400" />
												Shift Window: <span className="font-semibold text-slate-700">{r.employee?.shiftCheckIn || '09:30 AM'} → {r.employee?.shiftCheckOut || '06:30 PM'}</span>
											</span>
										</div>
									</div>

									{/* Status Badge */}
									<div className="shrink-0">
										<span className={cn(
											"inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full border shadow-2xs tracking-wide uppercase",
											isPending && "bg-amber-50 text-amber-800 border-amber-300",
											isApproved && "bg-emerald-50 text-emerald-800 border-emerald-300",
											isDenied && "bg-rose-50 text-rose-800 border-rose-300",
											!isPending && !isApproved && !isDenied && "bg-slate-50 text-slate-700 border-slate-300"
										)}>
											<span className={cn(
												"size-2 rounded-full",
												isPending ? "bg-amber-500" : isApproved ? "bg-emerald-500" : "bg-rose-500"
											)} />
											{r.status}
										</span>
									</div>
								</div>

								{/* Reason / Excuse Callout */}
								{r.reason ? (
									<div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed font-normal">
										<span className="font-semibold text-slate-800">Reason Provided: </span>
										"{r.reason}"
									</div>
								) : (
									<div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-xs text-slate-400 italic">
										No explanation text provided.
									</div>
								)}

								{/* Actions */}
								{isPending && (
									<div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
										<button
											type="button"
											disabled={busyId === r.id}
											onClick={() => void act(r.id, 'approve')}
											className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs"
											style={{ backgroundColor: '#059669', color: '#ffffff' }}
										>
											<CheckCircleIcon className="size-3.5 text-white" />
											{busyId === r.id ? 'Processing…' : 'Approve Permission'}
										</button>
										<button
											type="button"
											disabled={busyId === r.id}
											onClick={() => void act(r.id, 'deny')}
											className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs"
											style={{ backgroundColor: '#e11d48', color: '#ffffff' }}
										>
											<XCircleIcon className="size-3.5 text-white" />
											{busyId === r.id ? 'Processing…' : 'Decline'}
										</button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
