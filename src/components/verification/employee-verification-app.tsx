'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GoogleSignInButton } from '@/components/ui/google-sign-in-button';
import { firebaseAuth, googleProvider } from '@/lib/firebase-client';
import { signInWithPopup } from 'firebase/auth';

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
	joinedAt?: string;
};

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

function ScoreBar({ label, value }: { label: string; value: number }) {
	const color = value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500';
	return (
		<div>
			<div className="mb-1 flex justify-between text-[11px] text-zinc-400">
				<span>{label}</span>
				<span className="font-mono text-zinc-200">{value}</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
				<div className={`h-full ${color}`} style={{ width: `${Math.max(4, value)}%` }} />
			</div>
		</div>
	);
}

export function EmployeeVerificationApp() {
	const [session, setSession] = useState<Session | null>(null);
	const [ready, setReady] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [q, setQ] = useState('');
	const [employees, setEmployees] = useState<EmpRow[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [dossier, setDossier] = useState<any | null>(null);
	const [dossierLoading, setDossierLoading] = useState(false);
	const [tab, setTab] = useState<'directory' | 'access'>('directory');

	// Access management (SUPER)
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
		} catch (err: any) {
			setError(String(err?.message || err));
		}
	}, [session?.token, q, authHeaders]);

	const loadDossier = useCallback(
		async (id: string) => {
			if (!session?.token) return;
			setDossierLoading(true);
			setSelectedId(id);
			try {
				const res = await fetch(`/api/verification/employees/${encodeURIComponent(id)}`, {
					headers: { ...authHeaders },
					cache: 'no-store',
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(data?.error || 'Failed to load dossier');
				setDossier(data);
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

	if (!ready) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#070B14] text-zinc-400">
				Loading…
			</div>
		);
	}

	if (!session) {
		return (
			<main className="min-h-screen bg-[#070B14] text-white">
				<div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8CFF]">wrkspace</p>
					<h1 className="mt-3 text-3xl font-semibold tracking-tight">Employee verification</h1>
					<p className="mt-2 text-sm leading-relaxed text-zinc-400">
						Company &amp; workspace reviewers only. Sign in with a wrkspace admin account, or a
						verification login shared by wrkspace.
					</p>

					{error ? (
						<p className="mt-4 rounded-md border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
							{error}
						</p>
					) : null}

					<form onSubmit={loginEmail} className="mt-8 space-y-3">
						<input
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Email"
							className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-[#0047FF]"
						/>
						<input
							type="password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Password"
							className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-[#0047FF]"
						/>
						<button
							type="submit"
							disabled={busy}
							className="w-full rounded-md bg-[#0047FF] py-2.5 text-sm font-semibold hover:bg-[#0036C7] disabled:opacity-50"
						>
							{busy ? 'Signing in…' : 'Sign in with email'}
						</button>
					</form>

					<div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-zinc-600">
						<div className="h-px flex-1 bg-zinc-800" />
						or
						<div className="h-px flex-1 bg-zinc-800" />
					</div>

					<GoogleSignInButton onClick={loginGoogle} disabled={busy} loading={busy} label="Continue with Google" />

					<p className="mt-8 text-center text-[11px] text-zinc-600">
						<a href="/" className="underline hover:text-zinc-400">
							Employee portal
						</a>
						{' · '}
						<a href="/admin" className="underline hover:text-zinc-400">
							Admin panel
						</a>
					</p>
				</div>
			</main>
		);
	}

	const insights = dossier?.insights;
	const emp = dossier?.employee;

	return (
		<main className="min-h-screen bg-[#070B14] text-white">
			<header className="border-b border-zinc-900 bg-[#0B1220]">
				<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B8CFF]">
							Employee verification
						</p>
						<p className="text-sm text-zinc-300">
							{session.user.email}
							{session.user.companyName ? ` · ${session.user.companyName}` : ''}
							<span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
								{session.user.role}
							</span>
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => {
								setTab('directory');
								setSelectedId(null);
								setDossier(null);
							}}
							className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
								tab === 'directory' ? 'bg-[#0047FF]' : 'bg-zinc-900 text-zinc-300'
							}`}
						>
							Directory
						</button>
						{session.user.role === 'SUPER' ? (
							<button
								type="button"
								onClick={() => setTab('access')}
								className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
									tab === 'access' ? 'bg-[#0047FF]' : 'bg-zinc-900 text-zinc-300'
								}`}
							>
								Company access
							</button>
						) : null}
						<button
							type="button"
							onClick={logout}
							className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
						>
							Sign out
						</button>
					</div>
				</div>
			</header>

			{error ? (
				<div className="mx-auto max-w-7xl px-4 pt-3">
					<p className="rounded-md border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
						{error}
					</p>
				</div>
			) : null}

			{tab === 'access' && session.user.role === 'SUPER' ? (
				<div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-2">
					<section className="space-y-4 rounded-xl border border-zinc-800 bg-[#0B1220] p-5">
						<h2 className="text-lg font-semibold">Add verification company</h2>
						<p className="text-xs text-zinc-400">
							Create a company, then create an email/password login to share with their HR for this
							portal only.
						</p>
						<input
							value={companyName}
							onChange={(e) => setCompanyName(e.target.value)}
							placeholder="Company name"
							className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
						/>
						<input
							value={companyEmail}
							onChange={(e) => setCompanyEmail(e.target.value)}
							placeholder="Contact email (optional)"
							className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
						/>
						<button
							type="button"
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
							className="rounded-md bg-[#0047FF] px-4 py-2 text-sm font-semibold"
						>
							Create company
						</button>

						<hr className="border-zinc-800" />

						<h3 className="font-semibold">Create login to share</h3>
						<input
							value={newUserEmail}
							onChange={(e) => setNewUserEmail(e.target.value)}
							placeholder="Login email"
							className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
						/>
						<input
							value={newUserPassword}
							onChange={(e) => setNewUserPassword(e.target.value)}
							placeholder="Temporary password"
							className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
						/>
						<select
							value={newUserCompanyId}
							onChange={(e) => setNewUserCompanyId(e.target.value)}
							className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
						>
							<option value="">Select company…</option>
							{companies.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
						<button
							type="button"
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
							className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold"
						>
							Create &amp; show share credentials
						</button>
						{accessMsg ? <p className="text-xs text-amber-200">{accessMsg}</p> : null}
					</section>

					<section className="rounded-xl border border-zinc-800 bg-[#0B1220] p-5">
						<h2 className="text-lg font-semibold">Existing access</h2>
						<ul className="mt-4 max-h-[520px] space-y-2 overflow-y-auto text-sm">
							{portalUsers.map((u) => (
								<li key={u.id} className="rounded-lg border border-zinc-800 px-3 py-2">
									<p className="font-semibold">{u.email}</p>
									<p className="text-[11px] text-zinc-400">
										{u.role} · {u.companyName || '—'} · {u.active ? 'active' : 'disabled'}
									</p>
									<p className="mt-1 font-mono text-[10px] text-zinc-500">pass: {u.password}</p>
								</li>
							))}
							{portalUsers.length === 0 ? (
								<li className="text-xs text-zinc-500">No portal users yet.</li>
							) : null}
						</ul>
					</section>
				</div>
			) : (
				<div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[340px_1fr]">
					<aside className="rounded-xl border border-zinc-800 bg-[#0B1220]">
						<div className="border-b border-zinc-800 p-3">
							<input
								value={q}
								onChange={(e) => setQ(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') void loadEmployees();
								}}
								placeholder="Search name, phone, wing…"
								className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
							/>
							<button
								type="button"
								onClick={() => void loadEmployees()}
								className="mt-2 w-full rounded-md border border-zinc-700 py-1.5 text-xs text-zinc-300"
							>
								Search / refresh ({employees.length})
							</button>
						</div>
						<ul className="max-h-[70vh] overflow-y-auto divide-y divide-zinc-900">
							{employees.map((e) => (
								<li key={e.id}>
									<button
										type="button"
										onClick={() => void loadDossier(e.id)}
										className={`w-full px-3 py-3 text-left hover:bg-zinc-900/80 ${
											selectedId === e.id ? 'bg-zinc-900' : ''
										}`}
									>
										<p className="truncate text-sm font-semibold">{e.name}</p>
										<p className="truncate text-[11px] text-zinc-400">
											{e.role} · {e.wingName}
										</p>
										<p className="truncate text-[11px] text-zinc-500">{e.phone}</p>
									</button>
								</li>
							))}
						</ul>
					</aside>

					<section className="min-h-[70vh] rounded-xl border border-zinc-800 bg-[#0B1220] p-5">
						{dossierLoading ? (
							<p className="text-sm text-zinc-400">Loading complete history…</p>
						) : !dossier ? (
							<div className="flex h-full min-h-[40vh] flex-col items-center justify-center text-center">
								<p className="text-lg font-semibold">Select an employee</p>
								<p className="mt-2 max-w-md text-sm text-zinc-400">
									Open a profile to review attendance, tasks, submissions, leaves, events, and
									company-facing strengths / risks.
								</p>
							</div>
						) : (
							<div className="space-y-6">
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div>
										<h2 className="text-2xl font-semibold tracking-tight">{emp?.name}</h2>
										<p className="mt-1 text-sm text-zinc-400">
											{emp?.role} · {emp?.wingName} · Lead: {emp?.wingLeadName}
										</p>
										<p className="mt-1 text-xs text-zinc-500">
											{emp?.email} · {emp?.phone} · ID {emp?.id} · tenure {emp?.tenureDays}d
										</p>
									</div>
									<div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-center">
										<p className="text-[10px] uppercase tracking-wider text-zinc-500">Overall</p>
										<p className="text-3xl font-bold text-white">{insights?.scores?.overall ?? '—'}</p>
									</div>
								</div>

								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
									{[
										['Attendance days', dossier.summary?.attendanceDays],
										['Tasks done / total', `${dossier.summary?.tasksCompleted}/${dossier.summary?.tasksTotal}`],
										['Submissions', dossier.summary?.submissionsTotal],
										['Leaves', dossier.summary?.leavesTotal],
									].map(([label, val]) => (
										<div key={String(label)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
											<p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
											<p className="mt-1 text-lg font-semibold">{val}</p>
										</div>
									))}
								</div>

								<div className="grid gap-4 lg:grid-cols-3">
									<div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 lg:col-span-1">
										<p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Scores</p>
										<ScoreBar label="Attendance reliability" value={insights?.scores?.attendanceReliability ?? 0} />
										<ScoreBar label="Task delivery" value={insights?.scores?.taskDelivery ?? 0} />
										<ScoreBar label="Submission discipline" value={insights?.scores?.submissionDiscipline ?? 0} />
									</div>
									<div className="space-y-3 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4">
										<p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Strengths</p>
										<ul className="list-disc space-y-1 pl-4 text-sm text-emerald-100/90">
											{(insights?.strengths || []).map((s: string) => (
												<li key={s}>{s}</li>
											))}
										</ul>
									</div>
									<div className="space-y-3 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
										<p className="text-xs font-bold uppercase tracking-wider text-amber-300">Weaknesses / watch</p>
										<ul className="list-disc space-y-1 pl-4 text-sm text-amber-100/90">
											{(insights?.weaknesses || []).map((s: string) => (
												<li key={s}>{s}</li>
											))}
										</ul>
										{(insights?.flags || []).length ? (
											<ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-rose-200">
												{insights.flags.map((s: string) => (
													<li key={s}>{s}</li>
												))}
											</ul>
										) : null}
									</div>
								</div>

								{(insights?.priorityNotes || []).length ? (
									<div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
										<p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
											Priority notes (company view)
										</p>
										<ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-zinc-300">
											{insights.priorityNotes.map((s: string) => (
												<li key={s}>{s}</li>
											))}
										</ul>
									</div>
								) : null}

								<HistoryBlock title="Attendance (recent)" rows={dossier.attendance} render={(a: any) => `${a.date} · in ${a.checkIn || '—'} · out ${a.checkOut || '—'} · ${a.status || ''}`} />
								<HistoryBlock title="Tasks" rows={dossier.tasks} render={(t: any) => `${t.title} · ${t.status} · due ${String(t.deadline || '').slice(0, 10)}`} />
								<HistoryBlock title="Work submissions" rows={dossier.submissions} render={(s: any) => `${s.title} · ${s.status} · ${s.hoursSpent ?? 0}h`} />
								<HistoryBlock title="Leaves" rows={dossier.leaves} render={(l: any) => `${l.type} · ${l.status} · ${String(l.startDate || '').slice(0, 10)} → ${String(l.endDate || '').slice(0, 10)}`} />
								<HistoryBlock title="Events (as representative)" rows={dossier.events} render={(ev: any) => `${ev.title} · ${String(ev.startDate || '').slice(0, 10)} · ${ev.venueAddress || ''}`} />
							</div>
						)}
					</section>
				</div>
			)}
		</main>
	);
}

function HistoryBlock({
	title,
	rows,
	render,
}: {
	title: string;
	rows: any[];
	render: (row: any) => string;
}) {
	const list = Array.isArray(rows) ? rows : [];
	return (
		<div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
			<p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
				{title} ({list.length})
			</p>
			{list.length === 0 ? (
				<p className="mt-2 text-sm text-zinc-500">No records.</p>
			) : (
				<ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[12px] text-zinc-300">
					{list.slice(0, 40).map((row, i) => (
						<li key={row.id || i} className="border-b border-zinc-900/80 py-1.5 font-mono">
							{render(row)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
