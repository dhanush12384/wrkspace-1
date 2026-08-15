'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { connectRealtime } from '@/lib/realtime-client';
import { ensureAdminToken } from '@/lib/admin-client-auth';
import { DollarSignIcon, RefreshCwIcon, CheckCircleIcon, AlertCircleIcon, SearchIcon, PlusIcon, Trash2Icon, PencilIcon, CreditCardIcon, BuildingIcon, CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Emp = {
	id: string;
	firstName: string;
	middleName?: string | null;
	lastName: string;
	name?: string;
	email: string;
	stipendAmount?: number | null;
	upiId?: string | null;
	bankAccountHolderName?: string | null;
	bankAccountNumber?: string | null;
	bankName?: string | null;
	bankIfsc?: string | null;
	paymentDetailsComplete?: boolean;
};

type PayDraft = {
	upiId: string;
	bankAccountHolderName: string;
	bankAccountNumber: string;
	bankName: string;
	bankIfsc: string;
};

function nameOf(e: Emp) {
	return e.name || [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
}

function emptyPay(): PayDraft {
	return {
		upiId: '',
		bankAccountHolderName: '',
		bankAccountNumber: '',
		bankName: '',
		bankIfsc: '',
	};
}

interface AdminPayoutsPanelProps {
	adminEmail?: string;
}

export function AdminPayoutsPanel({ adminEmail }: AdminPayoutsPanelProps) {
	const [rows, setRows] = useState<Emp[]>([]);
	const [allEmployees, setAllEmployees] = useState<Emp[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const [draftAmount, setDraftAmount] = useState<Record<string, string>>({});
	const [expanded, setExpanded] = useState<string | null>(null);
	const [payDraft, setPayDraft] = useState<Record<string, PayDraft>>({});
	const [addId, setAddId] = useState('');
	const [addAmount, setAddAmount] = useState('3500');
	const [rtToken, setRtToken] = useState('');
	const [searchQuery, setSearchQuery] = useState('');

	const load = useCallback(async (isSilent = false) => {
		if (!isSilent) setLoading(true);
		setMsg(null);
		try {
			const token = await ensureAdminToken(adminEmail);
			setRtToken(token);
			const [res, allRes] = await Promise.all([
				fetch('/api/admin/payouts', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
				fetch('/api/admin/payouts?all=1', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
			]);
			const data = await res.json();
			const allData = await allRes.json();
			if (!res.ok) throw new Error(data.error || `Load failed (${res.status})`);
			const list: Emp[] = data.employees || [];
			setRows(list);
			setAllEmployees(allData.employees || []);
			const d: Record<string, string> = {};
			const p: Record<string, PayDraft> = {};
			for (const e of list) {
				d[e.id] = e.stipendAmount != null ? String(e.stipendAmount) : '';
				p[e.id] = {
					upiId: e.upiId || '',
					bankAccountHolderName: e.bankAccountHolderName || '',
					bankAccountNumber: e.bankAccountNumber || '',
					bankName: e.bankName || '',
					bankIfsc: e.bankIfsc || '',
				};
			}
			setDraftAmount(d);
			setPayDraft(p);
		} catch (e: any) {
			setRows([]);
			setMsg({ type: 'error', text: e?.message || 'Failed to load payouts data' });
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		if (!rtToken) return;
		return connectRealtime({
			token: rtToken,
			onAttendance: (p) => {
				const action = String(p.action || '');
				if (action === 'payout-update' || action === 'payout_update') void load(true);
			},
		});
	}, [rtToken, load]);

	const notOnList = useMemo(() => {
		const on = new Set(rows.map((r) => r.id));
		return allEmployees.filter((e) => !on.has(e.id));
	}, [allEmployees, rows]);

	const saveAmount = async (id: string, amount: number | null) => {
		setSavingId(id);
		setMsg(null);
		try {
			const token = await ensureAdminToken(adminEmail);
			const res = await fetch('/api/admin/payouts', {
				method: 'PATCH',
				headers: {
					Authorization: token ? `Bearer ${token}` : '',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ employeeId: id, stipendAmount: amount }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Save failed');
			setMsg({ type: 'success', text: amount != null ? 'Stipend amount updated' : 'Employee removed from payout list' });
			await load(true);
		} catch (e: any) {
			setMsg({ type: 'error', text: e?.message || 'Save failed' });
		} finally {
			setSavingId(null);
		}
	};

	const savePayment = async (id: string) => {
		setSavingId(id);
		setMsg(null);
		try {
			const token = await ensureAdminToken(adminEmail);
			const d = payDraft[id] || emptyPay();
			const res = await fetch('/api/admin/payouts/payment', {
				method: 'PATCH',
				headers: {
					Authorization: token ? `Bearer ${token}` : '',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ employeeId: id, ...d }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Save failed');
			setMsg({ type: 'success', text: 'Bank and payment details saved' });
			setExpanded(null);
			await load(true);
		} catch (e: any) {
			setMsg({ type: 'error', text: e?.message || 'Save failed' });
		} finally {
			setSavingId(null);
		}
	};

	const clearPayment = async (id: string) => {
		setSavingId(id);
		try {
			const token = await ensureAdminToken(adminEmail);
			const res = await fetch('/api/admin/payouts/payment', {
				method: 'PATCH',
				headers: {
					Authorization: token ? `Bearer ${token}` : '',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ employeeId: id, clear: true }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Clear failed');
			setMsg({ type: 'success', text: 'Payment details cleared' });
			await load(true);
		} catch (e: any) {
			setMsg({ type: 'error', text: e?.message || 'Clear failed' });
		} finally {
			setSavingId(null);
		}
	};

	const filteredRows = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return rows;
		return rows.filter(e => 
			nameOf(e).toLowerCase().includes(q) ||
			e.id.toLowerCase().includes(q) ||
			e.email.toLowerCase().includes(q) ||
			(e.upiId || '').toLowerCase().includes(q) ||
			(e.bankAccountNumber || '').toLowerCase().includes(q)
		);
	}, [rows, searchQuery]);

	const completeCount = rows.filter(r => r.paymentDetailsComplete).length;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Payouts & Salaries</h2>
					<p className="text-xs text-slate-500 mt-0.5">
						Verify monthly stipends, bank accounts, UPI IDs, and track salary disbursement eligibility
					</p>
				</div>
				<button
					type="button"
					onClick={() => void load()}
					className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all rounded-xl cursor-pointer shadow-2xs self-start sm:self-auto"
					title="Refresh Payouts"
				>
					<RefreshCwIcon className="size-4" />
				</button>
			</div>

			{/* Status Feedback Toast */}
			{msg && (
				<div className={cn(
					"p-3.5 rounded-xl text-xs flex items-center gap-2 border shadow-2xs",
					msg.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
				)}>
					{msg.type === 'success' ? <CheckCircleIcon className="size-4 text-emerald-600 shrink-0" /> : <AlertCircleIcon className="size-4 text-rose-600 shrink-0" />}
					<span>{msg.text}</span>
				</div>
			)}

			{/* Top 3 Stat Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="border border-slate-200/90 bg-white p-5 space-y-1 rounded-2xl shadow-2xs">
					<p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Recipients on Payroll</p>
					<p className="text-3xl font-bold text-slate-900">{rows.length}</p>
					<p className="text-[10px] text-slate-400 font-normal">Active stipend configurations</p>
				</div>
				<div className="border border-emerald-200 bg-emerald-50/70 p-5 space-y-1 rounded-2xl shadow-2xs">
					<p className="text-[11px] uppercase tracking-wider text-emerald-700 font-medium">Bank Details Complete</p>
					<p className="text-3xl font-bold text-emerald-700">{completeCount}</p>
					<p className="text-[10px] text-emerald-600 font-normal">Ready for disbursement</p>
				</div>
				<div className="border border-amber-200 bg-amber-50/70 p-5 space-y-1 rounded-2xl shadow-2xs">
					<p className="text-[11px] uppercase tracking-wider text-amber-700 font-medium">Pending Account Info</p>
					<p className="text-3xl font-bold text-amber-700">{rows.length - completeCount}</p>
					<p className="text-[10px] text-amber-600 font-normal">Missing UPI / Account number</p>
				</div>
			</div>

			{/* Add Recipient Quick Bar */}
			{notOnList.length > 0 && (
				<div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
					<div className="flex items-center gap-2">
						<PlusIcon className="size-4 text-[#E61E32]" />
						<h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Add Employee to Payroll</h4>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex-1 min-w-[240px]">
							<select
								value={addId}
								onChange={(e) => setAddId(e.target.value)}
								className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors"
							>
								<option value="">-- Choose Employee to Add --</option>
								{notOnList.map((e) => (
									<option key={e.id} value={e.id}>
										{nameOf(e)} ({e.id})
									</option>
								))}
							</select>
						</div>
						<div className="w-36 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
							<span className="text-xs text-slate-400 mr-1.5 font-medium">₹</span>
							<input
								value={addAmount}
								onChange={(e) => setAddAmount(e.target.value)}
								placeholder="3500"
								className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium"
							/>
						</div>
						<button
							type="button"
							disabled={!addId || savingId === addId}
							onClick={() => {
								void saveAmount(addId, Math.round(Number(addAmount)) || 3500);
								setAddId('');
							}}
							className="inline-flex items-center gap-1.5 bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs"
						>
							<PlusIcon className="size-3.5" />
							Add to Payroll
						</button>
					</div>
				</div>
			)}

			{/* Search Filter Bar */}
			<div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
				<div className="relative flex-1 max-w-md">
					<SearchIcon className="absolute left-3 top-2.5 size-4 text-slate-400" />
					<input
						type="text"
						placeholder="Search by name, ID, email, UPI, or account..."
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors"
					/>
				</div>
				<span className="text-xs text-slate-500 font-medium mr-2">
					{filteredRows.length} recipient{filteredRows.length !== 1 ? 's' : ''}
				</span>
			</div>

			{/* Table Content */}
			{loading ? (
				<div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-2xs">
					<div className="size-10 border-3 border-[#E61E32]/20 border-t-[#E61E32] rounded-full animate-spin mx-auto mb-3" />
					<p className="text-sm font-medium text-slate-600">Loading payout records...</p>
					<p className="text-xs text-slate-400 mt-1">Retrieving employee stipend amounts and banking data</p>
				</div>
			) : (
				<div className="overflow-x-auto bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-medium text-[11px] uppercase tracking-wider">
								<th className="py-3.5 px-4">Employee</th>
								<th className="py-3.5 px-4">Monthly Stipend</th>
								<th className="py-3.5 px-4">Payment Account</th>
								<th className="py-3.5 px-4">Status</th>
								<th className="py-3.5 px-4 text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-slate-700">
							{filteredRows.length === 0 ? (
								<tr>
									<td colSpan={5} className="py-12 text-center text-slate-400 italic">
										No stipend recipients found. Add an employee above.
									</td>
								</tr>
							) : (
								filteredRows.map((e) => (
									<Fragment key={e.id}>
										<tr className="hover:bg-slate-50/70 transition-colors">
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
												<div className="flex items-center gap-1.5 max-w-[160px]">
													<span className="text-slate-400 font-medium">₹</span>
													<input
														value={draftAmount[e.id] ?? ''}
														onChange={(ev) =>
															setDraftAmount((prev) => ({ ...prev, [e.id]: ev.target.value }))
														}
														className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"
													/>
													<button
														type="button"
														disabled={savingId === e.id}
														onClick={() =>
															void saveAmount(
																e.id,
																draftAmount[e.id] === ''
																	? null
																	: Math.round(Number(draftAmount[e.id])),
															)
														}
														className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg cursor-pointer transition-all shadow-2xs"
														style={{ backgroundColor: '#059669', color: '#ffffff' }}
													>
														Save
													</button>
												</div>
											</td>
											<td className="py-3.5 px-4 text-xs text-slate-600">
												{e.upiId ? (
													<span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md border border-slate-200/60">
														<CreditCardIcon className="size-3 text-slate-400" />
														UPI: {e.upiId}
													</span>
												) : e.bankAccountNumber ? (
													<span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md border border-slate-200/60">
														<BuildingIcon className="size-3 text-slate-400" />
														{e.bankName || 'Bank'} · ****{String(e.bankAccountNumber).slice(-4)}
													</span>
												) : (
													<span className="text-slate-400 italic">No account provided</span>
												)}
											</td>
											<td className="py-3.5 px-4">
												<span
													className={cn(
														"inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border shadow-2xs",
														e.paymentDetailsComplete
															? "bg-emerald-50 text-emerald-700 border-emerald-200"
															: "bg-amber-50 text-amber-700 border-amber-200"
													)}
												>
													<span className={cn("size-1.5 rounded-full", e.paymentDetailsComplete ? "bg-emerald-500" : "bg-amber-500")} />
													{e.paymentDetailsComplete ? 'Ready' : 'Pending Info'}
												</span>
											</td>
											<td className="py-3.5 px-4 text-right whitespace-nowrap">
												<div className="inline-flex items-center justify-end gap-1.5">
													<button
														type="button"
														onClick={() => setExpanded(expanded === e.id ? null : e.id)}
														className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs transition-all"
													>
														<PencilIcon className="size-3 text-slate-400" />
														{expanded === e.id ? 'Close' : 'Bank Info'}
													</button>
													<button
														type="button"
														disabled={savingId === e.id}
														onClick={() => void saveAmount(e.id, null)}
														className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer transition-all shadow-2xs disabled:opacity-50"
														style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
														title="Remove Recipient"
													>
														<Trash2Icon className="size-3.5 text-white" />
													</button>
												</div>
											</td>
										</tr>
										{expanded === e.id && (
											<tr className="bg-slate-50/80 border-b border-slate-200/80">
												<td colSpan={5} className="p-4">
													<div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
														<h5 className="text-xs font-semibold text-slate-800">
															Edit Banking Details for {nameOf(e)}
														</h5>
														<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
															{(
																[
																	['upiId', 'UPI ID (e.g. name@okhdfcbank)'],
																	['bankAccountHolderName', 'Account Holder Name'],
																	['bankAccountNumber', 'Bank Account Number'],
																	['bankName', 'Bank Name'],
																	['bankIfsc', 'IFSC Code'],
																] as const
															).map(([key, label]) => (
																<label
																	key={key}
																	className="flex flex-col gap-1 text-[11px] font-medium text-slate-600"
																>
																	{label}
																	<input
																		value={payDraft[e.id]?.[key] || ''}
																		onChange={(ev) =>
																			setPayDraft((prev) => ({
																				...prev,
																				[e.id]: {
																					...(prev[e.id] || emptyPay()),
																					[key]: ev.target.value,
																				},
																			}))
																		}
																		className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"
																	/>
																</label>
															))}
														</div>
														<div className="mt-3 flex gap-2 pt-2 border-t border-slate-100">
															<button
																type="button"
																disabled={savingId === e.id}
																onClick={() => void savePayment(e.id)}
																className="inline-flex items-center gap-1.5 bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs"
															>
																<CheckIcon className="size-3.5" />
																{savingId === e.id ? 'Saving…' : 'Save Payment Details'}
															</button>
															<button
																type="button"
																disabled={savingId === e.id}
																onClick={() => void clearPayment(e.id)}
																className="text-xs text-slate-600 hover:text-slate-800 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all"
															>
																Clear Details
															</button>
														</div>
													</div>
												</td>
											</tr>
										)}
									</Fragment>
								))
							)}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
