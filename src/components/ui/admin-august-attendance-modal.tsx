'use client';

import React, { useEffect, useState, useTransition } from 'react';
import {
    X,
    Mail,
    FileText,
    AlertTriangle,
    CheckCircle2,
    Search,
    Send,
    Loader2,
    Eye,
    ShieldAlert,
    RefreshCw,
    Download,
    Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    getAugustAttendanceOverviewAction,
    previewAugustAttendancePdfAction,
    sendAugustAttendanceReportsAction,
} from '@/app/admin/actions';

interface AdminAugustAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AdminAugustAttendanceModal({ isOpen, onClose }: AdminAugustAttendanceModalProps) {
    const [loading, setLoading] = useState(true);
    const [overviewData, setOverviewData] = useState<{
        totalEmployees: number;
        workingDaysCount: number;
        belowSixtyCount: number;
        compliantCount: number;
        employees: Array<{
            id: string;
            name: string;
            email: string;
            role: string;
            wingName: string;
            totalWorkingDays: number;
            presentDays: number;
            absentDays: number;
            attendancePercentage: number;
            isBelowSixty: boolean;
        }>;
    } | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'BELOW_60' | 'COMPLIANT'>('ALL');
    const [isPending, startTransition] = useTransition();
    const [dispatching, setDispatching] = useState(false);
    const [dispatchProgress, setDispatchProgress] = useState<string | null>(null);
    const [singleSendingId, setSingleSendingId] = useState<string | null>(null);
    const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
    const [dispatchLogs, setDispatchLogs] = useState<any[] | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        setStatusMessage(null);
        try {
            const res = await getAugustAttendanceOverviewAction();
            if (res.success && res.employees) {
                setOverviewData(res as any);
            } else {
                setStatusMessage({ type: 'error', text: res.error || 'Failed to load August attendance data' });
            }
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err?.message || 'Error loading overview' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            void loadData();
            setDispatchLogs(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredEmployees = (overviewData?.employees || []).filter((emp) => {
        const matchesSearch =
            emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.wingName.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (filterStatus === 'BELOW_60') return emp.isBelowSixty;
        if (filterStatus === 'COMPLIANT') return !emp.isBelowSixty;
        return true;
    });

    const handlePreviewPdf = async (employeeId: string, employeeName: string) => {
        setPreviewLoadingId(employeeId);
        try {
            const res = await previewAugustAttendancePdfAction(employeeId);
            if (res.success && res.base64) {
                const byteCharacters = atob(res.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);

                // Open in new tab
                window.open(blobUrl, '_blank');
            } else {
                alert(res.error || 'Failed to generate PDF');
            }
        } catch (e: any) {
            alert('Error generating preview: ' + e.message);
        } finally {
            setPreviewLoadingId(null);
        }
    };

    const handleSendSingle = async (employeeId: string, employeeName: string) => {
        if (!confirm(`Send official August Attendance email & PDF statement to ${employeeName}?`)) return;
        setSingleSendingId(employeeId);
        setStatusMessage(null);
        try {
            const res = await sendAugustAttendanceReportsAction({ employeeId, dryRun: false });
            if (res.success) {
                setStatusMessage({
                    type: 'success',
                    text: `Successfully dispatched August Attendance PDF statement to ${employeeName}!`,
                });
            } else {
                setStatusMessage({ type: 'error', text: res.error || 'Failed to dispatch email' });
            }
        } catch (e: any) {
            setStatusMessage({ type: 'error', text: e.message || 'Dispatch error' });
        } finally {
            setSingleSendingId(null);
        }
    };

    const handleBulkDispatch = async (dryRun: boolean) => {
        const count = overviewData?.totalEmployees || 0;
        const belowCount = overviewData?.belowSixtyCount || 0;

        const actionWord = dryRun ? 'run simulation for' : 'SEND official emails & PDFs to';
        if (
            !confirm(
                `Are you sure you want to ${actionWord} ALL ${count} employees for August 2026?\n\n- ${belowCount} employees will receive STRICT ACTION NOTICES (< 60% attendance)\n- ${count - belowCount} employees will receive compliant statements.`
            )
        ) {
            return;
        }

        setDispatching(true);
        setDispatchProgress(dryRun ? 'Simulating email and PDF generation...' : 'Dispatching emails with attached PDFs via Resend...');
        setStatusMessage(null);
        setDispatchLogs(null);

        try {
            const res = await sendAugustAttendanceReportsAction({ dryRun });
            if (res.success && res.result) {
                setDispatchLogs(res.result.logs);
                setStatusMessage({
                    type: 'success',
                    text: dryRun
                        ? `Simulation complete! Successfully verified ${res.result.sent} statements (${res.result.belowSixtyCount} with strict warning).`
                        : `Successfully dispatched ${res.result.sent} August attendance emails with attached PDFs!`,
                });
            } else {
                setStatusMessage({
                    type: 'error',
                    text: res.error || 'Failed to execute bulk dispatch',
                });
            }
        } catch (e: any) {
            setStatusMessage({ type: 'error', text: e.message || 'Bulk dispatch failed' });
        } finally {
            setDispatching(false);
            setDispatchProgress(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-8 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#E61E32]/20 border border-[#E61E32]/40 rounded-xl text-[#E61E32]">
                            <Mail className="size-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold tracking-tight">August 2026 Attendance Statements & PDF Dispatch</h3>
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-[#E61E32] text-white">
                                    Official
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">
                                Send personalized August attendance PDFs to all employees with strict warnings for &lt;60% attendance.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={dispatching}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Status / Alert Banner */}
                {statusMessage && (
                    <div
                        className={cn(
                            'px-6 py-3 text-xs font-semibold flex items-center gap-2 border-b',
                            statusMessage.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-red-50 text-red-800 border-red-200'
                        )}
                    >
                        {statusMessage.type === 'success' ? <Check className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
                        <span>{statusMessage.text}</span>
                    </div>
                )}

                {/* Metrics Summary Strip */}
                <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">August Evaluated Days</span>
                        <p className="text-xl font-black text-slate-800 mt-0.5">{overviewData?.workingDaysCount ?? '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Employees</span>
                        <p className="text-xl font-black text-slate-800 mt-0.5">{overviewData?.totalEmployees ?? '-'}</p>
                    </div>
                    <div className="bg-red-50/70 p-3 rounded-xl border border-red-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Below 60% (Strict Notice)</span>
                            <ShieldAlert className="size-3.5 text-red-600" />
                        </div>
                        <p className="text-xl font-black text-red-700 mt-0.5">{overviewData?.belowSixtyCount ?? '-'}</p>
                    </div>
                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Compliant (&ge; 60%)</span>
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                        </div>
                        <p className="text-xl font-black text-emerald-700 mt-0.5">{overviewData?.compliantCount ?? '-'}</p>
                    </div>
                </div>

                {/* Policy Notice Callout */}
                <div className="px-6 py-2.5 bg-amber-50/60 border-b border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <strong className="font-semibold">Policy Enforcement Rule:</strong> Employees with August attendance below{' '}
                        <strong>60.0%</strong> will automatically have their PDF statement and email highlighted with an official{' '}
                        <strong className="text-red-700">Strict Administrative & Disciplinary Action Notice</strong>.
                    </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                    <div className="relative w-full sm:w-80">
                        <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search employee, ID, wing..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                        <button
                            onClick={() => setFilterStatus('ALL')}
                            className={cn(
                                'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer',
                                filterStatus === 'ALL'
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            )}
                        >
                            All ({overviewData?.employees?.length || 0})
                        </button>
                        <button
                            onClick={() => setFilterStatus('BELOW_60')}
                            className={cn(
                                'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer',
                                filterStatus === 'BELOW_60'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            )}
                        >
                            ⚠️ Below 60% ({overviewData?.belowSixtyCount || 0})
                        </button>
                        <button
                            onClick={() => setFilterStatus('COMPLIANT')}
                            className={cn(
                                'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer',
                                filterStatus === 'COMPLIANT'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            )}
                        >
                            ✓ Compliant ({overviewData?.compliantCount || 0})
                        </button>
                        <button
                            onClick={loadData}
                            className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer ml-1"
                            title="Refresh Data"
                        >
                            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="size-6 animate-spin text-[#E61E32]" />
                            <span className="text-xs">Evaluating August attendance records...</span>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 italic">
                            No employees found matching the selected filter.
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                                        <th className="py-2.5 px-3">Employee</th>
                                        <th className="py-2.5 px-3">Wing / Dept</th>
                                        <th className="py-2.5 px-3 text-center">Present / Total</th>
                                        <th className="py-2.5 px-3 text-center">August Att. %</th>
                                        <th className="py-2.5 px-3 text-center">Status</th>
                                        <th className="py-2.5 px-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredEmployees.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-2.5 px-3">
                                                <div className="font-semibold text-slate-900">{emp.name}</div>
                                                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                                                    <span>{emp.id}</span>
                                                    <span>•</span>
                                                    <span>{emp.email}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md text-[11px] text-slate-700 font-medium">
                                                    {emp.wingName || 'General'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                                {emp.presentDays} / {emp.totalWorkingDays}
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span
                                                    className={cn(
                                                        'font-extrabold text-xs',
                                                        emp.isBelowSixty ? 'text-red-600' : 'text-emerald-600'
                                                    )}
                                                >
                                                    {emp.attendancePercentage}%
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                {emp.isBelowSixty ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200">
                                                        ⚠️ Below 60%
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                                                        ✓ Compliant
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handlePreviewPdf(emp.id, emp.name)}
                                                        disabled={previewLoadingId === emp.id}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                                        title="View & Download PDF Statement"
                                                    >
                                                        {previewLoadingId === emp.id ? (
                                                            <Loader2 className="size-3 animate-spin" />
                                                        ) : (
                                                            <Eye className="size-3 text-slate-500" />
                                                        )}
                                                        <span>Preview PDF</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleSendSingle(emp.id, emp.name)}
                                                        disabled={singleSendingId === emp.id || dispatching}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
                                                        title="Send Email with PDF attached"
                                                    >
                                                        {singleSendingId === emp.id ? (
                                                            <Loader2 className="size-3 animate-spin" />
                                                        ) : (
                                                            <Send className="size-3" />
                                                        )}
                                                        <span>Send Mail</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Dispatch Results Summary Log */}
                    {dispatchLogs && (
                        <div className="mt-4 p-4 bg-slate-900 rounded-xl text-white">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                Batch Dispatch Results ({dispatchLogs.length} Records)
                            </h4>
                            <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-[11px]">
                                {dispatchLogs.map((log) => (
                                    <div
                                        key={log.employeeId}
                                        className="flex items-center justify-between py-0.5 border-b border-slate-800"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    'font-bold',
                                                    log.status === 'SENT' || log.status === 'SIMULATED'
                                                        ? 'text-emerald-400'
                                                        : 'text-red-400'
                                                )}
                                            >
                                                [{log.status}]
                                            </span>
                                            <span>
                                                {log.name} ({log.employeeId})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(log.isBelowSixty ? 'text-red-400' : 'text-emerald-400')}>
                                                {log.attendancePercentage}% {log.isBelowSixty ? '(Warning Sent)' : ''}
                                            </span>
                                            {log.error && <span className="text-red-400">Error: {log.error}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                        {dispatchProgress ? (
                            <div className="flex items-center gap-2 text-slate-800 font-semibold">
                                <Loader2 className="size-4 animate-spin text-[#E61E32]" />
                                <span>{dispatchProgress}</span>
                            </div>
                        ) : (
                            <span>
                                Ready to dispatch to <strong>{overviewData?.totalEmployees || 0}</strong> employees (
                                <strong className="text-red-600">{overviewData?.belowSixtyCount || 0}</strong> low attendance
                                warnings).
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={() => handleBulkDispatch(true)}
                            disabled={dispatching || loading}
                            className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shadow-2xs"
                        >
                            Dry-Run (Test Without Sending)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleBulkDispatch(false)}
                            disabled={dispatching || loading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#E61E32] hover:bg-[#c9182a] text-white rounded-xl transition-all cursor-pointer shadow-xs"
                        >
                            {dispatching ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <Mail className="size-3.5" />
                            )}
                            <span>Send All August Attendance Mails (with PDF)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
