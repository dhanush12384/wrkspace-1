'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { SoftErrorBoundary } from '@/components/soft-error-boundary';
import { importWithRetry } from '@/lib/import-with-retry';

import {
	AtSignIcon,
	ChevronLeftIcon,
	Grid2x2PlusIcon,
	LockIcon,
	MailIcon,
	ArrowLeftIcon,
	CheckCircle2Icon,
	SendIcon,
	KeyIcon,
	TerminalIcon,
} from 'lucide-react';
import { Input } from './input';
import { cn } from '@/lib/utils';
import { 
	loginEmployee,
	loginEmployeeWithGoogle,
	sendEmployeeOtp, 
	verifyEmployeeOtpAndResetPassword,
	setEmployeeGender,
} from '@/app/admin/actions';
import { firebaseAuth, googleProvider } from '@/lib/firebase-client';
import { signInWithPopup } from 'firebase/auth';
import { GoogleSignInButton } from './google-sign-in-button';

const MobileAppShell = dynamic(
	() =>
		importWithRetry(() =>
			import('@/components/mobile/mobile-app-shell').then((m) => {
				if (!m?.MobileAppShell) throw new Error('MobileAppShell export missing');
				return m.MobileAppShell;
			}),
		),
	{ ssr: false, loading: () => <ShellLoading /> },
);

const EmployeeDashboard = dynamic(
	() =>
		importWithRetry(() =>
			import('./employee-dashboard').then((m) => {
				if (!m?.EmployeeDashboard) throw new Error('EmployeeDashboard export missing');
				return m.EmployeeDashboard;
			}),
		),
	{ ssr: false, loading: () => <ShellLoading /> },
);

function ShellLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-[#F0F3FF] text-[#0F172A]">
			<div className="size-8 animate-spin rounded-full border-2 border-[#0047FF] border-t-transparent" />
		</div>
	);
}

function EmployeeShell({
	employee,
	onLogout,
	onEmployeeUpdate,
}: {
	employee: any;
	onLogout: () => void;
	onEmployeeUpdate: (next: any) => void;
}) {
	const isMobile = useIsMobile();

	// Warm the mobile shell chunk while login is visible / spinner shows
	useEffect(() => {
		if (isMobile !== true) return;
		void import('@/components/mobile/mobile-app-shell').catch(() => {});
	}, [isMobile]);

	// Desktop also needs FCM for chat / tasks / SOS (mobile shell registers itself).
	useEffect(() => {
		if (isMobile !== false || !employee?.id) return;
		const t = window.setTimeout(() => {
			void import('@/lib/web-push').then((m) => m.registerWebPush(employee.id));
		}, 2500);
		return () => window.clearTimeout(t);
	}, [isMobile, employee?.id]);

	if (isMobile === null) return <ShellLoading />;

	if (isMobile) {
		return (
			<SoftErrorBoundary>
				<Suspense fallback={<ShellLoading />}>
					<MobileAppShell
						employee={employee}
						onLogout={onLogout}
						onEmployeeUpdate={onEmployeeUpdate}
					/>
				</Suspense>
			</SoftErrorBoundary>
		);
	}
	return (
		<SoftErrorBoundary>
			<Suspense fallback={<ShellLoading />}>
				<EmployeeDashboard
					employee={employee}
					onLogout={onLogout}
					onEmployeeUpdate={onEmployeeUpdate}
				/>
			</Suspense>
		</SoftErrorBoundary>
	);
}

type ViewType = 'login' | 'forgot' | 'forgot_verify' | 'forgot_sent';

