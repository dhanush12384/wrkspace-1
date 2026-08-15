'use client';
import { useEffect, useRef, useState } from 'react';
import { ProfessionalProfileReadonly } from '@/components/verification/professional-profile-readonly';
import { Search, ArrowRight, Lock, ArrowLeft } from 'lucide-react';
type Props = {
    authHeaders: Record<string, string>;
};
export function PeerColleagueView({ authHeaders }: Props) {
    const [colleagues, setColleagues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedColleague, setSelectedColleague] = useState<any | null>(null);
    const [employeeId, setEmployeeId] = useState('');
    const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [step, setStep] = useState<'id' | 'otp' | 'view'>('id');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [view, setView] = useState<{
        employee: any;
        profile: any;
    } | null>(null);
    useEffect(() => {
        let active = true;
        const fetchColleagues = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/verification/employees', { headers: authHeaders });
                if (!res.ok)
                    throw new Error('Failed to load colleagues');
                const data = await res.json();
                if (active) {
                    setColleagues(data.employees || []);
                }
            }
            catch (e: any) {
                console.error(e);
            }
            finally {
                if (active)
                    setLoading(false);
            }
        };
        void fetchColleagues();
        return () => {
            active = false;
        };
    }, [authHeaders]);
    const filteredColleagues = colleagues.filter((c) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q)
            return true;
        return (String(c.name || '').toLowerCase().includes(q) ||
            String(c.id || '').toLowerCase().includes(q) ||
            String(c.wingName || '').toLowerCase().includes(q) ||
            String(c.role || '').toLowerCase().includes(q));
    });
    const selectColleagueAndSendOtp = async (colleague: any) => {
        setSelectedColleague(colleague);
        setEmployeeId(colleague.id);
        setBusy(true);
        setErr(null);
        setMsg(null);
        setOtpDigits(['', '', '', '', '', '']);
        try {
            const res = await fetch('/api/verification/peer-view/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ employeeId: colleague.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(data?.error || 'Failed to send OTP');
            setMsg(data.message || `OTP sent to ${colleague.name}'s registered email.`);
            setStep('otp');
            setTimeout(() => {
                otpRefs.current[0]?.focus();
            }, 100);
        }
        catch (e: any) {
            setErr(String(e?.message || e));
        }
        finally {
            setBusy(false);
        }
    };
    const resendOtp = async () => {
        if (!selectedColleague)
            return;
        setBusy(true);
        setErr(null);
        setMsg(null);
        setOtpDigits(['', '', '', '', '', '']);
        try {
            const res = await fetch('/api/verification/peer-view/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ employeeId: selectedColleague.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(data?.error || 'Failed to send OTP');
            setMsg(data.message || 'A new OTP has been sent successfully.');
            otpRefs.current[0]?.focus();
        }
        catch (e: any) {
            setErr(String(e?.message || e));
        }
        finally {
            setBusy(false);
        }
    };
    const verifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        const otpStr = otpDigits.join('');
        try {
            const res = await fetch('/api/verification/peer-view/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ employeeId: employeeId.trim(), otp: otpStr.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(data?.error || 'Invalid OTP');
            setView({ employee: data.employee, profile: data.profile });
            setStep('view');
            setMsg(null);
        }
        catch (e: any) {
            setErr(String(e?.message || e));
        }
        finally {
            setBusy(false);
        }
    };
    const handleOtpChange = (index: number, val: string) => {
        const clean = val.replace(/\D/g, '').slice(-1);
        const nextDigits = [...otpDigits];
        nextDigits[index] = clean;
        setOtpDigits(nextDigits);
        if (clean && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };
    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!otpDigits[index] && index > 0) {
                const nextDigits = [...otpDigits];
                nextDigits[index - 1] = '';
                setOtpDigits(nextDigits);
                otpRefs.current[index - 1]?.focus();
            }
            else {
                const nextDigits = [...otpDigits];
                nextDigits[index] = '';
                setOtpDigits(nextDigits);
            }
        }
    };
    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted)
            return;
        const nextDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
            nextDigits[i] = pasted[i] || '';
        }
        setOtpDigits(nextDigits);
        const focusIndex = Math.min(pasted.length, 5);
        otpRefs.current[focusIndex]?.focus();
    };
    const reset = () => {
        setStep('id');
        setSelectedColleague(null);
        setEmployeeId('');
        setOtpDigits(['', '', '', '', '', '']);
        setView(null);
        setErr(null);
        setMsg(null);
    };
    if (step === 'view' && view) {
        const e = view.employee;
        const p = view.profile || {};
        const photo = e.photoUrl && e.photoUrl !== '[set]' ? String(e.photoUrl) : '';
        const meta = [e.role, e.wingName, e.employmentStatus || 'Active', e.id ? `ID ${e.id}` : null]
            .filter(Boolean)
            .join(' · ');
        return (<div className="ev-shell">
				<div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] mb-4">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							{photo ? (<img src={photo} alt="" className="size-16 rounded-xl object-cover border border-slate-200"/>) : (<div className="size-16 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-800 text-lg border border-slate-200">
									{String(e.name || '?')
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w: string) => w[0]?.toUpperCase())
                    .join('') || '?'}
								</div>)}
							<div>
								<span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Read-only Colleague Profile</span>
								<h2 className="text-xl font-bold text-slate-900 mt-0.5">{e.name}</h2>
								<p className="text-sm text-slate-500 mt-1">{meta}</p>
							</div>
						</div>
						<button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer" onClick={reset}>
							<ArrowLeft className="size-3.5"/>
							Back to directory
						</button>
					</div>
				</div>

				<ProfessionalProfileReadonly profile={p} employee={e} showRemarks={false}/>
			</div>);
    }
    if (step === 'otp' && selectedColleague) {
        const photo = selectedColleague.photoUrl && selectedColleague.photoUrl !== '[set]' ? String(selectedColleague.photoUrl) : '';
        const getMaskedEmail = () => {
            if (!msg)
                return '';
            const match = msg.match(/\(([^)]+)\)/);
            return match ? match[1] : '';
        };
        const maskedEmail = getMaskedEmail();
        return (<div className="ev-shell flex flex-col items-center justify-center py-10">
				<div className="w-full max-w-[420px] rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
					<button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-900 mb-6 transition-colors cursor-pointer">
						<ArrowLeft className="size-3.5"/>
						Back to directory
					</button>

					<div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
						{photo ? (<img src={photo} alt="" className="size-11 rounded-lg object-cover border border-slate-200"/>) : (<div className="size-11 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-800 border border-slate-200 text-sm">
								{String(selectedColleague.name || '?')
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w: string) => w[0]?.toUpperCase())
                    .join('') || '?'}
							</div>)}
						<div>
							<h3 className="text-xs font-bold text-slate-900">{selectedColleague.name}</h3>
							<p className="text-[10px] text-slate-500 mt-0.5">
								{selectedColleague.role} · {selectedColleague.wingName} (ID: {selectedColleague.id})
							</p>
						</div>
					</div>

					<div className="mt-6 text-center">
						<div className="size-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3 text-[#E61E32]">
							<Lock className="size-4.5"/>
						</div>
						<h3 className="text-sm font-bold text-slate-950">Security Verification</h3>
						<p className="text-xs text-slate-500 mt-1.5 px-4 leading-relaxed">
							Enter the 6-digit code sent to <strong className="text-slate-800">{maskedEmail || 'their email'}</strong>.
						</p>
					</div>

					{err && (<div className="mt-4 rounded-lg bg-red-50 border border-red-100 p-2.5 text-center text-xs font-medium text-red-600">
							{err}
						</div>)}

					<form onSubmit={verifyOtp} className="mt-6">
						<div className="flex justify-between items-center gap-2" onPaste={handleOtpPaste}>
							{otpDigits.map((digit, index) => (<input key={index} ref={(el) => {
                    otpRefs.current[index] = el;
                }} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1} value={digit} onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(index, e)} className="size-10 rounded-lg border border-slate-300 bg-slate-50 text-center text-lg font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all" disabled={busy}/>))}
						</div>

						<button type="submit" disabled={busy || otpDigits.join('').length !== 6} className="mt-6 flex h-10 w-full items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-sm">
							{busy ? 'Verifying...' : 'Unlock Profile'}
						</button>

						<button type="button" onClick={resendOtp} disabled={busy} className="mt-3.5 w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
							Resend OTP
						</button>
					</form>
				</div>
			</div>);
    }
    return (<div className="ev-shell">
			
			<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
				<div>
					<h2 className="text-lg font-semibold text-slate-950">Colleagues Directory</h2>
					<p className="text-xs text-slate-500 mt-0.5">Select a colleague to view their professional profile.</p>
				</div>
				<div className="relative w-full sm:max-w-xs">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"/>
					<input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search colleagues..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"/>
				</div>
			</div>

			{loading ? (<div className="flex justify-center items-center py-20">
					<div className="size-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"/>
				</div>) : filteredColleagues.length === 0 ? (<div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
					<div className="size-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-400">
						<Search className="size-5"/>
					</div>
					<h3 className="text-sm font-semibold text-slate-800">No colleagues found</h3>
					<p className="text-xs text-slate-500 mt-1">Try refining your search query.</p>
				</div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{filteredColleagues.map((emp) => {
                const photo = emp.photoUrl && emp.photoUrl !== '[set]' ? String(emp.photoUrl) : '';
                return (<div key={emp.id} onClick={() => !busy && selectColleagueAndSendOtp(emp)} className="group mx-auto w-full max-w-[290px] rounded-[32px] border border-slate-200 bg-white p-4 flex flex-col gap-4.5 transition-all hover:border-slate-900/60 hover:shadow-lg cursor-pointer">
								
								<div className="text-center pt-2">
									<h4 className="text-base font-bold text-slate-900 tracking-tight leading-tight group-hover:text-slate-950 transition-colors">
										{emp.name}
									</h4>
									<div className="flex items-center justify-center gap-1.5 mt-1 text-[10px] text-slate-400 font-medium">
										<span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse"/>
										<span>{emp.role} · {emp.wingName || 'Org'}</span>
									</div>
								</div>

								
								<div className="relative w-full h-[250px] overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50 flex items-center justify-center shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
									{photo ? (<img src={photo} alt="" className="w-full h-full object-cover rounded-[24px] transition-transform duration-500 group-hover:scale-105"/>) : (<div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
											<div className="size-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm">
												{String(emp.name || '?')
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w: string) => w[0]?.toUpperCase())
                            .join('') || '?'}
											</div>
										</div>)}
								</div>

								
								<div className="flex items-center justify-between pt-1 border-t border-slate-50">
									<div className="flex items-center gap-2">
										{photo ? (<img src={photo} alt="" className="size-7 rounded-full object-cover border border-slate-200"/>) : (<div className="size-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-[10px] border border-slate-200">
												{String(emp.name || '?')
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w: string) => w[0]?.toUpperCase())
                            .join('') || '?'}
											</div>)}
										<div className="text-left">
											<p className="text-[10px] font-semibold text-slate-800 leading-none">
												@{emp.id.toLowerCase()}
											</p>
											<p className="text-[9px] text-slate-400 mt-0.5 leading-none">Active</p>
										</div>
									</div>

									<button type="button" className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3.5 py-2 text-[10px] font-bold text-white shadow-sm hover:bg-slate-800 transition-colors">
										+ Verify
									</button>
								</div>
							</div>);
            })}
				</div>)}
		</div>);
}
