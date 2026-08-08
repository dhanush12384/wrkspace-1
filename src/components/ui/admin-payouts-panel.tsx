'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { connectRealtime } from '@/lib/realtime-client';
import { ensureAdminToken } from '@/lib/admin-client-auth';

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

export function AdminPayoutsPanel() {
	const [rows, setRows] = useState<Emp[]>([]);
	const [allEmployees, setAllEmployees] = useState<Emp[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [msg, setMsg] = useState<string | null>(null);
	const [draftAmount, setDraftAmount] = useState<Record<string, string>>({});
	const [expanded, setExpanded] = useState<string | null>(null);
	const [payDraft, setPayDraft] = useState<Record<string, PayDraft>>({});
	const [addId, setAddId] = useState('');
	const [addAmount, setAddAmount] = useState('3500');
	const [rtToken, setRtToken] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		setMsg(null);
		try {
			const token = await ensureAdminToken();
			setRtToken(token);
			const [res, allRes] = await Promise.all([
				fetch('/api/admin/payouts', { headers: { Authorization: `Bearer ${token}` } }),
				fetch('/api/admin/payouts?all=1', { headers: { Authorization: `Bearer ${token}` } }),
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
			if (!list.length) setMsg('No stipend recipients yet — add one below');
		} catch (e: any) {
			setRows([]);
			setMsg(e?.message || 'Failed to load payouts');
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
				if (action === 'payout-update' || action === 'payout_update') void load();
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
			const token = await ensureAdminToken();
			const res = await fetch('/api/admin/payouts', {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ employeeId: id, stipendAmount: amount }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Save failed');
			setMsg('Saved');
			await load();
		} catch (e: any) {
			setMsg(e?.message || 'Save failed');
		} finally {
			setSavingId(null);
		}
	};

	const savePayment = async (id: string) => {
		setSavingId(id);
		setMsg(null);
		try {
			const token = await ensureAdminToken();
			const d = payDraft[id] || emptyPay();
			const res = await fetch('/api/admin/payouts/payment', {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ employeeId: id, ...d }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Save failed');
			setMsg('Payment details saved');
			await load();
		} catch (e: any) {
			setMsg(e?.message || 'Save failed');
		} finally {
			setSavingId(null);
		}
	};

	const clearPayment = async (id: string) => {
		setSavingId(id);
		try {
			const token = await ensureAdminToken();
			const res = await fetch('/api/admin/payouts/payment', {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ employeeId: id, clear: true }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Clear failed');
			setMsg('Payment details cleared');
			await load();
		} catch (e: any) {
			setMsg(e?.message || 'Clear failed');
		} finally {
			setSavingId(null);
		}
	};

	return (
		<div className="space-y-4 p-4 md:p-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold text-white">Payouts / stipends</h2>
					<p className="text-sm text-zinc-400">
						Edit monthly stipend amounts. Employees see changes live on home.
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
			{msg ? <p className="text-xs text-sky-300">{msg}</p> : null}

			<div className="flex flex-wrap items-end gap-2 rounded-none border border-zinc-800 bg-zinc-900/40 p-3">
				<label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[10px] uppercase tracking-wide text-zinc-500">
					Add employee
					<select
						value={addId}
						onChange={(e) => setAddId(e.target.value)}
						className="rounded-none border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white"
					>
						<option value="">Select…</option>
						{notOnList.map((e) => (
							<option key={e.id} value={e.id}>
								{nameOf(e)}
							</option>
						))}
					</select>
				</label>
				<label className="flex w-28 flex-col gap-1 text-[10px] uppercase tracking-wide text-zinc-500">
					Amount
					<input
						value={addAmount}
						onChange={(e) => setAddAmount(e.target.value)}
						className="rounded-none border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white"
					/>
				</label>
				<button
					type="button"
					disabled={!addId || savingId === addId}
					onClick={() => void saveAmount(addId, Math.round(Number(addAmount)) || 3500)}
					className="rounded-none bg-sky-600 px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-50"
				>
					Add
				</button>
			</div>

			{loading ? (
				<p className="text-sm text-zinc-400">Loading…</p>
			) : (
				<div className="overflow-x-auto border border-zinc-800">
					<table className="w-full min-w-[820px] text-left text-sm">
						<thead className="bg-zinc-900 text-[10px] uppercase tracking-wider text-zinc-500">
							<tr>
								<th className="px-3 py-2">Employee</th>
								<th className="px-3 py-2">Amount</th>
								<th className="px-3 py-2">Payment</th>
								<th className="px-3 py-2">Status</th>
								<th className="px-3 py-2">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.length === 0 ? (
								<tr>
									<td colSpan={5} className="p-6 text-center text-zinc-500">
										No stipend rows. Add an employee above, or click Refresh.
									</td>
								</tr>
							) : (
								rows.map((e) => (
									<Fragment key={e.id}>
										<tr className="border-t border-zinc-800 text-zinc-200">
											<td className="px-3 py-2">
												<div className="font-medium text-white">{nameOf(e)}</div>
												<div className="text-[11px] text-zinc-500">{e.email}</div>
											</td>
											<td className="px-3 py-2">
												<div className="flex items-center gap-2">
													<span className="text-zinc-500">₹</span>
													<input
														value={draftAmount[e.id] ?? ''}
														onChange={(ev) =>
															setDraftAmount((prev) => ({ ...prev, [e.id]: ev.target.value }))
														}
														className="w-24 border border-zinc-700 bg-zinc-950 px-2 py-1 text-white"
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
														className="bg-emerald-700 px-2 py-1 text-[11px] font-bold uppercase text-white disabled:opacity-50"
													>
														Save
													</button>
												</div>
											</td>
											<td className="px-3 py-2 text-xs text-zinc-400">
												{e.upiId
													? `UPI: ${e.upiId}`
													: e.bankAccountNumber
														? `${e.bankAccountHolderName || '—'} · ${e.bankName || 'Bank'} · ****${String(e.bankAccountNumber).slice(-4)} · ${e.bankIfsc || ''}`
														: '—'}
											</td>
											<td className="px-3 py-2">
												<span
													className={
														e.paymentDetailsComplete ? 'text-emerald-400' : 'text-amber-400'
													}
												>
													{e.paymentDetailsComplete ? 'Complete' : 'Missing'}
												</span>
											</td>
											<td className="px-3 py-2">
												<div className="flex flex-wrap gap-2">
													<button
														type="button"
														onClick={() => setExpanded(expanded === e.id ? null : e.id)}
														className="border border-zinc-600 px-2 py-1 text-[11px] uppercase text-zinc-300"
													>
														{expanded === e.id ? 'Hide' : 'Bank'}
													</button>
													<button
														type="button"
														disabled={savingId === e.id}
														onClick={() => void saveAmount(e.id, null)}
														className="border border-red-800 px-2 py-1 text-[11px] uppercase text-red-300"
													>
														Remove
													</button>
												</div>
											</td>
										</tr>
										{expanded === e.id ? (
											<tr className="border-t border-zinc-800 bg-zinc-950/60">
												<td colSpan={5} className="px-3 py-3">
													<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
														{(
															[
																['upiId', 'UPI ID'],
																['bankAccountHolderName', 'Account holder name'],
																['bankAccountNumber', 'Account number'],
																['bankName', 'Bank name'],
																['bankIfsc', 'IFSC'],
															] as const
														).map(([key, label]) => (
															<label
																key={key}
																className="flex flex-col gap-1 text-[10px] uppercase text-zinc-500"
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
																	className="border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"
																/>
															</label>
														))}
													</div>
													<div className="mt-3 flex gap-2">
														<button
															type="button"
															disabled={savingId === e.id}
															onClick={() => void savePayment(e.id)}
															className="bg-sky-600 px-3 py-1.5 text-[11px] font-bold uppercase text-white"
														>
															Save payment
														</button>
														<button
															type="button"
															disabled={savingId === e.id}
															onClick={() => void clearPayment(e.id)}
															className="border border-zinc-600 px-3 py-1.5 text-[11px] uppercase text-zinc-300"
														>
															Clear
														</button>
													</div>
												</td>
											</tr>
										) : null}
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
