'use client';
import React, { useState, useEffect } from 'react';
import { 
    Send, 
    Eye, 
    Edit3, 
    Bold, 
    Italic, 
    Underline, 
    Link as LinkIcon, 
    Users, 
    CheckCircle, 
    AlertCircle, 
    Search, 
    Mail, 
    UserPlus, 
    Sparkles, 
    Plus, 
    X, 
    History, 
    UserCheck,
    SendHorizonal
} from 'lucide-react';
import { getEmployees, sendBulkAlerts, sendDirectEmail } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

interface EmployeeItem {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    wingName: string;
    employmentStatus: string;
}

interface DispatchHistoryItem {
    id: string;
    timestamp: string;
    module: 'broadcast' | 'direct';
    recipients: string[];
    subject: string;
    status: 'success' | 'failed';
}

const TEMPLATES = [
    {
        id: 'interview_invitation',
        name: '💼 Interview Invitation',
        category: 'Hiring',
        subject: 'Invitation for Interview - [Role Name] at WrkSpace',
        body: `Dear **[Candidate Name]**,

Thank you for your interest in joining our team at **WrkSpace (Redlix Studio)**! We were very impressed by your background and would like to invite you for an interview for the **[Role Name]** position.

### 📅 Interview Details
- **Position:** [Role Name]
- **Date & Time:** [e.g. Monday, 25th August at 3:00 PM IST]
- **Meeting Link:** [Join Video Call](https://meet.google.com/your-meeting-link)
- **Duration:** 45 minutes

Please review the position requirements and let us know if this time slot works for you. If you need to reschedule, feel free to reply directly to this email with your preferred availability.

We look forward to speaking with you!

Best regards,  
**Hiring Team**  
*WrkSpace / Redlix Studio*`
    },
    {
        id: 'application_shortlist',
        name: '📝 Application Shortlist Update',
        category: 'Hiring',
        subject: 'Application Update: Shortlisted for [Role Name] - WrkSpace',
        body: `Hello **[Candidate Name]**,

We have completed the initial screening of applications for the **[Role Name]** role, and we are pleased to inform you that your profile has been **shortlisted**!

### 🚀 Next Steps
1. Complete our quick technical / assessment task.
2. Ensure your portfolio or GitHub repositories are accessible.
3. Keep an eye on your inbox for our follow-up interview schedule.

If you have any questions or require any clarification regarding the role or process, please reply to this email.

Warm regards,  
**Talent Acquisition Team**  
*WrkSpace*`
    },
    {
        id: 'job_offer',
        name: '🎉 Job Offer & Welcome',
        category: 'Hiring',
        subject: 'Congratulations! Official Job Offer - WrkSpace',
        body: `Dear **[Candidate Name]**,

On behalf of **WrkSpace (Redlix Studio)**, we are thrilled to formally offer you the position of **[Job Title / Role]**!

### 🌟 Offer Highlights
- **Role:** [Job Title]
- **Department / Wing:** [e.g. Engineering / Design / Marketing]
- **Tentative Start Date:** [Start Date]
- **Reporting To:** [Hiring Manager / Team Lead]

We believe your skills and passion will be a tremendous addition to our team and culture. Please review the attached / mentioned terms and confirm your acceptance by replying to this email.

Welcome aboard! We are super excited to work with you.

Sincerely,  
**Leadership & HR Team**  
*WrkSpace*`
    },
    {
        id: 'doc_submission',
        name: '📄 Document Verification Request',
        category: 'Hiring & Onboarding',
        subject: 'Action Required: Submit Onboarding Documents for Verification',
        body: `Dear **[Member / Candidate Name]**,

To complete your onboarding verification and account activation on the **WrkSpace Portal**, please provide the following required documentation at your earliest convenience:

- **Government Photo ID** (Aadhaar / Passport / Driving License)
- **Educational Certificates / Degree transcripts**
- **Experience Letters** from previous employers (if applicable)
- **Updated Resume / Portfolio links**

You can reply directly to this email with the attachments or submit them via the member portal link: [Open Verification Portal](https://app.redlix.co.in/verification)

Thank you for your prompt cooperation!

Best regards,  
**Operations & Verification Desk**  
*WrkSpace*`
    },
    {
        id: 'member_welcome',
        name: '🤝 Member Portal Access & Welcome',
        category: 'Members',
        subject: 'Welcome to WrkSpace - Your Member Access & Guide',
        body: `Hello **[Member Name]**,

Welcome to the **WrkSpace** community! Your member profile and dashboard access have been successfully configured.

### 🔑 Portal Access
- **Portal URL:** [Access WrkSpace Dashboard](https://app.redlix.co.in)
- **Registered Email:** [Your Registered Email]

You can now track your assignments, access company channels, submit work updates, and check in on shifts directly through the dashboard.

If you encounter any issues accessing your account, please reach out to your team lead or reply to this email.

Best regards,  
**Community & Admin Team**  
*WrkSpace*`
    }
];

