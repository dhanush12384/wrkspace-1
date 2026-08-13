'use client';

import React, { useState, useEffect } from 'react';
import { 
	Send, 
	Eye, 
	Edit3, 
	Bold, 
	Italic, 
	Underline, 
	Link, 
	Users, 
	CheckCircle, 
	AlertCircle,
	Search
} from 'lucide-react';
import { getEmployees, sendBulkAlerts } from '@/app/admin/actions';

interface EmployeeItem {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	wingName: string;
	employmentStatus: string;
}

export function AdminAlertSender() {
	const [subject, setSubject] = useState('');
	const [body, setBody] = useState('');
	const [activePreviewTab, setActivePreviewTab] = useState<'edit' | 'preview'>('edit');
	
	const [employees, setEmployees] = useState<EmployeeItem[]>([]);
	const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
	const [searchQ, setSearchQ] = useState('');
	const [sendToAll, setSendToAll] = useState(true);

	const [isSending, setIsSending] = useState(false);
	const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	// Load employees list on mount
	useEffect(() => {
		getEmployees().then((data: any) => {
			if (data && Array.isArray(data)) {
				// Keep only active employees
				const active = data.filter((e: any) => e.employmentStatus === 'Active');
				setEmployees(active);
			}
		}).catch(err => console.error('Failed to load employees:', err));
	}, []);

	// Format helper for client-side live preview (matches queue.ts logic)
	const getLivePreviewHtml = () => {
		if (!body) return '<p style="color: #94a3b8; font-style: italic;">Your email body preview will appear here...</p>';
		
		let html = body
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Restore styling tags
		html = html
			.replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/gi, '<strong>$1</strong>')
			.replace(/&lt;i&gt;([\s\S]*?)&lt;\/i&gt;/gi, '<em>$1</em>')
			.replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<span style="text-decoration: underline;">$1</span>')
			.replace(/&lt;strong&gt;([\s\S]*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>')
			.replace(/&lt;em&gt;([\s\S]*?)&lt;\/em&gt;/gi, '<em>$1</em>')
			.replace(/&lt;a\s+href=&quot;([^&]+?)&quot;&gt;([\s\S]*?)&lt;\/a&gt;/gi, '<a href="$1" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">$2</a>')
			.replace(/&lt;a\s+href=\'([^\']+?)\'&gt;([\s\S]*?)&lt;\/a&gt;/gi, '<a href="$1" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">$2</a>');

		// Markdown Bold/Italic/Underline
		html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
		html = html.replace(/__([\s\S]*?)__/g, '<strong>$1</strong>');
		html = html.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
		html = html.replace(/_([\s\S]*?)_/g, '<span style="text-decoration: underline;">$1</span>');

		// Markdown links
		html = html.replace(/\[([\s\S]*?)\]\((https?:\/\/[^\s\)]+?)\)/g, '<a href="$2" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">$1</a>');

		// Split paragraphs
		const paragraphs = html.split(/\n\s*\n+/);
		return paragraphs
			.map(p => {
				const trimmed = p.trim();
				if (!trimmed) return '';
				const withLineBreaks = trimmed.replace(/\n/g, '<br />');
				return `<p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${withLineBreaks}</p>`;
			})
			.filter(Boolean)
			.join('');
	};

	// Format Insertion Helpers
	const insertFormat = (prefix: string, suffix: string = '') => {
		const textarea = document.getElementById('alert-body-textarea') as HTMLTextAreaElement;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = textarea.value;
		const selected = text.substring(start, end);
		
		const replacement = prefix + (selected || 'text') + suffix;
		setBody(text.substring(0, start) + replacement + text.substring(end));
		
		// Refocus
		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || 'text').length);
		}, 50);
	};

	// Toggle employee selection
	const toggleSelectEmployee = (id: string) => {
		if (selectedEmpIds.includes(id)) {
			setSelectedEmpIds(selectedEmpIds.filter(x => x !== id));
		} else {
			setSelectedEmpIds([...selectedEmpIds, id]);
		}
	};

	const filteredEmployees = employees.filter(e => {
		const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
		const emailMatch = e.email.toLowerCase().includes(searchQ.toLowerCase());
		const nameMatch = fullName.includes(searchQ.toLowerCase());
		const wingMatch = e.wingName.toLowerCase().includes(searchQ.toLowerCase());
		return emailMatch || nameMatch || wingMatch;
	});

	const handleSendAlerts = async () => {
		if (!subject.trim()) {
			setStatusMsg({ type: 'error', text: 'Please enter an alert subject.' });
			return;
		}
		if (!body.trim()) {
			setStatusMsg({ type: 'error', text: 'Please enter the email alert body message.' });
			return;
		}

		const targets = sendToAll ? undefined : selectedEmpIds;
		if (!sendToAll && (!targets || targets.length === 0)) {
			setStatusMsg({ type: 'error', text: 'Please select at least one employee recipient.' });
			return;
		}

		setIsSending(true);
		setStatusMsg(null);

		try {
			const res = await sendBulkAlerts(subject, body, targets);
			if (res.success) {
				setStatusMsg({ 
					type: 'success', 
					text: `Success! Alerts dispatched successfully to ${res.count} recipient(s).` 
				});
				setSubject('');
				setBody('');
				setSelectedEmpIds([]);
				setSendToAll(true);
			} else {
				setStatusMsg({ type: 'error', text: res.error || 'Failed to dispatch alerts.' });
			}
		} catch (err: any) {
			setStatusMsg({ type: 'error', text: err.message || 'An unexpected error occurred.' });
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header info */}
			<div>
				<h2 className="text-xl font-bold text-white tracking-tight">Alert Sender</h2>
				<p className="text-zinc-500 text-xs mt-1">
					Compose custom email alerts with rich formatting to notify team members. Jobs are queued and sent in the background.
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Column 1 & 2: Composition and Preview */}
				<div className="lg:col-span-2 space-y-6">
					
					{/* Tabs header */}
					<div className="flex border-b border-zinc-800">
						<button
							onClick={() => setActivePreviewTab('edit')}
							className={`py-2 px-4 flex items-center gap-2 border-b-2 text-xs font-medium cursor-pointer transition-all ${
								activePreviewTab === 'edit' 
									? 'border-brand-400 text-white' 
									: 'border-transparent text-zinc-500 hover:text-zinc-300'
							}`}
						>
							<Edit3 className="size-4" />
							Compose Alert
						</button>
						<button
							onClick={() => setActivePreviewTab('preview')}
							className={`py-2 px-4 flex items-center gap-2 border-b-2 text-xs font-medium cursor-pointer transition-all ${
								activePreviewTab === 'preview' 
									? 'border-brand-400 text-white' 
									: 'border-transparent text-zinc-500 hover:text-zinc-300'
							}`}
						>
							<Eye className="size-4" />
							Email Preview
						</button>
					</div>

					{activePreviewTab === 'edit' ? (
						<div className="space-y-4">
							{/* Subject */}
							<div className="space-y-1.5">
								<label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block font-mono">
									Email Subject
								</label>
								<input
									type="text"
									placeholder="e.g. Server Maintenance Notice"
									value={subject}
									onChange={(e) => setSubject(e.target.value)}
									className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 placeholder-zinc-600 transition-colors"
								/>
							</div>

							{/* Toolbar */}
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block font-mono">
										Body Message
									</label>
									
									{/* Toolbar actions */}
									<div className="flex items-center gap-1 bg-zinc-900/60 p-0.5 rounded border border-zinc-800/80">
										<button
											type="button"
											onClick={() => insertFormat('**', '**')}
											title="Bold"
											className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
										>
											<Bold className="size-3.5" />
										</button>
										<button
											type="button"
											onClick={() => insertFormat('*', '*')}
											title="Italic"
											className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
										>
											<Italic className="size-3.5" />
										</button>
										<button
											type="button"
											onClick={() => insertFormat('_', '_')}
											title="Underline"
											className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
										>
											<Underline className="size-3.5" />
										</button>
										<span className="w-px h-4 bg-zinc-800 mx-0.5" />
										<button
											type="button"
											onClick={() => insertFormat('[Link Text](', ')')}
											title="Insert Link"
											className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
										>
											<Link className="size-3.5" />
										</button>
									</div>
								</div>

								<textarea
									id="alert-body-textarea"
									rows={12}
									placeholder="Write your email body message here... Double newlines start a new paragraph. Markdown format helpers are supported."
									value={body}
									onChange={(e) => setBody(e.target.value)}
									className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder-zinc-600 transition-colors font-sans resize-y leading-relaxed"
								/>
							</div>

							<div className="text-[10px] text-zinc-500 flex flex-wrap gap-x-4 gap-y-1 font-mono">
								<span>**Bold**</span>
								<span>*Italic*</span>
								<span>_Underline_</span>
								<span>[Link Text](https://url)</span>
							</div>
						</div>
					) : (
						/* Live brand template preview */
						<div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800/80 overflow-x-auto">
							<div 
								style={{
									fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
									maxWidth: "500px",
									padding: "24px",
									border: "1px solid #e4e4e7",
									borderRadius: "12px",
									color: "#334155",
									margin: "0 auto",
									background: "#ffffff"
								}}
							>
								<div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
									<style>{`
										@media (prefers-color-scheme: dark) {
											.wrkspace-light-logo { display: none !important; }
											.wrkspace-dark-logo { display: inline-block !important; }
										}
									`}</style>
									<img className="wrkspace-light-logo" src="https://ik.imagekit.io/dypkhqxip/wrkspacenew?updatedAt=1786471821009" alt="WrkSpace" style={{ height: "36px", width: "auto", display: "inline-block" }} />
									<img className="wrkspace-dark-logo" src="https://ik.imagekit.io/dypkhqxip/codered" alt="WrkSpace" style={{ height: "36px", width: "auto", display: "none" }} />
								</div>
								
								<h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", marginTop: "0", marginBottom: "16px" }}>
									{subject || 'No Subject Provided'}
								</h2>
								
								<div 
									style={{ fontSize: "14px", lineHeight: "1.6", color: "#334155" }}
									dangerouslySetInnerHTML={{ __html: getLivePreviewHtml() }}
								/>
								
								<div style={{ textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: "16px", marginTop: "24px", fontSize: "11px", color: "#94a3b8" }}>
									© 2026 Redlix Studio. All rights reserved.
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Column 3: Recipient selection */}
				<div className="space-y-6">
					<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
						<div className="flex items-center gap-2 text-white font-medium text-sm">
							<Users className="size-4 text-zinc-400" />
							Recipients Selection
						</div>

						{/* Selection mode toggle */}
						<div className="space-y-2">
							<label className="flex items-center gap-3 text-zinc-300 text-xs cursor-pointer p-2 hover:bg-zinc-800/40 rounded transition-colors">
								<input
									type="radio"
									name="recipientMode"
									checked={sendToAll}
									onChange={() => setSendToAll(true)}
									className="accent-brand-500"
								/>
								<span>All Active Employees ({employees.length})</span>
							</label>

							<label className="flex items-center gap-3 text-zinc-300 text-xs cursor-pointer p-2 hover:bg-zinc-800/40 rounded transition-colors">
								<input
									type="radio"
									name="recipientMode"
									checked={!sendToAll}
									onChange={() => setSendToAll(false)}
									className="accent-brand-500"
								/>
								<span>Select specific recipients</span>
							</label>
						</div>

						{!sendToAll && (
							<div className="space-y-3 pt-2 border-t border-zinc-800">
								{/* Search */}
								<div className="relative">
									<Search className="absolute left-3 top-2.5 size-3.5 text-zinc-500" />
									<input
										type="text"
										placeholder="Search by name or wing..."
										value={searchQ}
										onChange={(e) => setSearchQ(e.target.value)}
										className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 placeholder-zinc-600 transition-colors"
									/>
								</div>

								{/* Select specific list */}
								<div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
									{filteredEmployees.length === 0 ? (
										<div className="text-zinc-600 py-4 text-center">No active employees match.</div>
									) : (
										filteredEmployees.map(emp => {
											const isChecked = selectedEmpIds.includes(emp.id);
											return (
												<label 
													key={emp.id} 
													className={`flex items-center justify-between p-2 rounded border transition-colors cursor-pointer select-none ${
														isChecked 
															? 'border-brand-800 bg-brand-950/20 text-white' 
															: 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:bg-zinc-800/50'
													}`}
												>
													<div className="flex items-center gap-2">
														<input
															type="checkbox"
															checked={isChecked}
															onChange={() => toggleSelectEmployee(emp.id)}
															className="accent-brand-500"
														/>
														<div>
															<p className="font-semibold">{emp.firstName} {emp.lastName}</p>
															<p className="text-[10px] text-zinc-500">{emp.wingName} · {emp.email}</p>
														</div>
													</div>
												</label>
											);
										})
									)}
								</div>
							</div>
						)}

						{/* Action status message */}
						{statusMsg && (
							<div className={`p-3 rounded-lg flex items-start gap-2.5 text-xs ${
								statusMsg.type === 'success' 
									? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300' 
									: 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
							}`}>
								{statusMsg.type === 'success' ? (
									<CheckCircle className="size-4 shrink-0 mt-0.5 text-emerald-400" />
								) : (
									<AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-400" />
								)}
								<p>{statusMsg.text}</p>
							</div>
						)}

						{/* Dispatch Trigger Button */}
						<button
							onClick={handleSendAlerts}
							disabled={isSending}
							className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-150 active:scale-98 cursor-pointer disabled:cursor-not-allowed"
						>
							<Send className="size-3.5" />
							{isSending ? 'Sending alerts...' : 'Send Email Alerts'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
