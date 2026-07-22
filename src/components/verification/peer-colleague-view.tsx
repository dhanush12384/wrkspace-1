'use client';

import { useState } from 'react';

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
		const skills = Object.entries(p.skills || {}).flatMap(([k, arr]: [string, any]) =>
			(Array.isArray(arr) ? arr : []).map((s: string) => `${k}: ${s}`),
		);
		return (
			<div className="ev-shell">
				<div className="ev-card" style={{ marginBottom: 16 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
						<div>
							<p className="ev-kicker">Read-only</p>
							<h2 style={{ margin: '4px 0 0' }}>{e.name}</h2>
							<p className="ev-muted" style={{ marginTop: 6 }}>
								{e.role} · {e.wingName} · {e.employmentStatus || 'Active'} · ID {e.id}
							</p>
						</div>
						<button type="button" className="ev-btn ev-btn-ghost" onClick={reset}>
							View another
						</button>
					</div>
				</div>

				<div className="ev-card" style={{ marginBottom: 12 }}>
					<h3>General</h3>
					<div className="ev-info-grid">
						<div className="ev-info-item">
							<span>Email</span>
							<strong>{e.email}</strong>
						</div>
						<div className="ev-info-item">
							<span>Phone</span>
							<strong>{e.phone || '—'}</strong>
						</div>
						<div className="ev-info-item">
							<span>Title</span>
							<strong>{p.professionalTitle || e.professionalTitle || '—'}</strong>
						</div>
						<div className="ev-info-item">
							<span>Location</span>
							<strong>{[p.city, p.state, p.country].filter(Boolean).join(', ') || '—'}</strong>
						</div>
					</div>
				</div>

				{(p.about || p.careerObjective) && (
					<div className="ev-card" style={{ marginBottom: 12 }}>
						<h3>Summary</h3>
						{p.about ? <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{p.about}</p> : null}
						{p.careerObjective ? (
							<p className="ev-muted" style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>
								{p.careerObjective}
							</p>
						) : null}
					</div>
				)}

				{Array.isArray(p.experience) && p.experience.length > 0 ? (
					<div className="ev-card" style={{ marginBottom: 12 }}>
						<h3>Experience</h3>
						<ul>
							{p.experience.map((x: any) => (
								<li key={x.id || `${x.title}-${x.company}`}>
									<strong>{x.title}</strong>
									{x.company ? ` @ ${x.company}` : ''}{' '}
									<span className="ev-muted">
										({x.startYear || '?'}–{x.currentlyWorking ? 'Present' : x.endYear || '?'})
									</span>
								</li>
							))}
						</ul>
					</div>
				) : null}

				{Array.isArray(p.education) && p.education.length > 0 ? (
					<div className="ev-card" style={{ marginBottom: 12 }}>
						<h3>Education</h3>
						<ul>
							{p.education.map((ed: any) => (
								<li key={ed.id || ed.college}>
									<strong>{ed.degree || '—'}</strong>
									{ed.college ? ` · ${ed.college}` : ''}
								</li>
							))}
						</ul>
					</div>
				) : null}

				{skills.length > 0 ? (
					<div className="ev-card" style={{ marginBottom: 12 }}>
						<h3>Skills</h3>
						<p style={{ margin: 0 }}>{skills.join(' · ')}</p>
					</div>
				) : null}

				{Array.isArray(p.projects) && p.projects.length > 0 ? (
					<div className="ev-card" style={{ marginBottom: 12 }}>
						<h3>Projects</h3>
						<ul>
							{p.projects.map((pr: any) => (
								<li key={pr.id || pr.name}>
									<strong>{pr.name}</strong>
									{pr.role ? ` — ${pr.role}` : ''}
								</li>
							))}
						</ul>
					</div>
				) : null}

				{Array.isArray(p.certifications) && p.certifications.length > 0 ? (
					<div className="ev-card" style={{ marginBottom: 12 }}>
						<h3>Certifications</h3>
						<ul>
							{p.certifications.map((c: any) => (
								<li key={c.id || c.name}>
									<strong>{c.name}</strong>
									{c.organization ? ` · ${c.organization}` : ''}
								</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
		);
	}

	return (
		<div className="ev-shell">
			<div className="ev-card" style={{ maxWidth: 480 }}>
				<h2 style={{ margin: 0 }}>View another employee</h2>
				<p className="ev-muted" style={{ marginTop: 8 }}>
					Enter their employee ID. An OTP is emailed to <strong>their</strong> registered email (not
					yours). Ask them to share the code, then enter it below for a read-only view.
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
