'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GoogleSignInButton } from '@/components/ui/google-sign-in-button';
import { firebaseAuth, googleProvider } from '@/lib/firebase-client';
import { signInWithPopup } from 'firebase/auth';
import './verification.css';

const SESSION_KEY = 'wrkspace_verification_session';

type PortalUser = {
	id: string;
	email: string;
	role: 'SUPER' | 'COMPANY';
	companyId?: string | null;
	companyName?: string | null;
	source: string;
};

type Session = { token: string; user: PortalUser };

type EmpRow = {
	id: string;
	name: string;
	email: string;
	phone: string;
	wingName: string;
	wingLeadName: string;
	role: string;
	photoUrl?: string | null;
	joinedAt?: string;
};

type DossierTab = 'overview' | 'attendance' | 'tasks' | 'submissions' | 'leaves' | 'events';

function loadSession(): Session | null {
	try {
		const raw = localStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Session;
		if (!parsed?.token || !parsed?.user?.email) return null;
		return parsed;
	} catch {
		return null;
	}
}

function saveSession(s: Session | null) {
	try {
		if (!s) localStorage.removeItem(SESSION_KEY);
		else localStorage.setItem(SESSION_KEY, JSON.stringify(s));
	} catch {
		/* ignore */
	}
}

function initials(name: string) {
	const p = name.trim().split(/\s+/).filter(Boolean);
	if (!p.length) return '?';
	if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
	return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
}

function scoreTone(v: number) {
	if (v >= 75) return 'good';
	if (v >= 50) return 'mid';
	return 'low';
}

function verdictFromScore(v: number) {
	if (v >= 80) return { label: 'Strong profile', hint: 'Reliable history signals for company review.' };
	if (v >= 65) return { label: 'Solid with notes', hint: 'Good baseline — check open flags below.' };
	if (v >= 45) return { label: 'Needs review', hint: 'Mixed signals — dig into attendance & tasks.' };
	return { label: 'High caution', hint: 'Limited or weak history — verify manually.' };
}

