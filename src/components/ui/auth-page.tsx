'use client';

import React, { useState, useEffect, Suspense, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { GrainGradient } from '@paper-design/shaders-react';
import { SoftErrorBoundary } from '@/components/soft-error-boundary';
import { UnanimousFormGate } from './unanimous-form-gate';
import { importWithRetry } from '@/lib/import-with-retry';
import { useIsMobile } from '@/hooks/use-is-mobile';
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
		<div className="flex min-h-screen items-center justify-center bg-white text-black">
			<div className="size-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
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
	const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState<boolean | null>(null);

	useEffect(() => {
		async function checkFeedback() {
			if (!employee?.email) return;
			try {
				const { checkHasSubmittedFeedback } = await import('@/app/admin/actions');
				const res = await checkHasSubmittedFeedback(employee.email);
				if (res.success) {
					setHasSubmittedFeedback(res.hasSubmitted);
				} else {
					setHasSubmittedFeedback(true); // Fallback: allow entry if database check fails
				}
			} catch (e) {
				console.error('Feedback check failed', e);
				setHasSubmittedFeedback(true);
			}
		}
		checkFeedback();
	}, [employee?.email]);

	useEffect(() => {
		if (isMobile !== true) return;
		void import('@/components/mobile/mobile-app-shell').catch(() => {});
	}, [isMobile]);

	useEffect(() => {
		if (isMobile !== false || !employee?.id) return;
		const t = window.setTimeout(() => {
			void import('@/lib/web-push').then((m) => m.registerWebPush(employee.id));
		}, 2500);
		return () => window.clearTimeout(t);
	}, [isMobile, employee?.id]);

	if (employee && hasSubmittedFeedback === false) {
		return (
			<UnanimousFormGate
				userEmail={employee.email}
				userName={`${employee.firstName} ${employee.lastName}`}
				userType="EMPLOYEE"
				userId={employee.id}
				onSuccess={() => setHasSubmittedFeedback(true)}
			/>
		);
	}

	if (isMobile === null || hasSubmittedFeedback === null) return <ShellLoading />;

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

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const [loggedInEmployee, setLoggedInEmployee] = useState<any>(null);
	const [sessionRestored, setSessionRestored] = useState(false);

	useEffect(() => {
		void import('@/lib/purge-sw').then((m) => m.purgeBrokenServiceWorkers());
	}, []);

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
		} catch {
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

	if (!sessionRestored) return null;

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
			<main className="min-h-screen bg-white flex items-center justify-center p-6 font-sans text-black">
				<div className="w-full max-w-sm bg-white border border-black/10 rounded-xl p-6 space-y-4">
					<h1 className="text-lg font-medium tracking-tight text-black">Select your gender</h1>
					<p className="text-xs text-black/55 leading-relaxed">
						Required once for workplace safety settings. Girl Safety and SOS are available only for female employees.
					</p>
					{message?.type === 'error' && (
						<p className="text-xs text-red-500 font-medium">{message.text}</p>
					)}
					<div className="grid grid-cols-2 gap-3 pt-1">
						<button
							type="button"
							onClick={() => pick('FEMALE')}
							className="bg-black text-white text-sm font-medium py-2.5 px-3 rounded-lg hover:bg-black/85 transition-colors"
						>
							Female
						</button>
						<button
							type="button"
							onClick={() => pick('MALE')}
							className="bg-black/5 text-black text-sm font-medium py-2.5 px-3 rounded-lg hover:bg-black/10 transition-colors border border-black/15"
						>
							Male
						</button>
					</div>
					<button type="button" onClick={handleLogout} className="text-xs text-black/40 underline">
						Sign out
					</button>
				</div>
			</main>
		);
	}

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
						
					}
				}}
			/>
		);
	}

	const termsText = (
		<>
			By creating an account, you agree to our{' '}
			<a
				href="#"
				className="font-medium text-black/50 underline underline-offset-2 hover:text-black transition-colors"
			>
				Terms and Services
			</a>{' '}
			and{' '}
			<a
				href="#"
				className="font-medium text-black/50 underline underline-offset-2 hover:text-black transition-colors"
			>
				Privacy Policy
			</a>
		</>
	);

	return (
		<section className="min-h-screen bg-white p-3 text-black antialiased [font-synthesis:none]">
			<div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[1.18fr_0.82fr] xl:grid-cols-[1.22fr_0.78fr]">
				<div className="flex min-h-[600px] items-center rounded-md border border-black/20 bg-white px-6 py-8 sm:px-10 lg:min-h-0 lg:px-12 lg:py-14">
					<div className="mx-auto w-full max-w-[510px]">
						<div>
							<div className="mb-5 flex items-center justify-start">
								<img
									src="https://ik.imagekit.io/dypkhqxip/wrkspacenew"
									alt="wrkspace"
									className="h-11 sm:h-14 w-auto object-contain max-w-[220px]"
								/>
							</div>
							<h1 className="whitespace-nowrap text-2xl font-medium tracking-[-0.03em] sm:text-3xl lg:text-3xl xl:text-3xl">
								{view === 'login' ? 'Sign in to account' : 'Reset your password'}
							</h1>
							<p className="mt-1.5 whitespace-nowrap text-xs text-black/60 sm:text-sm lg:text-base">
								Brainstorm in chat, build in cowork
							</p>
						</div>

						{view === 'login' && (
							<>
								<div className="mt-6 grid gap-3 sm:grid-cols-2">
									<SocialButton
										icon={<GoogleIcon />}
										label="Sign in with Google"
										onClick={handleGoogleLogin}
										disabled={isLoading}
									/>
									<SocialButton
										icon={<AppleIcon />}
										label="Sign in with Apple"
										onClick={() => setMessage({ type: 'error', text: 'Apple sign-in is coming soon.' })}
										disabled={isLoading}
									/>
								</div>

								<div className="my-5 text-center text-xs font-semibold uppercase tracking-wider text-black/40">
									or
								</div>

								{message && (
									<div
										className={cn(
											'mb-4 p-3 rounded-lg text-xs font-medium border',
											message.type === 'success'
												? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
												: 'bg-red-500/10 border-red-500/30 text-red-400',
										)}
									>
										{message.text}
									</div>
								)}

								<form onSubmit={handleLogin} className="space-y-4">
									<FieldBox
										label="Email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										type="email"
										placeholder="your.email@example.com"
										required
									/>

									<div>
										<FieldBox
											label="Password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											type="password"
											placeholder="••••••••••••"
											required
										/>
										<div className="mt-1.5 flex justify-end">
											<button
												type="button"
												onClick={() => {
													setView('forgot');
													setMessage(null);
													setForgotMessage(null);
												}}
												className="text-[11px] font-medium text-black/50 hover:text-black transition-colors underline"
											>
												Forgot password?
											</button>
										</div>
									</div>

									<div className="space-y-2 pt-1 text-xs leading-relaxed text-black/40">
										<CheckboxLine>
											Keep me signed in on this browser
										</CheckboxLine>
										<CheckboxLine>{termsText}</CheckboxLine>
									</div>

									<button
										type="submit"
										disabled={isLoading}
										className="mt-6 flex h-11 w-full items-center justify-center rounded-[10px] border border-black/40 bg-black text-base font-semibold text-white transition-all hover:bg-black/85 disabled:opacity-50 cursor-pointer"
									>
										{isLoading ? 'Processing...' : 'Submit'}
									</button>
								</form>
							</>
						)}

						{view === 'forgot' && (
							<div className="mt-6 space-y-4">
								<p className="text-black/60 text-xs sm:text-sm">
									Enter your registered email address to receive a password reset OTP code.
								</p>

								{forgotMessage && (
									<div
										className={cn(
											'p-3 rounded-lg text-xs font-medium border',
											forgotMessage.type === 'success'
												? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
												: 'bg-red-500/10 border-red-500/30 text-red-400',
										)}
									>
										{forgotMessage.text}
									</div>
								)}

								<form onSubmit={handleSendOtp} className="space-y-4">
									<FieldBox
										label="Registered Email"
										value={forgotEmail}
										onChange={(e) => setForgotEmail(e.target.value)}
										type="email"
										placeholder="your.email@example.com"
										required
									/>

									<button
										type="submit"
										disabled={isSending}
										className="mt-4 flex h-11 w-full items-center justify-center rounded-[10px] border border-black/40 bg-black text-base font-semibold text-white transition-all hover:bg-black/85 disabled:opacity-50 cursor-pointer"
									>
										{isSending ? 'Sending OTP...' : 'Send OTP Code'}
									</button>

									<button
										type="button"
										onClick={goBackToLogin}
										className="w-full text-center text-xs font-medium text-black/50 hover:text-black transition-colors underline pt-1"
									>
										Back to Sign In
									</button>
								</form>
							</div>
						)}

						{view === 'forgot_verify' && (
							<div className="mt-6 space-y-4">
								<p className="text-black/60 text-xs sm:text-sm">
									Enter the OTP code sent to your email and your new password.
								</p>

								{forgotMessage && (
									<div
										className={cn(
											'p-3 rounded-lg text-xs font-medium border',
											forgotMessage.type === 'success'
												? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
												: 'bg-red-500/10 border-red-500/30 text-red-400',
										)}
									>
										{forgotMessage.text}
									</div>
								)}

								<form onSubmit={handleVerifyAndReset} className="space-y-3">
									<FieldBox
										label="OTP Code"
										value={otpCode}
										onChange={(e) => setOtpCode(e.target.value)}
										type="text"
										placeholder="6-digit OTP"
										required
									/>

									<FieldBox
										label="New Password"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										type="password"
										placeholder="••••••••••••"
										required
									/>

									<FieldBox
										label="Confirm Password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										type="password"
										placeholder="••••••••••••"
										required
									/>

									<button
										type="submit"
										disabled={isSending}
										className="mt-4 flex h-11 w-full items-center justify-center rounded-[10px] border border-black/40 bg-black text-base font-semibold text-white transition-all hover:bg-black/85 disabled:opacity-50 cursor-pointer"
									>
										{isSending ? 'Updating Password...' : 'Reset Password'}
									</button>

									<button
										type="button"
										onClick={goBackToLogin}
										className="w-full text-center text-xs font-medium text-black/50 hover:text-black transition-colors underline pt-1"
									>
										Back to Sign In
									</button>
								</form>
							</div>
						)}

						{view === 'forgot_sent' && (
							<div className="mt-6 space-y-4 text-center">
								<div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
									Password updated successfully! You can now sign in with your new password.
								</div>

								<button
									type="button"
									onClick={goBackToLogin}
									className="mt-4 flex h-11 w-full items-center justify-center rounded-[10px] border border-black/40 bg-black text-base font-semibold text-white transition-all hover:bg-black/85 cursor-pointer"
								>
									Continue to Sign In
								</button>
							</div>
						)}
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
								Think fast,
								<br />
								Build faster
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

function SocialButton({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-black/25 bg-white px-3 text-xs font-medium text-black transition-colors hover:bg-black/[0.03] disabled:opacity-50 sm:text-sm cursor-pointer"
		>
			<span className="shrink-0">{icon}</span>
			<span className="whitespace-nowrap truncate">{label}</span>
		</button>
	);
}

function FieldBox({
	label,
	value,
	type = 'text',
	placeholder,
	onChange,
	required,
}: {
	label: string;
	value: string;
	type?: string;
	placeholder?: string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	required?: boolean;
}) {
	return (
		<label className="flex h-11 items-center justify-between gap-3 rounded-[10px] border border-black/25 bg-white px-4 text-sm leading-none">
			<input
				type={type}
				value={value}
				aria-label={label}
				placeholder={placeholder || label}
				required={required}
				onChange={onChange}
				className="min-w-0 flex-1 truncate bg-transparent text-black text-sm outline-none placeholder:text-black/30:text-white/35"
			/>
			<span className="shrink-0 text-black/50 text-xs font-medium">{label}</span>
		</label>
	);
}

function CheckboxLine({ children }: { children: ReactNode }) {
	return (
		<label className="flex items-start gap-2.5 cursor-pointer">
			<span className="relative mt-0.5 size-3.5 shrink-0">
				<input
					type="checkbox"
					className="peer size-full appearance-none rounded-[2px] border border-black/25 bg-white checked:border-black checked:bg-black"
				/>
				<svg
					viewBox="0 0 12 12"
					className="pointer-events-none absolute inset-0 hidden size-full p-0.5 text-white peer-checked:block"
					fill="none"
					aria-hidden="true"
				>
					<path
						d="M3 6.2 5 8.1 9 3.9"
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</span>
			<span>{children}</span>
		</label>
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