export function AdminAlertSender() {
    // Mode: 'broadcast' (internal employees bulk) | 'direct' (hiring, external, specific member emails)
    const [activeModule, setActiveModule] = useState<'direct' | 'broadcast'>('direct');
    
    // Broadcast State
    const [broadcastSubject, setBroadcastSubject] = useState('');
    const [broadcastBody, setBroadcastBody] = useState('');
    const [sendToAll, setSendToAll] = useState(true);
    const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
    const [searchQ, setSearchQ] = useState('');

    // Direct / Hiring Mailer State
    const [directEmails, setDirectEmails] = useState<string[]>([]);
    const [emailInput, setEmailInput] = useState('');
    const [directSubject, setDirectSubject] = useState('');
    const [directBody, setDirectBody] = useState('');
    const [memberSearchQ, setMemberSearchQ] = useState('');
    const [showMemberPicker, setShowMemberPicker] = useState(false);

    // Common State
    const [activePreviewTab, setActivePreviewTab] = useState<'edit' | 'preview'>('edit');
    const [employees, setEmployees] = useState<EmployeeItem[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [dispatchHistory, setDispatchHistory] = useState<DispatchHistoryItem[]>([]);

    useEffect(() => {
        getEmployees().then((data: any) => {
            if (data && Array.isArray(data)) {
                const active = data.filter((e: any) => e.employmentStatus === 'Active');
                setEmployees(active);
            }
        }).catch(err => console.error('Failed to load employees:', err));
    }, []);

    const activeSubject = activeModule === 'direct' ? directSubject : broadcastSubject;
    const activeBody = activeModule === 'direct' ? directBody : broadcastBody;

    const getLivePreviewHtml = (rawBody: string) => {
        if (!rawBody)
            return '<p style="color: #94a3b8; font-style: italic;">Your email body preview will appear here...</p>';
        let html = rawBody
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
        
        // Markdown headings
        html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 15px; font-weight: 600; color: #1e293b; margin: 16px 0 8px;">$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 18px 0 10px;">$1</h2>');

        // Paragraphs
        const paragraphs = html.split(/\n\s*\n+/);
        return paragraphs
            .map(p => {
                const trimmed = p.trim();
                if (!trimmed)
                    return '';
                if (trimmed.startsWith('<h2') || trimmed.startsWith('<h3')) {
                    return trimmed;
                }
                const withLineBreaks = trimmed.replace(/\n/g, '<br />');
                return `<p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${withLineBreaks}</p>`;
            })
            .filter(Boolean)
            .join('');
    };

    const insertFormat = (prefix: string, suffix: string = '') => {
        const textareaId = activeModule === 'direct' ? 'direct-body-textarea' : 'broadcast-body-textarea';
        const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
        if (!textarea)
            return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        const replacement = prefix + (selected || 'text') + suffix;
        
        if (activeModule === 'direct') {
            setDirectBody(text.substring(0, start) + replacement + text.substring(end));
        } else {
            setBroadcastBody(text.substring(0, start) + replacement + text.substring(end));
        }

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || 'text').length);
        }, 50);
    };

    // Direct Email Management
    const handleAddEmail = (emailToAdd?: string) => {
        const raw = emailToAdd || emailInput;
        if (!raw.trim()) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const parts = raw.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
        
        const newValid = parts.filter(e => emailRegex.test(e) && !directEmails.includes(e));
        if (newValid.length > 0) {
            setDirectEmails([...directEmails, ...newValid]);
            if (!emailToAdd) setEmailInput('');
            setStatusMsg(null);
        } else if (parts.some(e => !emailRegex.test(e))) {
            setStatusMsg({ type: 'error', text: 'Please enter a valid email address format (e.g., candidate@example.com).' });
        }
    };

    const handleRemoveEmail = (emailToRemove: string) => {
        setDirectEmails(directEmails.filter(e => e !== emailToRemove));
    };

    const handleApplyTemplate = (tmplId: string) => {
        const template = TEMPLATES.find(t => t.id === tmplId);
        if (!template) return;
        setDirectSubject(template.subject);
        setDirectBody(template.body);
        setStatusMsg({ type: 'success', text: `Loaded template: "${template.name}"` });
    };

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
        const wingMatch = (e.wingName || '').toLowerCase().includes(searchQ.toLowerCase());
        return emailMatch || nameMatch || wingMatch;
    });

    const filteredEmployeesForDirect = employees.filter(e => {
        const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
        const emailMatch = e.email.toLowerCase().includes(memberSearchQ.toLowerCase());
        const nameMatch = fullName.includes(memberSearchQ.toLowerCase());
        return emailMatch || nameMatch;
    });

    // Send Handlers
    const handleSendDirectEmail = async () => {
        let finalEmails = [...directEmails];
        if (emailInput.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const parts = emailInput.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
            const valid = parts.filter(e => emailRegex.test(e) && !finalEmails.includes(e));
            finalEmails = [...finalEmails, ...valid];
            setDirectEmails(finalEmails);
            setEmailInput('');
        }

        if (finalEmails.length === 0) {
            setStatusMsg({ type: 'error', text: 'Please add at least one recipient email address.' });
            return;
        }
        if (!directSubject.trim()) {
            setStatusMsg({ type: 'error', text: 'Please enter the email subject line.' });
            return;
        }
        if (!directBody.trim()) {
            setStatusMsg({ type: 'error', text: 'Please enter the email message content.' });
            return;
        }

        setIsSending(true);
        setStatusMsg(null);

        try {
            const res = await sendDirectEmail(finalEmails, directSubject, directBody);
            if (res.success && res.recipients) {
                setStatusMsg({
                    type: 'success',
                    text: `Success! Email queued and dispatched to ${res.count} recipient(s) (${res.recipients.join(', ')}).`
                });

                // Add to session history
                setDispatchHistory(prev => [
                    {
                        id: String(Date.now()),
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        module: 'direct',
                        recipients: res.recipients || finalEmails,
                        subject: directSubject,
                        status: 'success'
                    },
                    ...prev
                ]);

                // Reset fields
                setDirectSubject('');
                setDirectBody('');
                setDirectEmails([]);
            } else {
                setStatusMsg({ type: 'error', text: res.error || 'Failed to dispatch email.' });
            }
        } catch (err: any) {
            setStatusMsg({ type: 'error', text: err.message || 'An unexpected error occurred.' });
        } finally {
            setIsSending(false);
        }
    };

    const handleSendBroadcastAlerts = async () => {
        if (!broadcastSubject.trim()) {
            setStatusMsg({ type: 'error', text: 'Please enter an alert subject.' });
            return;
        }
        if (!broadcastBody.trim()) {
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
            const res = await sendBulkAlerts(broadcastSubject, broadcastBody, targets);
            if (res.success) {
                setStatusMsg({
                    type: 'success',
                    text: `Success! Broadcast alerts dispatched successfully to ${res.count} recipient(s).`
                });

                setDispatchHistory(prev => [
                    {
                        id: String(Date.now()),
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        module: 'broadcast',
                        recipients: sendToAll ? [`All Active Employees (${res.count})`] : [`${selectedEmpIds.length} Selected Employees`],
                        subject: broadcastSubject,
                        status: 'success'
                    },
                    ...prev
                ]);

                setBroadcastSubject('');
                setBroadcastBody('');
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
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header & Module Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-red-50 text-[#E61E32]">
                            <Mail className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                Mail & Alert Dispatcher
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                    Resend & BullMQ
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Send targeted emails to hiring candidates, specific members, or broadcast bulk alerts to internal teams.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Module Selector Pill Tabs */}
                <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
                    <button
                        onClick={() => {
                            setActiveModule('direct');
                            setStatusMsg(null);
                        }}
                        className={cn(
                            "flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                            activeModule === 'direct'
                                ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                                : "text-slate-600 hover:text-slate-900"
                        )}
                    >
                        <UserPlus className="size-3.5 text-[#E61E32]" />
                        <span>Direct Mailer (Hiring & Members)</span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveModule('broadcast');
                            setStatusMsg(null);
                        }}
                        className={cn(
                            "flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                            activeModule === 'broadcast'
                                ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                                : "text-slate-600 hover:text-slate-900"
                        )}
                    >
                        <Users className="size-3.5 text-slate-600" />
                        <span>Employee Broadcast Alert</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Cols: Editor & Preview */}
                <div className="lg:col-span-2 space-y-4">
                    
                    {/* View Switcher (Edit vs Live Email Preview) */}
                    <div className="flex items-center justify-between border-b border-slate-200">
                        <div className="flex">
                            <button
                                onClick={() => setActivePreviewTab('edit')}
                                className={cn(
                                    "py-2.5 px-4 flex items-center gap-2 border-b-2 text-xs font-semibold cursor-pointer transition-all",
                                    activePreviewTab === 'edit'
                                        ? "border-[#E61E32] text-[#E61E32]"
                                        : "border-transparent text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <Edit3 className="size-3.5" />
                                Compose Message
                            </button>
                            <button
                                onClick={() => setActivePreviewTab('preview')}
                                className={cn(
                                    "py-2.5 px-4 flex items-center gap-2 border-b-2 text-xs font-semibold cursor-pointer transition-all",
                                    activePreviewTab === 'preview'
                                        ? "border-[#E61E32] text-[#E61E32]"
                                        : "border-transparent text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <Eye className="size-3.5" />
                                Live Email Preview
                            </button>
                        </div>

                        {activeModule === 'direct' && (
                            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block">
                                Markdown & Rich Links Enabled
                            </span>
                        )}
                    </div>

                    {activePreviewTab === 'edit' ? (
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-5">
                            
                            {/* If Direct Mailer: Quick Template Selector Banner */}
                            {activeModule === 'direct' && (
                                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                            <Sparkles className="size-3.5 text-[#E61E32]" />
                                            <span>Quick Hiring & Member Templates:</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">One-click load</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {TEMPLATES.map(tmpl => (
                                            <button
                                                key={tmpl.id}
                                                type="button"
                                                onClick={() => handleApplyTemplate(tmpl.id)}
                                                className="text-[11px] bg-white hover:bg-red-50 hover:text-[#E61E32] hover:border-red-200 text-slate-700 font-medium px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                                            >
                                                {tmpl.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Subject Input */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
                                    Email Subject Line
                                </label>
                                <input
                                    type="text"
                                    placeholder={
                                        activeModule === 'direct'
                                            ? "e.g. Invitation for Technical Interview: Software Engineer Role"
                                            : "e.g. Urgent Notice: Scheduled Maintenance & Updates"
                                    }
                                    value={activeSubject}
                                    onChange={(e) => {
                                        if (activeModule === 'direct') setDirectSubject(e.target.value);
                                        else setBroadcastSubject(e.target.value);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 placeholder:text-slate-400 transition-colors font-medium"
                                />
                            </div>

                            {/* Body Message Editor & Toolbar */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
                                        Email Body Content
                                    </label>
                                    
                                    {/* Markdown Format Controls */}
                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => insertFormat('**', '**')}
                                            title="Bold"
                                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                                        >
                                            <Bold className="size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => insertFormat('*', '*')}
                                            title="Italic"
                                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                                        >
                                            <Italic className="size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => insertFormat('_', '_')}
                                            title="Underline"
                                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                                        >
                                            <Underline className="size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => insertFormat('### ', '')}
                                            title="Heading"
                                            className="px-1.5 py-0.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                                        >
                                            H3
                                        </button>
                                        <span className="w-px h-3.5 bg-slate-300 mx-0.5" />
                                        <button
                                            type="button"
                                            onClick={() => insertFormat('[Link Text](', ')')}
                                            title="Insert Link"
                                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                                        >
                                            <LinkIcon className="size-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <textarea
                                    id={activeModule === 'direct' ? "direct-body-textarea" : "broadcast-body-textarea"}
                                    rows={12}
                                    placeholder={
                                        activeModule === 'direct'
                                            ? "Write your email message to the candidate or member here...\n\nUse double newlines for paragraphs.\nFormatting with **bold**, *italic*, ### headings, and [link text](https://url) is supported."
                                            : "Write your broadcast message here... Double newlines start a new paragraph."
                                    }
                                    value={activeBody}
                                    onChange={(e) => {
                                        if (activeModule === 'direct') setDirectBody(e.target.value);
                                        else setBroadcastBody(e.target.value);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 placeholder:text-slate-400 transition-colors font-normal resize-y leading-relaxed font-mono text-[11.5px]"
                                />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                    <span>**Bold**</span>
                                    <span>*Italic*</span>
                                    <span>_Underline_</span>
                                    <span>### Heading</span>
                                    <span>[Link](https://url)</span>
                                </div>
                                <span>{activeBody.length} characters</span>
                            </div>
                        </div>
                    ) : (
                        /* Live HTML Preview Tab */
                        <div className="bg-slate-100/70 p-6 rounded-2xl border border-slate-200/90 overflow-x-auto">
                            <div
                                style={{
                                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                                    maxWidth: "520px",
                                    padding: "28px",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "16px",
                                    color: "#334155",
                                    margin: "0 auto",
                                    background: "#ffffff",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
                                }}
                            >
                                <div style={{ textAlign: "center", marginBottom: "22px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
                                    <img
                                        src="https://ik.imagekit.io/dypkhqxip/wrkspacenew?updatedAt=1786471821009"
                                        alt="WrkSpace"
                                        style={{ height: "32px", width: "auto", display: "inline-block" }}
                                    />
                                </div>
                                
                                <h2 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", marginTop: "0", marginBottom: "16px" }}>
                                    {activeSubject || 'No Subject Provided'}
                                </h2>
                                
                                <div
                                    style={{ fontSize: "13.5px", lineHeight: "1.65", color: "#334155" }}
                                    dangerouslySetInnerHTML={{ __html: getLivePreviewHtml(activeBody) }}
                                />
                                
                                <div style={{ textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: "18px", marginTop: "28px", fontSize: "11px", color: "#94a3b8" }}>
                                    © 2026 Redlix Studio. All rights reserved.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Recipients & Dispatch Controls */}
                <div className="space-y-4">
                    
                    {/* Module A: Direct Mailer Recipients Box */}
                    {activeModule === 'direct' ? (
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                                    <UserPlus className="size-4 text-[#E61E32]" />
                                    <span>Recipient Emails</span>
                                </div>
                                <span className="text-[11px] font-semibold px-2 py-0.5 bg-red-50 text-[#E61E32] rounded-full border border-red-100">
                                    {directEmails.length} added
                                </span>
                            </div>

                            {/* Email Input & Add Button */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-medium text-slate-600 block">
                                    Add Candidate or Member Email:
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder="e.g. candidate@example.com"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ',') {
                                                e.preventDefault();
                                                handleAddEmail();
                                            }
                                        }}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleAddEmail()}
                                        className="bg-slate-900 hover:bg-black text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                    >
                                        <Plus className="size-3.5" />
                                        Add
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    Tip: You can paste multiple emails separated by commas or spaces.
                                </p>
                            </div>

                            {/* Recipient Chips List */}
                            <div className="space-y-2">
                                {directEmails.length > 0 ? (
                                    <div className="max-h-40 overflow-y-auto p-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 text-[10px] text-slate-500 font-medium">
                                            <span>Queued Recipients</span>
                                            <button
                                                type="button"
                                                onClick={() => setDirectEmails([])}
                                                className="text-rose-600 hover:underline cursor-pointer font-semibold"
                                            >
                                                Clear all
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {directEmails.map((email) => (
                                                <span
                                                    key={email}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-[11px] font-medium shadow-2xs"
                                                >
                                                    <Mail className="size-3 text-slate-400" />
                                                    {email}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveEmail(email)}
                                                        className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                                                    >
                                                        <X className="size-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                        <UserPlus className="size-5 mx-auto mb-1.5 text-slate-300" />
                                        No recipient emails added yet.
                                    </div>
                                )}
                            </div>

                            {/* Quick Add Existing Member Drawer / Trigger */}
                            <div className="pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowMemberPicker(!showMemberPicker)}
                                    className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                                >
                                    <span className="flex items-center gap-2">
                                        <UserCheck className="size-3.5 text-slate-500" />
                                        Select from Active Staff/Members
                                    </span>
                                    <span className="text-[10px] text-slate-400">{showMemberPicker ? '▲ Close' : '▼ Expand'}</span>
                                </button>

                                {showMemberPicker && (
                                    <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search staff members..."
                                                value={memberSearchQ}
                                                onChange={(e) => setMemberSearchQ(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
                                            />
                                        </div>
                                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-[11px]">
                                            {filteredEmployeesForDirect.slice(0, 15).map(emp => (
                                                <button
                                                    key={emp.id}
                                                    type="button"
                                                    onClick={() => handleAddEmail(emp.email)}
                                                    className="w-full text-left p-1.5 hover:bg-white rounded-md flex items-center justify-between text-slate-700 hover:text-slate-900 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                                                >
                                                    <div>
                                                        <span className="font-semibold">{emp.firstName} {emp.lastName}</span>
                                                        <span className="text-[10px] text-slate-400 ml-1.5">({emp.email})</span>
                                                    </div>
                                                    <span className="text-[10px] text-[#E61E32] font-semibold">+ Add</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Status Feedback */}
                            {statusMsg && (
                                <div className={cn(
                                    "p-3 rounded-xl flex items-start gap-2.5 text-xs border shadow-2xs",
                                    statusMsg.type === 'success'
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                        : "bg-rose-50 border-rose-200 text-rose-800"
                                )}>
                                    {statusMsg.type === 'success' ? (
                                        <CheckCircle className="size-4 shrink-0 mt-0.5 text-emerald-600" />
                                    ) : (
                                        <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
                                    )}
                                    <p className="leading-snug">{statusMsg.text}</p>
                                </div>
                            )}

                            {/* Send Button */}
                            <button
                                onClick={handleSendDirectEmail}
                                disabled={isSending}
                                className="w-full bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-50 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                                <SendHorizonal className="size-4" />
                                {isSending ? 'Dispatching Direct Email...' : `Send Email (${directEmails.length} Recipient${directEmails.length === 1 ? '' : 's'})`}
                            </button>
                        </div>
                    ) : (
                        /* Module B: Employee Broadcast Recipients Box */
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
                                <Users className="size-4 text-[#E61E32]" />
                                <span>Broadcast Recipients</span>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-3 text-slate-700 text-xs cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
                                    <input
                                        type="radio"
                                        name="recipientMode"
                                        checked={sendToAll}
                                        onChange={() => setSendToAll(true)}
                                        className="accent-[#E61E32]"
                                    />
                                    <span className="font-medium">All Active Employees ({employees.length})</span>
                                </label>

                                <label className="flex items-center gap-3 text-slate-700 text-xs cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
                                    <input
                                        type="radio"
                                        name="recipientMode"
                                        checked={!sendToAll}
                                        onChange={() => setSendToAll(false)}
                                        className="accent-[#E61E32]"
                                    />
                                    <span className="font-medium">Select specific employees</span>
                                </label>
                            </div>

                            {!sendToAll && (
                                <div className="space-y-3 pt-2 border-t border-slate-100">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or wing..."
                                            value={searchQ}
                                            onChange={(e) => setSearchQ(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 transition-colors"
                                        />
                                    </div>

                                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                                        {filteredEmployees.length === 0 ? (
                                            <div className="text-slate-400 py-4 text-center text-xs italic">
                                                No active employees match.
                                            </div>
                                        ) : (
                                            filteredEmployees.map(emp => {
                                                const isChecked = selectedEmpIds.includes(emp.id);
                                                return (
                                                    <label
                                                        key={emp.id}
                                                        className={cn(
                                                            "flex items-center justify-between p-2.5 rounded-xl border transition-colors cursor-pointer select-none",
                                                            isChecked
                                                                ? "border-red-200 bg-red-50/60 text-slate-900"
                                                                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => toggleSelectEmployee(emp.id)}
                                                                className="accent-[#E61E32]"
                                                            />
                                                            <div>
                                                                <p className="font-semibold text-slate-800">{emp.firstName} {emp.lastName}</p>
                                                                <p className="text-[10px] text-slate-500">{emp.wingName} · {emp.email}</p>
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Status Feedback */}
                            {statusMsg && (
                                <div className={cn(
                                    "p-3 rounded-xl flex items-start gap-2.5 text-xs border shadow-2xs",
                                    statusMsg.type === 'success'
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                        : "bg-rose-50 border-rose-200 text-rose-800"
                                )}>
                                    {statusMsg.type === 'success' ? (
                                        <CheckCircle className="size-4 shrink-0 mt-0.5 text-emerald-600" />
                                    ) : (
                                        <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
                                    )}
                                    <p className="leading-snug">{statusMsg.text}</p>
                                </div>
                            )}

                            <button
                                onClick={handleSendBroadcastAlerts}
                                disabled={isSending}
                                className="w-full bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-50 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                                <Send className="size-3.5" />
                                {isSending ? 'Dispatching broadcast...' : 'Send Broadcast Alert'}
                            </button>
                        </div>
                    )}

                    {/* Session Dispatch History Box */}
                    {dispatchHistory.length > 0 && (
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
                            <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider pb-1.5 border-b border-slate-100">
                                <History className="size-3.5 text-slate-500" />
                                <span>Recent Session Dispatches</span>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {dispatchHistory.map(item => (
                                    <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-slate-800 truncate max-w-[150px]">{item.subject}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 truncate">
                                            To: {item.recipients.join(', ')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

