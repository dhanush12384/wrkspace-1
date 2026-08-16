'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './button';
import { CalendarIcon, ClockIcon, BriefcaseIcon, LogOutIcon, MapPinIcon, Grid2x2PlusIcon, RefreshCwIcon, BarChart2Icon, UploadIcon, UserCheckIcon, Trash2Icon, PencilIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEmployeeTasks, updateTaskStatus, requestLeave, getEmployeeLeaves, clockIn, clockOut, keepCheckedIn, startGoingHomeTrip, getEmployeeAttendance, getCurrentAttendanceStatus, getEventsForEmployee, createWorkSubmission, getEmployeeWorkSubmissions, deleteEmployeeWorkSubmission, editEmployeeWorkSubmission, getLeads, updateLeadStatus, bulkImportLeads, createManualLead, getEmployeeHrCompanies, updateHrCompany, } from '@/app/admin/actions';
import { MessagesView } from './messages-view';
import { EmployeeSafetyPanel } from './safety-panel';
import { ProfilePhotoEditor } from './profile-photo';
import { StipendCard } from '@/components/mobile/stipend-card';
type EmpTabType = 'overview' | 'tasks' | 'attendance' | 'leaves' | 'messages' | 'events' | 'work_submission' | 'leads' | 'hr_companies' | 'profile' | 'id_card' | 'safety';
interface EmployeeDashboardProps {
    employee: any;
    onLogout: () => void;
    onEmployeeUpdate?: (next: any) => void;
    mobilePanelTab?: EmpTabType;
    mobileLogsOnly?: boolean;
}
export function EmployeeDashboard({ employee, onLogout, onEmployeeUpdate, mobilePanelTab, mobileLogsOnly }: EmployeeDashboardProps) {
    const [activeTab, setActiveTab] = useState<EmpTabType>(mobilePanelTab || 'overview');
    const [empTasks, setEmpTasks] = useState<any[]>([]);
    const [isTasksLoading, setIsTasksLoading] = useState(false);
    const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    useEffect(() => {
        if (mobilePanelTab)
            setActiveTab(mobilePanelTab);
    }, [mobilePanelTab]);
    const [attendanceStatus, setAttendanceStatus] = useState<'checked_out' | 'checked_in'>('checked_out');
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [leaveStart, setLeaveStart] = useState('');
    const [leaveEnd, setLeaveEnd] = useState('');
    const [leaveType, setLeaveType] = useState('Annual Leave');
    const [leaveReason, setLeaveReason] = useState('');
    const [leaveMsg, setLeaveMsg] = useState<string | null>(null);
    const [isLeaveSubmitting, setIsLeaveSubmitting] = useState(false);
    const leaveInFlightRef = useRef(false);
    const [attendanceError, setAttendanceError] = useState<string | null>(null);
    const [canRequestLatePermission, setCanRequestLatePermission] = useState(false);
    const [latePermissionBusy, setLatePermissionBusy] = useState(false);
    const [latePermissionNote, setLatePermissionNote] = useState<string | null>(null);
    const [leaveChoiceOpen, setLeaveChoiceOpen] = useState(false);
    const [leaveChoiceBusy, setLeaveChoiceBusy] = useState(false);
    const [eventsList, setEventsList] = useState<any[]>([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const loadEvents = async () => {
        setEventsLoading(true);
        try {
            const data = await getEventsForEmployee(employee.id);
            setEventsList(data);
        }
        catch (e) {
            console.error('Failed to load events:', e);
        }
        finally {
            setEventsLoading(false);
        }
    };
    useEffect(() => {
        const token = (typeof window !== 'undefined' &&
            (localStorage.getItem('wrkspace_employee_token') ||
                (JSON.parse(localStorage.getItem('wrkspace_employee_session') || '{}') as any)?.token)) ||
            '';
        if (!token || !employee?.id)
            return;
        let stop: (() => void) | undefined;
        (async () => {
            const { connectRealtime } = await import('@/lib/realtime-client');
            stop = connectRealtime({
                token,
                onAttendance: (p) => {
                    if (p.employeeId === employee.id) {
                        loadEmployeeAttendanceStatus(employee.id);
                        loadEmployeeAttendance(employee.id);
                    }
                },
            });
        })();
        return () => stop?.();
    }, [employee?.id]);
    const [mySubmissions, setMySubmissions] = useState<any[]>([]);
    const [subTitle, setSubTitle] = useState('');
    const [subDescription, setSubDescription] = useState('');
    const [subTaskId, setSubTaskId] = useState('');
    const [subHours, setSubHours] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitInFlightRef = useRef(false);
    const [subMessage, setSubMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const loadMySubmissions = async () => {
        try {
            const data = await getEmployeeWorkSubmissions(employee.id);
            setMySubmissions(data);
        }
        catch (e) {
            console.error('Failed to load submissions:', e);
        }
    };
    const handleWorkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitInFlightRef.current)
            return;
        submitInFlightRef.current = true;
        setIsSubmitting(true);
        setSubMessage(null);
        try {
            const linkedTask = empTasks.find(t => t.id === subTaskId);
            const result = await createWorkSubmission({
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                title: subTitle,
                description: subDescription,
                taskId: linkedTask?.id || undefined,
                taskTitle: linkedTask?.title || undefined,
                hoursSpent: parseFloat(subHours) || 0,
            });
            if (result.success) {
                setSubMessage({ type: 'success', text: 'Work submitted successfully! The admin will review it shortly.' });
                setSubTitle('');
                setSubDescription('');
                setSubTaskId('');
                setSubHours('');
                await loadMySubmissions();
            }
            else {
                setSubMessage({ type: 'error', text: result.error || 'Failed to submit work.' });
            }
        }
        finally {
            setIsSubmitting(false);
            submitInFlightRef.current = false;
        }
    };
    const canDeleteSubmission = (sub: any) => {
        try {
            const submittedAt = new Date(sub.submittedAt).getTime();
            return Date.now() - submittedAt <= 10 * 60 * 1000;
        }
        catch {
            return false;
        }
    };
    const canEditSubmission = (sub: any) => {
        try {
            const submittedAt = new Date(sub.submittedAt).getTime();
            return Date.now() - submittedAt <= 10 * 60 * 1000;
        }
        catch {
            return false;
        }
    };
    const handleDeleteMySubmission = async (submissionId: string) => {
        const ok = window.confirm('Delete this submission? Allowed only within 10 minutes after submit.');
        if (!ok)
            return;
        const result = await deleteEmployeeWorkSubmission(submissionId, employee.id);
        if (result.success) {
            setSubMessage({ type: 'success', text: 'Submission deleted.' });
            await loadMySubmissions();
            return;
        }
        setSubMessage({ type: 'error', text: result.error || 'Could not delete submission.' });
    };
    const handleEditMySubmission = async (sub: any) => {
        const title = window.prompt('Edit title', String(sub.title || ''));
        if (title == null)
            return;
        const description = window.prompt('Edit description', String(sub.description || ''));
        if (description == null)
            return;
        const hoursText = window.prompt('Edit hours spent', String(sub.hoursSpent ?? ''));
        if (hoursText == null)
            return;
        const hoursSpent = Number(hoursText);
        const result = await editEmployeeWorkSubmission(sub.id, employee.id, {
            title,
            description,
            hoursSpent,
        });
        if (result.success) {
            setSubMessage({ type: 'success', text: 'Submission updated.' });
            await loadMySubmissions();
            return;
        }
        setSubMessage({ type: 'error', text: result.error || 'Could not edit submission.' });
    };
    const [leadsList, setLeadsList] = useState<any[]>([]);
    const [leadsFilter, setLeadsFilter] = useState('All');
    const [leadsSourceFilter, setLeadsSourceFilter] = useState('All');
    const [leadsSearch, setLeadsSearch] = useState('');
    const [importMessage, setImportMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
    const [leadsSubTab, setLeadsSubTab] = useState<'pipeline' | 'manual'>('pipeline');
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualBizName, setManualBizName] = useState('');
    const [manualContact, setManualContact] = useState('');
    const [manualEmail, setManualEmail] = useState('');
    const [manualPhone, setManualPhone] = useState('');
    const [manualWeb, setManualWeb] = useState('');
    const [manualLoc, setManualLoc] = useState('');
    const [manualCat, setManualCat] = useState('');
    const [manualDesc, setManualDesc] = useState('');
    const [manualPriority, setManualPriority] = useState('Medium');
    const [manualNotes, setManualNotes] = useState('');
    const [isSavingManualLead, setIsSavingManualLead] = useState(false);
    const [manualLeadMsg, setManualLeadMsg] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const handleCreateManualLead = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingManualLead(true);
        setManualLeadMsg(null);
        try {
            const result = await createManualLead({
                businessName: manualBizName,
                contactName: manualContact,
                email: manualEmail,
                phone: manualPhone,
                website: manualWeb,
                location: manualLoc,
                category: manualCat,
                description: manualDesc,
                priority: manualPriority,
                notes: manualNotes,
                assignedTo: employee.id,
            });
            if (result.success) {
                setManualLeadMsg({ type: 'success', text: 'Lead manually created successfully!' });
                setManualBizName('');
                setManualContact('');
                setManualEmail('');
                setManualPhone('');
                setManualWeb('');
                setManualLoc('');
                setManualCat('');
                setManualDesc('');
                setManualPriority('Medium');
                setManualNotes('');
                setShowManualForm(false);
                await loadLeads();
            }
            else {
                setManualLeadMsg({ type: 'error', text: result.error || 'Failed to create lead.' });
            }
        }
        catch (err: any) {
            setManualLeadMsg({ type: 'error', text: err.message || 'Error occurred.' });
        }
        finally {
            setIsSavingManualLead(false);
        }
    };
    const [employeeHrCompanies, setEmployeeHrCompanies] = useState<any[]>([]);
    const [isHrLoading, setIsHrLoading] = useState(false);
    const [hrSearchQuery, setHrSearchQuery] = useState('');
    const [updatingHrId, setUpdatingHrId] = useState<string | null>(null);
    const loadEmployeeHrCompanies = async () => {
        setIsHrLoading(true);
        try {
            const res = await getEmployeeHrCompanies(employee.id);
            if (res.success && res.companies) {
                setEmployeeHrCompanies(res.companies);
            }
        }
        catch (error) {
            console.error('Failed to load employee HR companies:', error);
        }
        finally {
            setIsHrLoading(false);
        }
    };
    const handleHrStatusUpdate = async (id: string, newStatus: string) => {
        setUpdatingHrId(id);
        try {
            await updateHrCompany(id, { status: newStatus });
            await loadEmployeeHrCompanies();
        }
        catch (error) {
            console.error('Failed to update company status:', error);
        }
        finally {
            setUpdatingHrId(null);
        }
    };
    const handleHrNotesUpdate = async (id: string, notes: string) => {
        setUpdatingHrId(id);
        try {
            await updateHrCompany(id, { notes });
            await loadEmployeeHrCompanies();
        }
        catch (error) {
            console.error('Failed to update company notes:', error);
        }
        finally {
            setUpdatingHrId(null);
        }
    };
    const loadLeads = async () => {
        try {
            const data = await getLeads({ allowed: true });
            setLeadsList(data);
        }
        catch (e) {
            console.error('Failed to load leads:', e);
        }
    };
    const handleLeadStatusUpdate = async (id: string, status: string) => {
        setUpdatingLeadId(id);
        await updateLeadStatus(id, status);
        await loadLeads();
        setUpdatingLeadId(null);
    };
    const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setImportLoading(true);
        setImportMessage(null);
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const rawLeads = Array.isArray(parsed) ? parsed : parsed.leads ?? [];
            if (!rawLeads.length) {
                setImportMessage({ type: 'error', text: 'No leads found in the file.' });
                return;
            }
            const result = await bulkImportLeads(rawLeads);
            if (result.success) {
                setImportMessage({ type: 'success', text: `Successfully imported ${result.count} leads!` });
                await loadLeads();
            }
            else {
                setImportMessage({ type: 'error', text: result.error || 'Import failed.' });
            }
        }
        catch (err: any) {
            setImportMessage({ type: 'error', text: `Parse error: ${err.message}` });
        }
        finally {
            setImportLoading(false);
            e.target.value = '';
        }
    };
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        if (employee?.id) {
            loadEmployeeTasks(employee.id);
            loadEmployeeLeaves(employee.id);
            loadEmployeeAttendance(employee.id);
            loadEmployeeAttendanceStatus(employee.id);
            loadMySubmissions();
            loadLeads();
            loadEvents();
            loadEmployeeHrCompanies();
        }
    }, [employee?.id]);
    const loadEmployeeTasks = async (empId: string) => {
        setIsTasksLoading(true);
        try {
            const tasks = await getEmployeeTasks(empId);
            setEmpTasks(tasks);
        }
        catch (error) {
            console.error('Failed to load employee tasks:', error);
        }
        finally {
            setIsTasksLoading(false);
        }
    };
    const loadEmployeeLeaves = async (empId: string) => {
        try {
            const leaves = await getEmployeeLeaves(empId);
            setLeaveRequests(leaves);
        }
        catch (error) {
            console.error('Failed to load employee leaves:', error);
        }
    };
    const loadEmployeeAttendance = async (empId: string) => {
        try {
            const logs = await getEmployeeAttendance(empId);
            setAttendanceLogs(logs);
        }
        catch (error) {
            console.error('Failed to load employee attendance:', error);
        }
    };
    const loadEmployeeAttendanceStatus = async (empId: string) => {
        try {
            const res = await getCurrentAttendanceStatus(empId);
            setAttendanceStatus(res.status as 'checked_in' | 'checked_out');
        }
        catch (error) {
            console.error('Failed to load attendance status:', error);
        }
    };
    const applyClockInResult = (res: {
        success: boolean;
        error?: string;
        code?: string;
        canRequestPermission?: boolean;
    }) => {
        if (res.success) {
            setAttendanceStatus('checked_in');
            setCanRequestLatePermission(false);
            setLatePermissionNote(null);
            loadEmployeeAttendance(employee!.id);
            return;
        }
        setAttendanceError(res.error || 'Failed to clock in');
        setCanRequestLatePermission(Boolean(res.canRequestPermission) || res.code === 'CHECKIN_WINDOW_CLOSED');
    };
    const requestLatePermission = async () => {
        if (!employee || latePermissionBusy)
            return;
        setLatePermissionBusy(true);
        try {
            const { apiPost } = await import('@/lib/mobile-api');
            await apiPost('/api/attendance/late-permission', {});
            setCanRequestLatePermission(false);
            setLatePermissionNote('Request sent. Waiting for admin approval…');
        }
        catch (e: any) {
            setLatePermissionNote(e?.message || 'Could not send request');
        }
        finally {
            setLatePermissionBusy(false);
        }
    };
    const handleCheckIn = async () => {
        if (!employee)
            return;
        setAttendanceError(null);
        setCanRequestLatePermission(false);
        setLatePermissionNote(null);
        try {
            const res = await clockIn(employee.id, `${employee.firstName} ${employee.lastName}`);
            applyClockInResult(res as any);
        }
        catch (error) {
            console.error("Failed to clock in:", error);
            setAttendanceError("A server error occurred during Clock In.");
        }
    };
    const handleCheckOut = () => {
        if (!employee)
            return;
        setAttendanceError(null);
        setLeaveChoiceOpen(true);
    };
    const applyLeaveChoice = async (mode: 'office_work' | 'going_home') => {
        if (!employee || leaveChoiceBusy)
            return;
        setLeaveChoiceBusy(true);
        const female = String(employee?.gender || '').toUpperCase() === 'FEMALE';
        try {
            if (mode === 'office_work') {
                const res = await keepCheckedIn(employee.id, 'office_work');
                if (res.success) {
                    setLeaveChoiceOpen(false);
                    setAttendanceError(null);
                    loadEmployeeAttendance(employee.id);
                }
                else {
                    setAttendanceError(res.error || 'Failed to keep checked in');
                }
                return;
            }
            const finishGoingHome = async (lat?: number, lng?: number) => {
                const res = await clockOut(employee.id, 'going_home');
                if (!res.success) {
                    setAttendanceError(res.error || 'Failed to clock out');
                    return;
                }
                setAttendanceStatus('checked_out');
                setLeaveChoiceOpen(false);
                loadEmployeeAttendance(employee.id);
                if (female) {
                    await startGoingHomeTrip(employee.id, lat, lng);
                }
            };
            await finishGoingHome();
        }
        catch (error) {
            console.error('leave choice failed:', error);
            setAttendanceError('A server error occurred.');
        }
        finally {
            setLeaveChoiceBusy(false);
        }
    };
    const handleRequestLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (leaveInFlightRef.current)
            return;
        if (!leaveStart || !leaveEnd || !leaveReason) {
            setLeaveMsg('Please fill out all request fields.');
            return;
        }
        leaveInFlightRef.current = true;
        setIsLeaveSubmitting(true);
        setLeaveMsg(null);
        try {
            const res = await requestLeave({
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                startDate: leaveStart,
                endDate: leaveEnd,
                type: leaveType,
                reason: leaveReason
            });
            if (res.success) {
                setLeaveStart('');
                setLeaveEnd('');
                setLeaveReason('');
                setLeaveMsg('Leave request submitted successfully!');
                loadEmployeeLeaves(employee.id);
                setTimeout(() => setLeaveMsg(null), 3000);
            }
            else {
                setLeaveMsg(res.error || 'Failed to submit leave request.');
            }
        }
        catch (err: any) {
            setLeaveMsg('An unexpected error occurred while submitting.');
        }
        finally {
            leaveInFlightRef.current = false;
            setIsLeaveSubmitting(false);
        }
    };
    if (!employee?.id) {
        return (<div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-slate-500">
				Loading your profile…
			</div>);
    }
    const getTabStyle = (tabName: string) => {
        const isActive = activeTab === tabName;
        return {
            color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
            borderBottomColor: isActive ? '#ffffff' : 'transparent',
            fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui',
        };
    };
    return (<main className={cn("employee-portal bg-[#e8edf5] text-slate-900 relative flex flex-col font-sans", mobilePanelTab ? "min-h-0 h-full overflow-y-auto" : activeTab === 'messages' ? "h-screen overflow-hidden" : "min-h-screen overflow-y-auto")}>
			
			<div className="absolute inset-0 z-0 pointer-events-none"/>

			
			{!mobilePanelTab && (<>
			<header className="w-full border-b border-black/[0.06] dark:border-white/[0.08] bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50 shadow-xs">
				<div className="w-full px-6 md:px-10 h-16 sm:h-20 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<img src="https://ik.imagekit.io/dypkhqxip/wrkspacenew" alt="wrkspace" className="h-11 sm:h-13 w-auto object-contain"/>
						<div className="w-px h-5 bg-black/15 dark:bg-white/15"/>
						<span className="text-[10px] font-bold uppercase tracking-wider text-[#E61E32] bg-[#E61E32]/5 px-2.5 py-1 rounded-full border border-[#E61E32]/15">
							Employee
						</span>
					</div>
					<div className="flex items-center gap-3">
						<ProfilePhotoEditor employeeId={employee.id} photoUrl={employee.photoUrl} initials={`${(employee.firstName?.[0] || '').toUpperCase()}${(employee.lastName?.[0] || '').toUpperCase()}` || 'U'} size="md" className="!size-10 !text-xs border-0 rounded-full shadow-none bg-transparent" hideEditIcon={true} onUpdated={(photoUrl) => onEmployeeUpdate?.({ ...employee, photoUrl })}/>
						{employee.role === 'Team Lead' && (<button type="button" className="border border-slate-200/90 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer rounded-xl transition-all text-xs py-2 px-3.5 h-9 font-semibold flex items-center gap-2 shadow-2xs" onClick={() => {
                    localStorage.setItem('wrkspace_admin_session', JSON.stringify({ email: employee.email }));
                    window.location.href = '/admin';
                }}>
								<UserCheckIcon className="size-3.5"/>
								Switch to Lead Portal
							</button>)}
						<button type="button" className="bg-[#dc2626] hover:bg-red-700 border-0 cursor-pointer rounded-xl transition-all text-xs font-semibold py-2 px-4 h-9 flex items-center gap-2 shadow-2xs" style={{ color: '#ffffff' }} onClick={onLogout}>
							<LogOutIcon className="size-3.5" style={{ color: '#ffffff' }}/>
							<span style={{ color: '#ffffff' }}>Logout</span>
						</button>
					</div>
				</div>
			</header>

			
			{(() => {
                const isServicesActive = ['leaves', 'events', 'work_submission'].includes(activeTab);
                const isAccountActive = ['profile', 'id_card'].includes(activeTab);
                return (<div className="w-full bg-[#E61E32] z-40 sticky top-16 sm:top-20 shadow-xs border-b border-red-700/20" style={{ backgroundColor: '#E61E32' }}>
						<div className="w-full px-6 md:px-10 flex items-center justify-between overflow-visible relative">
							<div className="flex gap-5 md:gap-6 text-xs font-bold tracking-wide overflow-x-auto no-scrollbar">
								<button onClick={() => setActiveTab('overview')} className="py-2.5 border-b-2 transition-all cursor-pointer font-bold whitespace-nowrap" style={getTabStyle('overview')}>
									Overview
								</button>
								<button onClick={() => setActiveTab('safety')} className="py-2.5 border-b-2 transition-all cursor-pointer font-bold whitespace-nowrap" style={getTabStyle('safety')}>
									{String(employee?.gender || '').toUpperCase() === 'FEMALE' ? 'Girl Safety' : 'SOS alerts'}
								</button>
								<button onClick={() => {
                        setActiveTab('tasks');
                        loadEmployeeTasks(employee.id);
                    }} className="py-2.5 border-b-2 transition-all cursor-pointer font-bold whitespace-nowrap" style={getTabStyle('tasks')}>
									Tasks ({empTasks.length})
								</button>
								<button onClick={() => {
                        setActiveTab('attendance');
                        loadEmployeeAttendance(employee.id);
                        loadEmployeeAttendanceStatus(employee.id);
                    }} className="py-2.5 border-b-2 transition-all cursor-pointer font-bold whitespace-nowrap" style={getTabStyle('attendance')}>
									Attendance
								</button>
								<button onClick={() => {
                        setActiveTab('messages');
                    }} className="py-2.5 border-b-2 transition-all cursor-pointer font-bold whitespace-nowrap" style={getTabStyle('messages')}>
									Messages
								</button>
							</div>

							<div className="flex gap-5 md:gap-6 items-center text-xs">
								{/* Services Dropdown */}
								<div className="relative z-50">
									<button onClick={() => { setServicesMenuOpen(!servicesMenuOpen); setAccountMenuOpen(false); }} className="py-2.5 border-b-2 transition-all cursor-pointer font-bold flex items-center gap-1 whitespace-nowrap select-none" style={{
										color: isServicesActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
										borderBottomColor: isServicesActive ? '#ffffff' : 'transparent',
										fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui',
									}}>
										<span>Services</span>
										<svg viewBox="0 0 20 20" fill="currentColor" className="size-4 opacity-80 mt-0.5" style={{ color: isServicesActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)' }}>
											<path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/>
										</svg>
									</button>

									{servicesMenuOpen && (<>
										<div className="fixed inset-0 z-40 bg-transparent" onClick={() => setServicesMenuOpen(false)}/>
										<div className="absolute right-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-white/10 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
											{[
												{ id: 'leaves' as const, label: 'Apply Leaves', onClick: () => loadEmployeeLeaves(employee.id) },
												{ id: 'work_submission' as const, label: 'Submissions', onClick: () => loadMySubmissions() },
												{ id: 'events' as const, label: 'Events', onClick: () => loadEvents() },
											].map((item) => (<button key={item.id} onClick={() => {
													setActiveTab(item.id);
													item.onClick?.();
													setServicesMenuOpen(false);
												}} className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center justify-between text-slate-700 dark:text-zinc-300" style={{
													color: activeTab === item.id ? '#E61E32' : undefined,
													fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui',
												}}>
														<span>{item.label}</span>
														{activeTab === item.id && (<span className="size-1.5 rounded-full bg-[#E61E32]"/>)}
													</button>))}
										</div>
									</>)}
								</div>

								{/* Account Dropdown */}
								<div className="relative z-50">
									<button onClick={() => { setAccountMenuOpen(!accountMenuOpen); setServicesMenuOpen(false); }} className="py-2.5 border-b-2 transition-all cursor-pointer font-bold flex items-center gap-1 whitespace-nowrap select-none" style={{
										color: isAccountActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
										borderBottomColor: isAccountActive ? '#ffffff' : 'transparent',
										fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui',
									}}>
										<span>Account</span>
										<svg viewBox="0 0 20 20" fill="currentColor" className="size-4 opacity-80 mt-0.5" style={{ color: isAccountActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)' }}>
											<path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/>
										</svg>
									</button>

									{accountMenuOpen && (<>
										<div className="fixed inset-0 z-40 bg-transparent" onClick={() => setAccountMenuOpen(false)}/>
										<div className="absolute right-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-white/10 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
											{[
												{ id: 'profile' as const, label: 'Profile' },
												{ id: 'id_card' as const, label: 'ID card' },
											].map((item) => (<button key={item.id} onClick={() => {
													setActiveTab(item.id);
													setAccountMenuOpen(false);
												}} className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center justify-between text-slate-700 dark:text-zinc-300" style={{
													color: activeTab === item.id ? '#E61E32' : undefined,
													fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui',
												}}>
														<span>{item.label}</span>
														{activeTab === item.id && (<span className="size-1.5 rounded-full bg-[#E61E32]"/>)}
													</button>))}
										</div>
									</>)}
								</div>
							</div>
						</div>
					</div>);
            })()}
			</>)}

			
			<div className={cn("flex-1 w-full relative z-10", mobilePanelTab
            ? "px-4 py-4 space-y-5"
            : activeTab === 'messages' ? "h-[calc(100vh-128px)] flex flex-col" : "max-w-[90rem] mx-auto px-6 md:px-10 py-5 space-y-5")}>

				
				{activeTab === 'overview' && (<div className="space-y-5" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui' }}>
						
						<div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-5 md:p-6 rounded-xl shadow-xs space-y-4 relative overflow-hidden">
							<div>
								<h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
									Welcome back, <span className="text-[#E61E32] font-extrabold">{employee.firstName}</span>!
								</h2>
								<p className="text-slate-500 dark:text-zinc-400 text-xs md:text-sm max-w-2xl leading-relaxed mt-1">
									Access your personal workspace telemetry dashboard console. Below is your directory profile classification registry and active lead status assignment.
								</p>
							</div>
							
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
								<div className="bg-slate-50 dark:bg-zinc-950/50 p-3 rounded-lg border border-black/[0.03] dark:border-white/[0.03] space-y-0.5">
									<span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider font-bold">Registered ID</span>
									<p className="font-mono text-[#E61E32] text-xs font-bold truncate">{employee.id}</p>
								</div>
								<div className="bg-slate-50 dark:bg-zinc-950/50 p-3 rounded-lg border border-black/[0.03] dark:border-white/[0.03] space-y-0.5">
									<span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider font-bold">Allocated Wing</span>
									<p className="text-slate-800 dark:text-zinc-200 text-xs font-semibold truncate">{employee.wingName}</p>
								</div>
								<div className="bg-slate-50 dark:bg-zinc-950/50 p-3 rounded-lg border border-black/[0.03] dark:border-white/[0.03] space-y-0.5">
									<span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider font-bold">Wing Lead</span>
									<p className="text-slate-800 dark:text-zinc-200 text-xs font-medium truncate">{employee.wingLeadName}</p>
								</div>
								<div className="bg-slate-50 dark:bg-zinc-950/50 p-3 rounded-lg border border-black/[0.03] dark:border-white/[0.03] space-y-0.5">
									<span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider font-bold">Registry Date</span>
									<p className="text-slate-800 dark:text-zinc-200 font-mono text-xs truncate">{new Date(employee.createdAt).toLocaleDateString()}</p>
								</div>
							</div>
						</div>

						
						<div className="grid grid-cols-2 md:grid-cols-6 gap-4">
							
							<div onClick={() => {
                setActiveTab('tasks');
                loadEmployeeTasks(employee.id);
            }} className="group bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] hover:border-[#E61E32]/40 p-4 rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[110px]">
								<div className="flex items-start justify-between">
									<span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-white transition-colors">My Tasks</span>
									<div className="size-8 rounded-lg bg-[#E61E32]/10 flex items-center justify-center text-[#E61E32] group-hover:bg-[#E61E32] group-hover:text-white transition-all duration-200">
										<BriefcaseIcon className="size-4"/>
									</div>
								</div>
								<div className="mt-2">
									<p className="text-2xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">{empTasks.length}</p>
									<p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1.5 flex items-center gap-1.5 font-medium">
										<span className="inline-block size-1.5 rounded-full bg-[#E61E32]/80"/>
										{empTasks.filter(t => t.status === 'Pending').length} Pending
									</p>
								</div>
							</div>

							
							<div onClick={() => {
                setActiveTab('attendance');
                loadEmployeeAttendance(employee.id);
                loadEmployeeAttendanceStatus(employee.id);
            }} className="group bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] hover:border-emerald-500/40 p-4 rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[110px]">
								<div className="flex items-start justify-between">
									<span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Attendance</span>
									<div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-200">
										<ClockIcon className="size-4"/>
									</div>
								</div>
								<div className="mt-2">
									<p className={cn("text-lg font-bold leading-none tracking-tight truncate", attendanceStatus === 'checked_in' ? 'text-emerald-500' : 'text-slate-900 dark:text-white')}>
										{attendanceStatus === 'checked_in' ? 'Clocked In' : 'Clocked Out'}
									</p>
									<p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1.5 flex items-center gap-1.5 font-medium">
										<span className={cn("inline-block size-1.5 rounded-full", attendanceStatus === 'checked_in' ? 'bg-emerald-500' : 'bg-slate-400')}/>
										Today's status
									</p>
								</div>
							</div>

							
							<div onClick={() => {
                setActiveTab('leaves');
                loadEmployeeLeaves(employee.id);
            }} className="group bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] hover:border-amber-500/40 p-4 rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[110px]">
								<div className="flex items-start justify-between">
									<span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Leaves</span>
									<div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all duration-200">
										<CalendarIcon className="size-4"/>
									</div>
								</div>
								<div className="mt-2">
									<p className="text-2xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">
										{leaveRequests.filter(req => req.status === 'Pending').length}
									</p>
									<p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1.5 flex items-center gap-1.5 font-medium">
										<span className="inline-block size-1.5 rounded-full bg-amber-500/80"/>
										Pending Requests
									</p>
								</div>
							</div>

							
							<div onClick={() => {
                setActiveTab('work_submission');
                loadMySubmissions();
            }} className="group bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] hover:border-sky-500/40 p-4 rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[110px]">
								<div className="flex items-start justify-between">
									<span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Submissions</span>
									<div className="size-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-all duration-200">
										<RefreshCwIcon className="size-4"/>
									</div>
								</div>
								<div className="mt-2">
									<p className="text-2xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">{mySubmissions.length}</p>
									<p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1.5 flex items-center gap-1.5 font-medium">
										<span className="inline-block size-1.5 rounded-full bg-sky-500/80"/>
										{mySubmissions.filter(s => s.status === 'Submitted').length} Pending
									</p>
								</div>
							</div>

							
							<div onClick={() => {
                setActiveTab('leads');
                loadLeads();
            }} className="group bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] hover:border-rose-500/40 p-4 rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[110px]">
								<div className="flex items-start justify-between">
									<span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-white transition-colors">My Leads</span>
									<div className="size-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all duration-200">
										<BarChart2Icon className="size-4"/>
									</div>
								</div>
								<div className="mt-2">
									<p className="text-2xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">{leadsList.filter(l => l.assignedTo === employee.id).length}</p>
									<p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1.5 flex items-center gap-1.5 font-medium">
										<span className="inline-block size-1.5 rounded-full bg-rose-500/80"/>
										Active pipeline
									</p>
								</div>
							</div>

							
							<div onClick={() => {
                setActiveTab('events');
                loadEvents();
            }} className="group bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] hover:border-brand-500/40 p-4 rounded-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[110px]">
								<div className="flex items-start justify-between">
									<span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Events</span>
									<div className="size-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-all duration-200">
										<Grid2x2PlusIcon className="size-4"/>
									</div>
								</div>
								<div className="mt-2">
									<p className="text-2xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">{eventsList.length}</p>
									<p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1.5 flex items-center gap-1.5 font-medium">
										<span className="inline-block size-1.5 rounded-full bg-brand-500/80"/>
										Total Planned
									</p>
								</div>
							</div>
						</div>
					</div>)}

				
				{activeTab === 'tasks' && (<div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-4 rounded-xl shadow-xs" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui' }}>
						<div className="flex justify-between items-center border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
							<h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
								My Tasks Directory
							</h3>
							<button onClick={() => loadEmployeeTasks(employee.id)} className="p-1.5 border border-black/[0.06] dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-750 text-slate-500 dark:text-zinc-400 transition-all rounded-md cursor-pointer">
								<RefreshCwIcon className={cn("size-3.5", isTasksLoading && "animate-spin")}/>
							</button>
						</div>

						{empTasks.length === 0 ? (<p className="text-slate-500 dark:text-zinc-400 text-xs italic py-6 text-center">No tasks are currently allocated to you.</p>) : (<div className="overflow-x-auto">
								<table className="w-full text-left text-xs border-collapse">
									<thead>
										<tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-slate-500 dark:text-zinc-400 uppercase font-mono text-[10px] bg-slate-50/50 dark:bg-zinc-950/40">
											<th className="p-3">Task Details</th>
											<th className="p-3">Reporting Manager</th>
											<th className="p-3">Deadline</th>
											<th className="p-3">Mode</th>
											<th className="p-3">Status</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
										{empTasks.map((task: any) => (<tr key={task.id} className={cn("transition-colors duration-150 border-l-2", task.allocatorRole === 'CTO'
                        ? "bg-rose-500/5 border-l-rose-500 hover:bg-rose-500/10"
                        : task.status === 'Completed'
                            ? "bg-emerald-500/5 border-l-transparent hover:bg-emerald-500/10"
                            : task.status === 'In Progress'
                                ? "bg-blue-500/5 border-l-transparent hover:bg-blue-500/10"
                                : "border-l-transparent hover:bg-slate-50/50 dark:hover:bg-zinc-800/20")}>
												<td className="p-3">
													<div className="font-bold text-slate-900 dark:text-white text-sm">{task.title}</div>
													<div className="text-[11px] text-slate-500 dark:text-zinc-450 mt-1 max-w-lg leading-relaxed">{task.description}</div>
													
													{(task.allocatorName || task.allocatorRole) ? (<div className="mt-2.5 flex items-center gap-1.5">
															<span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">Assigned by:</span>
															<span className={cn("text-[9px] font-semibold font-mono px-1.5 py-0.5 rounded-md", task.allocatorRole === 'CTO'
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold"
                            : task.allocatorRole === 'Team Lead'
                                ? "bg-[#E61E32]/10 text-[#E61E32] border border-[#E61E32]/20"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-650 dark:text-zinc-450 border border-black/5 dark:border-white/5")}>
																{task.allocatorName} ({task.allocatorRole})
															</span>
														</div>) : (task.reportTo && (<div className="mt-2.5 flex items-center gap-1.5">
																<span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">Assigned by:</span>
																<span className="text-[9px] font-semibold font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-650 dark:text-zinc-450 border border-black/5 dark:border-white/5 rounded-md">
																	{task.reportTo}
																</span>
															</div>))}
												</td>
												<td className="p-3 whitespace-nowrap text-slate-700 dark:text-zinc-300 font-medium">{task.reportTo || '—'}</td>
												<td className="p-3 whitespace-nowrap font-mono text-slate-500 dark:text-zinc-450">{new Date(task.deadline).toLocaleDateString()}</td>
												<td className="p-3 whitespace-nowrap">
													<span className={cn("px-2 py-0.5 text-[10px] uppercase font-bold border rounded-md", task.mode === 'Remote' && "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20", task.mode === 'Onsite' && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", task.mode === 'Hybrid' && "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20")}>
														{task.mode}
													</span>
												</td>
												<td className="p-3 whitespace-nowrap">
													<select value={task.status} onChange={async (e) => {
                        const newStatus = e.target.value;
                        try {
                            await updateTaskStatus(task.id, newStatus);
                            loadEmployeeTasks(employee.id);
                        }
                        catch (err) {
                            console.error("Failed to update status", err);
                        }
                    }} className={cn("px-2.5 py-1 text-[10px] uppercase font-mono font-bold border bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none cursor-pointer focus:ring-1 focus:ring-[#E61E32]/40 transition-colors rounded-md", task.status === 'Completed' && "text-emerald-600 dark:text-emerald-400 border-emerald-500/30", task.status === 'In Progress' && "text-blue-600 dark:text-blue-400 border-blue-500/30", task.status === 'Pending' && "text-amber-600 dark:text-amber-450 border-amber-500/30")}>
														<option value="Pending" className="bg-white dark:bg-zinc-950 text-amber-600 dark:text-amber-450 font-bold">Pending</option>
														<option value="In Progress" className="bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 font-bold">In Progress</option>
														<option value="Completed" className="bg-white dark:bg-zinc-950 text-emerald-600 dark:text-emerald-400 font-bold">Completed</option>
													</select>
												</td>
											</tr>))}
									</tbody>
								</table>
							</div>)}
					</div>)}

				
				{activeTab === 'attendance' && (<div className="space-y-6" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui' }}>
						{leaveChoiceOpen && !(mobilePanelTab && mobileLogsOnly) && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
								<div className="w-full max-w-md border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-900 p-6 space-y-4 rounded-xl shadow-lg">
									<h3 className="text-sm font-semibold text-slate-900 dark:text-white">Leaving office?</h3>
									<p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
										{String(employee?.gender || '').toUpperCase() === 'FEMALE'
                    ? 'Office work keeps you checked in. Going home checks you out and starts home tracking (use the mobile app for live GPS until you arrive).'
                    : 'Office work keeps you checked in. Going home checks you out.'}
									</p>
									<div className="flex flex-col sm:flex-row gap-2">
										<Button disabled={leaveChoiceBusy} onClick={() => applyLeaveChoice('office_work')} className="flex-1 rounded-md bg-slate-800 dark:bg-zinc-800 hover:bg-slate-700 dark:hover:bg-zinc-700 text-white text-xs h-10 transition-colors cursor-pointer">
											Office work
										</Button>
										<Button disabled={leaveChoiceBusy} onClick={() => applyLeaveChoice('going_home')} className="flex-1 rounded-md bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs h-10 transition-colors cursor-pointer">
											Going home
										</Button>
										<Button disabled={leaveChoiceBusy} onClick={() => setLeaveChoiceOpen(false)} className="rounded-md bg-transparent border border-black/[0.1] dark:border-white/[0.1] text-slate-700 dark:text-zinc-300 text-xs h-10 transition-colors cursor-pointer">
											Cancel
										</Button>
									</div>
								</div>
							</div>)}
						{!(mobilePanelTab && mobileLogsOnly) ? (<StipendCard variant="dashboard" employee={employee} onEmployeeUpdate={onEmployeeUpdate}/>) : null}
						{attendanceError && !(mobilePanelTab && mobileLogsOnly) && (<div className="bg-[#E61E32]/10 border border-[#E61E32]/20 p-4 rounded-xl text-xs text-[#E61E32] flex items-start gap-2.5 transition-all shadow-xs font-semibold">
								<span className="font-bold uppercase bg-[#E61E32] text-white px-1.5 py-0.5 text-[9px] tracking-wider shrink-0 rounded">Attendance Alert</span>
								<span>{attendanceError}</span>
							</div>)}

						
						{!(mobilePanelTab && mobileLogsOnly) && (<div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl shadow-xs">
							<div className="flex items-center gap-4 text-start">
								<div className="bg-[#E61E32]/10 p-3 rounded-lg flex items-center justify-center text-[#E61E32]">
									<ClockIcon className="size-6"/>
								</div>
								<div>
									<p className="text-[10px] text-slate-500 dark:text-zinc-450 uppercase tracking-wider font-bold">Workspace Standard Clock</p>
									<p className="text-xl md:text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-wider">
										{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
									</p>
									<p className="text-[10px] text-slate-500 dark:text-zinc-550 mt-0.5">
										{currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
									</p>
								</div>
							</div>
							
							<div className="w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-2">
								{attendanceStatus === 'checked_out' ? (<Button onClick={handleCheckIn} className="bg-emerald-600 hover:bg-emerald-555 text-white text-xs font-bold py-2.5 px-6 rounded-md cursor-pointer h-11 w-full sm:w-auto transition-colors shadow-sm">
										Clock In Shift
									</Button>) : (<Button onClick={handleCheckOut} className="bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-bold py-2.5 px-6 rounded-md cursor-pointer h-11 w-full sm:w-auto transition-colors shadow-sm">
										Clock Out Shift
									</Button>)}
							</div>
						</div>)}

						
						<div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-4 rounded-xl shadow-xs">
							<h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
								{mobileLogsOnly ? 'Attendance logs' : 'Attendance Shift Registry'}
							</h3>
							{attendanceLogs.length === 0 ? (<div className="text-slate-500 dark:text-zinc-400 text-xs italic py-6 text-center">
									No attendance logs have been recorded in the database.
								</div>) : (<div className="overflow-x-auto">
									<table className="w-full text-left text-xs border-collapse">
										<thead>
											<tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-slate-500 dark:text-zinc-400 uppercase font-mono text-[10px] bg-slate-50/50 dark:bg-zinc-950/40">
												<th className="p-3">Date</th>
												<th className="p-3">Check-In Time</th>
												<th className="p-3">Check-Out Time</th>
												<th className="p-3">Status</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08] font-mono text-slate-700 dark:text-zinc-300">
											{attendanceLogs.map((log) => (<tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors">
													<td className="p-3 font-semibold text-slate-900 dark:text-white">{log.date}</td>
													<td className="p-3 text-slate-550 dark:text-zinc-400">{log.checkIn}</td>
													<td className="p-3 text-slate-550 dark:text-zinc-400">{log.checkOut || '--'}</td>
													<td className="p-3">
														<span className={cn("px-2.5 py-0.5 text-[10px] font-bold border uppercase whitespace-nowrap rounded-md", log.status === 'Checked In' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", log.status === 'Present' && "bg-brand-500/10 text-brand-650 dark:text-brand-400 border-brand-500/20")}>
															{log.status}
														</span>
													</td>
												</tr>))}
										</tbody>
									</table>
								</div>)}
						</div>
					</div>)}

				
				{activeTab === 'leaves' && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui' }}>
						
						<form onSubmit={handleRequestLeave} className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-4 rounded-xl shadow-xs h-fit">
							<h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
								Request Leave Time
							</h3>
							
							{leaveMsg && (<div className="p-2.5 border border-[#E61E32]/20 bg-[#E61E32]/5 text-[#E61E32] text-xs font-mono rounded-md">
									{leaveMsg}
								</div>)}

							<div className="space-y-1.5">
								<label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400">Start Date</label>
								<input type="date" required value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-800 dark:text-zinc-200 rounded-md p-2.5 text-xs outline-none focus:ring-1 focus:ring-[#E61E32]/35 transition-all"/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400">End Date</label>
								<input type="date" required value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-800 dark:text-zinc-200 rounded-md p-2.5 text-xs outline-none focus:ring-1 focus:ring-[#E61E32]/35 transition-all"/>
							</div>

							<div className="space-y-1.5">
								<label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400">Leave Category</label>
								<select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-800 dark:text-zinc-200 rounded-md p-2.5 text-xs outline-none focus:ring-1 focus:ring-[#E61E32]/35 transition-all cursor-pointer">
									<option value="Annual Leave">Annual Leave</option>
									<option value="Sick Leave">Sick Leave</option>
									<option value="Maternity/Paternity">Maternity/Paternity</option>
									<option value="Casual Leave">Casual Leave</option>
								</select>
							</div>

							<div className="space-y-1.5">
								<label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400">Reason / Justification</label>
								<textarea rows={4} required value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Provide shift coverage justification..." className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-800 dark:text-zinc-200 rounded-md p-2.5 text-xs outline-none focus:ring-1 focus:ring-[#E61E32]/35 transition-all resize-none placeholder-slate-400 dark:placeholder-zinc-600"/>
							</div>

							<Button type="submit" className="w-full bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-bold py-2.5 rounded-md cursor-pointer transition-colors">
								{isLeaveSubmitting ? 'Submitting…' : 'Submit Leave Request'}
							</Button>
						</form>

						
						<div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-4 rounded-xl shadow-xs lg:col-span-2">
							<h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
								Requested Leaves Registry
							</h3>

							{leaveRequests.length === 0 ? (<p className="text-slate-500 dark:text-zinc-400 text-xs italic py-6 text-center">No leave requests have been logged.</p>) : (<div className="overflow-x-auto">
									<table className="w-full text-left text-xs border-collapse">
										<thead>
											<tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-slate-500 dark:text-zinc-400 uppercase font-mono text-[10px] bg-slate-50/50 dark:bg-zinc-950/40">
												<th className="p-3">Category</th>
												<th className="p-3">Period</th>
												<th className="p-3">Reason</th>
												<th className="p-3 text-right">Status</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08] text-slate-700 dark:text-zinc-300">
											{leaveRequests.map((req: any) => (<tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors">
													<td className="p-3 font-semibold text-slate-900 dark:text-white font-mono">{req.type}</td>
													<td className="p-3 text-slate-550 dark:text-zinc-400 whitespace-nowrap font-mono">
														{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
													</td>
													<td className="p-3 text-slate-500 dark:text-zinc-400 max-w-xs truncate">{req.reason}</td>
													<td className="p-3 text-right">
														<span className={cn("px-2.5 py-0.5 text-[10px] font-bold border uppercase whitespace-nowrap font-mono rounded-md", req.status === 'Approved' && "bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border-emerald-500/20", req.status === 'Pending' && "bg-amber-500/10 text-amber-650 dark:text-amber-400 border-amber-500/20", req.status === 'Ignored' && "bg-slate-100 dark:bg-zinc-800 text-slate-650 dark:text-zinc-450 border border-black/5 dark:border-white/5", req.status === 'Cancelled' && "bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20")}>
															{req.status}
														</span>
													</td>
												</tr>))}
										</tbody>
									</table>
								</div>)}
						</div>
					</div>)}

				
				{activeTab === 'messages' && (<MessagesView currentUser={{
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`,
                email: employee.email,
                role: 'Employee',
                photoUrl: (employee as {
                    photoUrl?: string | null;
                }).photoUrl ?? null,
            }}/>)}

				
				{activeTab === 'events' && (<div className="space-y-6" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui' }}>
						<div>
							<h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<CalendarIcon className="size-5 text-[#E61E32]"/>
								Company Events
							</h2>
							<p className="text-slate-500 dark:text-zinc-400 text-sm mt-0.5">Events where you are listed as a representative</p>
						</div>

						{eventsLoading ? (<div className="text-center py-16 text-slate-400">
								<p className="text-sm animate-pulse">Loading events...</p>
							</div>) : eventsList.length === 0 ? (<div className="text-center py-16 text-slate-400 border border-dashed border-black/10 dark:border-white/10 rounded-xl">
								<CalendarIcon className="size-10 mx-auto mb-3 opacity-30 text-slate-400"/>
								<p className="text-sm font-semibold">No events assigned to you</p>
								<p className="text-xs mt-1">You only see events where admin added you as a representative</p>
							</div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{eventsList.map((event: any) => {
                    const startD = new Date(event.startDate);
                    const endD = new Date(event.endDate);
                    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    const now = new Date();
                    const isUpcoming = startD > now;
                    const isOngoing = startD <= now && endD >= now;
                    return (<div key={event.id} className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] flex flex-col hover:border-[#E61E32]/40 transition-all duration-300 shadow-sm rounded-xl overflow-hidden group relative">
											
											<div className="h-40 w-full relative overflow-hidden bg-slate-50 dark:bg-zinc-950 flex items-center justify-center border-b border-black/[0.06] dark:border-white/[0.08]">
												{event.imageUrl ? (<img src={event.imageUrl} alt={event.title} className="h-full w-full object-contain group-hover:scale-102 transition-transform duration-500"/>) : (<div className="h-full w-full bg-gradient-to-br from-red-950/10 via-slate-50 to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 relative flex items-center justify-center">
														<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(230,30,50,0.04),transparent_70%)]"/>
														<CalendarIcon className="size-10 text-[#E61E32]/10"/>
													</div>)}
												
												
												<span className={`absolute top-3 right-3 text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider whitespace-nowrap border rounded-md ${isOngoing
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-450 backdrop-blur-xs'
                            : isUpcoming
                                ? 'bg-[#E61E32]/10 border-[#E61E32]/20 text-[#E61E32] backdrop-blur-xs'
                                : 'bg-slate-100 dark:bg-zinc-800 border-black/10 dark:border-white/10 text-slate-500 dark:text-zinc-400 backdrop-blur-xs'}`}>
													{isOngoing ? 'Ongoing' : isUpcoming ? 'Upcoming' : 'Past'}
												</span>
											</div>

											
											<div className="p-4 flex-1 flex flex-col justify-between space-y-4 bg-white dark:bg-zinc-900">
												<div className="space-y-1.5">
													<p className="text-[10px] text-[#E61E32] font-bold uppercase tracking-wider font-mono">{event.organisingCollege}</p>
													<h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{event.title}</h3>
													<p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{event.description}</p>
												</div>

												<div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px] text-slate-500 dark:text-zinc-450 flex items-center justify-between">
													<span className="font-mono font-medium">{fmt(startD)}</span>
													<button onClick={() => {
                            const url = `/events/${event.id}`;
                            if (mobilePanelTab) {
                                window.open(url, '_blank', 'noopener,noreferrer');
                            }
                            else {
                                window.location.href = url;
                            }
                        }} className="text-[#E61E32] hover:text-[#c9182a] font-bold text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors">
														View Details →
													</button>
												</div>
											</div>
										</div>);
                })}
							</div>)}
					</div>)}

				
				{activeTab === 'work_submission' && (<div className="space-y-8" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui' }}>
						
						<div className="space-y-4">
							<div>
								<h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
									<BriefcaseIcon className="size-5 text-[#E61E32]"/>
									Submit Your Work
								</h2>
								<p className="text-slate-500 dark:text-zinc-400 text-sm mt-0.5">Report completed work for admin review and approval</p>
							</div>

							{subMessage && (<div className={cn("p-3 text-xs border font-mono rounded-md", subMessage.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-[#E61E32]/10 border-[#E61E32]/20 text-[#E61E32]")}>
									{subMessage.text}
								</div>)}

							<form onSubmit={handleWorkSubmit} className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-5 rounded-xl shadow-xs">
								<h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-black/[0.06] dark:border-white/[0.08] pb-3">Work Details</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-1.5">
										<label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Work Title *</label>
										<input type="text" value={subTitle} onChange={e => setSubTitle(e.target.value)} required disabled={isSubmitting} placeholder="e.g. Completed landing page redesign" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder-zinc-650 rounded-md text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35 transition-all"/>
									</div>
									<div className="space-y-1.5">
										<label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Hours Spent *</label>
										<input type="number" value={subHours} onChange={e => setSubHours(e.target.value)} required disabled={isSubmitting} min="0.5" step="0.5" placeholder="e.g. 3.5" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder-zinc-650 rounded-md text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35 transition-all"/>
									</div>
								</div>

								<div className="space-y-1.5">
									<label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Description of Work Done *</label>
									<textarea value={subDescription} onChange={e => setSubDescription(e.target.value)} required disabled={isSubmitting} rows={4} placeholder="Describe what you accomplished, challenges overcome, and deliverables produced..." className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder-zinc-650 rounded-md text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35 transition-all resize-none"/>
								</div>

								{empTasks.length > 0 && (<div className="space-y-1.5">
										<label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Link to Task (Optional)</label>
										<select value={subTaskId} onChange={e => setSubTaskId(e.target.value)} disabled={isSubmitting} className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-800 dark:text-zinc-200 rounded-md text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35 transition-all cursor-pointer">
											<option value="">— No linked task —</option>
											{empTasks.map((task: any) => (<option key={task.id} value={task.id}>
													{task.title} ({task.status})
												</option>))}
										</select>
									</div>)}

								<div className="flex justify-end pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
									<button type="submit" disabled={isSubmitting} className="bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-bold px-6 py-2.5 rounded-md cursor-pointer transition-colors disabled:opacity-50 shadow-sm">
										{isSubmitting ? 'Submitting...' : 'Submit Work'}
									</button>
								</div>
							</form>
						</div>

						
						<div className="space-y-4">
							<h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
								<ClockIcon className="size-4 text-slate-500"/>
								My Submission History
							</h3>
							{mySubmissions.length === 0 ? (<div className="text-center py-12 text-slate-400 border border-dashed border-black/10 dark:border-white/10 rounded-xl">
									<p className="text-sm">No submissions yet. Submit your first work above.</p>
								</div>) : (<div className="space-y-3">
									{mySubmissions.map((sub: any) => {
                    const statusColors: Record<string, string> = {
                        'Submitted': 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
                        'Reviewed': 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400',
                        'Approved': 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
                        'Needs Revision': 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400',
                    };
                    const canDelete = canDeleteSubmission(sub);
                    const canEdit = canEditSubmission(sub);
                    return (<div key={sub.id} className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-4.5 space-y-2.5 rounded-xl shadow-xs">
												<div className="flex items-start justify-between gap-3 flex-wrap">
													<div>
														<h4 className="text-sm font-bold text-slate-900 dark:text-white">{sub.title}</h4>
														<p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
															{new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
															{' · '}
															<span className="text-[#E61E32] font-semibold">{sub.hoursSpent}h</span>
															{sub.taskTitle && <span> · Task: <span className="text-slate-800 dark:text-zinc-300 font-medium">{sub.taskTitle}</span></span>}
														</p>
													</div>
													<span className={cn("text-[9px] px-2.5 py-0.5 font-mono uppercase font-bold tracking-wider border rounded-md", statusColors[sub.status] || 'bg-slate-100 dark:bg-zinc-800 border-black/10 dark:border-white/10 text-slate-500 dark:text-zinc-400')}>
														{sub.status}
													</span>
												</div>
												<p className="text-xs text-slate-650 dark:text-zinc-400 leading-relaxed">{sub.description}</p>
												{(canDelete || canEdit) && (<div className="flex justify-end pt-1">
														{canEdit && (<button type="button" onClick={() => void handleEditMySubmission(sub)} className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 border border-black/[0.1] dark:border-white/[0.1] bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-md cursor-pointer me-2 transition-colors">
																<PencilIcon className="size-3.5"/>
																Edit (10m)
															</button>)}
														<button type="button" onClick={() => handleDeleteMySubmission(sub.id)} className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-650 dark:text-red-400 rounded-md cursor-pointer transition-colors">
															<Trash2Icon className="size-3.5"/>
															Delete (10m)
														</button>
													</div>)}
												{sub.adminNote && (<div className="bg-slate-50 dark:bg-zinc-950 border border-black/[0.06] dark:border-white/[0.08] px-3.5 py-2.5 rounded-lg text-xs text-slate-500 dark:text-zinc-400 italic mt-1.5">
														<span className="text-slate-800 dark:text-zinc-300 not-italic font-bold">Admin: </span>{sub.adminNote}
													</div>)}
											</div>);
                })}
								</div>)}
					</div>
				</div>)}

				
				{activeTab === 'leads' && (() => {
            const STATUS_COLOURS: Record<string, string> = {
                New: 'bg-slate-100 dark:bg-zinc-800 border-black/10 dark:border-white/10 text-slate-500 dark:text-zinc-400',
                Contacted: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
                Qualified: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
                Proposal: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
                Won: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                Lost: 'bg-red-500/10 border-red-500/20 text-red-650 dark:text-red-405',
            };
            const SOURCE_COLOURS: Record<string, string> = {
                JustDial: 'text-orange-500',
                Sulekha: 'text-amber-505',
                Yelp: 'text-red-500',
                Clutch: 'text-[#E61E32]',
                Upwork: 'text-green-500',
                Freelancer: 'text-teal-500',
                IndiaMART: 'text-yellow-600 dark:text-yellow-400',
                'Google Maps': 'text-sky-500',
                LinkedIn: 'text-blue-500',
                Behance: 'text-cyan-500',
            };
            const allSources = ['All', ...Array.from(new Set(leadsList.map(l => l.source)))];
            const filtered = leadsList.filter(l => {
                const subTabOk = leadsSubTab === 'pipeline' ? l.source !== 'Manual' : l.source === 'Manual';
                const statusOk = leadsFilter === 'All' || l.status === leadsFilter;
                const sourceOk = leadsSourceFilter === 'All' || l.source === leadsSourceFilter;
                const searchOk = !leadsSearch || l.businessName.toLowerCase().includes(leadsSearch.toLowerCase()) || (l.location || '').toLowerCase().includes(leadsSearch.toLowerCase()) || (l.category || '').toLowerCase().includes(leadsSearch.toLowerCase());
                return subTabOk && statusOk && sourceOk && searchOk;
            });
            return (<div className="space-y-6" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui' }}>
							
							<div className="flex items-start justify-between gap-4 flex-wrap">
								<div>
									<h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
										<BarChart2Icon className="size-5 text-[#E61E32]"/>
										Leads Pipeline
									</h2>
									<p className="text-slate-500 dark:text-zinc-400 text-sm mt-0.5">{leadsList.filter(l => leadsSubTab === 'pipeline' ? l.source !== 'Manual' : l.source === 'Manual').length} total leads · {filtered.length} shown</p>
								</div>
								
								<div className="flex items-center gap-2 flex-wrap">
									
									<div className="bg-slate-100 dark:bg-zinc-950 border border-black/5 dark:border-white/5 p-0.5 rounded-lg flex gap-0.5">
										<button onClick={() => { setLeadsSubTab('pipeline'); setLeadsFilter('All'); setLeadsSourceFilter('All'); }} className={cn("text-[10px] px-3.5 py-1.5 font-semibold cursor-pointer rounded-md transition-all", leadsSubTab === 'pipeline' ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white")}>
											Pipeline Leads
										</button>
										<button onClick={() => { setLeadsSubTab('manual'); setLeadsFilter('All'); setLeadsSourceFilter('All'); }} className={cn("text-[10px] px-3.5 py-1.5 font-semibold cursor-pointer rounded-md transition-all", leadsSubTab === 'manual' ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white")}>
											Manual Leads
										</button>
									</div>

									
									{leadsSubTab === 'pipeline' ? (<label className={cn("flex items-center gap-2 text-[10px] font-semibold px-4 py-2.5 rounded-md cursor-pointer transition-colors border shadow-xs", importLoading ? "bg-slate-100 dark:bg-zinc-850 border-black/10 dark:border-white/10 text-slate-400 dark:text-zinc-500 cursor-wait" : "bg-[#E61E32] hover:bg-[#c9182a] border-[#E61E32] text-white")}>
											<UploadIcon className="size-3.5"/>
											{importLoading ? 'Importing…' : 'Import leads_latest.json'}
											<input type="file" accept=".json" className="hidden" onChange={handleImportJson} disabled={importLoading}/>
										</label>) : (<button onClick={() => setShowManualForm(!showManualForm)} className="bg-[#E61E32] hover:bg-[#c9182a] border border-[#E61E32] text-white text-[10px] font-semibold px-4 py-2.5 rounded-md cursor-pointer transition-colors shadow-xs">
											{showManualForm ? 'Hide Form' : 'Add Lead Manually'}
										</button>)}
								</div>
							</div>

							{importMessage && (<div className={cn("p-3 text-xs border font-mono rounded-md", importMessage.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-[#E61E32]/10 border-[#E61E32]/20 text-[#E61E32]")}>
									{importMessage.text}
								</div>)}

							{manualLeadMsg && (<div className={cn("p-3 text-xs border font-mono rounded-md", manualLeadMsg.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-[#E61E32]/10 border-[#E61E32]/20 text-[#E61E32]")}>
									{manualLeadMsg.text}
								</div>)}

							
							{leadsSubTab === 'manual' && showManualForm && (<form onSubmit={handleCreateManualLead} className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-5 space-y-4 rounded-xl shadow-xs">
									<div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-2">
										<h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Feed Manual Lead</h3>
										<button type="button" onClick={() => setShowManualForm(false)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200">Cancel</button>
									</div>
									
									<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
										<div className="space-y-1">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Business Name *</label>
											<input type="text" value={manualBizName} onChange={e => setManualBizName(e.target.value)} required placeholder="e.g. Delta Corp" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-900 dark:text-white text-xs p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35"/>
										</div>
										<div className="space-y-1">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Contact Person</label>
											<input type="text" value={manualContact} onChange={e => setManualContact(e.target.value)} placeholder="e.g. Jane Smith" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-900 dark:text-white text-xs p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35"/>
										</div>
										<div className="space-y-1">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Category</label>
											<input type="text" value={manualCat} onChange={e => setManualCat(e.target.value)} placeholder="e.g. Web Development" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-900 dark:text-white text-xs p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35"/>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
										<div className="space-y-1">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Phone Number</label>
											<input type="text" value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="e.g. +91 9988776655" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-900 dark:text-white text-xs p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35"/>
										</div>
										<div className="space-y-1">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Email Address</label>
											<input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} placeholder="e.g. contact@delta.com" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-900 dark:text-white text-xs p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35"/>
										</div>
										<div className="space-y-1">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Website</label>
											<input type="text" value={manualWeb} onChange={e => setManualWeb(e.target.value)} placeholder="e.g. www.delta.com" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-900 dark:text-white text-xs p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35"/>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<div className="space-y-1">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Location / Address</label>
											<input type="text" value={manualLoc} onChange={e => setManualLoc(e.target.value)} placeholder="e.g. Gachibowli, Hyderabad" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-900 dark:text-white text-xs p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35"/>
										</div>
										<div className="space-y-1">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Priority</label>
											<select value={manualPriority} onChange={e => setManualPriority(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-900 dark:text-white text-xs p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35 cursor-pointer">
												<option value="Low">Low</option>
												<option value="Medium">Medium</option>
												<option value="High">High</option>
											</select>
										</div>
									</div>

									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Description / Notes</label>
										<textarea value={manualDesc} onChange={e => setManualDesc(e.target.value)} rows={2} placeholder="Enter any initial details about the client, requirements, or lead description..." className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-900 dark:text-white text-xs p-2.5 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35"/>
									</div>

									<div className="flex justify-end pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
										<button type="submit" disabled={isSavingManualLead} className="bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-bold px-5 py-2 rounded-md cursor-pointer transition-colors disabled:opacity-50">
											{isSavingManualLead ? 'Saving...' : 'Save Lead'}
										</button>
									</div>
								</form>)}

							
							<div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
								{Object.entries(STATUS_COLOURS).map(([status, cls]) => (<button key={status} onClick={() => setLeadsFilter(leadsFilter === status ? 'All' : status)} className={cn("border p-3 text-left transition-colors cursor-pointer rounded-lg shadow-2xs", leadsFilter === status ? cls + " ring-1 ring-[#E61E32]" : "bg-white dark:bg-zinc-900 border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.12]")}>
										<p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{status}</p>
										<p className="text-lg font-bold text-slate-800 dark:text-white leading-none mt-1">{leadsList.filter(l => {
                        const subTabOk = leadsSubTab === 'pipeline' ? l.source !== 'Manual' : l.source === 'Manual';
                        return subTabOk && l.status === status;
                    }).length}</p>
									</button>))}
							</div>

							
							<div className="flex gap-3 flex-wrap items-center">
								<input type="text" value={leadsSearch} onChange={e => setLeadsSearch(e.target.value)} placeholder="Search by name, location, category…" className="flex-1 min-w-[220px] bg-white dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder-zinc-650 text-xs p-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35"/>
								{leadsSubTab === 'pipeline' && (<div className="flex gap-1.5 flex-wrap">
										{allSources.filter(s => s !== 'Manual').map(s => (<button key={s} onClick={() => setLeadsSourceFilter(s)} className={cn("text-[10px] px-2.5 py-1 border font-medium cursor-pointer transition-colors rounded-md", leadsSourceFilter === s ? "bg-[#E61E32] border-[#E61E32] text-white" : "bg-slate-50 dark:bg-zinc-850 border-black/[0.06] dark:border-white/[0.08] text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800")}>
												{s}
											</button>))}
									</div>)}
							</div>

							
							{filtered.length === 0 ? (<div className="text-center py-16 border border-dashed border-black/10 dark:border-white/10 rounded-xl text-slate-400">
									<BarChart2Icon className="size-10 mx-auto mb-3 opacity-30 text-slate-400"/>
									<p className="text-sm font-semibold">No leads found</p>
									<p className="text-xs mt-1">
										{leadsSubTab === 'pipeline'
                        ? 'Run the Python crawler and import the JSON file above'
                        : 'Add your first manual lead using the "Add Lead Manually" button above'}
									</p>
								</div>) : leadsSubTab === 'manual' ? (<div className="overflow-x-auto border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-900 rounded-xl shadow-xs">
									<table className="w-full text-left border-collapse text-xs">
										<thead>
											<tr className="bg-slate-50/70 dark:bg-zinc-950/40 border-b border-black/[0.06] dark:border-white/[0.08] text-slate-500 dark:text-zinc-400 font-mono uppercase tracking-wider text-[10px]">
												<th className="p-3 font-semibold">Business Name</th>
												<th className="p-3 font-semibold">Contact Person</th>
												<th className="p-3 font-semibold">Category / Location</th>
												<th className="p-3 font-semibold">Phone / Website</th>
												<th className="p-3 font-semibold">Notes / Description</th>
												<th className="p-3 font-semibold">Priority</th>
												<th className="p-3 font-semibold text-right">Status</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
											{filtered.map((lead: any) => (<tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors">
													<td className="p-3 font-bold text-slate-950 dark:text-white max-w-[180px] truncate">{lead.businessName}</td>
													<td className="p-3 text-slate-700 dark:text-zinc-300 font-mono">{lead.contactName || '—'}</td>
													<td className="p-3">
														<div className="font-semibold text-slate-705 dark:text-zinc-300">{lead.category || '—'}</div>
														<div className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">{lead.location || '—'}</div>
													</td>
													<td className="p-3">
														<div className="font-mono text-slate-700 dark:text-zinc-300">{lead.phone || '—'}</div>
														<div className="text-[10px] text-[#E61E32] mt-0.5 truncate max-w-[140px]" title={lead.website}>
															{lead.website ? (<a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
																	{lead.website.replace(/^https?:\/\//, '')}
																</a>) : '—'}
														</div>
													</td>
													<td className="p-3 text-slate-500 dark:text-zinc-500 max-w-[200px] truncate" title={lead.notes || lead.description || ''}>
														{lead.notes || lead.description || '—'}
													</td>
													<td className="p-3">
														<span className={cn("text-[9px] px-1.5 py-0.5 font-semibold font-mono rounded-md", lead.priority === 'High' ? 'text-red-600 bg-red-500/10 border border-red-500/20' :
                            lead.priority === 'Medium' ? 'text-amber-600 bg-amber-500/10 border border-amber-500/20' :
                                'text-slate-500 bg-slate-100 border border-black/10 dark:text-zinc-400 dark:bg-zinc-800 dark:border-white/10')}>
															{lead.priority}
														</span>
													</td>
													<td className="p-3 text-right">
														<select value={lead.status} onChange={e => handleLeadStatusUpdate(lead.id, e.target.value)} disabled={updatingLeadId === lead.id} className={cn("text-[10px] px-2 py-1 border font-mono uppercase tracking-wider cursor-pointer bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border-black/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35 transition-colors disabled:opacity-50 rounded-md", STATUS_COLOURS[lead.status] || 'border-zinc-700 text-zinc-400')}>
															{['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'].map(s => (<option key={s} value={s}>{s}</option>))}
														</select>
													</td>
												</tr>))}
										</tbody>
									</table>
								</div>) : (<div className="space-y-2.5">
									{filtered.map((lead: any) => (<div key={lead.id} className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-4.5 rounded-xl hover:border-black/[0.12] dark:hover:border-white/[0.12] transition-colors shadow-xs">
											<div className="flex items-start justify-between gap-3 flex-wrap">
												<div className="space-y-0.5 flex-1 min-w-0">
													<div className="flex items-center gap-2 flex-wrap">
														<h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{lead.businessName}</h3>
														{lead.rating && <span className="text-[10px] text-amber-500 font-mono">★ {lead.rating}</span>}
														{lead.reviewCount && <span className="text-[10px] text-slate-400 dark:text-zinc-550">({lead.reviewCount})</span>}
													</div>
													<div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
														{lead.category && <span>{lead.category}</span>}
														{lead.location && <><span>·</span><span>{lead.location}</span></>}
														{lead.phone && <><span>·</span><span className="text-slate-700 dark:text-zinc-300 font-mono">{lead.phone}</span></>}
														{lead.website && <><span>·</span><a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-[#E61E32] hover:underline truncate max-w-[160px]">{lead.website.replace(/^https?:\/\//, '')}</a></>}
													</div>
													{lead.description && <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1 line-clamp-2 leading-relaxed">{lead.description}</p>}
												</div>
												<div className="flex items-center gap-2 flex-shrink-0">
													<span className={cn("text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-md border", STATUS_COLOURS[lead.status] || 'border-zinc-700 text-zinc-400')}>
														{lead.source}
													</span>
													<select value={lead.status} onChange={e => handleLeadStatusUpdate(lead.id, e.target.value)} disabled={updatingLeadId === lead.id} className={cn("text-[10px] px-2 py-1 border font-mono uppercase tracking-wider cursor-pointer bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border-black/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35 transition-colors disabled:opacity-50 rounded-md", STATUS_COLOURS[lead.status] || 'border-zinc-700 text-zinc-400')}>
														{['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'].map(s => (<option key={s} value={s}>{s}</option>))}
													</select>
												</div>
											</div>
											{lead.notes && (<div className="mt-2 text-[11px] text-slate-500 dark:text-zinc-500 italic border-t border-black/[0.06] dark:border-white/[0.08] pt-1.5">
													{lead.notes}
												</div>)}
											{lead.sourceUrl && (<a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#E61E32] hover:text-[#c9182a] hover:underline mt-1 inline-block font-semibold">
													View source →
												</a>)}
										</div>))}
								</div>)}
						</div>);
        })()}

				{activeTab === 'hr_companies' && (() => {
            const STATUS_COLOURS: Record<string, string> = {
                New: 'bg-slate-100 dark:bg-zinc-800 border-black/10 dark:border-white/10 text-slate-500 dark:text-zinc-400',
                Contacted: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
                Rejected: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
                Hired: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            };
            const filteredCompanies = employeeHrCompanies.filter(c => {
                const query = hrSearchQuery.toLowerCase();
                return (c.companyName.toLowerCase().includes(query) ||
                    (c.hrName || '').toLowerCase().includes(query) ||
                    (c.industry || '').toLowerCase().includes(query) ||
                    (c.location || '').toLowerCase().includes(query));
            });
            return (<div className="space-y-6" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui' }}>
							<div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
								<div>
									<h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
										<BriefcaseIcon className="size-5 text-[#E61E32]"/>
										Assigned HR & Companies
									</h2>
									<p className="text-xs text-slate-500 dark:text-zinc-450 mt-0.5">Manage recruitment status and communication logs for your allocated company leads.</p>
								</div>
								<button onClick={loadEmployeeHrCompanies} disabled={isHrLoading} className="p-2 border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer disabled:opacity-50 rounded-md shadow-2xs" title="Refresh List">
									<RefreshCwIcon className={`size-3.5 ${isHrLoading ? 'animate-spin text-[#E61E32]' : ''}`}/>
								</button>
							</div>

							
							<div className="w-full">
								<input type="text" placeholder="Search by company name, HR name, location, or industry…" value={hrSearchQuery} onChange={e => setHrSearchQuery(e.target.value)} className="w-full bg-white dark:bg-zinc-950 border border-black/[0.1] dark:border-white/[0.1] text-slate-800 dark:text-zinc-205 placeholder:text-slate-400 dark:placeholder-zinc-650 text-xs p-3 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35 transition-all"/>
							</div>

							{isHrLoading && employeeHrCompanies.length === 0 ? (<div className="text-center py-12 border border-dashed border-black/10 dark:border-white/10 rounded-xl text-slate-400">
									<p className="text-sm animate-pulse">Loading allocated HR registries...</p>
								</div>) : filteredCompanies.length === 0 ? (<div className="text-center py-12 border border-dashed border-black/10 dark:border-white/10 rounded-xl text-slate-400">
									<p className="text-sm font-semibold">No allocated companies found matching the search criteria.</p>
								</div>) : (<div className="overflow-x-auto border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-900 rounded-xl shadow-xs">
									<table className="w-full text-left border-collapse text-xs">
										<thead>
											<tr className="bg-slate-50/70 dark:bg-zinc-950/40 border-b border-black/[0.06] dark:border-white/[0.08] text-slate-500 dark:text-zinc-400 font-mono uppercase tracking-wider text-[9px]">
												<th className="p-3">Company Details</th>
												<th className="p-3">HR Manager</th>
												<th className="p-3">Location & Industry</th>
												<th className="p-3">Status</th>
												<th className="p-3">Notes & Logs</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.08] text-slate-700 dark:text-zinc-300">
											{filteredCompanies.map((company) => (<tr key={company.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors">
													<td className="p-3 space-y-0.5 align-top">
														<div className="font-bold text-slate-900 dark:text-white text-xs">{company.companyName}</div>
														{company.website && (<a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#E61E32] hover:text-[#c9182a] hover:underline block font-semibold">
																{company.website.replace(/^https?:\/\//, '')}
															</a>)}
													</td>
													<td className="p-3 space-y-0.5 align-top">
														<div className="text-slate-800 dark:text-zinc-200 font-semibold">{company.hrName}</div>
														<div className="text-[10px] text-slate-500 dark:text-zinc-500 flex flex-col mt-0.5 font-mono">
															{company.hrEmail && <span>{company.hrEmail}</span>}
															{company.hrPhone && <span>{company.hrPhone}</span>}
														</div>
													</td>
													<td className="p-3 space-y-0.5 align-top">
														<div className="text-slate-800 dark:text-zinc-300 font-semibold">{company.location || '—'}</div>
														<div className="text-[10px] text-slate-550 dark:text-zinc-500 font-medium mt-0.5">{company.industry || '—'}</div>
													</td>
													<td className="p-3 align-top min-w-[140px]">
														<select value={company.status} disabled={updatingHrId === company.id} onChange={(e) => handleHrStatusUpdate(company.id, e.target.value)} className={cn("bg-slate-50 dark:bg-zinc-950 text-slate-850 dark:text-zinc-200 border border-black/10 dark:border-white/10 text-[10px] p-1.5 focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35 rounded-md w-full font-bold uppercase tracking-wider transition-colors cursor-pointer", updatingHrId === company.id ? "opacity-50" : "")}>
															<option value="New">New</option>
															<option value="Contacted">Contacted</option>
															<option value="Rejected">Rejected</option>
															<option value="Hired">Hired</option>
														</select>
													</td>
													<td className="p-3 align-top max-w-[320px] space-y-1">
														<textarea defaultValue={company.notes || ''} disabled={updatingHrId === company.id} placeholder="Add interaction notes..." onBlur={(e) => {
                            if (e.target.value !== (company.notes || '')) {
                                handleHrNotesUpdate(company.id, e.target.value);
                            }
                        }} rows={2} className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-black/10 dark:border-white/10 text-[10px] p-2 text-slate-800 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#E61E32]/35 rounded-md resize-none"/>
														{updatingHrId === company.id && (<span className="text-[9px] text-[#E61E32] animate-pulse block font-semibold">Saving logs...</span>)}
													</td>
												</tr>))}
										</tbody>
									</table>
								</div>)}
						</div>);
        })()}

				
				{activeTab === 'safety' && (<EmployeeSafetyPanel employee={employee} onEmployeeUpdate={onEmployeeUpdate}/>)}

				{activeTab === 'id_card' && (<div className="space-y-6" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui' }}>
						<div>
							<h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<BriefcaseIcon className="size-5 text-[#E61E32]"/>
								Employee ID Card
							</h2>
							<p className="text-slate-500 dark:text-zinc-400 text-sm mt-0.5">Your official ID card uploaded by admin</p>
						</div>
						<div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 rounded-xl shadow-xs space-y-4 max-w-2xl">
							<p className="text-sm text-slate-800 dark:text-zinc-200 font-bold">
								{employee.firstName} {employee.lastName} · ID {employee.id}
							</p>
							{employee.idCardUrl ? (<img src={employee.idCardUrl} alt="Employee ID card" className="w-full border border-black/[0.06] dark:border-white/[0.08] bg-slate-50 dark:bg-white object-contain max-h-[520px] rounded-lg shadow-sm"/>) : (<div className="border border-dashed border-black/10 dark:border-white/10 rounded-xl p-10 text-center text-slate-400 text-sm">
									No ID card uploaded yet. Ask admin to upload it from Employees → Edit employee.
								</div>)}
						</div>
					</div>)}

				{activeTab === 'profile' && (<div className="space-y-6" style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui' }}>
						
						<div>
							<h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<BriefcaseIcon className="size-5 text-[#E61E32]"/>
								Employee Profile
							</h2>
							<p className="text-slate-500 dark:text-zinc-400 text-sm mt-0.5">Your official corporate profile and organization details</p>
						</div>

						<StipendCard variant="dashboard" employee={employee} onEmployeeUpdate={onEmployeeUpdate}/>

						
						<div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-8 rounded-xl shadow-sm space-y-8">
							<div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-black/[0.06] dark:border-white/[0.08]">
								<div className="flex flex-col items-center gap-2">
									<ProfilePhotoEditor employeeId={employee.id} photoUrl={employee.photoUrl} initials={`${(employee.firstName?.[0] || '').toUpperCase()}${(employee.lastName?.[0] || '').toUpperCase()}` || 'U'} size="lg" onUpdated={(photoUrl) => onEmployeeUpdate?.({ ...employee, photoUrl })}/>
									<p className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono uppercase tracking-wider font-bold">
										{employee.photoUrl ? 'Tap to view / change' : 'Tap pencil to upload'}
									</p>
								</div>
								<div className="text-center sm:text-left space-y-1.5">
									<h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
										{employee.firstName} {employee.middleName ? `${employee.middleName} ` : ''}{employee.lastName}
									</h3>
									<p className="text-[#E61E32] font-mono text-xs uppercase tracking-wider font-bold">
										{employee.role || 'Employee'}
									</p>
									<p className="text-slate-500 dark:text-zinc-500 text-xs font-mono">
										Member Since: {new Date(employee.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
								
								<div className="space-y-6">
									<h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-widest border-b border-black/[0.06] dark:border-white/[0.08] pb-2">
										Personal Details
									</h4>
									
									<div className="grid grid-cols-1 gap-4">
										<div className="space-y-1.5">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">Full Name</label>
											<input type="text" readOnly value={`${employee.firstName} ${employee.middleName ? employee.middleName + ' ' : ''}${employee.lastName}`} className="w-full bg-slate-50 dark:bg-zinc-950/40 border border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-zinc-300 text-xs p-3 focus:outline-none cursor-not-allowed rounded-md font-sans font-medium"/>
										</div>
										<div className="space-y-1.5">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">Email Address</label>
											<input type="text" readOnly value={employee.email} className="w-full bg-slate-50 dark:bg-zinc-950/40 border border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-zinc-300 text-xs p-3 focus:outline-none cursor-not-allowed rounded-md font-mono select-all font-medium"/>
										</div>
										<div className="space-y-1.5">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">Phone Number</label>
											<input type="text" readOnly value={employee.phone} className="w-full bg-slate-50 dark:bg-zinc-950/40 border border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-zinc-300 text-xs p-3 focus:outline-none cursor-not-allowed rounded-md font-mono font-medium"/>
										</div>
									</div>
								</div>

								
								<div className="space-y-6">
									<h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-widest border-b border-black/[0.06] dark:border-white/[0.08] pb-2">
										Organization Details
									</h4>
									
									<div className="grid grid-cols-1 gap-4">
										<div className="space-y-1.5">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">Employee ID</label>
											<input type="text" readOnly value={employee.id} className="w-full bg-slate-50 dark:bg-zinc-950/40 border border-black/[0.06] dark:border-white/[0.08] text-[#E61E32] text-xs p-3 focus:outline-none cursor-not-allowed rounded-md font-mono font-bold select-all"/>
										</div>
										<div className="space-y-1.5">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">Wing Name</label>
											<input type="text" readOnly value={employee.wingName} className="w-full bg-slate-50 dark:bg-zinc-950/40 border border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-zinc-300 text-xs p-3 focus:outline-none cursor-not-allowed rounded-md font-sans font-medium"/>
										</div>
										<div className="space-y-1.5">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">Reporting Lead</label>
											<input type="text" readOnly value={employee.wingLeadName} className="w-full bg-slate-50 dark:bg-zinc-950/40 border border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-zinc-300 text-xs p-3 focus:outline-none cursor-not-allowed rounded-md font-sans font-medium"/>
										</div>
										<div className="space-y-1.5">
											<label className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">Date Registered</label>
											<input type="text" readOnly value={new Date(employee.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} className="w-full bg-slate-50 dark:bg-zinc-950/40 border border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-zinc-300 text-xs p-3 focus:outline-none cursor-not-allowed rounded-md font-mono font-medium"/>
										</div>
									</div>
								</div>
							</div>

							<div className="rounded-xl border border-[#E61E32]/25 bg-[#E61E32]/5 px-4 py-3 flex items-start gap-2.5">
								<BriefcaseIcon className="size-4 text-[#E61E32] mt-0.5 shrink-0"/>
								<p className="text-xs text-slate-650 dark:text-zinc-300">
									Your professional profile (résumé, experience, education, skills, projects &amp;
									more) is filled in at{' '}
									<a href="/employee-verification" className="text-[#E61E32] font-bold underline hover:text-[#c9182a]">
										/employee-verification
									</a>{' '}
									— sign in there with your employee email &amp; password.
								</p>
							</div>
						</div>
					</div>)}

			</div>
		</main>);
}
