'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitUnanimousFeedback, checkHasSubmittedFeedback } from '@/app/admin/actions';
import { Button } from './button';
import {
	ShieldAlert,
	MessageSquare,
	AlertCircle,
	Calendar,
	UserCheck,
	CheckSquare,
	ArrowRight,
	Loader2,
	Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnanimousFormGateProps {
	userEmail: string;
	userName: string;
	userType: 'ADMIN' | 'EMPLOYEE';
	userId?: string;
	onSuccess: () => void;
}

export function UnanimousFormGate({
	userEmail,
	userName,
	userType,
	userId,
	onSuccess,
}: UnanimousFormGateProps) {
	const [checking, setChecking] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Theme selection based on user type (Admin uses dark, Employee uses light/white theme)
	const isDark = userType === 'ADMIN';

	// Form fields
	const [comfortableSharing, setComfortableSharing] = useState<string | null>(null); // "Yes" | "No"
	const [feedbackText, setFeedbackText] = useState('');
	const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
	const [severity, setSeverity] = useState('Low');
	const [duration, setDuration] = useState('Recently');
	const [involvesOthers, setInvolvesOthers] = useState('No');
	const [selectedActions, setSelectedActions] = useState<string[]>([]);
	const [additionalNotes, setAdditionalNotes] = useState('');

	// Options
	const concernOptions = [
		'Manager / Supervisor',
		'Team member / Colleague',
		'Work environment',
		'Workload / Working hours',
		'Salary / Compensation',
		'Harassment / Bullying',
		'Discrimination / Unfair treatment',
		'Workplace behavior',
		'Company policy',
		'Management decision',
		'Personal/work-related difficulty',
		'Other',
	];

	const severityOptions = ['Low', 'Moderate', 'Serious', 'Urgent'];

	const durationOptions = [
		'Recently',
		'A few weeks',
		'A few months',
		'More than 6 months',
		'Ongoing / Not sure',
	];

	const involvesOthersOptions = ['Yes', 'No', 'Prefer not to say'];

	const actionOptions = [
		'Just listen / be aware',
		'Look into the matter',
		'Take action',
		'Improve a policy/process',
		'Prefer not to say',
	];

	useEffect(() => {
		async function checkStatus() {
			try {
				const res = await checkHasSubmittedFeedback(userEmail);
				if (res.success && res.hasSubmitted) {
					onSuccess();
				} else {
					setChecking(false);
				}
			} catch (err) {
				console.error('Error in UnanimousFormGate checking:', err);
				setChecking(false);
			}
		}
		checkStatus();
	}, [userEmail, onSuccess]);

	const toggleConcern = (concern: string) => {
		setSelectedConcerns((prev) =>
			prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
		);
	};

	const toggleAction = (action: string) => {
		setSelectedActions((prev) =>
			prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!comfortableSharing) return;

		setSubmitting(true);
		setError(null);

		// Validation for "Yes" case
		if (comfortableSharing === 'Yes') {
			if (!feedbackText.trim()) {
				setError('Please fill in what you would like to tell us.');
				setSubmitting(false);
				return;
			}
			if (selectedConcerns.length === 0) {
				setError('Please select at least one concern category.');
				setSubmitting(false);
				return;
			}
			if (selectedActions.length === 0) {
				setError('Please select at least one actions preference.');
				setSubmitting(false);
				return;
			}
		}

		try {
			const res = await submitUnanimousFeedback({
				userType,
				userId,
				userEmail,
				userName,
				comfortableSharing,
				feedbackText: comfortableSharing === 'Yes' ? feedbackText : undefined,
				concerns: comfortableSharing === 'Yes' ? selectedConcerns.join(', ') : 'None',
				severity: comfortableSharing === 'Yes' ? severity : 'Low',
				duration: comfortableSharing === 'Yes' ? duration : 'N/A',
				involvesOthers: comfortableSharing === 'Yes' ? involvesOthers : 'N/A',
				desiredAction: comfortableSharing === 'Yes' ? selectedActions.join(', ') : 'None',
				additionalNotes: comfortableSharing === 'Yes' ? additionalNotes : undefined,
			});

			if (res.success) {
				onSuccess();
			} else {
				setError(res.error || 'Failed to submit feedback.');
			}
		} catch (err: any) {
			setError(err.message || 'An unexpected error occurred during submission.');
		} finally {
			setSubmitting(false);
		}
	};

	if (checking) {
		return (
			<div className={cn(
				"fixed inset-0 flex flex-col items-center justify-center z-50 transition-colors duration-300",
				isDark ? "bg-zinc-950 text-zinc-200" : "bg-[#e8edf5] text-slate-800"
			)}>
				<div className="relative">
					<div className={cn(
						"absolute inset-0 blur-xl rounded-full scale-150 animate-pulse",
						isDark ? "bg-brand-500/20" : "bg-brand-500/10"
					)} />
					<div className="relative flex flex-col items-center gap-4">
						<Loader2 className="size-10 text-brand-500 animate-spin" />
						<p className={cn(
							"text-xs tracking-widest uppercase",
							isDark ? "text-zinc-400" : "text-slate-500"
						)}>Loading Portal...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={cn(
			"fixed inset-0 overflow-y-auto z-50 flex justify-center p-4 md:p-8 selection:bg-brand-500/35 selection:text-white transition-colors duration-300",
			isDark ? "bg-zinc-950 text-zinc-200" : "bg-[#e8edf5] text-slate-800"
		)}>
			{/* Background gradients */}
			<div className={cn(
				"fixed inset-0 pointer-events-none transition-opacity duration-300",
				isDark 
					? "bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.06),transparent_60%)] bg-[radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.04),transparent_50%)]" 
					: "bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.03),transparent_60%)] bg-[radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.02),transparent_50%)]"
			)} />

			<div className="relative w-full max-w-3xl my-auto space-y-8 py-10">
				{/* Top Premium Badge & Title */}
				<div className="text-center space-y-4 max-w-xl mx-auto">
					<div className={cn(
						"inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] tracking-widest uppercase shadow-sm transition-all duration-300",
						isDark 
							? "border border-zinc-800/80 bg-zinc-900/50 text-zinc-400" 
							: "bg-white text-slate-500"
					)}>
						<Lock className="size-3 text-brand-500" /> Secure Verification System
					</div>
					<h1 className={cn(
						"text-3xl md:text-4xl tracking-tight transition-colors duration-300",
						isDark ? "text-white" : "text-slate-900"
					)}>
						Feedback Portal
					</h1>
					<p className={cn(
						"text-sm transition-colors duration-300",
						isDark ? "text-zinc-400" : "text-slate-600"
					)}>
						This dashboard values transparency and safety. Please share your feedback before accessing your main control center.
					</p>
				</div>

				<form
					onSubmit={handleSubmit}
					className={cn(
						"rounded-2xl p-6 md:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all duration-300",
						isDark 
							? "bg-zinc-900/40 border border-zinc-800/80 text-zinc-200" 
							: "bg-white border-transparent text-slate-800 shadow-xl shadow-slate-200/50"
					)}
				>
					{/* Decorative glowing gradient borders */}
					<div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

					{error && (
						<div className={cn(
							"mb-6 p-4 rounded-xl border text-xs flex items-center gap-3",
							isDark 
								? "border-red-900/50 bg-red-950/20 text-red-400" 
								: "border-transparent bg-red-50 text-red-605"
						)}>
							<AlertCircle className="size-4 shrink-0" />
							<span>{error}</span>
						</div>
					)}

					<div className="space-y-8">
						{/* Gate Question */}
						<div className="space-y-4">
							<label className={cn(
								"block text-sm md:text-base transition-colors duration-300",
								isDark ? "text-zinc-100" : "text-slate-900"
							)}>
								Is there something you have wanted to tell us but haven&apos;t felt comfortable sharing directly?
							</label>
							<div className="grid grid-cols-2 gap-4">
								<button
									type="button"
									onClick={() => setComfortableSharing('Yes')}
									className={cn(
										'relative py-4 px-6 rounded-xl border text-sm transition-all duration-300 text-center flex flex-col items-center justify-center gap-2 cursor-pointer',
										comfortableSharing === 'Yes'
											? isDark 
												? 'bg-brand-600/10 border-brand-500 text-white shadow-lg shadow-brand-500/10 scale-[1.02]'
												: 'bg-brand-50 border-transparent text-brand-700 shadow-md shadow-brand-500/5 scale-[1.02]'
											: isDark
												? 'bg-zinc-900/20 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
												: 'bg-slate-50/50 border-transparent text-slate-550 hover:bg-slate-100/80 hover:text-slate-800'
									)}
								>
									<span className="text-base">Yes, I want to share</span>
									<span className="text-[10px] opacity-60 font-normal">Expand the anonymous form</span>
								</button>

								<button
									type="button"
									onClick={() => setComfortableSharing('No')}
									className={cn(
										'relative py-4 px-6 rounded-xl border text-sm transition-all duration-300 text-center flex flex-col items-center justify-center gap-2 cursor-pointer',
										comfortableSharing === 'No'
											? isDark
												? 'bg-zinc-800/50 border-zinc-550 text-white shadow-lg shadow-zinc-500/10 scale-[1.02]'
												: 'bg-slate-100 border-transparent text-slate-800 shadow-slate-500/5 scale-[1.02]'
											: isDark
												? 'bg-zinc-900/20 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
												: 'bg-slate-50/50 border-transparent text-slate-550 hover:bg-slate-100/80 hover:text-slate-800'
									)}
								>
									<span className="text-base">No concerns right now</span>
									<span className="text-[10px] opacity-60 font-normal">Go directly to dashboard</span>
								</button>
							</div>
						</div>

						{/* Expanded Form Sections */}
						<AnimatePresence initial={false}>
							{comfortableSharing === 'Yes' && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.4, ease: 'easeInOut' }}
									className={cn(
										"overflow-hidden space-y-8 pt-6 border-t",
										isDark ? "border-zinc-800/50" : "border-slate-100"
									)}
								>
									{/* 1. What would you like to tell us? */}
									<div className="space-y-2.5">
										<label className={cn(
											"flex items-center gap-2 text-sm",
											isDark ? "text-zinc-200" : "text-slate-800"
										)}>
											<MessageSquare className="size-4 text-brand-500" />
											<span>What would you like to tell us? *</span>
										</label>
										<p className={cn(
											"text-[11px] italic",
											isDark ? "text-zinc-500" : "text-slate-450"
										)}>
											Example prompt: “Share anything you feel you cannot openly discuss with your manager or team.”
										</p>
										<textarea
											rows={5}
											required
											value={feedbackText}
											onChange={(e) => setFeedbackText(e.target.value)}
											placeholder="Write your concerns or feedback in detail here..."
											className={cn(
												"w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors",
												isDark
													? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-650"
													: "bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-450 focus:bg-white"
											)}
										/>
									</div>

									{/* 2. What is the concern about? */}
									<div className="space-y-3">
										<label className={cn(
											"flex items-center gap-2 text-sm",
											isDark ? "text-zinc-200" : "text-slate-800"
										)}>
											<ShieldAlert className="size-4 text-brand-500" />
											<span>What is the concern about? *</span>
										</label>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
											{concernOptions.map((option) => (
												<button
													key={option}
													type="button"
													onClick={() => toggleConcern(option)}
													className={cn(
														'flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-xs transition-all duration-200 cursor-pointer',
														selectedConcerns.includes(option)
															? isDark
																? 'bg-brand-500/10 border-brand-550 text-white'
																: 'bg-brand-50 border-transparent text-brand-700'
															: isDark
																? 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-750 hover:text-zinc-350'
																: 'bg-slate-50/40 border-transparent text-slate-550 hover:bg-slate-100 hover:text-slate-700'
													)}
												>
													<div
														className={cn(
															'size-3.5 rounded border flex items-center justify-center text-[8px]',
															selectedConcerns.includes(option)
																? 'border-brand-500 bg-brand-500 text-white'
																: isDark
																	? 'border-zinc-700 bg-zinc-900/60'
																	: 'border-slate-200 bg-white'
														)}
													>
														{selectedConcerns.includes(option) && '✓'}
													</div>
													<span>{option}</span>
												</button>
											))}
										</div>
									</div>

									{/* 3. How serious do you feel this issue is? */}
									<div className="space-y-2.5">
										<label className={cn(
											"flex items-center gap-2 text-sm",
											isDark ? "text-zinc-200" : "text-slate-800"
										)}>
											<AlertCircle className="size-4 text-brand-500" />
											<span>How serious do you feel this issue is? *</span>
										</label>
										<div className="grid grid-cols-4 gap-2">
											{severityOptions.map((opt) => (
												<button
													key={opt}
													type="button"
													onClick={() => setSeverity(opt)}
													className={cn(
														'py-2.5 rounded-xl border text-xs transition-all duration-250 cursor-pointer',
														severity === opt
															? opt === 'Urgent'
																? isDark ? 'bg-red-950/30 border-red-500 text-red-400' : 'bg-red-50 border-transparent text-red-700'
																: opt === 'Serious'
																? isDark ? 'bg-orange-950/30 border-orange-500 text-orange-400' : 'bg-orange-50 border-transparent text-orange-700'
																: opt === 'Moderate'
																? isDark ? 'bg-yellow-950/30 border-yellow-500 text-yellow-450' : 'bg-yellow-50 border-transparent text-yellow-700'
																: isDark ? 'bg-green-950/30 border-green-500 text-green-400' : 'bg-green-50 border-transparent text-green-700'
															: isDark
																? 'bg-zinc-950/40 border-zinc-800 text-zinc-450 hover:border-zinc-750 hover:text-zinc-305'
																: 'bg-slate-50/40 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
													)}
												>
													{opt}
												</button>
											))}
										</div>
									</div>

									{/* 4. How long has this been happening? */}
									<div className="space-y-2.5">
										<label className={cn(
											"flex items-center gap-2 text-sm",
											isDark ? "text-zinc-200" : "text-slate-800"
										)}>
											<Calendar className="size-4 text-brand-500" />
											<span>How long has this been happening? *</span>
										</label>
										<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
											{durationOptions.map((opt) => (
												<button
													key={opt}
													type="button"
													onClick={() => setDuration(opt)}
													className={cn(
														'py-2 px-1.5 rounded-xl border text-[11px] text-center transition-all duration-200 cursor-pointer',
														duration === opt
															? isDark
																? 'bg-brand-500/10 border-brand-500 text-white'
																: 'bg-brand-50 border-transparent text-brand-700'
															: isDark
																? 'bg-zinc-950/40 border-zinc-800 text-zinc-455 hover:border-zinc-750 hover:text-zinc-300'
																: 'bg-slate-50/40 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
													)}
												>
													{opt}
												</button>
											))}
										</div>
									</div>

									{/* 5. Does this concern involve someone else? */}
									<div className="space-y-2.5">
										<label className={cn(
											"flex items-center gap-2 text-sm",
											isDark ? "text-zinc-200" : "text-slate-800"
										)}>
											<UserCheck className="size-4 text-brand-500" />
											<span>Does this concern involve someone else? *</span>
										</label>
										<div className="grid grid-cols-3 gap-2">
											{involvesOthersOptions.map((opt) => (
												<button
													key={opt}
													type="button"
													onClick={() => setInvolvesOthers(opt)}
													className={cn(
														'py-2.5 rounded-xl border text-xs transition-all duration-200 cursor-pointer',
														involvesOthers === opt
															? isDark
																? 'bg-brand-500/10 border-brand-500 text-white shadow-sm'
																: 'bg-brand-50 border-transparent text-brand-700 shadow-sm'
															: isDark
																? 'bg-zinc-950/40 border-zinc-800 text-zinc-450 hover:border-zinc-750 hover:text-zinc-300'
																: 'bg-slate-50/40 border-transparent text-slate-550 hover:bg-slate-100 hover:text-slate-700'
													)}
												>
													{opt}
												</button>
											))}
										</div>
									</div>

									{/* 6. What would you like us to do? */}
									<div className="space-y-3">
										<label className={cn(
											"flex items-center gap-2 text-sm",
											isDark ? "text-zinc-200" : "text-slate-800"
										)}>
											<CheckSquare className="size-4 text-brand-500" />
											<span>What would you like us to do? *</span>
										</label>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
											{actionOptions.map((option) => (
												<button
													key={option}
													type="button"
													onClick={() => toggleAction(option)}
													className={cn(
														'flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-xs transition-all duration-200 cursor-pointer',
														selectedActions.includes(option)
															? isDark
																? 'bg-brand-500/10 border-brand-550 text-white'
																: 'bg-brand-50 border-transparent text-brand-700'
															: isDark
																? 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-750 hover:text-zinc-350'
																: 'bg-slate-50/40 border-transparent text-slate-550 hover:bg-slate-100 hover:text-slate-700'
													)}
												>
													<div
														className={cn(
															'size-3.5 rounded border flex items-center justify-center text-[8px]',
															selectedActions.includes(option)
																? 'border-brand-500 bg-brand-500 text-white'
																: isDark
																	? 'border-zinc-700 bg-zinc-900/60'
																	: 'border-slate-200 bg-white'
														)}
													>
														{selectedActions.includes(option) && '✓'}
													</div>
													<span>{option}</span>
												</button>
											))}
										</div>
									</div>

									{/* 7. Anything else you'd like to add? */}
									<div className="space-y-2.5">
										<label className="block text-sm">
											Anything else you&apos;d like to add? (Optional)
										</label>
										<textarea
											rows={3}
											value={additionalNotes}
											onChange={(e) => setAdditionalNotes(e.target.value)}
											placeholder="Optional additional context, details, or requests..."
											className={cn(
												"w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors",
												isDark
													? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-650"
													: "bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-450 focus:bg-white"
											)}
										/>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Action Submit Area */}
					{comfortableSharing !== null && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3 }}
							className={cn(
								"mt-8 pt-6 border-t flex items-center justify-between",
								isDark ? "border-zinc-850/60 text-zinc-550" : "border-slate-200 text-slate-500"
							)}
						>
							<div />

							<Button
								type="submit"
								disabled={submitting}
								className="bg-brand-600 hover:bg-brand-500 text-white text-xs px-6 py-2.5 h-auto transition-all shadow-md shadow-brand-600/10 active:scale-[0.98] cursor-pointer inline-flex items-center gap-2 animate-none"
							>
								{submitting ? (
									<>
										<Loader2 className="size-3.5 animate-spin" /> Submitting...
									</>
								) : (
									<>
										{comfortableSharing === 'Yes' ? 'Submit Feedback' : 'Continue to Dashboard'}{' '}
										<ArrowRight className="size-3.5" />
									</>
								)}
							</Button>
						</motion.div>
					)}
				</form>
			</div>
		</div>
	);
}
