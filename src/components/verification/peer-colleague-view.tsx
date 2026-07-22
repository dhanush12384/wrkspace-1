'use client';

import { useState } from 'react';
import { ProfessionalProfileReadonly } from '@/components/verification/professional-profile-readonly';

type Props = {
	authHeaders: Record<string, string>;
};

/**
 * Enter another employee ID → OTP emailed to them → enter OTP → read-only profile.
 */
export function PeerColleagueView({ authHeaders }: Props) {
	const [employeeId, setEmployeeId] = useState('');
	const [otp, setOtp] = useState('');
	const [step, setStep] = useState<'id' | 'otp' | 'view'>('id');
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [view, setView] = useState<{ employee: any; profile: any } | null>(null);

	const requestOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setErr(null);
		setMsg(null);
		try {
			const res = await fetch('/api/verification/peer-view/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...authHeaders },
				body: JSON.stringify({ employeeId: employeeId.trim() }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || 'Failed to send OTP');
			setMsg(data.message || 'OTP sent');
			setStep('otp');
		} catch (e: any) {
			setErr(String(e?.message || e));
		} finally {
			setBusy(false);
		}
	};

	const verifyOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setErr(null);
		try {
			const res = await fetch('/api/verification/peer-view/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...authHeaders },
				body: JSON.stringify({ employeeId: employeeId.trim(), otp: otp.trim() }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || 'Invalid OTP');
			setView({ employee: data.employee, profile: data.profile });
			setStep('view');
			setMsg(null);
		} catch (e: any) {
			setErr(String(e?.message || e));
		} finally {
			setBusy(false);
		}
	};

	const reset = () => {
		setStep('id');
		setOtp('');
		setView(null);
		setErr(null);
		setMsg(null);
	};

	if (step === 'view' && view) {
		const e = view.employee;
		const p = view.profile || {};
		const photo =
			e.photoUrl && e.photoUrl !== '[set]' ? String(e.photoUrl) : '';
		const meta = [e.role, e.wingName, e.employmentStatus || 'Active', e.id ? `ID ${e.id}` : null]
			.filter(Boolean)
			.join(' · ');

		return (
			<div className="ev-shell">
				<div className="ev-card" style={{ marginBottom: 16 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
						<div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
							{photo ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={photo}
									alt=""
									style={{
										width: 64,
										height: 64,
										borderRadius: 12,
										objectFit: 'cover',
										border: '1px solid #e2e8f0',
									}}
								/>
							) : (
								<div
									style={{
										width: 64,
										height: 64,
										borderRadius: 12,
										background: '#eef2ff',
										display: 'grid',
										placeItems: 'center',
										fontWeight: 700,
										color: '#0047FF',
										fontSize: 18,
									}}
								>
									{String(e.name || '?')
										.split(/\s+/)
										.filter(Boolean)
										.slice(0, 2)
										.map((w: string) => w[0]?.toUpperCase())
										.join('') || '?'}
								</div>
							)}
							<div>
								<p className="ev-kicker">Read-only · colleague profile</p>
								<h2 style={{ margin: '4px 0 0' }}>{e.name}</h2>
								<p className="ev-muted" style={{ marginTop: 6 }}>
									{meta}
								</p>
							</div>
						</div>
						<button type="button" className="ev-btn ev-btn-ghost" onClick={reset}>
							View another
						</button>
					</div>
				</div>

				{/* Full professional profile — same sections as admin dossier (no remarks) */}
				<ProfessionalProfileReadonly profile={p} employee={e} showRemarks={false} />
			</div>
		);
	}

	return (
		<div className="ev-shell">
			<div className="ev-card" style={{ maxWidth: 480 }}>
				<h2 style={{ margin: 0 }}>View another employee</h2>
				<p className="ev-muted" style={{ marginTop: 8 }}>
					Enter their employee ID. An OTP is emailed to <strong>their</strong> registered email (not
					yours). Ask them to share the code, then enter it below for a full read-only professional
					profile.
				</p>

				{err ? (
					<div className="ev-alert ev-alert-error" style={{ marginTop: 12 }}>
						<strong>{err}</strong>
					</div>
				) : null}
				{msg ? (
					<div className="ev-alert ev-alert-info" style={{ marginTop: 12 }}>
						<span>{msg}</span>
					</div>
				) : null}

				{step === 'id' ? (
					<form onSubmit={requestOtp} className="ev-form">
						<label className="ev-field">
							<span>Employee ID</span>
							<input
								value={employeeId}
								onChange={(e) => setEmployeeId(e.target.value.trim())}
								placeholder="e.g. A1B2C3"
								required
								autoComplete="off"
							/>
						</label>
						<button type="submit" disabled={busy} className="ev-btn ev-btn-primary">
							{busy ? 'Sending OTP…' : 'Send OTP to employee'}
						</button>
					</form>
				) : (
					<form onSubmit={verifyOtp} className="ev-form">
						<label className="ev-field">
							<span>OTP (from the employee)</span>
							<input
								value={otp}
								onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
								placeholder="6-digit code"
								required
								inputMode="numeric"
								autoComplete="one-time-code"
							/>
						</label>
						<button type="submit" disabled={busy || otp.length !== 6} className="ev-btn ev-btn-primary">
							{busy ? 'Verifying…' : 'View profile (read-only)'}
						</button>
						<button type="button" className="ev-btn ev-btn-ghost" onClick={reset} disabled={busy}>
							Start over
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
