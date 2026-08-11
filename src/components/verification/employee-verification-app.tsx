'use client';

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleSignInButton } from '@/components/ui/google-sign-in-button';
import { firebaseAuth, googleProvider } from '@/lib/firebase-client';
import { signInWithPopup } from 'firebase/auth';
import { EmployeeProfessionalProfileEditor } from '@/components/ui/employee-professional-profile';
import { PeerColleagueView } from '@/components/verification/peer-colleague-view';
import { GrainGradient } from '@paper-design/shaders-react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import './verification.css';


const LOGIN_ANIMATION_SRC =
	'https://cdnl.iconscout.com/lottie/premium/preview-watermark/businesswoman-access-sensitive-information-using-login-password-animation-gif-download-13352243.mp4';

function VerificationAccessAnimation() {
	return (
		<div className="ev-login-anim">
			<video
				className="ev-login-anim-video"
				src={LOGIN_ANIMATION_SRC}
				autoPlay
				muted
				loop
				playsInline
				preload="auto"
				aria-label="Secure login animation"
			/>
		</div>
	);
}

function SocialButton({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-black/25 bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-black/[0.03] disabled:opacity-50 sm:text-sm cursor-pointer"
		>
			<span className="shrink-0">{icon}</span>
			<span className="whitespace-nowrap truncate">{label}</span>
		</button>
	);
}

function GoogleIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
				fill="#4285F4"
			/>
			<path
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
				fill="#34A853"
			/>
			<path
				d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z"
				fill="#FBBC05"
			/>
			<path
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
				fill="#EB4335"
			/>
		</svg>
	);
}

function AppleIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M17.05 12.54c-.03-3.02 2.47-4.47 2.58-4.54-1.41-2.06-3.6-2.34-4.38-2.37-1.86-.19-3.64 1.1-4.58 1.1-.95 0-2.42-1.07-3.98-1.04-2.05.03-3.94 1.19-4.99 3.02-2.13 3.69-.54 9.16 1.53 12.15 1.01 1.46 2.22 3.1 3.81 3.04 1.53-.06 2.11-.99 3.96-.99s2.37.99 3.99.96c1.65-.03 2.69-1.49 3.69-2.96 1.16-1.69 1.64-3.33 1.66-3.41-.04-.02-3.2-1.23-3.24-4.87ZM14.03 3.66c.84-1.02 1.41-2.43 1.25-3.84-1.21.05-2.68.81-3.55 1.83-.78.9-1.46 2.34-1.28 3.72 1.35.1 2.73-.69 3.58-1.71Z" />
		</svg>
	);
}

const SESSION_KEY = 'wrkspace_verification_session';
const EMP_TOKEN_KEY = 'wrkspace_employee_token';

type PortalUser = {
	id: string;
	email: string;
	role: 'SUPER' | 'COMPANY' | 'EMPLOYEE';
	companyId?: string | null;
	companyName?: string | null;
	source: string;
	
	employeeId?: string | null;
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
	employmentStatus?: string;
};

type DossierTab = 'overview' | 'attendance' | 'tasks' | 'submissions' | 'leaves' | 'events' | 'edit_profile';
type AppTab = 'directory' | 'access' | 'my_profile' | 'peer_view';
type EmpSelfTab = 'my_profile' | 'peer_view';

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
		
	}
}

function initials(name: string) {
	const p = name.trim().split(/\s+/).filter(Boolean);
	if (!p.length) return '?';
	if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
	return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
}

