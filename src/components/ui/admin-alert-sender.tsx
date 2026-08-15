'use client';
import React, { useState, useEffect } from 'react';
import { Send, Eye, Edit3, Bold, Italic, Underline, Link, Users, CheckCircle, AlertCircle, Search, BellIcon } from 'lucide-react';
import { getEmployees, sendBulkAlerts } from '@/app/admin/actions';
import { cn } from '@/lib/utils';
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
    const [statusMsg, setStatusMsg] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    useEffect(() => {
        getEmployees().then((data: any) => {
            if (data && Array.isArray(data)) {
                const active = data.filter((e: any) => e.employmentStatus === 'Active');
                setEmployees(active);
            }
        }).catch(err => console.error('Failed to load employees:', err));
    }, []);
    const getLivePreviewHtml = () => {
        if (!body)
            return '<p style="color: #94a3b8; font-style: italic;">Your email body preview will appear here...</p>';
        let html = body
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        html = html
            .replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/gi, '<strong>$1</strong>')
            .replace(/&lt;i&gt;([\s\S]*?)&lt;\/i&gt;/gi, '<em>$1</em>')
            .replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<span style="text-decoration: underline;">$1</span>')
            .replace(/&lt;strong&gt;([\s\S]*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>')
            .replace(/&lt;em&gt;([\s\S]*?)&lt;\/em&gt;/gi, '<em>$1</em>')
            .replace(/&lt;a\s+href=&quot;([^&]+?)&quot;&gt;([\s\S]*?)&lt;\/a&gt;/gi, '<a href="$1" target="_blank" style="color: #E61E32; text-decoration: underline; font-weight: 500;">$2</a>')
            .replace(/&lt;a\s+href=\'([^\']+?)\'&gt;([\s\S]*?)&lt;\/a&gt;/gi, '<a href="$1" target="_blank" style="color: #E61E32; text-decoration: underline; font-weight: 500;">$2</a>');
        html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__([\s\S]*?)__/g, '<strong>$1</strong>');
        html = html.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
        html = html.replace(/_([\s\S]*?)_/g, '<span style="text-decoration: underline;">$1</span>');
        html = html.replace(/\[([\s\S]*?)\]\((https?:\/\/[^\s\)]+?)\)/g, '<a href="$2" target="_blank" style="color: #E61E32; text-decoration: underline; font-weight: 500;">$1</a>');
        const paragraphs = html.split(/\n\s*\n+/);
        return paragraphs
            .map(p => {
            const trimmed = p.trim();
            if (!trimmed)
                return '';
            const withLineBreaks = trimmed.replace(/\n/g, '<br />');
            return `<p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${withLineBreaks}</p>`;
        })
            .filter(Boolean)
            .join('');
    };
    const insertFormat = (prefix: string, suffix: string = '') => {
        const textarea = document.getElementById('alert-body-textarea') as HTMLTextAreaElement;
        if (!textarea)
            return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        const replacement = prefix + (selected || 'text') + suffix;
        setBody(text.substring(0, start) + replacement + text.substring(end));
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || 'text').length);
        }, 50);
    };
    const toggleSelectEmployee = (id: string) => {
        if (selectedEmpIds.includes(id)) {
            setSelectedEmpIds(selectedEmpIds.filter(x => x !== id));
        }
        else {
            setSelectedEmpIds([...selectedEmpIds, id]);
        }
    };
    const filteredEmployees = employees.filter(e => {
        const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
        const emailMatch = e.email.toLowerCase().includes(searchQ.toLowerCase());
        const nameMatch = fullName.includes(searchQ.toLowerCase());
        const wingMatch = (e.wingName || '').toLowerCase().includes(searchQ.toLowerCase());
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
            }
            else {
                setStatusMsg({ type: 'error', text: res.error || 'Failed to dispatch alerts.' });
            }
        }
        catch (err: any) {
            setStatusMsg({ type: 'error', text: err.message || 'An unexpected error occurred.' });
        }
        finally {
            setIsSending(false);
        }
    };
    return (<div className="space-y-6">
			
			<div>
				<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Emergency Alert Sender</h2>
				<p className="text-xs text-slate-500 mt-0.5">
					Compose custom email alerts with rich formatting to notify team members. Jobs are queued and dispatched in the background.
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				
				<div className="lg:col-span-2 space-y-4">
					
					<div className="flex border-b border-slate-200">
						<button onClick={() => setActivePreviewTab('edit')} className={cn("py-2.5 px-4 flex items-center gap-2 border-b-2 text-xs font-semibold cursor-pointer transition-all", activePreviewTab === 'edit'
            ? "border-[#E61E32] text-[#E61E32]"
            : "border-transparent text-slate-500 hover:text-slate-800")}>
							<Edit3 className="size-3.5"/>
							Compose Alert
						</button>
						<button onClick={() => setActivePreviewTab('preview')} className={cn("py-2.5 px-4 flex items-center gap-2 border-b-2 text-xs font-semibold cursor-pointer transition-all", activePreviewTab === 'preview'
            ? "border-[#E61E32] text-[#E61E32]"
            : "border-transparent text-slate-500 hover:text-slate-800")}>
							<Eye className="size-3.5"/>
							Live Email Preview
						</button>
					</div>

					{activePreviewTab === 'edit' ? (<div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
							
							<div className="space-y-1">
								<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider block">
									Email Subject Title
								</label>
								<input type="text" placeholder="e.g. Urgent Notice: Scheduled Maintenance & Update" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 placeholder:text-slate-400 transition-colors"/>
							</div>

							
							<div className="space-y-1">
								<div className="flex items-center justify-between">
									<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider block">
										Body Message Content
									</label>
									
									
									<div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
										<button type="button" onClick={() => insertFormat('**', '**')} title="Bold" className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer">
											<Bold className="size-3.5"/>
										</button>
										<button type="button" onClick={() => insertFormat('*', '*')} title="Italic" className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer">
											<Italic className="size-3.5"/>
										</button>
										<button type="button" onClick={() => insertFormat('_', '_')} title="Underline" className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer">
											<Underline className="size-3.5"/>
										</button>
										<span className="w-px h-3.5 bg-slate-300 mx-0.5"/>
										<button type="button" onClick={() => insertFormat('[Link Text](', ')')} title="Insert Link" className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer">
											<Link className="size-3.5"/>
										</button>
									</div>
								</div>

								<textarea id="alert-body-textarea" rows={11} placeholder="Write your email body message here... Double newlines start a new paragraph. Markdown format helpers are supported." value={body} onChange={(e) => setBody(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 placeholder:text-slate-400 transition-colors font-normal resize-y leading-relaxed"/>
							</div>

							<div className="text-[10px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 font-mono">
								<span>**Bold**</span>
								<span>*Italic*</span>
								<span>_Underline_</span>
								<span>[Link Text](https://url)</span>
							</div>
						</div>) : (<div className="bg-slate-100/70 p-6 rounded-2xl border border-slate-200/90 overflow-x-auto">
							<div style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                maxWidth: "500px",
                padding: "24px",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                color: "#334155",
                margin: "0 auto",
                background: "#ffffff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}>
								<div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
									<img src="https://ik.imagekit.io/dypkhqxip/wrkspacenew?updatedAt=1786471821009" alt="WrkSpace" style={{ height: "32px", width: "auto", display: "inline-block" }}/>
								</div>
								
								<h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", marginTop: "0", marginBottom: "16px" }}>
									{subject || 'No Subject Provided'}
								</h2>
								
								<div style={{ fontSize: "13px", lineHeight: "1.6", color: "#334155" }} dangerouslySetInnerHTML={{ __html: getLivePreviewHtml() }}/>
								
								<div style={{ textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: "16px", marginTop: "24px", fontSize: "11px", color: "#94a3b8" }}>
									© 2026 Redlix Studio. All rights reserved.
								</div>
							</div>
						</div>)}
				</div>

				
				<div className="space-y-4">
					<div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
						<div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
							<Users className="size-4 text-[#E61E32]"/>
							Recipients Selection
						</div>

						
						<div className="space-y-2">
							<label className="flex items-center gap-3 text-slate-700 text-xs cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
								<input type="radio" name="recipientMode" checked={sendToAll} onChange={() => setSendToAll(true)} className="accent-[#E61E32]"/>
								<span className="font-medium">All Active Employees ({employees.length})</span>
							</label>

							<label className="flex items-center gap-3 text-slate-700 text-xs cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
								<input type="radio" name="recipientMode" checked={!sendToAll} onChange={() => setSendToAll(false)} className="accent-[#E61E32]"/>
								<span className="font-medium">Select specific recipients</span>
							</label>
						</div>

						{!sendToAll && (<div className="space-y-3 pt-2 border-t border-slate-100">
								
								<div className="relative">
									<Search className="absolute left-3 top-2.5 size-3.5 text-slate-400"/>
									<input type="text" placeholder="Search by name or wing..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 transition-colors"/>
								</div>

								
								<div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
									{filteredEmployees.length === 0 ? (<div className="text-slate-400 py-4 text-center text-xs italic">No active employees match.</div>) : (filteredEmployees.map(emp => {
                const isChecked = selectedEmpIds.includes(emp.id);
                return (<label key={emp.id} className={cn("flex items-center justify-between p-2.5 rounded-xl border transition-colors cursor-pointer select-none", isChecked
                        ? "border-red-200 bg-red-50/60 text-slate-900"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100")}>
													<div className="flex items-center gap-2">
														<input type="checkbox" checked={isChecked} onChange={() => toggleSelectEmployee(emp.id)} className="accent-[#E61E32]"/>
														<div>
															<p className="font-semibold text-slate-800">{emp.firstName} {emp.lastName}</p>
															<p className="text-[10px] text-slate-500">{emp.wingName} · {emp.email}</p>
														</div>
													</div>
												</label>);
            }))}
								</div>
							</div>)}

						
						{statusMsg && (<div className={cn("p-3 rounded-xl flex items-start gap-2.5 text-xs border shadow-2xs", statusMsg.type === 'success'
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800")}>
								{statusMsg.type === 'success' ? (<CheckCircle className="size-4 shrink-0 mt-0.5 text-emerald-600"/>) : (<AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600"/>)}
								<p>{statusMsg.text}</p>
							</div>)}

						
						<button onClick={handleSendAlerts} disabled={isSending} className="w-full bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer">
							<Send className="size-3.5"/>
							{isSending ? 'Dispatching alerts...' : 'Send Broadcast Alert'}
						</button>
					</div>
				</div>
			</div>
		</div>);
}
