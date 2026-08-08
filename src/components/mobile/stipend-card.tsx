'use client';

import { useEffect, useState } from 'react';
import { IndianRupee } from 'lucide-react';
import { apiGet, apiPatch, employeeToken } from '@/lib/mobile-api';
import { isPaymentDetailsComplete } from '@/lib/payment-details';
import { connectRealtime } from '@/lib/realtime-client';
import { cn } from '@/lib/utils';

type Props = {
	employee: any;
	onEmployeeUpdate?: (emp: any) => void;
	/** `dashboard` = dark employee website; `mobile` = light PWA home */
	variant?: 'mobile' | 'dashboard';
};

export function StipendCard({ employee, onEmployeeUpdate, variant = 'mobile' }: Props) {
	const dark = variant === 'dashboard';
	const [emp, setEmp] = useState(employee);
	const [loaded, setLoaded] = useState(false);
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);
	const [mode, setMode] = useState<'upi' | 'bank'>('upi');
	const [upiId, setUpiId] = useState('');
	const [bankAccountHolderName, setBankAccountHolderName] = useState('');
	const [bankAccountNumber, setBankAccountNumber] = useState('');
	const [bankAccountNumberConfirm, setBankAccountNumberConfirm] = useState('');
	const [bankName, setBankName] = useState('');
	const [bankIfsc, setBankIfsc] = useState('');

	useEffect(() => {
		setEmp(employee);
	}, [employee]);

	useEffect(() => {
		let cancelled = false;
		void apiGet<{ employee?: any }>('/api/auth/me')
			.then((data) => {
				if (cancelled || !data.employee) return;
				setEmp((prev: any) => ({ ...prev, ...data.employee }));
				onEmployeeUpdate?.(data.employee);
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setLoaded(true);
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [employee?.id]);

	useEffect(() => {
		const token = employeeToken();
		if (!token) return;
		return connectRealtime({
			token,
			onAttendance: (p) => {
				const action = String(p.action || '');
				if (action !== 'payout-update' && action !== 'payout_update') return;
				void apiGet<{ employee?: any }>('/api/auth/me')
					.then((data) => {
						if (data.employee) {
							setEmp(data.employee);
							onEmployeeUpdate?.(data.employee);
						}
					})
					.catch(() => {});
			},
		});
	}, [onEmployeeUpdate]);

	const rawAmount = emp?.stipendAmount;
	const amount =
		rawAmount == null || rawAmount === ''
			? null
			: typeof rawAmount === 'number'
				? rawAmount
				: Number(rawAmount);
	if (!loaded && (amount == null || !Number.isFinite(amount))) {
		return null;
	}
	if (amount == null || !Number.isFinite(amount)) return null;

	const complete =
		Boolean(emp?.paymentDetailsComplete) || isPaymentDetailsComplete(emp || {});

	async function submit() {
		setBusy(true);
		setErr(null);
		try {
			const body =
				mode === 'upi'
					? { upiId: upiId.trim() }
					: {
							bankAccountHolderName: bankAccountHolderName.trim(),
							bankAccountNumber: bankAccountNumber.trim(),
							bankAccountNumberConfirm: bankAccountNumberConfirm.trim(),
							bankName: bankName.trim(),
							bankIfsc: bankIfsc.trim(),
						};
			const data = await apiPatch<{ employee?: any }>('/api/auth/me/payment', body);
			if (data.employee) {
				setEmp(data.employee);
				onEmployeeUpdate?.(data.employee);
			}
			setOpen(false);
		} catch (e: any) {
			setErr(String(e?.message || e).replace(/^Error:\s*/, ''));
		} finally {
			setBusy(false);
		}
	}

	const inputClass = dark
		? 'w-full rounded-none border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-brand-500'
		: 'w-full rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#0047FF]';

	return (
		<section
			className={cn(
				dark
					? 'mt-0 rounded-none border border-zinc-800 bg-zinc-900/30 p-5'
					: 'mt-4 rounded-[14px] border border-[#E2E8F0] bg-white p-4',
			)}
		>
			<div className="flex items-start gap-3">
				<div
					className={cn(
						'flex size-10 shrink-0 items-center justify-center',
						dark
							? 'rounded-none border border-brand-900/50 bg-brand-950/40'
							: 'rounded-full bg-[#EEF2FF]',
					)}
				>
					<IndianRupee className={cn('size-4', dark ? 'text-brand-400' : 'text-[#0047FF]')} />
				</div>
				<div className="min-w-0 flex-1">
					<p
						className={cn(
							dark
								? 'text-[10px] font-bold uppercase tracking-wider text-zinc-400'
								: 'text-base font-bold text-[#0F172A]',
						)}
					>
						Stipend
					</p>
					<p
						className={cn(
							dark
								? 'mt-1 text-2xl font-bold font-mono tracking-tight text-white'
								: 'text-[15px] font-semibold text-[#0047FF]',
						)}
					>
						₹{Number(amount).toLocaleString('en-IN')}
						<span
							className={cn(
								dark ? 'ml-1.5 text-sm font-medium text-zinc-400' : 'font-semibold text-[#0047FF]',
							)}
						>
							/ month
						</span>
					</p>
					{complete ? (
						<p
							className={cn(
								'mt-1.5 text-xs font-medium',
								dark ? 'text-emerald-400' : 'text-[#067647]',
							)}
						>
							Payment details on file
						</p>
					) : (
						<p className={cn('mt-1.5 text-xs', dark ? 'text-zinc-400' : 'text-[#64748B]')}>
							Add UPI or bank details for payout
						</p>
					)}
				</div>
			</div>
			{!complete ? (
				<button
					type="button"
					onClick={() => setOpen(true)}
					className={cn(
						'mt-4 w-full py-3 text-sm font-semibold text-white',
						dark
							? 'rounded-none bg-brand-600 hover:bg-brand-500 transition-colors'
							: 'rounded-xl bg-[#0047FF]',
					)}
				>
					Update bank details
				</button>
			) : null}

			{open ? (
				<div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-4 sm:items-center">
					<div
						className={cn(
							'w-full max-w-md p-5 shadow-xl',
							dark
								? 'rounded-none border border-zinc-700 bg-zinc-900 text-white'
								: 'rounded-2xl bg-white text-[#0F172A]',
						)}
					>
						<p className={cn('text-lg font-bold', dark ? 'text-white' : '')}>Payment details</p>
						<p className={cn('mt-1 text-sm', dark ? 'text-zinc-400' : 'text-[#64748B]')}>
							Enter UPI ID, or bank details with account holder name exactly as in the bank. You can
							submit only once.
						</p>
						<div className="mt-3 flex gap-2">
							<button
								type="button"
								onClick={() => setMode('upi')}
								className={cn(
									'flex-1 py-2 text-sm font-semibold',
									dark ? 'rounded-none' : 'rounded-lg',
									mode === 'upi'
										? dark
											? 'bg-brand-600 text-white'
											: 'bg-[#0047FF] text-white'
										: dark
											? 'border border-zinc-700 bg-zinc-950 text-zinc-300'
											: 'bg-[#F1F5F9] text-[#334155]',
								)}
							>
								UPI
							</button>
							<button
								type="button"
								onClick={() => setMode('bank')}
								className={cn(
									'flex-1 py-2 text-sm font-semibold',
									dark ? 'rounded-none' : 'rounded-lg',
									mode === 'bank'
										? dark
											? 'bg-brand-600 text-white'
											: 'bg-[#0047FF] text-white'
										: dark
											? 'border border-zinc-700 bg-zinc-950 text-zinc-300'
											: 'bg-[#F1F5F9] text-[#334155]',
								)}
							>
								Bank
							</button>
						</div>
						<div className="mt-3 space-y-2">
							{mode === 'upi' ? (
								<input
									value={upiId}
									onChange={(e) => setUpiId(e.target.value)}
									placeholder="name@upi"
									className={inputClass}
								/>
							) : (
								<>
									<input
										value={bankAccountHolderName}
										onChange={(e) => setBankAccountHolderName(e.target.value)}
										placeholder="Account holder name (exact as in bank)"
										className={inputClass}
									/>
									<input
										value={bankAccountNumber}
										onChange={(e) => setBankAccountNumber(e.target.value)}
										placeholder="Account number"
										className={inputClass}
										inputMode="numeric"
									/>
									<input
										value={bankAccountNumberConfirm}
										onChange={(e) => setBankAccountNumberConfirm(e.target.value)}
										placeholder="Re-enter account number"
										className={inputClass}
										inputMode="numeric"
									/>
									<input
										value={bankName}
										onChange={(e) => setBankName(e.target.value)}
										placeholder="Bank name"
										className={inputClass}
									/>
									<input
										value={bankIfsc}
										onChange={(e) => setBankIfsc(e.target.value)}
										placeholder="IFSC"
										className={inputClass}
									/>
								</>
							)}
						</div>
						{err ? (
							<p className={cn('mt-2 text-sm', dark ? 'text-red-400' : 'text-[#B42318]')}>{err}</p>
						) : null}
						<div className="mt-4 flex gap-2">
							<button
								type="button"
								onClick={() => setOpen(false)}
								className={cn(
									'flex-1 py-2.5 text-sm font-semibold',
									dark
										? 'rounded-none border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
										: 'rounded-xl border border-[#E2E8F0]',
								)}
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={busy}
								onClick={() => void submit()}
								className={cn(
									'flex-1 py-2.5 text-sm font-semibold text-white disabled:opacity-60',
									dark ? 'rounded-none bg-brand-600 hover:bg-brand-500' : 'rounded-xl bg-[#0047FF]',
								)}
							>
								{busy ? 'Saving…' : 'Save'}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