export function EmployeeVerificationApp() {
	const [session, setSession] = useState<Session | null>(null);
	const [ready, setReady] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPass, setShowPass] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [q, setQ] = useState('');
	const [wingFilter, setWingFilter] = useState('all');
	const [employees, setEmployees] = useState<EmpRow[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [dossier, setDossier] = useState<any | null>(null);
	const [dossierLoading, setDossierLoading] = useState(false);
	const [tab, setTab] = useState<'directory' | 'access'>('directory');
	const [dossierTab, setDossierTab] = useState<DossierTab>('overview');
	const [copied, setCopied] = useState('');

	const [companies, setCompanies] = useState<any[]>([]);
	const [portalUsers, setPortalUsers] = useState<any[]>([]);
	const [companyName, setCompanyName] = useState('');
	const [companyEmail, setCompanyEmail] = useState('');
	const [newUserEmail, setNewUserEmail] = useState('');
	const [newUserPassword, setNewUserPassword] = useState('');
	const [newUserCompanyId, setNewUserCompanyId] = useState('');
	const [accessMsg, setAccessMsg] = useState('');

	useEffect(() => {
		setSession(loadSession());
		setReady(true);
	}, []);

	const authHeaders = useMemo(() => {
		if (!session?.token) return {};
		return { Authorization: `Bearer ${session.token}` };
	}, [session?.token]);

	const wings = useMemo(() => {
		const set = new Set(employees.map((e) => e.wingName).filter(Boolean));
		return Array.from(set).sort();
	}, [employees]);

	const filteredEmployees = useMemo(() => {
		return employees.filter((e) => (wingFilter === 'all' ? true : e.wingName === wingFilter));
	}, [employees, wingFilter]);

	const logout = () => {
		saveSession(null);
		setSession(null);
		setEmployees([]);
		setDossier(null);
		setSelectedId(null);
	};

	const applyLogin = (data: any) => {
		const next = { token: data.token, user: data.user } as Session;
		saveSession(next);
		setSession(next);
		setError('');
	};

	const flashCopy = (label: string) => {
		setCopied(label);
		window.setTimeout(() => setCopied(''), 1600);
	};

	const copyText = async (text: string, label: string) => {
		try {
			await navigator.clipboard.writeText(text);
			flashCopy(label);
		} catch {
			/* ignore */
		}
	};

	const loginEmail = async (e: React.FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setError('');
		try {
			const res = await fetch('/api/verification/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || 'Login failed');
			applyLogin(data);
		} catch (err: any) {
			setError(String(err?.message || err));
		} finally {
			setBusy(false);
		}
	};

	const loginGoogle = async () => {
		if (!firebaseAuth) {
			setError('Google sign-in is not configured on this deployment.');
			return;
		}
		setBusy(true);
		setError('');
		try {
			const cred = await signInWithPopup(firebaseAuth, googleProvider);
			const gEmail = cred.user?.email;
			if (!gEmail) throw new Error('Google did not return an email');
			const res = await fetch('/api/verification/google', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: gEmail }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || 'Google login failed');
			applyLogin(data);
		} catch (err: any) {
			const code = String(err?.code || '');
			if (code.includes('popup-closed') || code.includes('cancelled')) setError('');
			else setError(String(err?.message || err));
		} finally {
			setBusy(false);
		}
	};

	const loadEmployees = useCallback(async () => {
		if (!session?.token) return;
		try {
			const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
			const res = await fetch(`/api/verification/employees${qs}`, {
				headers: { ...authHeaders },
				cache: 'no-store',
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || 'Failed to load employees');
			setEmployees(Array.isArray(data.employees) ? data.employees : []);
			setError('');
		} catch (err: any) {
			setError(String(err?.message || err));
		}
	}, [session?.token, q, authHeaders]);

	const loadDossier = useCallback(
		async (id: string) => {
			if (!session?.token) return;
			setDossierLoading(true);
			setSelectedId(id);
			setDossierTab('overview');
			try {
				const res = await fetch(`/api/verification/employees/${encodeURIComponent(id)}`, {
					headers: { ...authHeaders },
					cache: 'no-store',
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(data?.error || 'Failed to load dossier');
				setDossier(data);
				setError('');
			} catch (err: any) {
				setError(String(err?.message || err));
				setDossier(null);
			} finally {
				setDossierLoading(false);
			}
		},
		[session?.token, authHeaders],
	);

	const loadAccess = useCallback(async () => {
		if (!session?.token || session.user.role !== 'SUPER') return;
		try {
			const res = await fetch('/api/verification/companies', {
				headers: { ...authHeaders },
				cache: 'no-store',
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || 'Failed to load access');
			setCompanies(Array.isArray(data.companies) ? data.companies : []);
			setPortalUsers(Array.isArray(data.users) ? data.users : []);
		} catch (err: any) {
			setAccessMsg(String(err?.message || err));
		}
	}, [session, authHeaders]);

	useEffect(() => {
		if (!session) return;
		void loadEmployees();
	}, [session, loadEmployees]);

	useEffect(() => {
		if (session?.user.role === 'SUPER' && tab === 'access') void loadAccess();
	}, [session, tab, loadAccess]);

	const printReport = () => {
		window.print();
	};

	const copySummary = async () => {
		if (!dossier?.employee) return;
		const e = dossier.employee;
		const i = dossier.insights;
		const s = dossier.summary;
		const text = [
			`EMPLOYEE VERIFICATION — wrkspace`,
			`Name: ${e.name}`,
			`ID: ${e.id}`,
			`Role: ${e.role} · Wing: ${e.wingName}`,
			`Email: ${e.email} · Phone: ${e.phone}`,
			`Tenure: ${e.tenureDays} days`,
			`Overall score: ${i?.scores?.overall ?? '—'}`,
			`Attendance days: ${s?.attendanceDays} · Tasks ${s?.tasksCompleted}/${s?.tasksTotal} · Submissions ${s?.submissionsTotal} · Leaves ${s?.leavesTotal}`,
			`Strengths: ${(i?.strengths || []).join('; ')}`,
			`Weaknesses: ${(i?.weaknesses || []).join('; ')}`,
			`Flags: ${(i?.flags || []).join('; ') || 'none'}`,
			`Generated: ${new Date().toLocaleString()}`,
		].join('\n');
		await copyText(text, 'Summary copied');
	};

	if (!ready) {
		return (
			<div className="ev-root ev-loading">
				<div className="ev-spinner" />
				<p>Loading verification portal…</p>
			</div>
		);
	}

	if (!session) {
		return (
			<main className="ev-root ev-login">
				<div className="ev-login-grid">
					<aside className="ev-login-brand">
						<div className="ev-login-brand-inner">
							<img
								src="/branding/wrkspace-logo-on-dark.png"
								alt="wrkspace"
								className="ev-brand-logo"
								onError={(e) => {
									(e.target as HTMLImageElement).style.display = 'none';
								}}
							/>
							<p className="ev-kicker">Employee verification</p>
							<h1>Company-grade employee history</h1>
							<p className="ev-lead">
								Review attendance, tasks, submissions, leaves, and risk signals before you decide.
								This is not the employee app.
							</p>
							<ul className="ev-brand-points">
								<li>Full workplace dossier per employee</li>
								<li>Strengths, weaknesses &amp; priority notes</li>
								<li>Share read access with partner companies</li>
							</ul>
						</div>
					</aside>

					<section className="ev-login-panel">
						<div className="ev-login-card">
							<p className="ev-kicker">Sign in</p>
							<h2>Verification access</h2>
							<p className="ev-sub">
								Use your <strong>Admin panel</strong> email &amp; password — or a company login
								shared by wrkspace.
							</p>

							<LoginHintsBox
								onPickEmail={(em) => {
									setEmail(em);
									setError('');
								}}
							/>

							{error ? (
								<div className="ev-alert ev-alert-error" role="alert">
									<strong>{error}</strong>
									{error.toLowerCase().includes('invalid') ? (
										<span>
											Employee portal logins do not work here. Use an admin account from the list
											above.
										</span>
									) : null}
								</div>
							) : null}

							<form onSubmit={loginEmail} className="ev-form">
								<label className="ev-field">
									<span>Admin / company email</span>
									<input
										type="email"
										required
										autoComplete="username"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="Tap an email above, or type it"
									/>
								</label>
								<label className="ev-field">
									<span>Password (same as Admin panel)</span>
									<div className="ev-pass-row">
										<input
											type={showPass ? 'text' : 'password'}
											required
											autoComplete="current-password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="Your /admin password"
										/>
										<button type="button" className="ev-ghost-btn" onClick={() => setShowPass((v) => !v)}>
											{showPass ? 'Hide' : 'Show'}
										</button>
									</div>
								</label>
								<button type="submit" disabled={busy} className="ev-btn ev-btn-primary">
									{busy ? 'Signing in…' : 'Sign in with email'}
								</button>
							</form>

							<div className="ev-or">
								<span>or</span>
							</div>

							<GoogleSignInButton
								onClick={loginGoogle}
								disabled={busy}
								loading={busy}
								label="Continue with Google (admin Gmail)"
							/>

							<nav className="ev-login-links">
								<a href="/admin">Admin panel</a>
								<a href="/">Employee portal</a>
							</nav>
						</div>
					</section>
				</div>
			</main>
		);
	}

	const insights = dossier?.insights;
	const emp = dossier?.employee;
	const overall = Number(insights?.scores?.overall ?? 0);
	const verdict = verdictFromScore(overall);

	return (
		<main className="ev-root ev-app">
			<header className="ev-topbar print:hidden">
				<div className="ev-topbar-inner">
					<div className="ev-topbar-brand">
						<img src="/branding/wrkspace-logo-on-dark.png" alt="" className="ev-top-logo" />
						<div>
							<p className="ev-kicker">Employee verification</p>
							<p className="ev-top-user">
								{session.user.email}
								{session.user.companyName ? ` · ${session.user.companyName}` : ''}
								<span className="ev-pill">{session.user.role}</span>
							</p>
						</div>
					</div>
					<div className="ev-topbar-actions">
						{copied ? <span className="ev-toast">{copied}</span> : null}
						<button
							type="button"
							className={`ev-nav-btn ${tab === 'directory' ? 'is-active' : ''}`}
							onClick={() => {
								setTab('directory');
							}}
						>
							Directory
						</button>
						{session.user.role === 'SUPER' ? (
							<button
								type="button"
								className={`ev-nav-btn ${tab === 'access' ? 'is-active' : ''}`}
								onClick={() => setTab('access')}
							>
								Company access
							</button>
						) : null}
						<button type="button" className="ev-nav-btn ev-nav-muted" onClick={logout}>
							Sign out
						</button>
					</div>
				</div>
			</header>

			{error ? (
				<div className="ev-shell">
					<div className="ev-alert ev-alert-error print:hidden">{error}</div>
				</div>
			) : null}

			{tab === 'access' && session.user.role === 'SUPER' ? (
				<div className="ev-shell ev-access-grid print:hidden">
					<section className="ev-card">
						<h2>Add verification company</h2>
						<p className="ev-muted">
							Create a company, then create an email/password to share with their HR for this portal
							only.
						</p>
						<div className="ev-form">
							<label className="ev-field">
								<span>Company name</span>
								<input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Pvt Ltd" />
							</label>
							<label className="ev-field">
								<span>Contact email (optional)</span>
								<input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="hr@company.com" />
							</label>
							<button
								type="button"
								className="ev-btn ev-btn-primary"
								onClick={async () => {
									setAccessMsg('');
									const res = await fetch('/api/verification/companies', {
										method: 'POST',
										headers: { 'Content-Type': 'application/json', ...authHeaders },
										body: JSON.stringify({
											action: 'create_company',
											name: companyName,
											contactEmail: companyEmail,
										}),
									});
									const data = await res.json().catch(() => ({}));
									if (!res.ok) setAccessMsg(data?.error || 'Failed');
									else {
										setAccessMsg(`Company created: ${data.company?.name}`);
										setCompanyName('');
										setCompanyEmail('');
										void loadAccess();
									}
								}}
							>
								Create company
							</button>
						</div>

						<hr className="ev-hr" />

						<h3>Create login to share</h3>
						<div className="ev-form">
							<label className="ev-field">
								<span>Login email</span>
								<input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="partner@company.com" />
							</label>
							<label className="ev-field">
								<span>Temporary password</span>
								<input value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Set a strong temporary password" />
							</label>
							<label className="ev-field">
								<span>Company</span>
								<select value={newUserCompanyId} onChange={(e) => setNewUserCompanyId(e.target.value)}>
									<option value="">Select company…</option>
									{companies.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</select>
							</label>
							<button
								type="button"
								className="ev-btn ev-btn-success"
								onClick={async () => {
									setAccessMsg('');
									const res = await fetch('/api/verification/companies', {
										method: 'POST',
										headers: { 'Content-Type': 'application/json', ...authHeaders },
										body: JSON.stringify({
											action: 'create_user',
											email: newUserEmail,
											password: newUserPassword,
											companyId: newUserCompanyId,
											role: 'COMPANY',
										}),
									});
									const data = await res.json().catch(() => ({}));
									if (!res.ok) setAccessMsg(data?.error || 'Failed');
									else {
										setAccessMsg(data.shareHint || 'User created');
										setNewUserEmail('');
										setNewUserPassword('');
										void loadAccess();
									}
								}}
							>
								Create &amp; show share credentials
							</button>
						</div>
						{accessMsg ? <p className="ev-access-msg">{accessMsg}</p> : null}
					</section>

					<section className="ev-card">
						<div className="ev-card-head">
							<h2>Existing access</h2>
							<span className="ev-count">{portalUsers.length}</span>
						</div>
						<ul className="ev-access-list">
							{portalUsers.map((u) => (
								<li key={u.id} className="ev-access-item">
									<div>
										<p className="ev-access-email">{u.email}</p>
										<p className="ev-muted">
											{u.role} · {u.companyName || '—'} · {u.active ? 'active' : 'disabled'}
										</p>
										<p className="ev-mono">pass: {u.password}</p>
									</div>
									<button
										type="button"
										className="ev-ghost-btn"
										onClick={() =>
											void copyText(`${u.email} / ${u.password}`, 'Credentials copied')
										}
									>
										Copy
									</button>
								</li>
							))}
							{portalUsers.length === 0 ? (
								<li className="ev-muted">No portal users yet — create one on the left.</li>
							) : null}
						</ul>
					</section>
				</div>
			) : (
				<div className="ev-shell ev-workspace">
					<aside className="ev-sidebar print:hidden">
						<div className="ev-sidebar-tools">
							<div className="ev-stats-row">
								<div className="ev-stat">
									<span>People</span>
									<strong>{filteredEmployees.length}</strong>
								</div>
								<div className="ev-stat">
									<span>Wings</span>
									<strong>{wings.length}</strong>
								</div>
							</div>
							<input
								value={q}
								onChange={(e) => setQ(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') void loadEmployees();
								}}
								placeholder="Search name, phone, wing, ID…"
								className="ev-input"
							/>
							<select
								value={wingFilter}
								onChange={(e) => setWingFilter(e.target.value)}
								className="ev-input"
							>
								<option value="all">All wings</option>
								{wings.map((w) => (
									<option key={w} value={w}>
										{w}
									</option>
								))}
							</select>
							<button type="button" className="ev-btn ev-btn-ghost" onClick={() => void loadEmployees()}>
								Refresh directory
							</button>
						</div>
						<ul className="ev-emp-list">
							{filteredEmployees.map((e) => (
								<li key={e.id}>
									<button
										type="button"
										onClick={() => void loadDossier(e.id)}
										className={`ev-emp-row ${selectedId === e.id ? 'is-active' : ''}`}
									>
										{e.photoUrl ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img src={e.photoUrl} alt="" className="ev-avatar" />
										) : (
											<span className="ev-avatar ev-avatar-fallback">{initials(e.name)}</span>
										)}
										<span className="ev-emp-meta">
											<span className="ev-emp-name">{e.name}</span>
											<span className="ev-emp-sub">
												{e.role} · {e.wingName}
											</span>
											<span className="ev-emp-sub">{e.phone}</span>
										</span>
									</button>
								</li>
							))}
							{filteredEmployees.length === 0 ? (
								<li className="ev-empty-side">No employees match.</li>
							) : null}
						</ul>
					</aside>

					<section className="ev-main">
						{dossierLoading ? (
							<div className="ev-empty-main">
								<div className="ev-spinner" />
								<p>Loading complete history…</p>
							</div>
						) : !dossier ? (
							<div className="ev-empty-main">
								<div className="ev-empty-art" aria-hidden />
								<h2>Select an employee</h2>
								<p>
									Open a profile to review attendance, tasks, submissions, leaves, events, and
									company-facing strengths / risks.
								</p>
							</div>
						) : (
							<div className="ev-dossier" id="ev-print-area">
								<div className="ev-dossier-hero">
									<div className="ev-dossier-identity">
										{emp?.photoUrl ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img src={emp.photoUrl} alt="" className="ev-avatar-lg" />
										) : (
											<span className="ev-avatar-lg ev-avatar-fallback">
												{initials(emp?.name || '?')}
											</span>
										)}
										<div>
											<p className="ev-kicker print:hidden">Employee dossier</p>
											<h1>{emp?.name}</h1>
											<p className="ev-dossier-line">
												{emp?.role} · {emp?.wingName} · Lead: {emp?.wingLeadName}
											</p>
											<p className="ev-dossier-line ev-mono">
												{emp?.email} · {emp?.phone} · ID {emp?.id} · {emp?.tenureDays}d tenure
											</p>
											<div className="ev-inline-actions print:hidden">
												<a className="ev-chip" href={`mailto:${emp?.email}`}>
													Email
												</a>
												<a className="ev-chip" href={`tel:${emp?.phone}`}>
													Call
												</a>
												<button
													type="button"
													className="ev-chip"
													onClick={() => void copyText(emp?.email || '', 'Email copied')}
												>
													Copy email
												</button>
												<button
													type="button"
													className="ev-chip"
													onClick={() => void copyText(emp?.phone || '', 'Phone copied')}
												>
													Copy phone
												</button>
											</div>
										</div>
									</div>
									<div className={`ev-score-card tone-${scoreTone(overall)}`}>
										<p>Overall</p>
										<strong>{insights?.scores?.overall ?? '—'}</strong>
										<span>{verdict.label}</span>
										<em>{verdict.hint}</em>
									</div>
								</div>

								<div className="ev-toolbar print:hidden">
									<div className="ev-tabs">
										{(
											[
												['overview', 'Overview'],
												['attendance', 'Attendance'],
												['tasks', 'Tasks'],
												['submissions', 'Submissions'],
												['leaves', 'Leaves'],
												['events', 'Events'],
											] as const
										).map(([id, label]) => (
											<button
												key={id}
												type="button"
												className={`ev-tab ${dossierTab === id ? 'is-active' : ''}`}
												onClick={() => setDossierTab(id)}
											>
												{label}
											</button>
										))}
									</div>
									<div className="ev-toolbar-right">
										<button type="button" className="ev-btn ev-btn-ghost" onClick={() => void copySummary()}>
											Copy summary
										</button>
										<button type="button" className="ev-btn ev-btn-primary" onClick={printReport}>
											Print / PDF
										</button>
									</div>
								</div>

								{dossierTab === 'overview' ? (
									<div className="ev-overview">
										<div className="ev-kpi-grid">
											{[
												['Attendance days', dossier.summary?.attendanceDays],
												['Tasks done', `${dossier.summary?.tasksCompleted}/${dossier.summary?.tasksTotal}`],
												['Submissions', dossier.summary?.submissionsTotal],
												['Leaves', dossier.summary?.leavesTotal],
												['Events', dossier.summary?.eventsAsRep],
												['SOS count', dossier.summary?.sosCount],
											].map(([label, val]) => (
												<div key={String(label)} className="ev-kpi">
													<span>{label}</span>
													<strong>{val}</strong>
												</div>
											))}
										</div>

										<div className="ev-insight-grid">
											<div className="ev-card ev-card-tight">
												<h3>Performance scores</h3>
												<ScoreBar label="Attendance reliability" value={insights?.scores?.attendanceReliability ?? 0} />
												<ScoreBar label="Task delivery" value={insights?.scores?.taskDelivery ?? 0} />
												<ScoreBar label="Submission discipline" value={insights?.scores?.submissionDiscipline ?? 0} />
											</div>
											<div className="ev-card ev-card-tight ev-card-good">
												<h3>Strengths</h3>
												<ul>
													{(insights?.strengths || []).map((s: string) => (
														<li key={s}>{s}</li>
													))}
												</ul>
											</div>
											<div className="ev-card ev-card-tight ev-card-warn">
												<h3>Weaknesses / watch</h3>
												<ul>
													{(insights?.weaknesses || []).map((s: string) => (
														<li key={s}>{s}</li>
													))}
												</ul>
												{(insights?.flags || []).length ? (
													<ul className="ev-flags">
														{insights.flags.map((s: string) => (
															<li key={s}>{s}</li>
														))}
													</ul>
												) : null}
											</div>
										</div>

										{(insights?.priorityNotes || []).length ? (
											<div className="ev-card">
												<h3>Priority notes (company view)</h3>
												<ul className="ev-notes">
													{insights.priorityNotes.map((s: string) => (
														<li key={s}>{s}</li>
													))}
												</ul>
											</div>
										) : null}

										<div className="ev-card print:hidden">
											<h3>Quick history peek</h3>
											<p className="ev-muted">Open tabs above for full tables.</p>
											<ul className="ev-peek">
												<li>Latest attendance: {peek(dossier.attendance, (a) => `${a.date} · ${a.checkIn || '—'} → ${a.checkOut || '—'}`)}</li>
												<li>Latest task: {peek(dossier.tasks, (t) => `${t.title} (${t.status})`)}</li>
												<li>Latest submission: {peek(dossier.submissions, (s) => `${s.title} (${s.status})`)}</li>
											</ul>
										</div>
									</div>
								) : null}

								{dossierTab === 'attendance' ? (
									<HistoryTable
										title="Attendance"
										rows={dossier.attendance}
										columns={['Date', 'Check-in', 'Check-out', 'Status']}
										cell={(a: any) => [a.date, a.checkIn || '—', a.checkOut || '—', a.status || '—']}
									/>
								) : null}
								{dossierTab === 'tasks' ? (
									<HistoryTable
										title="Tasks"
										rows={dossier.tasks}
										columns={['Title', 'Status', 'Mode', 'Deadline']}
										cell={(t: any) => [t.title, t.status, t.mode || '—', String(t.deadline || '').slice(0, 10) || '—']}
									/>
								) : null}
								{dossierTab === 'submissions' ? (
									<HistoryTable
										title="Work submissions"
										rows={dossier.submissions}
										columns={['Title', 'Status', 'Hours', 'Submitted']}
										cell={(s: any) => [
											s.title,
											s.status,
											String(s.hoursSpent ?? 0),
											String(s.submittedAt || '').slice(0, 10) || '—',
										]}
									/>
								) : null}
								{dossierTab === 'leaves' ? (
									<HistoryTable
										title="Leaves"
										rows={dossier.leaves}
										columns={['Type', 'Status', 'From', 'To']}
										cell={(l: any) => [
											l.type,
											l.status,
											String(l.startDate || '').slice(0, 10),
											String(l.endDate || '').slice(0, 10),
										]}
									/>
								) : null}
								{dossierTab === 'events' ? (
									<HistoryTable
										title="Events (as representative)"
										rows={dossier.events}
										columns={['Title', 'Start', 'Venue']}
										cell={(ev: any) => [
											ev.title,
											String(ev.startDate || '').slice(0, 10),
											ev.venueAddress || '—',
										]}
									/>
								) : null}
							</div>
						)}
					</section>
				</div>
			)}
		</main>
	);
}

function peek(rows: any[], render: (r: any) => string) {
	if (!Array.isArray(rows) || !rows.length) return '—';
	return render(rows[0]);
}

function ScoreBar({ label, value }: { label: string; value: number }) {
	const tone = scoreTone(value);
	return (
		<div className="ev-scorebar">
			<div className="ev-scorebar-label">
				<span>{label}</span>
				<span>{value}</span>
			</div>
			<div className="ev-scorebar-track">
				<div className={`ev-scorebar-fill tone-${tone}`} style={{ width: `${Math.max(4, value)}%` }} />
			</div>
		</div>
	);
}

function HistoryTable({
	title,
	rows,
	columns,
	cell,
}: {
	title: string;
	rows: any[];
	columns: string[];
	cell: (row: any) => (string | number)[];
}) {
	const list = Array.isArray(rows) ? rows : [];
	return (
		<div className="ev-card ev-table-card">
			<div className="ev-card-head">
				<h3>{title}</h3>
				<span className="ev-count">{list.length}</span>
			</div>
			{list.length === 0 ? (
				<p className="ev-muted">No records.</p>
			) : (
				<div className="ev-table-wrap">
					<table className="ev-table">
						<thead>
							<tr>
								{columns.map((c) => (
									<th key={c}>{c}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{list.slice(0, 80).map((row, i) => (
								<tr key={row.id || i}>
									{cell(row).map((v, j) => (
										<td key={j}>{v}</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function LoginHintsBox({ onPickEmail }: { onPickEmail: (email: string) => void }) {
	const [hints, setHints] = useState<{
		workspaceAdmins: { email: string; org: string }[];
		companyLogins: { email: string; role: string; company: string | null }[];
	} | null>(null);

	useEffect(() => {
		void fetch('/api/verification/login-hints', { cache: 'no-store' })
			.then((r) => r.json())
			.then((data) => {
				if (data?.workspaceAdmins) setHints(data);
			})
			.catch(() => {});
	}, []);

	return (
		<div className="ev-hints">
			<p className="ev-hints-title">Allowed accounts (tap email to fill)</p>
			{hints ? (
				<>
					<div className="ev-hints-group">
						<span>Workspace admins</span>
						{hints.workspaceAdmins.length === 0 ? (
							<p className="ev-muted">None found</p>
						) : (
							hints.workspaceAdmins.map((a) => (
								<button key={a.email} type="button" className="ev-hint-email" onClick={() => onPickEmail(a.email)}>
									{a.email}
									<em>{a.org}</em>
								</button>
							))
						)}
					</div>
					{hints.companyLogins.length > 0 ? (
						<div className="ev-hints-group">
							<span>Company logins</span>
							{hints.companyLogins.map((u) => (
								<button key={u.email} type="button" className="ev-hint-email is-company" onClick={() => onPickEmail(u.email)}>
									{u.email}
									<em>{u.company || u.role}</em>
								</button>
							))}
						</div>
					) : null}
					<p className="ev-hints-foot">Password = the one used on Admin panel (/admin).</p>
				</>
			) : (
				<p className="ev-muted">Loading allowed emails…</p>
			)}
		</div>
	);
}