export function AuthPage() {
	const [view, setView] = useState<ViewType>('login');

	// Login state
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const [loggedInEmployee, setLoggedInEmployee] = useState<any>(null);
	const [sessionRestored, setSessionRestored] = useState(false);

	// Drop stale SW/caches so users don't keep seeing the old split login
	useEffect(() => {
		void import('@/lib/purge-sw').then((m) => m.purgeBrokenServiceWorkers());
	}, []);

	// Restore session from localStorage, then refresh from Neon (home/gender stay in sync)
	useEffect(() => {
		(async () => {
			try {
				const saved = localStorage.getItem('wrkspace_employee_session');
				if (saved) {
					const parsed = JSON.parse(saved);
					setLoggedInEmployee(parsed);
					const { refreshEmployeeSession } = await import('@/app/admin/actions');
					const res = await refreshEmployeeSession(parsed.id);
					if (res.success && res.employee) {
						const existingToken =
							localStorage.getItem('wrkspace_employee_token') ||
							String((parsed as { token?: string }).token || '');
						const next = existingToken ? { ...res.employee, token: existingToken } : res.employee;
						localStorage.setItem('wrkspace_employee_session', JSON.stringify(next));
						if (existingToken) localStorage.setItem('wrkspace_employee_token', existingToken);
						setLoggedInEmployee(next);
					}
				}
			} catch {
				localStorage.removeItem('wrkspace_employee_session');
			} finally {
				setSessionRestored(true);
			}
		})();
	}, []);

	// Forgot password state
	const [forgotEmail, setForgotEmail] = useState('');
	const [otpCode, setOtpCode] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [forgotMessage, setForgotMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setMessage(null);

		if (!email || !password) {
			setMessage({ type: 'error', text: 'Please enter both your email address and password.' });
			setIsLoading(false);
			return;
		}

		try {
			const result = await loginEmployee(email, password);
			if (result.success && result.employee) {
				const session = { ...result.employee, token: (result as any).token };
				localStorage.setItem('wrkspace_employee_session', JSON.stringify(session));
				if ((result as any).token) localStorage.setItem('wrkspace_employee_token', (result as any).token);
				setLoggedInEmployee(session);
			} else {
				setMessage({ type: 'error', text: result.error || 'Authentication failed' });
			}
		} catch (error) {
			setMessage({ type: 'error', text: 'An unexpected system error occurred.' });
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleLogin = async () => {
		if (isLoading) return;
		if (!firebaseAuth) {
			setMessage({ type: 'error', text: 'Google sign-in is not configured on this deployment.' });
			return;
		}
		setIsLoading(true);
		setMessage(null);
		try {
			const cred = await signInWithPopup(firebaseAuth, googleProvider);
			const googleEmail = cred.user?.email;
			if (!googleEmail) {
				setMessage({ type: 'error', text: 'Google sign-in did not return an email.' });
				return;
			}
			const result = await loginEmployeeWithGoogle(googleEmail);
			if (result.success && result.employee) {
				const session = { ...result.employee, token: (result as any).token };
				localStorage.setItem('wrkspace_employee_session', JSON.stringify(session));
				if ((result as any).token) localStorage.setItem('wrkspace_employee_token', (result as any).token);
				setLoggedInEmployee(session);
			} else {
				setMessage({ type: 'error', text: result.error || 'No employee linked to this Google account' });
			}
		} catch (error: any) {
			const code = String(error?.code || '');
			if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
				setMessage(null);
			} else {
				setMessage({ type: 'error', text: error?.message || 'Google sign-in failed.' });
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleSendOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setForgotMessage(null);
		if (!forgotEmail) {
			setForgotMessage({ type: 'error', text: 'Please enter your registered email address.' });
			return;
		}
		setIsSending(true);
		try {
			const result = await sendEmployeeOtp(forgotEmail);
			if (result.success) {
				setView('forgot_verify');
				setForgotMessage({ type: 'success', text: `OTP sent successfully to ${forgotEmail}. Please check your inbox!` });
			} else {
				setForgotMessage({ type: 'error', text: result.error || 'Failed to send OTP.' });
			}
		} catch {
			setForgotMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
		} finally {
			setIsSending(false);
		}
	};

	const handleVerifyAndReset = async (e: React.FormEvent) => {
		e.preventDefault();
		setForgotMessage(null);

		if (!otpCode || !newPassword || !confirmPassword) {
			setForgotMessage({ type: 'error', text: 'Please fill in all verification fields.' });
			return;
		}

		if (newPassword !== confirmPassword) {
			setForgotMessage({ type: 'error', text: 'New passwords do not match.' });
			return;
		}

		setIsSending(true);
		try {
			const result = await verifyEmployeeOtpAndResetPassword(forgotEmail, otpCode, newPassword);
			if (result.success) {
				setView('forgot_sent');
				setForgotMessage(null);
			} else {
				setForgotMessage({ type: 'error', text: result.error || 'Verification failed.' });
			}
		} catch {
			setForgotMessage({ type: 'error', text: 'Reset failed. Please try again.' });
		} finally {
			setIsSending(false);
		}
	};

	const goBackToLogin = () => {
		setView('login');
		setForgotEmail('');
		setOtpCode('');
		setNewPassword('');
		setConfirmPassword('');
		setForgotMessage(null);
		setMessage(null);
	};

	const handleLogout = () => {
		localStorage.removeItem('wrkspace_employee_session');
		setLoggedInEmployee(null);
		setView('login');
		setEmail('');
		setPassword('');
		setMessage(null);
	};

	// Wait for session restore before rendering to avoid flash
	if (!sessionRestored) return null;

	// â”€â”€â”€ GENDER GATE â”€â”€â”€
	const gender = String(loggedInEmployee?.gender || 'UNSPECIFIED').toUpperCase();
	const needsGender = loggedInEmployee && (!gender || gender === 'UNSPECIFIED');

	if (loggedInEmployee && needsGender) {
		const pick = async (g: 'MALE' | 'FEMALE') => {
			const res = await setEmployeeGender(loggedInEmployee.id, g);
			if (res.success && res.employee) {
				localStorage.setItem('wrkspace_employee_session', JSON.stringify(res.employee));
				setLoggedInEmployee(res.employee);
			} else {
				setMessage({ type: 'error', text: res.error || 'Could not save gender' });
			}
		};
		return (
			<main className="min-h-screen bg-[#e8edf5] flex items-center justify-center p-6 font-sans">
				<div className="w-full max-w-md bg-white border border-slate-300 shadow-lg p-8 space-y-5">
					<h1 className="text-xl font-black text-slate-900">Select your gender</h1>
					<p className="text-sm text-slate-600 leading-relaxed">
						Required once for workplace safety settings. Girl Safety and SOS are available only for female employees.
					</p>
					{message?.type === 'error' && (
						<p className="text-sm text-red-600 font-semibold">{message.text}</p>
					)}
					<div className="grid grid-cols-2 gap-3 pt-2">
						<button
							type="button"
							onClick={() => pick('FEMALE')}
							className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-4"
						>
							Female
						</button>
						<button
							type="button"
							onClick={() => pick('MALE')}
							className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4"
						>
							Male
						</button>
					</div>
					<button type="button" onClick={handleLogout} className="text-sm text-slate-500 underline">
						Sign out
					</button>
				</div>
			</main>
		);
	}

	// â”€â”€â”€ EMPLOYEE DASHBOARD VIEW â”€â”€â”€
	if (loggedInEmployee) {
		return (
			<EmployeeShell
				employee={loggedInEmployee}
				onLogout={handleLogout}
				onEmployeeUpdate={(next) => {
					setLoggedInEmployee(next);
					try {
						localStorage.setItem('wrkspace_employee_session', JSON.stringify(next));
					} catch {
						/* ignore */
					}
				}}
			/>
		);
	}

	// --- AUTHENTICATION PORTAL (split: left brand + right form; no floating secure card) ---
	return (
		<main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-[3fr_5fr] bg-black font-sans">
			{/* Left Side Panel — original wave background theme (no Secure sign-in card) */}
			<div className="relative hidden h-full flex-col border-r border-zinc-900 bg-black p-10 lg:flex overflow-hidden">
				{/* Soft depth on black — same as before */}
				<div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-black z-0" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.02),transparent_40%)] z-0" />
				<div className="from-black absolute inset-0 z-10 bg-gradient-to-t to-transparent opacity-40" />
				<div className="absolute inset-0 z-0">
					<FloatingPaths position={1} />
					<FloatingPaths position={-1} />
				</div>

				<div className="z-10 flex items-center gap-2">
					<img
						src="/branding/wrkspace-logo-on-dark.png?v=20260717"
						alt="wrkspace"
						className="h-10 w-auto object-contain"
					/>
				</div>

				{/* Spacer — Secure sign-in floating card removed */}
				<div className="z-10 flex flex-1" aria-hidden />

				<div className="z-10 mt-auto">
					<blockquote className="space-y-3">
						<p className="text-xl text-zinc-100 font-light leading-relaxed">
							“This platform helps employees and developers connect to the main servers of the company,
							deliver leads, and ensure fast client project delivery.”
						</p>
						<footer className="font-mono text-sm font-semibold text-zinc-400">
							~ Rishi Rohan Kalapala
						</footer>
					</blockquote>
				</div>
			</div>

			{/* Right Side Panel — login form */}
			<div className="relative flex min-h-screen flex-col justify-center bg-black p-8 lg:p-12 overflow-hidden">
				<div className="w-full max-w-[420px] mx-auto z-10">
					<AnimatePresence mode="wait">
						{/* --- LOGIN VIEW --- */}
						{view === 'login' && (
							<motion.div
								key="login"
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -8 }}
								transition={{ duration: 0.2 }}
								className="space-y-6"
							>
								<div className="flex flex-col space-y-2">
									<img
										src="/branding/wrkspace-logo-on-dark.png?v=20260717"
										alt="wrkspace"
										className="h-10 w-auto object-contain self-start mb-2"
									/>
									<p className="text-zinc-400 text-sm leading-relaxed font-medium">
										Employee Portal directory console. Sign in with email or continue with Google.
									</p>
								</div>

								{message && (
									<div
										className={cn(
											'p-3 rounded-none text-xs border font-mono font-bold',
											message.type === 'success'
												? 'bg-emerald-950/30 border-emerald-850 text-emerald-400'
												: 'bg-red-950/30 border-red-850 text-red-400',
										)}
									>
										{message.text}
									</div>
								)}

								<form onSubmit={handleLogin} className="space-y-4">
									<div className="space-y-2">
										<p className="text-zinc-400 text-start text-xs font-medium">
											Enter your email address to sign in or create an account
										</p>
										<div className="relative h-max">
											<Input
												placeholder="your.email@example.com"
												className="peer ps-9 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-600 transition-colors"
												type="email"
												required
												value={email}
												onChange={(e) => setEmail(e.target.value)}
											/>
											<div className="text-zinc-500 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-focus:text-indigo-400 transition-colors">
												<AtSignIcon className="size-4" aria-hidden="true" />
											</div>
										</div>
									</div>

									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<p className="text-zinc-400 text-start text-xs font-medium">
												Password (Your custom password or 6-Digit ID)
											</p>
											<Button
												type="button"
												variant="link"
												onClick={() => {
													setView('forgot');
													setMessage(null);
													setForgotMessage(null);
												}}
												className="p-0 h-auto text-xs text-zinc-500 hover:text-indigo-400 transition-colors font-medium hover:no-underline cursor-pointer"
											>
												Forgot password?
											</Button>
										</div>
										<div className="relative h-max">
											<Input
												placeholder="••••••"
												className="peer ps-9 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-600 transition-colors"
												type="password"
												required
												value={password}
												onChange={(e) => setPassword(e.target.value)}
											/>
											<div className="text-zinc-500 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-focus:text-indigo-400 transition-colors">
												<LockIcon className="size-4" aria-hidden="true" />
											</div>
										</div>
									</div>

									<Button
										type="submit"
										disabled={isLoading}
										className="w-full h-12 rounded-lg bg-[#5B5CF0] hover:bg-[#4F50E5] disabled:opacity-50 text-white text-[15px] font-bold transition-all duration-200 cursor-pointer shadow-none"
									>
										<span>{isLoading ? 'Processing...' : 'Continue With Email'}</span>
									</Button>
								</form>

								<div className="relative my-5">
									<div className="absolute inset-0 flex items-center">
										<div className="w-full border-t border-zinc-800" />
									</div>
									<div className="relative flex justify-center text-[11px] uppercase tracking-widest">
										<span className="bg-black px-3 text-zinc-500 font-mono font-bold">or</span>
									</div>
								</div>

								<GoogleSignInButton
									onClick={handleGoogleLogin}
									disabled={isLoading}
									loading={isLoading}
									label="Continue with Google"
								/>

								<p className="text-zinc-500 mt-8 text-xs leading-relaxed">
									By clicking continue, you agree to our{' '}
									<a
										href="#"
										className="text-zinc-400 hover:text-indigo-400 underline underline-offset-4 transition-colors"
									>
										Terms of Service
									</a>{' '}
									and{' '}
									<a
										href="#"
										className="text-zinc-400 hover:text-indigo-400 underline underline-offset-4 transition-colors"
									>
										Privacy Policy
									</a>
									.
								</p>
							</motion.div>
						)}

						{view === 'forgot' && (
						<motion.div
							key="forgot"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.2 }}
							className="space-y-6"
						>
							<nav className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
								<button
									type="button"
									onClick={goBackToLogin}
									className="text-zinc-400 hover:text-indigo-400 transition-colors hover:underline cursor-pointer font-normal"
								>
									Sign In
								</button>
								<span>/</span>
								<span className="text-zinc-300">Forgot Password</span>
							</nav>

							<div className="flex flex-col space-y-2">
								<div className="w-10 h-10 rounded-none bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-2">
									<MailIcon className="size-5 text-indigo-400" />
								</div>
								<h1 className="font-heading text-3xl font-extrabold tracking-tight text-white">
									Forgot your password?
								</h1>
								<p className="text-zinc-400 text-sm leading-relaxed font-medium">
									No worries. Enter your registered email address and we&apos;ll send an OTP reset code
									to your inbox.
								</p>
							</div>

							{forgotMessage && (
								<div
									className={cn(
										'p-3 rounded-none text-xs border font-mono',
										forgotMessage.type === 'success'
											? 'bg-emerald-950/30 border-emerald-800 text-emerald-450'
											: 'bg-red-950/30 border-red-800 text-red-440',
									)}
								>
									{forgotMessage.text}
								</div>
							)}

							<form onSubmit={handleSendOtp} className="space-y-4">
								<div className="space-y-2">
									<p className="text-zinc-300 text-xs font-bold">Registered Email Address</p>
									<div className="relative h-max">
										<Input
											placeholder="your.email@example.com"
											className="peer ps-9 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-600 transition-colors"
											type="email"
											required
											value={forgotEmail}
											onChange={(e) => setForgotEmail(e.target.value)}
										/>
										<div className="text-zinc-500 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-focus:text-indigo-400 transition-colors">
											<AtSignIcon className="size-4" aria-hidden="true" />
										</div>
									</div>
								</div>

								<Button
									type="submit"
									disabled={isSending}
									className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-all duration-200 cursor-pointer"
								>
									{isSending ? (
										<span className="flex items-center gap-2 justify-center">
											<span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
											Sending...
										</span>
									) : (
										'Send Reset Code'
									)}
								</Button>
							</form>
						</motion.div>
					)}

					{/* â”€â”€â”€ FORGOT PASSWORD: VERIFY OTP AND UPDATE VIEW â”€â”€â”€ */}
					{view === 'forgot_verify' && (
						<motion.div
							key="forgot_verify"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.2 }}
							className="space-y-6"
						>
							<nav className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
								<button
									type="button"
									onClick={goBackToLogin}
									className="text-zinc-400 hover:text-indigo-400 transition-colors hover:underline cursor-pointer font-normal"
								>
									Sign In
								</button>
								<span>/</span>
								<span className="text-zinc-300">Reset Password</span>
							</nav>

							<div className="flex flex-col space-y-2">
								<div className="w-10 h-10 rounded-none bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-2">
									<KeyIcon className="size-5 text-indigo-400" />
								</div>
								<h1 className="font-heading text-3xl font-extrabold tracking-tight text-white">
									Enter reset code
								</h1>
								<p className="text-zinc-400 text-sm leading-relaxed font-medium">
									We sent a 6-digit code to your email. Enter it below with your new password.
								</p>
							</div>

							{forgotMessage && (
								<div
									className={cn(
										'p-3 rounded-none text-xs border font-mono',
										forgotMessage.type === 'success'
											? 'bg-emerald-950/30 border-emerald-800 text-emerald-450'
											: 'bg-red-950/30 border-red-800 text-red-440',
									)}
								>
									{forgotMessage.text}
								</div>
							)}

							<form onSubmit={handleVerifyAndReset} className="space-y-4">
								<div className="space-y-2">
									<p className="text-zinc-300 text-xs font-bold">OTP Code</p>
									<div className="relative h-max">
										<Input
											placeholder="6-digit code"
											className="peer ps-9 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-600 transition-colors"
											type="text"
											inputMode="numeric"
											required
											value={otpCode}
											onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
										/>
										<div className="text-zinc-500 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-focus:text-indigo-400 transition-colors">
											<TerminalIcon className="size-4" aria-hidden="true" />
										</div>
									</div>
								</div>
								<div className="space-y-2">
									<p className="text-zinc-300 text-xs font-bold">New password</p>
									<div className="relative h-max">
										<Input
											placeholder="â€¢â€¢â€¢â€¢â€¢â€¢"
											className="peer ps-9 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-600 transition-colors"
											type="password"
											required
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
										/>
										<div className="text-zinc-500 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-focus:text-indigo-400 transition-colors">
											<LockIcon className="size-4" aria-hidden="true" />
										</div>
									</div>
								</div>
								<div className="space-y-2">
									<p className="text-zinc-300 text-xs font-bold">Confirm password</p>
									<div className="relative h-max">
										<Input
											placeholder="â€¢â€¢â€¢â€¢â€¢â€¢"
											className="peer ps-9 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-600 transition-colors"
											type="password"
											required
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
										/>
										<div className="text-zinc-500 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-focus:text-indigo-400 transition-colors">
											<LockIcon className="size-4" aria-hidden="true" />
										</div>
									</div>
								</div>

								<Button
									type="submit"
									disabled={isSending}
									className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-all duration-200 cursor-pointer"
								>
									{isSending ? 'Updating...' : 'Update password'}
								</Button>
							</form>
						</motion.div>
					)}

					{/* â”€â”€â”€ FORGOT PASSWORD: SUCCESS VIEW â”€â”€â”€ */}
					{view === 'forgot_sent' && (
						<motion.div
							key="forgot_sent"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.2 }}
							className="space-y-6 text-center"
						>
							<div className="flex flex-col items-center space-y-3">
								<div className="w-12 h-12 rounded-full bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center">
									<CheckCircle2Icon className="size-6 text-emerald-400" />
								</div>
								<h1 className="font-heading text-2xl font-extrabold tracking-tight text-white">
									Password updated
								</h1>
								<p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">
									Your password has been successfully reset. You can now use your custom email
									credentials to log in.
								</p>
							</div>

							<Button
								onClick={goBackToLogin}
								className="w-full bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
							>
								Back to login
							</Button>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
			</div>
		</main>
	);
}

function FloatingPaths({ position }: { position: number }) {
	const paths = Array.from({ length: 36 }, (_, i) => ({
		id: i,
		d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
			380 - i * 5 * position
		} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
			152 - i * 5 * position
		} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
			684 - i * 5 * position
		} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
		width: 0.5 + i * 0.02,
	}));

	return (
		<div className="pointer-events-none absolute inset-0">
			<svg className="h-full w-full text-white" viewBox="0 0 696 316" fill="none">
				<title>Background Paths</title>
				{paths.map((path) => (
					<motion.path
						key={path.id}
						d={path.d}
						stroke="currentColor"
						strokeWidth={path.width}
						strokeOpacity={0.06 + path.id * 0.015}
						initial={{ pathLength: 0.3, opacity: 0.5 }}
						animate={{
							pathLength: 1,
							opacity: [0.2, 0.5, 0.2],
							pathOffset: [0, 1, 0],
						}}
						transition={{
							duration: 20 + Math.random() * 10,
							repeat: Number.POSITIVE_INFINITY,
							ease: 'linear',
						}}
					/>
				))}
			</svg>
		</div>
	);
}