export function EmployeeVerificationApp() {
	const [session, setSession] = useState<Session | null>(null);
	const [ready, setReady] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPass, setShowPass] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	const [isEmployeeIdLogin, setIsEmployeeIdLogin] = useState(false);
	const [employeeIdInput, setEmployeeIdInput] = useState('');
	const [otpStep, setOtpStep] = useState<'input_id' | 'verify_otp'>('input_id');
	const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
	const [maskedOtpEmail, setMaskedOtpEmail] = useState('');
	const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

	const [empRecord, setEmpRecord] = useState<any | null>(null);
	const [ownProfileLoading, setOwnProfileLoading] = useState(false);
	const [statusSaving, setStatusSaving] = useState(false);
	const [q, setQ] = useState('');
	const [wingFilter, setWingFilter] = useState('all');
	const [employees, setEmployees] = useState<EmpRow[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [dossier, setDossier] = useState<any | null>(null);
	const [dossierLoading, setDossierLoading] = useState(false);
	const [tab, setTab] = useState<AppTab>('directory');
	const [empSelfTab, setEmpSelfTab] = useState<EmpSelfTab>('my_profile');
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

	
	useEffect(() => {
		if (!ready || !session) return;
		if (session.user.role === 'COMPANY') {
			logout();
			setError('This portal is for employees and admins only.');
		}
		
	}, [ready, session?.user.role]);

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
		setEmpRecord(null);
		try {
			localStorage.removeItem(EMP_TOKEN_KEY);
		} catch {
			
		}
	};

	const applyLogin = (data: any) => {
		const next = { token: data.token, user: data.user } as Session;
		saveSession(next);
		setSession(next);
		setError('');
		if (data.employeeToken) {
			try {
				localStorage.setItem(EMP_TOKEN_KEY, data.employeeToken);
			} catch {
				
			}
		}
		if (data.linkedEmployee) {
			setEmpRecord(data.linkedEmployee);
		}
	};

	





	const handleOtpChange = (index: number, val: string) => {
		const clean = val.replace(/\D/g, '').slice(-1);
		const nextDigits = [...otpDigits];
		nextDigits[index] = clean;
		setOtpDigits(nextDigits);

		// Move focus to next input
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
			} else {
				const nextDigits = [...otpDigits];
				nextDigits[index] = '';
				setOtpDigits(nextDigits);
			}
		}
	};

	const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
		const nextDigits = [...otpDigits];
		for (let i = 0; i < 6; i++) {
			nextDigits[i] = pasted[i] || '';
		}
		setOtpDigits(nextDigits);
		
		// Focus last filled or first empty
		const focusIndex = Math.min(pasted.length, 5);
		otpRefs.current[focusIndex]?.focus();
	};

	const handleSendLoginOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setError('');
		try {
			const res = await fetch('/api/auth/send-login-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ employeeId: employeeIdInput }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || 'Failed to send OTP');
			
			setMaskedOtpEmail(data.email || 'your registered email');
			setOtpDigits(['', '', '', '', '', '']);
			setOtpStep('verify_otp');
		} catch (err: any) {
			setError(String(err?.message || err));
		} finally {
			setBusy(false);
		}
	};

	const handleVerifyLoginOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		const otp = otpDigits.join('');
		if (otp.length !== 6) {
			setError('Please enter a 6-digit OTP code.');
			return;
		}
		setBusy(true);
		setError('');
		try {
			const res = await fetch('/api/auth/verify-login-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ employeeId: employeeIdInput, otp }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || 'Invalid OTP');

			const emp = data.employee || {};
			try {
				localStorage.setItem(EMP_TOKEN_KEY, data.token);
			} catch {}
			setEmpRecord(emp);
			const next: Session = {
				token: data.token,
				user: {
					id: emp.id,
					email: emp.email,
					role: 'EMPLOYEE',
					companyId: null,
					companyName: null,
					source: 'employee',
				},
			};
			saveSession(next);
			setSession(next);
		} catch (err: any) {
			setError(String(err?.message || err));
		} finally {
			setBusy(false);
		}
	};

	const loginUnified = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isEmployeeIdLogin) {
			if (otpStep === 'input_id') {
				await handleSendLoginOtp(e);
			} else {
				await handleVerifyLoginOtp(e);
			}
			return;
		}

		setBusy(true);
		setError('');
		try {
			const orgRes = await fetch('/api/verification/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});
			const orgData = await orgRes.json().catch(() => ({}));
			if (orgRes.ok) {
				applyLogin(orgData);
				return;
			}

			const empRes = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});
			const empData = await empRes.json().catch(() => ({}));
			if (empRes.ok) {
				const emp = empData.employee || {};
				
				try {
					localStorage.setItem(EMP_TOKEN_KEY, empData.token);
				} catch {
					
				}
				setEmpRecord(emp);
				const next: Session = {
					token: empData.token,
					user: {
						id: emp.id,
						email: emp.email,
						role: 'EMPLOYEE',
						companyId: null,
						companyName: null,
						source: 'employee',
					},
				};
				saveSession(next);
				setSession(next);
				return;
			}

			throw new Error(orgData?.error || empData?.error || 'Invalid email or password');
		} catch (err: any) {
			setError(String(err?.message || err));
		} finally {
			setBusy(false);
		}
	};

	
	const setEmploymentStatus = async (employeeId: string, status: 'Active' | 'Inactive') => {
		setStatusSaving(true);
		try {
			const res = await fetch(`/api/verification/employees/${encodeURIComponent(employeeId)}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', ...authHeaders },
				body: JSON.stringify({ employmentStatus: status }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || 'Failed to update status');
			setDossier((d: any) => (d ? { ...d, employee: { ...d.employee, employmentStatus: status } } : d));
			setEmployees((rows) => rows.map((r) => (r.id === employeeId ? { ...r, employmentStatus: status } : r)));
		} catch (err: any) {
			setError(String(err?.message || err));
		} finally {
			setStatusSaving(false);
		}
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

			
			if (data.kind === 'employee' || data.user?.role === 'EMPLOYEE') {
				const emp = data.employee || {};
				try {
					localStorage.setItem(EMP_TOKEN_KEY, data.token);
				} catch {
					
				}
				setEmpRecord(emp);
				const next: Session = {
					token: data.token,
					user: {
						id: emp.id || data.user?.id,
						email: emp.email || data.user?.email || gEmail,
						role: 'EMPLOYEE',
						companyId: null,
						companyName: null,
						source: 'employee',
					},
				};
				saveSession(next);
				setSession(next);
				return;
			}

			
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
		if (!session?.token || session.user.role === 'EMPLOYEE') return;
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
		if (!session || session.user.role === 'EMPLOYEE') return;
		void loadEmployees();
	}, [session, loadEmployees]);

	useEffect(() => {
		if (session?.user.role === 'SUPER' && tab === 'access') void loadAccess();
	}, [session, tab, loadAccess]);

	
	useEffect(() => {
		if (!session?.token || session.user.role !== 'SUPER') return;
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch('/api/verification/me', {
					headers: { ...authHeaders },
					cache: 'no-store',
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok || cancelled) return;
				if (data.employeeToken) {
					try {
						localStorage.setItem(EMP_TOKEN_KEY, data.employeeToken);
					} catch {
						
					}
				}
				if (data.linkedEmployee) setEmpRecord(data.linkedEmployee);
				if (data.employeeId && session.user.employeeId !== data.employeeId) {
					const next: Session = {
						...session,
						user: { ...session.user, employeeId: data.employeeId },
					};
					saveSession(next);
					setSession(next);
				}
			} catch {
				
			}
		})();
		return () => {
			cancelled = true;
		};
		
		
	}, [session?.token, session?.user.role, authHeaders]);

	
	useEffect(() => {
		if (!session?.token || session.user.role !== 'SUPER') return;
		if (tab !== 'my_profile') return;
		const id = session.user.employeeId || empRecord?.id;
		if (!id) return;
		let cancelled = false;
		setOwnProfileLoading(true);
		(async () => {
			try {
				const res = await fetch(`/api/verification/employees/${encodeURIComponent(id)}`, {
					headers: { ...authHeaders },
					cache: 'no-store',
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok || cancelled) return;
				if (data.employee) {
					setEmpRecord((prev: any) => ({ ...(prev || {}), ...data.employee }));
				}
			} catch {
				
			} finally {
				if (!cancelled) setOwnProfileLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [session?.token, session?.user.role, session?.user.employeeId, empRecord?.id, tab, authHeaders]);

	
	useEffect(() => {
		if (!session?.token || session.user.role !== 'EMPLOYEE') return;
		if (empRecord?.id) return;
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch('/api/auth/me', {
					headers: { Authorization: `Bearer ${session.token}` },
					cache: 'no-store',
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok || cancelled) return;
				if (data.employee) setEmpRecord(data.employee);
			} catch {
				
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [session?.token, session?.user.role, empRecord?.id]);

	const printReport = () => {
		window.print();
	};

	const copySummary = async () => {
		if (!dossier?.employee) return;
		const e = dossier.employee;
		const p = dossier.profile || {};
		const s = dossier.summary;
		const skillsFlat = Object.values(p.skills || {})
			.flat()
			.filter(Boolean);
		const text = [
			`EMPLOYEE VERIFICATION PORTAL`,
			`Name: ${e.name}${p.professionalTitle ? ` — ${p.professionalTitle}` : ''}`,
			`ID: ${e.id}`,
			`Role: ${e.role} · Wing: ${e.wingName}`,
			`Email: ${e.email} · Phone: ${e.phone}`,
			`Location: ${[p.city, p.state, p.country].filter(Boolean).join(', ') || '—'}`,
			`Tenure: ${e.tenureDays} days`,
			`Resume summary: ${p.about || '—'}`,
			`Career objective: ${p.careerObjective || '—'}`,
			`Years of experience: ${p.yearsOfExperience || '—'} · Industry: ${p.industry || '—'}`,
			`Remarks: ${p.remarks || '—'}`,
			`EC: ${[p.emergencyContactName, p.emergencyContactPhone, p.emergencyContactRelation].filter(Boolean).join(' · ') || '—'}`,
			`Education: ${(p.education || []).map((q: any) => q.degree).filter(Boolean).join('; ') || '—'}`,
			`Skills: ${skillsFlat.join(', ') || '—'}`,
			`Certifications: ${(p.certifications || []).map((c: any) => c.name).filter(Boolean).join('; ') || '—'}`,
			`Experience: ${(p.experience || []).map((x: any) => `${x.title}@${x.company}`).filter(Boolean).join('; ') || '—'}`,
			`Internships: ${(p.internships || []).map((x: any) => `${x.title}@${x.company}`).filter(Boolean).join('; ') || '—'}`,
			`Projects: ${(p.projects || []).map((pr: any) => pr.name).filter(Boolean).join('; ') || '—'}`,
			`Achievements: ${(p.achievements || []).map((a: any) => a.title).filter(Boolean).join('; ') || '—'}`,
			`Publications: ${(p.publications || []).map((pub: any) => pub.title).filter(Boolean).join('; ') || '—'}`,
			`Attendance days: ${s?.attendanceDays} · Tasks ${s?.tasksCompleted}/${s?.tasksTotal} · Submissions ${s?.submissionsTotal}`,
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
			<section className="min-h-screen bg-white p-3 text-black antialiased [font-synthesis:none]" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui' }}>
				<div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[1.18fr_0.82fr] xl:grid-cols-[1.22fr_0.78fr]">
					<div className="flex min-h-[600px] items-center rounded-md border border-black/20 bg-white px-6 py-8 sm:px-10 lg:min-h-0 lg:px-12 lg:py-14 shadow-sm">
						<div className="mx-auto w-full max-w-[510px] space-y-6">
							<div>
								<div className="mb-5 flex items-center justify-start">
									<img
										src="https://ik.imagekit.io/dypkhqxip/wrkspacenew"
										alt="wrkspace"
										className="h-11 sm:h-14 w-auto object-contain max-w-[220px]"
									/>
								</div>
								<h1 className="whitespace-nowrap text-2xl font-medium tracking-[-0.03em] sm:text-3xl lg:text-3xl xl:text-3xl text-slate-900">
									Employee Verification
								</h1>
								<p className="mt-1.5 text-xs text-slate-500 sm:text-sm">
									Verify credentials and manage professional dossier records
								</p>
							</div>

							{error ? (
								<div className="p-3 rounded-lg text-xs font-medium border bg-red-500/10 border-red-500/30 text-red-650 font-mono">
									{error}
								</div>
							) : null}

							{isEmployeeIdLogin ? (
								otpStep === 'verify_otp' ? (
									<form onSubmit={loginUnified} className="space-y-5">
										<div className="space-y-2">
											<p className="text-xs text-slate-500">
												We sent a 6-digit OTP code to <strong className="text-slate-800">{maskedOtpEmail}</strong>. Please enter the code below to verify your identity.
											</p>
											
											<div className="flex justify-between items-center gap-2 pt-2" onPaste={handleOtpPaste}>
												{otpDigits.map((digit, index) => (
													<input
														key={index}
														ref={(el) => {
															otpRefs.current[index] = el;
														}}
														type="text"
														inputMode="numeric"
														pattern="[0-9]*"
														maxLength={1}
														value={digit}
														onChange={(e) => handleOtpChange(index, e.target.value)}
														onKeyDown={(e) => handleOtpKeyDown(index, e)}
														className="w-11 h-11 md:w-12 md:h-12 text-center text-lg font-bold border border-black/25 bg-white text-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-[#E61E32] transition-all"
													/>
												))}
											</div>
										</div>

										<div className="flex justify-between items-center text-xs">
											<button
												type="button"
												onClick={handleSendLoginOtp}
												className="text-slate-500 hover:text-black transition-colors cursor-pointer"
											>
												Resend Code
											</button>
											<button
												type="button"
												onClick={() => {
													setOtpStep('input_id');
													setError('');
												}}
												className="text-[#E61E32] hover:text-[#c9182a] transition-colors underline cursor-pointer"
											>
												Change Employee ID
											</button>
										</div>

										<button
											type="submit"
											disabled={busy || otpDigits.join('').length !== 6}
											className="mt-6 flex h-11 w-full items-center justify-center rounded-[10px] border border-black/40 bg-black text-base font-bold text-white transition-all hover:bg-black/85 disabled:opacity-50 cursor-pointer shadow-sm"
										>
											{busy ? 'Verifying...' : 'Verify & Login'}
										</button>
									</form>
								) : (
									<form onSubmit={loginUnified} className="space-y-4">
										<label className="flex h-11 items-center justify-between gap-3 rounded-[10px] border border-black/25 bg-white px-4 text-sm leading-none">
											<input
												type="text"
												required
												value={employeeIdInput}
												onChange={(e) => setEmployeeIdInput(e.target.value)}
												placeholder="e.g. EMP123"
												className="min-w-0 flex-1 truncate bg-transparent text-slate-800 text-sm outline-none placeholder:text-black/30:text-white/35"
											/>
											<span className="shrink-0 text-slate-500 text-xs font-semibold">Employee ID</span>
										</label>

										<div className="mt-1.5 flex justify-end">
											<button
												type="button"
												onClick={() => {
													setIsEmployeeIdLogin(false);
													setError('');
												}}
												className="text-[11px] font-medium text-[#E61E32] hover:text-[#c9182a] transition-colors underline cursor-pointer"
											>
												Want to login with email instead?
											</button>
										</div>

										<button
											type="submit"
											disabled={busy}
											className="mt-6 flex h-11 w-full items-center justify-center rounded-[10px] border border-black/40 bg-black text-base font-bold text-white transition-all hover:bg-black/85 disabled:opacity-50 cursor-pointer shadow-sm"
										>
											{busy ? 'Signing in...' : 'Sign In'}
										</button>
									</form>
								)
							) : (
								<form onSubmit={loginUnified} className="space-y-4">
									<label className="flex h-11 items-center justify-between gap-3 rounded-[10px] border border-black/25 bg-white px-4 text-sm leading-none">
										<input
											type="email"
											required
											autoComplete="username"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="your.email@example.com"
											className="min-w-0 flex-1 truncate bg-transparent text-slate-800 text-sm outline-none placeholder:text-black/30:text-white/35"
										/>
										<span className="shrink-0 text-slate-500 text-xs font-semibold">Email</span>
									</label>

									<label className="flex h-11 items-center justify-between gap-3 rounded-[10px] border border-black/25 bg-white px-4 text-sm leading-none">
										<input
											type={showPass ? 'text' : 'password'}
											required
											autoComplete="current-password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="••••••••••••"
											className="min-w-0 flex-1 truncate bg-transparent text-slate-800 text-sm outline-none placeholder:text-black/30:text-white/35"
										/>
										<div className="flex items-center gap-2">
											<button
												type="button"
												className="text-slate-400 hover:text-[#E61E32] transition-colors cursor-pointer p-0.5"
												onClick={() => setShowPass((v) => !v)}
											>
												{showPass ? (
													<EyeOffIcon className="size-4" />
												) : (
													<EyeIcon className="size-4" />
												)}
											</button>
											<span className="shrink-0 text-slate-500 text-xs font-semibold border-l border-black/10 pl-2">Password</span>
										</div>
									</label>

									<div className="mt-1.5 flex justify-end">
										<button
											type="button"
											onClick={() => {
												setIsEmployeeIdLogin(true);
												setError('');
											}}
											className="text-[11px] font-medium text-black/50 hover:text-black transition-colors underline cursor-pointer"
										>
											Want to login with the <span className="text-[#E61E32] font-semibold">employee ID</span>?
										</button>
									</div>

									<button
										type="submit"
										disabled={busy}
										className="mt-6 flex h-11 w-full items-center justify-center rounded-[10px] border border-black/40 bg-black text-base font-bold text-white transition-all hover:bg-black/85 disabled:opacity-50 cursor-pointer shadow-sm"
									>
										{busy ? 'Signing in...' : 'Sign In'}
									</button>
								</form>
							)}

							<div className="my-5 text-center text-xs font-semibold uppercase tracking-wider text-black/40">
								or
							</div>

							<div className="grid grid-cols-2 gap-3">
								<SocialButton
									icon={<GoogleIcon />}
									label="Sign in with Google"
									onClick={loginGoogle}
									disabled={busy}
								/>
								<SocialButton
									icon={<AppleIcon />}
									label="Sign in with Apple"
									onClick={() => setError('Apple sign-in is coming soon.')}
									disabled={busy}
								/>
							</div>
						</div>
					</div>

					<div className="relative flex min-h-[550px] overflow-hidden rounded-md bg-black p-6 text-white sm:p-8 lg:min-h-0 lg:p-10">
						<GrainGradient
							speed={1}
							scale={1}
							rotation={0}
							offsetX={0}
							offsetY={0}
							softness={0.5}
							intensity={0.5}
							noise={0.25}
							shape="corners"
							frame={2854.5}
							colors={["#FFFFFF", "#FC7819", "#FC7819", "#FFFFFF"]}
							colorBack="#00000000"
							className="absolute inset-0 bg-black"
						/>

						<div className="relative z-10 flex h-full w-full flex-col justify-between">
							<div className="pt-2 lg:pt-6">
								<h2 className="text-3xl font-medium tracking-[-0.04em] text-white sm:text-4xl lg:text-[44px] lg:leading-[1.02] xl:text-[50px]">
									Verify credentials,
									<br />
									Access profiles
								</h2>
							</div>

							<div className="w-full text-center pb-1 text-xs font-medium text-white/60 tracking-wide">
								© 2026 Redlix Studio. All rights reserved.
							</div>
						</div>
					</div>
				</div>
			</section>
		);
	}

	if (session.user.role === 'EMPLOYEE') {
		return (
			<main className="ev-root ev-app">
				<header className="ev-topbar print:hidden">
					<div className="ev-topbar-inner">
						<div className="ev-topbar-brand">
							<div>
								<img
									src="https://ik.imagekit.io/dypkhqxip/wrkspacenew"
									alt="WrkSpace"
									className="ev-top-logo"
								/>
								<p className="ev-top-user">
									{[empRecord?.firstName, empRecord?.lastName].filter(Boolean).join(' ') ||
										session.user.email}
									<span className="ev-pill">Employee</span>
								</p>
							</div>
						</div>
						<div className="ev-topbar-actions">
							<button
								type="button"
								className={`ev-nav-btn ${empSelfTab === 'my_profile' ? 'is-active' : ''}`}
								onClick={() => setEmpSelfTab('my_profile')}
							>
								My profile
							</button>
							<button
								type="button"
								className={`ev-nav-btn ${empSelfTab === 'peer_view' ? 'is-active' : ''}`}
								onClick={() => setEmpSelfTab('peer_view')}
							>
								View colleague
							</button>
							<button type="button" className="ev-nav-btn ev-nav-muted" onClick={logout}>
								Sign out
							</button>
						</div>
					</div>
				</header>
				{empSelfTab === 'peer_view' ? (
					<PeerColleagueView authHeaders={authHeaders as Record<string, string>} />
				) : (
					<div className="ev-shell">
						<div className="ev-card" style={{ marginBottom: 16 }}>
							<h2 style={{ margin: 0 }}>My professional profile</h2>
							<p className="ev-muted" style={{ marginTop: 6 }}>
								Fill in your professional details here. Admins can review your full profile.
							</p>
						</div>
						{empRecord?.id ? (
							<EmployeeProfessionalProfileEditor employee={empRecord} onEmployeeUpdate={setEmpRecord} />
						) : (
							<p className="ev-muted">Loading your employee profile…</p>
						)}
					</div>
				)}
			</main>
		);
	}

	const emp = dossier?.employee;
	const isAdmin = session.user.role === 'SUPER';
	const linkedEmployeeId = session.user.employeeId || empRecord?.id || null;
	const hasOwnEmployeeProfile = Boolean(isAdmin && linkedEmployeeId);
	const ownProfileIncomplete = Boolean(
		hasOwnEmployeeProfile &&
			empRecord &&
			!(
				String(empRecord.professionalTitle || '').trim() && String(empRecord.about || '').trim()
			),
	);

	return (
		<main className="ev-root ev-app">
			<header className="ev-topbar print:hidden">
				<div className="ev-topbar-inner">
					<div className="ev-topbar-brand">
						<div>
							<img
								src="https://ik.imagekit.io/dypkhqxip/wrkspacenew"
								alt="WrkSpace"
								className="ev-top-logo"
							/>
							<p className="ev-top-user">
								{session.user.email}
								{session.user.companyName ? ` · ${session.user.companyName}` : ''}
								<span className="ev-pill">
									{hasOwnEmployeeProfile ? 'Admin · Technical' : session.user.role}
								</span>
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
						{hasOwnEmployeeProfile ? (
							<button
								type="button"
								className={`ev-nav-btn ${tab === 'my_profile' ? 'is-active' : ''}`}
								onClick={() => setTab('my_profile')}
							>
								My professional profile
							</button>
						) : null}
						{isAdmin || hasOwnEmployeeProfile ? (
							<button
								type="button"
								className={`ev-nav-btn ${tab === 'peer_view' ? 'is-active' : ''}`}
								onClick={() => setTab('peer_view')}
							>
								View colleague
							</button>
						) : null}
						{isAdmin ? (
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

			{ownProfileIncomplete && tab !== 'my_profile' ? (
				<div className="ev-shell print:hidden">
					<div className="ev-alert ev-alert-info" role="status">
						<strong>Complete your professional profile.</strong>
						<span>
							You manage everyone as admin — and you also need to fill your own professional details
							(Admin · Technical).
						</span>
						<button type="button" className="ev-btn ev-btn-primary" onClick={() => setTab('my_profile')}>
							Fill my profile
						</button>
					</div>
				</div>
			) : null}

			{tab === 'access' && isAdmin ? (
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
			) : tab === 'peer_view' ? (
				<PeerColleagueView authHeaders={authHeaders as Record<string, string>} />
			) : tab === 'my_profile' && hasOwnEmployeeProfile ? (
				<div className="ev-shell print:hidden">
					<div className="ev-card" style={{ marginBottom: 16 }}>
						<h2 style={{ margin: 0 }}>My professional profile</h2>
						<p className="ev-muted" style={{ marginTop: 6 }}>
							You are signed in as <strong>Admin · Technical</strong> — manage every employee from
							Directory, and complete your own professional details here.
						</p>
					</div>
					{empRecord?.id && !ownProfileLoading ? (
						<EmployeeProfessionalProfileEditor
							key={`${empRecord.id}-${String(empRecord.about || '').length}-${String(empRecord.experience || '').length}`}
							employee={empRecord}
							canEditRemarks
							onEmployeeUpdate={setEmpRecord}
							saveOverride={async (profile) => {
								const id = linkedEmployeeId || empRecord.id;
								const res = await fetch(`/api/verification/employees/${encodeURIComponent(id)}`, {
									method: 'PATCH',
									headers: { 'Content-Type': 'application/json', ...authHeaders },
									body: JSON.stringify(profile),
								});
								const data = await res.json().catch(() => ({}));
								if (!res.ok) throw new Error(data?.error || 'Failed to save profile');
								if (data.employee) {
									setEmpRecord((prev: any) => ({ ...(prev || {}), ...data.employee }));
								}
								return { employee: data.employee, profile: data.profile };
							}}
						/>
					) : (
						<div className="ev-card">
							<div className="ev-spinner" />
							<p className="ev-muted">Loading your employee profile…</p>
						</div>
					)}
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
											
											<img src={e.photoUrl} alt="" className="ev-avatar" />
										) : (
											<span className="ev-avatar ev-avatar-fallback">{initials(e.name)}</span>
										)}
										<span className="ev-emp-meta">
											<span className="ev-emp-name">
												{e.name}
												<span
													className={`ev-status-pill ev-status-pill-sm ${
														e.employmentStatus === 'Inactive' ? 'is-inactive' : 'is-active'
													}`}
												>
													{e.employmentStatus === 'Inactive' ? 'Inactive' : 'Active'}
												</span>
											</span>
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
									{isAdmin
										? 'Open a profile to review about, qualifications, certifications, experience, and workplace history.'
										: 'Open a profile to see their name, role, wing and active/inactive status.'}
								</p>
							</div>
						) : (
							<div className="ev-dossier" id="ev-print-area">
								<div className="ev-dossier-hero">
									<div className="ev-dossier-identity">
										{emp?.photoUrl ? (
											
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
								</div>

								<div className="ev-toolbar print:hidden">
									<div className="ev-tabs">
										{(
											isAdmin
												? ([
														['overview', 'Overview'],
														['attendance', 'Attendance'],
														['tasks', 'Tasks'],
														['submissions', 'Submissions'],
														['leaves', 'Leaves'],
														['events', 'Events'],
														['edit_profile', 'Edit profile (admin)'],
													] as [DossierTab, string][])
												: ([['overview', 'Overview']] as [DossierTab, string][])
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
										{(() => {
											
											
											if (!isAdmin) {
												return (
													<div className="ev-card">
														<h3>General information</h3>
														<div className="ev-info-grid">
															<div className="ev-info-item">
																<span>Employment status</span>
																<strong>
																	<span
																		className={`ev-status-pill ${
																			emp?.employmentStatus === 'Inactive' ? 'is-inactive' : 'is-active'
																		}`}
																	>
																		{emp?.employmentStatus === 'Inactive' ? 'Inactive' : 'Active'}
																	</span>
																</strong>
															</div>
															<div className="ev-info-item">
																<span>Role</span>
																<strong>{emp?.role || '—'}</strong>
															</div>
															<div className="ev-info-item">
																<span>Wing</span>
																<strong>{emp?.wingName || '—'}</strong>
															</div>
															<div className="ev-info-item">
																<span>Wing lead</span>
																<strong>{emp?.wingLeadName || '—'}</strong>
															</div>
															<div className="ev-info-item">
																<span>Email</span>
																<strong>{emp?.email || '—'}</strong>
															</div>
															<div className="ev-info-item">
																<span>Phone</span>
																<strong>{emp?.phone || '—'}</strong>
															</div>
															<div className="ev-info-item">
																<span>Tenure</span>
																<strong>{emp?.tenureDays != null ? `${emp.tenureDays} days` : '—'}</strong>
															</div>
															<div className="ev-info-item">
																<span>Joined</span>
																<strong>
																	{emp?.createdAt ? new Date(emp.createdAt).toLocaleDateString() : '—'}
																</strong>
															</div>
														</div>
														<p className="ev-muted" style={{ marginTop: 12 }}>
															The full professional profile (résumé, experience, education, skills,
															projects &amp; more) is only visible to portal admins.
														</p>
													</div>
												);
											}

											const p = dossier.profile || {};
											const education = Array.isArray(p.education) ? p.education : [];
											const certs = Array.isArray(p.certifications) ? p.certifications : [];
											const exp = Array.isArray(p.experience) ? p.experience : [];
											const internships = Array.isArray(p.internships) ? p.internships : [];
											const projs = Array.isArray(p.projects) ? p.projects : [];
											const achievements = Array.isArray(p.achievements) ? p.achievements : [];
											const publications = Array.isArray(p.publications) ? p.publications : [];
											const customSections = Array.isArray(p.customSections) ? p.customSections : [];
											const skills = p.skills || {};
											const skillGroups: [string, string][] = [
												['programmingLanguages', 'Programming Languages'],
												['frontend', 'Frontend'],
												['backend', 'Backend'],
												['database', 'Database'],
												['cloud', 'Cloud'],
												['devops', 'DevOps'],
												['tools', 'Tools'],
												['softSkills', 'Soft Skills'],
											];
											const hasAnySkill = skillGroups.some(([k]) => Array.isArray(skills[k]) && skills[k].length > 0);
											const hasEc =
												p.emergencyContactName || p.emergencyContactPhone || p.emergencyContactRelation;
											const links: [string, string, string][] = [
												['LinkedIn', p.linkedinUrl, '🔗'],
												['GitHub', p.githubUrl, '🔗'],
												['Portfolio', p.portfolioUrl, '🔗'],
												['LeetCode', p.leetcodeUrl, '🔗'],
												['Codeforces', p.codeforcesUrl, '🔗'],
												['CodeChef', p.codechefUrl, '🔗'],
												['HackerRank', p.hackerrankUrl, '🔗'],
											];

											return (
												<>
													<div className="ev-card">
														<h3>Personal information</h3>
														<div className="ev-info-grid">
															<div className="ev-info-item">
																<span>Professional title</span>
																<strong>{p.professionalTitle || '—'}</strong>
															</div>
															<div className="ev-info-item">
																<span>Location</span>
																<strong>{[p.city, p.state, p.country].filter(Boolean).join(', ') || '—'}</strong>
															</div>
															{links.map(([label, url]) =>
																url ? (
																	<div className="ev-info-item" key={label}>
																		<span>{label}</span>
																		<a href={url} target="_blank" rel="noreferrer">
																			{url.replace(/^https?:\/\//, '')}
																		</a>
																	</div>
																) : null,
															)}
														</div>
														{links.every(([, url]) => !url) ? (
															<p className="ev-muted" style={{ marginTop: 10 }}>
																No links or coding profiles added yet.
															</p>
														) : null}
													</div>

													<div className="ev-card">
														<h3>Professional summary</h3>
														<div className="ev-subsection">
															<p className="ev-muted" style={{ marginBottom: 4 }}>Resume summary</p>
															<p className="ev-prose">
																{p.about?.trim() ? p.about : 'No resume summary yet — employee can add this in Profile.'}
															</p>
														</div>
														<div className="ev-subsection">
															<p className="ev-muted" style={{ marginBottom: 4 }}>Career objective</p>
															<p className="ev-prose">{p.careerObjective?.trim() ? p.careerObjective : 'Not provided.'}</p>
														</div>
														<div className="ev-subsection ev-info-grid">
															<div className="ev-info-item">
																<span>Years of experience</span>
																<strong>{p.yearsOfExperience || '—'}</strong>
															</div>
															<div className="ev-info-item">
																<span>Industry</span>
																<strong>{p.industry || '—'}</strong>
															</div>
														</div>
														<div className="ev-subsection">
															<p className="ev-muted" style={{ marginBottom: 4 }}>Remarks</p>
															<p className="ev-prose">{p.remarks?.trim() ? p.remarks : 'No remarks yet.'}</p>
														</div>
													</div>

													<div className="ev-card">
														<h3>Emergency contact (EC)</h3>
														{hasEc ? (
															<ul className="ev-notes">
																<li>
																	<strong>{p.emergencyContactName || '—'}</strong>
																	{p.emergencyContactRelation
																		? ` · ${p.emergencyContactRelation}`
																		: ''}
																</li>
																<li className="ev-mono">{p.emergencyContactPhone || '—'}</li>
															</ul>
														) : (
															<p className="ev-muted">Not provided.</p>
														)}
													</div>

													<div className="ev-card">
														<h3>Education</h3>
														{education.length === 0 ? (
															<p className="ev-muted">None listed.</p>
														) : (
															<ul className="ev-notes">
																{education.map((q: any) => (
																	<li key={q.id || q.degree}>
																		<strong>{q.degree}</strong>
																		{q.institution ? ` — ${q.institution}` : ''}
																		{q.specialization ? ` (${q.specialization})` : ''}
																		{q.from || q.to ? (
																			<span className="ev-muted"> · {q.from || '?'} – {q.to || '?'}</span>
																		) : null}
																		{q.cgpa ? <span className="ev-muted"> · CGPA {q.cgpa}</span> : null}
																	</li>
																))}
															</ul>
														)}
													</div>

													<div className="ev-card">
														<h3>Skills</h3>
														{!hasAnySkill ? (
															<p className="ev-muted">None listed.</p>
														) : (
															skillGroups.map(([key, label]) => {
																const tags = Array.isArray(skills[key]) ? skills[key] : [];
																if (!tags.length) return null;
																return (
																	<div className="ev-skill-group" key={key}>
																		<span>{label}</span>
																		<div className="ev-tag-row">
																			{tags.map((t: string) => (
																				<span className="ev-tag" key={t}>
																					{t}
																				</span>
																			))}
																		</div>
																	</div>
																);
															})
														)}
													</div>

													<div className="ev-card">
														<h3>Work experience</h3>
														{exp.length === 0 ? (
															<p className="ev-muted">None listed.</p>
														) : (
															<ul className="ev-notes">
																{exp.map((x: any) => (
																	<li key={x.id || `${x.title}-${x.company}`}>
																		<strong>{x.title}</strong>
																		{x.company ? ` @ ${x.company}` : ''}
																		{x.employmentType ? <span className="ev-muted"> · {x.employmentType}</span> : null}
																		<span className="ev-muted">
																			{' '}
																			· {x.from || '?'} – {x.current ? 'Present' : x.to || '?'}
																			{x.location ? ` · ${x.location}` : ''}
																		</span>
																		{x.description ? <div className="ev-muted">{x.description}</div> : null}
																		{x.technologiesUsed ? (
																			<div className="ev-muted">Tech: {x.technologiesUsed}</div>
																		) : null}
																	</li>
																))}
															</ul>
														)}
													</div>

													<div className="ev-card">
														<h3>Internships</h3>
														{internships.length === 0 ? (
															<p className="ev-muted">None listed.</p>
														) : (
															<ul className="ev-notes">
																{internships.map((x: any) => (
																	<li key={x.id || `${x.title}-${x.company}`}>
																		<strong>{x.title}</strong>
																		{x.company ? ` @ ${x.company}` : ''}
																		<span className="ev-muted">
																			{' '}
																			· {x.from || '?'} – {x.current ? 'Present' : x.to || '?'}
																			{x.location ? ` · ${x.location}` : ''}
																		</span>
																		{x.description ? <div className="ev-muted">{x.description}</div> : null}
																		{x.technologiesUsed ? (
																			<div className="ev-muted">Tech: {x.technologiesUsed}</div>
																		) : null}
																	</li>
																))}
															</ul>
														)}
													</div>

													<div className="ev-card">
														<h3>Projects</h3>
														{projs.length === 0 ? (
															<p className="ev-muted">None listed.</p>
														) : (
															<ul className="ev-notes">
																{projs.map((pr: any) => (
																	<li key={pr.id || pr.name}>
																		<strong>{pr.name}</strong>
																		{pr.role ? ` · ${pr.role}` : ''}
																		{pr.tech ? <span className="ev-muted"> · {pr.tech}</span> : null}
																		{pr.githubUrl ? (
																			<>
																				{' · '}
																				<a href={pr.githubUrl} target="_blank" rel="noreferrer">
																					GitHub
																				</a>
																			</>
																		) : null}
																		{pr.liveUrl ? (
																			<>
																				{' · '}
																				<a href={pr.liveUrl} target="_blank" rel="noreferrer">
																					Live demo
																				</a>
																			</>
																		) : null}
																		{pr.description ? <div className="ev-muted">{pr.description}</div> : null}
																	</li>
																))}
															</ul>
														)}
													</div>

													<div className="ev-card">
														<h3>Certifications</h3>
														{certs.length === 0 ? (
															<p className="ev-muted">None listed.</p>
														) : (
															<ul className="ev-notes">
																{certs.map((c: any) => (
																	<li key={c.id || c.name}>
																		<strong>{c.name}</strong>
																		{c.issuer ? ` — ${c.issuer}` : ''}
																		{c.issueDate ? ` (${c.issueDate})` : ''}
																		{c.credentialId ? <span className="ev-muted"> · ID: {c.credentialId}</span> : null}
																		{c.credentialUrl ? (
																			<>
																				{' · '}
																				<a href={c.credentialUrl} target="_blank" rel="noreferrer">
																					Credential
																				</a>
																			</>
																		) : null}
																		{c.fileUrl ? (
																			<>
																				{' · '}
																				<a href={c.fileUrl} target="_blank" rel="noreferrer">
																					View file
																				</a>
																			</>
																		) : null}
																	</li>
																))}
															</ul>
														)}
													</div>

													<div className="ev-card">
														<h3>Achievements &amp; awards</h3>
														{achievements.length === 0 ? (
															<p className="ev-muted">None listed.</p>
														) : (
															<ul className="ev-notes">
																{achievements.map((a: any) => (
																	<li key={a.id || a.title}>
																		<strong>{a.title}</strong>
																		{a.organization ? ` — ${a.organization}` : ''}
																		{a.date ? ` (${a.date})` : ''}
																		{a.fileUrl ? (
																			<>
																				{' · '}
																				<a href={a.fileUrl} target="_blank" rel="noreferrer">
																					View file
																				</a>
																			</>
																		) : null}
																		{a.description ? <div className="ev-muted">{a.description}</div> : null}
																	</li>
																))}
															</ul>
														)}
													</div>

													<div className="ev-card">
														<h3>Publications &amp; research</h3>
														{publications.length === 0 ? (
															<p className="ev-muted">None listed.</p>
														) : (
															<ul className="ev-notes">
																{publications.map((pub: any) => (
																	<li key={pub.id || pub.title}>
																		<strong>{pub.title}</strong>
																		{pub.year ? ` (${pub.year})` : ''}
																		{pub.authors ? <div className="ev-muted">{pub.authors}</div> : null}
																		{pub.journal || pub.conference ? (
																			<div className="ev-muted">{[pub.journal, pub.conference].filter(Boolean).join(' · ')}</div>
																		) : null}
																		{pub.url ? (
																			<div>
																				<a href={pub.url} target="_blank" rel="noreferrer">
																					DOI / link
																				</a>
																			</div>
																		) : null}
																		{pub.abstract ? <div className="ev-muted">{pub.abstract}</div> : null}
																	</li>
																))}
															</ul>
														)}
													</div>

													{customSections.length > 0 ? (
														<div className="ev-card">
															<h3>Additional sections</h3>
															{customSections.map((c: any) => (
																<div className="ev-subsection" key={c.id || c.title}>
																	<p className="ev-muted" style={{ marginBottom: 4 }}>{c.title}</p>
																	<p className="ev-prose">{c.content}</p>
																</div>
															))}
														</div>
													) : null}

													<div className="ev-kpi-grid">
														{[
															['Attendance days', dossier.summary?.attendanceDays],
															['Tasks done', `${dossier.summary?.tasksCompleted}/${dossier.summary?.tasksTotal}`],
															['Submissions', dossier.summary?.submissionsTotal],
															['Leaves', dossier.summary?.leavesTotal],
														].map(([label, val]) => (
															<div key={String(label)} className="ev-kpi">
																<span>{label}</span>
																<strong>{val}</strong>
															</div>
														))}
													</div>
												</>
											);
										})()}
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

								{dossierTab === 'edit_profile' && isAdmin && emp ? (
									<div className="ev-admin-edit print:hidden">
										<div className="ev-card" style={{ marginBottom: 16 }}>
											<h3>Employment status</h3>
											<p className="ev-muted" style={{ marginBottom: 10 }}>
												Controls the Active / Inactive status for this employee.
											</p>
											<div className="ev-inline-actions">
												{(['Active', 'Inactive'] as const).map((s) => (
													<button
														key={s}
														type="button"
														disabled={statusSaving}
														className={`ev-chip ${
															(emp?.employmentStatus || 'Active') === s ? 'is-active' : ''
														}`}
														onClick={() => void setEmploymentStatus(emp.id, s)}
													>
														{s}
													</button>
												))}
											</div>
										</div>
										<EmployeeProfessionalProfileEditor
											employee={emp}
											canEditRemarks
											onEmployeeUpdate={(next) =>
												setDossier((d: any) => (d ? { ...d, employee: { ...d.employee, ...next } } : d))
											}
											saveOverride={async (profile) => {
												const res = await fetch(
													`/api/verification/employees/${encodeURIComponent(emp.id)}`,
													{
														method: 'PATCH',
														headers: { 'Content-Type': 'application/json', ...authHeaders },
														body: JSON.stringify(profile),
													},
												);
												const data = await res.json().catch(() => ({}));
												if (!res.ok) throw new Error(data?.error || 'Save failed');
												return { employee: data.employee, profile: data.profile };
											}}
										/>
									</div>
								) : null}
							</div>
						)}
					</section>
				</div>
			)}
		</main>
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
