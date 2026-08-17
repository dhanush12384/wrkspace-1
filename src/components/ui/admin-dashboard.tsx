'use client';
import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Grid2x2PlusIcon, LogOutIcon, ServerIcon, LineChartIcon, UsersIcon, TerminalIcon, RefreshCwIcon, PackageIcon, CpuIcon, HistoryIcon, UserPlusIcon, PlusIcon, } from 'lucide-react';
import { getLiveSystemStats, addEmployee, getEmployees, createTask, getTasks, getAllLeaves, updateLeaveStatus, getAllAttendance, createEvent, getEvents, getWorkSubmissions, updateSubmissionStatus, getLeads, updateLeadStatus, assignLead, deleteLead, bulkImportLeads, allowLead, triggerCrawl, allowAllLeads, deleteAllLeads, createManualLead, getAdminProfile, allocateAdmin, getAllAdmins, deleteAdmin, deleteEmployee, updateEmployee, updateEmployeeIdCard, deleteTask, updateTask, deleteLeave, createLeave, deleteAttendance, createAttendance, updateAttendance, deleteEvent, updateEvent, deleteWorkSubmission, triggerEventsCrawl, allowEvent, allowAllEvents, deleteAllCrawledEvents, getHrCompanies, createHrCompany, updateHrCompany, deleteHrCompany, triggerHrCompaniesCrawl, allowHrCompany, allowAllHrCompanies, deleteAllCrawledHrCompanies, bulkImportEmployees, getTeamLeads, allocateTeamLead, updateTeamLead, deleteTeamLead, getEmployeeByEmail, allowEmployeeHomeSetup, giveBadgeToEmployee, deleteBadgeFromEmployee, sendBulkAlerts, getUnanimousFeedbackSubmissions, checkHasSubmittedFeedback, allocateAbsentEmployeesForToday } from '@/app/admin/actions';
import { AdminLiveSafetyPanel } from './safety-panel';
import { AdminLiveTrackingPanel } from './live-tracking-panel';
import { AdminShiftTimingsPanel } from './admin-shift-timings-panel';
import { AdminLateCheckinsPanel } from './admin-late-checkins-panel';
import { AdminPayoutsPanel } from './admin-payouts-panel';
import OfficesPanel from '@/components/ui/offices-panel';
import { CalendarIcon, MapPinIcon, FileTextIcon, CheckCircleIcon, XCircleIcon, ClockIcon, AlertCircleIcon, BarChart2Icon, UploadIcon, Trash2Icon, UserCheckIcon, PencilIcon, CheckIcon, XIcon, EyeIcon, CopyIcon, SendIcon, MailIcon, SearchIcon, Trophy, Zap, Heart, Flame, Shield, Sparkles, Award } from 'lucide-react';
import { profileFromEmployee } from '@/lib/employee-professional-profile';
import { cn } from '@/lib/utils';
import { UnanimousFormGate } from './unanimous-form-gate';
import { MessagesView } from './messages-view';
import { ChatAvatar } from './chat-avatar';
import { AdminAlertSender } from './admin-alert-sender';
const BadgeIcon = ({ name, className }: { name: string; className?: string }) => {
    switch (name) {
        case 'Trophy':
            return <Trophy className={className} />;
        case 'Zap':
            return <Zap className={className} />;
        case 'Heart':
            return <Heart className={className} />;
        case 'Flame':
            return <Flame className={className} />;
        case 'Shield':
            return <Shield className={className} />;
        case 'Sparkles':
            return <Sparkles className={className} />;
        case 'CheckCircle':
            return <CheckCircleIcon className={className} />;
        case 'Award':
        default:
            return <Award className={className} />;
    }
};

interface AdminDashboardProps {
    email: string;
    onLogout: () => void;
}
type TabType = 'overview' | 'employees' | 'leaves' | 'attendance' | 'offices' | 'system_status' | 'messages' | 'task_allocation' | 'events' | 'work_submissions' | 'super_admin' | 'team_leads' | 'live_safety' | 'live_tracking' | 'add_remarks' | 'alert_sender' | 'form' | 'shift_timings' | 'late_checkins' | 'payouts';
export function AdminDashboard({ email, onLogout }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const isSuperAdmin = email.toLowerCase() === 'webstrixx@gmail.com';
    const [quickSubject, setQuickSubject] = useState('');
    const [quickBody, setQuickBody] = useState('');
    const [quickSending, setQuickSending] = useState(false);
    const [quickMsg, setQuickMsg] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [adminsList, setAdminsList] = useState<any[]>([]);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminOrgName, setNewAdminOrgName] = useState('');
    const [newAdminPassword, setNewAdminPassword] = useState('admin123');
    const [newAdminPages, setNewAdminPages] = useState<string[]>([
        'overview', 'employees', 'task_allocation', 'attendance', 'offices', 'leaves', 'messages', 'system_status', 'events', 'work_submissions', 'alert_sender', 'form'
    ]);
    const [allocatedLink, setAllocatedLink] = useState<string | null>(null);
    const [isAllocating, setIsAllocating] = useState(false);
    const [superAdminMsg, setSuperAdminMsg] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
    const [organizationName, setOrganizationName] = useState('WrkSpace Headquarters');
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [isAdminTeamLead, setIsAdminTeamLead] = useState(false);
    const [adminEmployeeId, setAdminEmployeeId] = useState<string | null>(null);
    const [adminDisplayName, setAdminDisplayName] = useState('Admin');
    const [allocatorName, setAllocatorName] = useState('Admin');
    const [allocatorRole, setAllocatorRole] = useState('Admin');
    const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState<boolean | null>(null);
    const [feedbackSubmissions, setFeedbackSubmissions] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterUserType, setFilterUserType] = useState('ALL');
    const [filterSeverity, setFilterSeverity] = useState('ALL');
    useEffect(() => {
        async function loadAdminProfile() {
            try {
                const res = await getAdminProfile(email);
                if (res.success && res.profile) {
                    setOrganizationName(res.profile.organizationName || 'WrkSpace Headquarters');
                    setAdminEmployeeId(res.profile.employeeId || null);
                    setAdminDisplayName(res.profile.employeeName || 'Admin');
                    const pages = res.profile.allowedPages || '';
                    const tabs = pages.split(',').map(t => t.trim()).filter(Boolean);
                    setAllowedTabs(tabs);
                    setIsAdminTeamLead(res.profile.isTeamLead || false);
                    if (res.profile.isTeamLead) {
                        setAllocatorName(res.profile.employeeName || 'Team Lead');
                        setAllocatorRole('Team Lead');
                    }
                    else if (email.toLowerCase() === 'webstrixx@gmail.com') {
                        setAllocatorName('CTO');
                        setAllocatorRole('CTO');
                    }
                    else {
                        setAllocatorName('Admin');
                        setAllocatorRole('Admin');
                    }
                    const feedbackRes = await checkHasSubmittedFeedback(email);
                    if (feedbackRes.success) {
                        setHasSubmittedFeedback(feedbackRes.hasSubmitted);
                    }
                    else {
                        setHasSubmittedFeedback(true);
                    }
                    if (tabs.length > 0 && !tabs.includes(activeTab)) {
                        setActiveTab(tabs[0] as TabType);
                    }
                }
                else {
                    console.error('Failed to load admin profile:', res.error);
                    onLogout();
                }
            }
            catch (e) {
                console.error(e);
                onLogout();
            }
            finally {
                setLoadingProfile(false);
            }
        }
        loadAdminProfile();
    }, [email]);
    const getQuickPreviewHtml = () => {
        if (!quickBody)
            return '<p style="color: #a1a1aa; font-style: italic; font-size: 11px;">Message body preview...</p>';
        let html = quickBody
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        html = html
            .replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/gi, '<strong>$1</strong>')
            .replace(/&lt;i&gt;([\s\S]*?)&lt;\/i&gt;/gi, '<em>$1</em>')
            .replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<span style="text-decoration: underline;">$1</span>')
            .replace(/&lt;strong&gt;([\s\S]*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>')
            .replace(/&lt;em&gt;([\s\S]*?)&lt;\/em&gt;/gi, '<em>$1</em>')
            .replace(/&lt;a\s+href=&quot;([^&]+?)&quot;&gt;([\s\S]*?)&lt;\/a&gt;/gi, '<a href="$1" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">$2</a>')
            .replace(/&lt;a\s+href=\'([^\']+?)\'&gt;([\s\S]*?)&lt;\/a&gt;/gi, '<a href="$1" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">$2</a>');
        html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__([\s\S]*?)__/g, '<strong>$1</strong>');
        html = html.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
        html = html.replace(/_([\s\S]*?)_/g, '<span style="text-decoration: underline;">$1</span>');
        html = html.replace(/\[([\s\S]*?)\]\((https?:\/\/[^\s\)]+?)\)/g, '<a href="$2" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">$1</a>');
        const paragraphs = html.split(/\n\s*\n+/);
        return paragraphs
            .map(p => {
            const trimmed = p.trim();
            if (!trimmed)
                return '';
            const withLineBreaks = trimmed.replace(/\n/g, '<br />');
            return `<p style="font-size: 12px; line-height: 1.5; color: #475569; margin: 0 0 10px;">${withLineBreaks}</p>`;
        })
            .filter(Boolean)
            .join('');
    };
    const handleSendQuickAlert = async () => {
        if (!quickSubject.trim() || !quickBody.trim()) {
            setQuickMsg({ type: 'error', text: 'Subject and body message are required.' });
            return;
        }
        setQuickSending(true);
        setQuickMsg(null);
        try {
            const res = await sendBulkAlerts(quickSubject, quickBody);
            if (res.success) {
                setQuickMsg({ type: 'success', text: `Success! Alert broadcasted to ${res.count} active employees.` });
                setQuickSubject('');
                setQuickBody('');
            }
            else {
                setQuickMsg({ type: 'error', text: res.error || 'Failed to send alerts.' });
            }
        }
        catch (err: any) {
            setQuickMsg({ type: 'error', text: err.message || 'Error occurred.' });
        }
        finally {
            setQuickSending(false);
        }
    };
    const fetchAdmins = async () => {
        try {
            const res = await getAllAdmins();
            if (res.success && res.admins) {
                setAdminsList(res.admins);
            }
        }
        catch (e) {
            console.error(e);
        }
    };
    const fetchTeamLeads = async () => {
        try {
            const res = await getTeamLeads();
            if (res.success && res.teamLeads) {
                setTeamLeadsList(res.teamLeads);
            }
        }
        catch (e) {
            console.error(e);
        }
    };
    const handleAllocateTeamLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmpId) {
            setLeadMsg({ type: 'error', text: 'Please select an employee.' });
            return;
        }
        setIsAllocatingLead(true);
        setLeadMsg(null);
        try {
            const res = await allocateTeamLead({
                employeeId: selectedEmpId,
                password: leadPassword,
                allowedPages: leadAllowedPages.join(',')
            });
            if (res.success) {
                setLeadMsg({ type: 'success', text: 'Team Lead allocated successfully!' });
                setSelectedEmpId('');
                setLeadPassword('lead123');
                setLeadAllowedPages(['task_allocation', 'attendance', 'leaves']);
                setShowLeadForm(false);
                await fetchTeamLeads();
                await fetchEmployees();
                await fetchStats();
            }
            else {
                setLeadMsg({ type: 'error', text: res.error || 'Failed to allocate Team Lead.' });
            }
        }
        catch (err: any) {
            setLeadMsg({ type: 'error', text: err.message || 'Error occurred.' });
        }
        finally {
            setIsAllocatingLead(false);
        }
    };
    const handleDeleteTeamLead = async (adminId: string) => {
        if (confirm('Are you sure you want to remove this Team Lead allocation? Their admin login will be revoked, and their employee role will reset to Employee.')) {
            const res = await deleteTeamLead(adminId);
            if (res.success) {
                await fetchTeamLeads();
                await fetchEmployees();
                await fetchStats();
            }
            else {
                alert(res.error || 'Failed to delete Team Lead.');
            }
        }
    };
    const handleSaveTeamLeadEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLead)
            return;
        try {
            const res = await updateTeamLead(editingLead.id, {
                password: editLeadPassword || undefined,
                allowedPages: editLeadAllowedPages.join(',')
            });
            if (res.success) {
                setShowEditLeadModal(false);
                setEditingLead(null);
                setEditLeadPassword('');
                setEditLeadAllowedPages([]);
                await fetchTeamLeads();
            }
            else {
                alert(res.error || 'Failed to update Team Lead.');
            }
        }
        catch (error: any) {
            alert(error.message || 'Error updating Team Lead.');
        }
    };
    const toggleLeadPagePermission = (page: string) => {
        if (leadAllowedPages.includes(page)) {
            setLeadAllowedPages(leadAllowedPages.filter(p => p !== page));
        }
        else {
            setLeadAllowedPages([...leadAllowedPages, page]);
        }
    };
    const toggleEditLeadPagePermission = (page: string) => {
        if (editLeadAllowedPages.includes(page)) {
            setEditLeadAllowedPages(editLeadAllowedPages.filter(p => p !== page));
        }
        else {
            setEditLeadAllowedPages([...editLeadAllowedPages, page]);
        }
    };
    const handleAllocateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAllocating(true);
        setSuperAdminMsg(null);
        setAllocatedLink(null);
        try {
            const res = await allocateAdmin({
                email: newAdminEmail,
                organizationName: newAdminOrgName,
                allowedPages: newAdminPages.join(','),
                password: newAdminPassword
            });
            if (res.success && res.admin) {
                setSuperAdminMsg({ type: 'success', text: 'Admin allocated successfully!' });
                const inviteUrl = `${window.location.origin}/admin?invite=${res.admin.inviteToken}`;
                setAllocatedLink(inviteUrl);
                setNewAdminEmail('');
                setNewAdminOrgName('');
                setNewAdminPassword('admin123');
                await fetchAdmins();
            }
            else {
                setSuperAdminMsg({ type: 'error', text: res.error || 'Failed to allocate admin.' });
            }
        }
        catch (err: any) {
            setSuperAdminMsg({ type: 'error', text: err.message || 'Error occurred.' });
        }
        finally {
            setIsAllocating(false);
        }
    };
    const handleDeleteAdmin = async (targetEmail: string) => {
        if (confirm(`Are you sure you want to delete admin account ${targetEmail}?`)) {
            const res = await deleteAdmin(targetEmail);
            if (res.success) {
                await fetchAdmins();
            }
            else {
                alert(res.error || 'Failed to delete admin.');
            }
        }
    };
    const togglePagePermission = (page: string) => {
        if (newAdminPages.includes(page)) {
            setNewAdminPages(newAdminPages.filter(p => p !== page));
        }
        else {
            setNewAdminPages([...newAdminPages, page]);
        }
    };
    const [stats, setStats] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [employeesList, setEmployeesList] = useState<any[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [empEmail, setEmpEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [wingName, setWingName] = useState('');
    const [wingLeadName, setWingLeadName] = useState('');
    const [empRole, setEmpRole] = useState('Employee');
    const [empGender, setEmpGender] = useState('UNSPECIFIED');
    const [empRemarks, setEmpRemarks] = useState('');
    const [empMonthWorked, setEmpMonthWorked] = useState('');
    const [remPhotoUrl, setRemPhotoUrl] = useState('');
    const [remFirstName, setRemFirstName] = useState('');
    const [remMiddleName, setRemMiddleName] = useState('');
    const [remLastName, setRemLastName] = useState('');
    const [remEmail, setRemEmail] = useState('');
    const [remPhone, setRemPhone] = useState('');
    const [remCompanyWorkedFor, setRemCompanyWorkedFor] = useState('');
    const [remStatus, setRemStatus] = useState('Active');
    const [remRemarks, setRemRemarks] = useState('');
    const [remOverallScore, setRemOverallScore] = useState('');
    const [remConduct, setRemConduct] = useState('');
    const [remWingName, setRemWingName] = useState('');
    const [remWingLeadName, setRemWingLeadName] = useState('');
    const [remRole, setRemRole] = useState('Employee');
    const [remGender, setRemGender] = useState('UNSPECIFIED');
    const [remMonthWorked, setRemMonthWorked] = useState('');
    const [remMessage, setRemMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [remBusy, setRemBusy] = useState(false);
    const [remBadgeTitle, setRemBadgeTitle] = useState('');
    const [remBadgeIcon, setRemBadgeIcon] = useState('Award');
    const [remBadgeColor, setRemBadgeColor] = useState('blue');
    const [remSelectedEmployee, setRemSelectedEmployee] = useState<any>(null);
    const [remEmpSearch, setRemEmpSearch] = useState('');
    const [remShowEmpDropdown, setRemShowEmpDropdown] = useState(false);
    const [remCertifications, setRemCertifications] = useState<{
        title: string;
        url: string;
    }[]>([]);
    const [addMessage, setAddMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [teamLeadsList, setTeamLeadsList] = useState<any[]>([]);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [selectedEmpId, setSelectedEmpId] = useState('');
    const [leadPassword, setLeadPassword] = useState('lead123');
    const [leadAllowedPages, setLeadAllowedPages] = useState<string[]>(['task_allocation', 'attendance', 'leaves']);
    const [isAllocatingLead, setIsAllocatingLead] = useState(false);
    const [leadMsg, setLeadMsg] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [editingLead, setEditingLead] = useState<any>(null);
    const [showEditLeadModal, setShowEditLeadModal] = useState(false);
    const [editLeadPassword, setEditLeadPassword] = useState('');
    const [editLeadAllowedPages, setEditLeadAllowedPages] = useState<string[]>([]);
    const [tasksList, setTasksList] = useState<any[]>([]);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskReportTo, setTaskReportTo] = useState('');
    const [taskAssigneeId, setTaskAssigneeId] = useState('');
    const [taskDeadline, setTaskDeadline] = useState('');
    const [taskStatus, setTaskStatus] = useState('Pending');
    const [taskMode, setTaskMode] = useState('Onsite');
    const [assignToAll, setAssignToAll] = useState(false);
    const [taskMessage, setTaskMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [leavesList, setLeavesList] = useState<any[]>([]);
    const [attendanceList, setAttendanceList] = useState<any[]>([]);
    const [eventsList, setEventsList] = useState<any[]>([]);
    const [showEventForm, setShowEventForm] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventCollege, setEventCollege] = useState('');
    const [eventStartDate, setEventStartDate] = useState('');
    const [eventEndDate, setEventEndDate] = useState('');
    const [eventStartTime, setEventStartTime] = useState('');
    const [eventEndTime, setEventEndTime] = useState('');
    const [eventVenue, setEventVenue] = useState('');
    const [eventImageUrl, setEventImageUrl] = useState('');
    const [selectedEventRepIds, setSelectedEventRepIds] = useState<string[]>([]);
    const [editEventImageUrl, setEditEventImageUrl] = useState('');
    const [editEventRepIds, setEditEventRepIds] = useState<string[]>([]);
    const [eventMessage, setEventMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [eventsSubTab, setEventsSubTab] = useState<'active' | 'crawler'>('active');
    const [crawlEventCity, setCrawlEventCity] = useState('Hyderabad');
    const [crawlEventArea, setCrawlEventArea] = useState('Gachibowli');
    const [isCrawlingEvents, setIsCrawlingEvents] = useState(false);
    const [eventsCrawlMsg, setEventsCrawlMsg] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const citiesList = ["Hyderabad", "Mumbai", "Bangalore", "Pune", "Chennai", "Delhi / Noida"];
    const cityAreas: Record<string, string[]> = {
        "Hyderabad": ["Gachibowli", "Madhapur", "Jubilee Hills", "Kondapur", "Begumpet", "Kukatpally"],
        "Mumbai": ["Powai", "Bandra", "Andheri", "Colaba", "Thane", "Dadar"],
        "Bangalore": ["Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "Electronic City", "Jayanagar"],
        "Pune": ["Hinjewadi", "Kothrud", "Koregaon Park", "Viman Nagar", "Baner", "Wakad"],
        "Chennai": ["Adyar", "Velachery", "T. Nagar", "OMR Road", "Guindy", "Nungambakkam"],
        "Delhi / Noida": ["Connaught Place", "Dwarka", "Saket", "Sector 62 Noida", "Greater Noida", "Gurugram"]
    };
    const [editModalType, setEditModalType] = useState<'employee' | 'task' | 'leave' | 'attendance' | 'event' | 'submission' | 'hr_company' | null>(null);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);
    const [viewingTab, setViewingTab] = useState<'personal' | 'verification' | 'attendance'>('personal');
    const [badgeTitle, setBadgeTitle] = useState('');
    const [badgeIcon, setBadgeIcon] = useState('Award');
    const [badgeColor, setBadgeColor] = useState('blue');
    const [badgeDescription, setBadgeDescription] = useState('');
    const [badgeImage, setBadgeImage] = useState('');
    const [badgeMessage, setBadgeMessage] = useState<string | null>(null);
    const [showAddManualLeave, setShowAddManualLeave] = useState(false);
    const [leavesFilter, setLeavesFilter] = useState('All');
    const [leavesSearchQuery, setLeavesSearchQuery] = useState('');
    const [showAddManualAttendance, setShowAddManualAttendance] = useState(false);
    const [showTodayAttendanceSummary, setShowTodayAttendanceSummary] = useState(false);
    const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
    const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('All');
    const [showAddManualHr, setShowAddManualHr] = useState(false);
    const [hrCompaniesList, setHrCompaniesList] = useState<any[]>([]);
    const [hrCompaniesSubTab, setHrCompaniesSubTab] = useState<'active' | 'crawler'>('active');
    const [crawlHrCity, setCrawlHrCity] = useState('Hyderabad');
    const [isCrawlingHr, setIsCrawlingHr] = useState(false);
    const [hrCrawlMsg, setHrCrawlMsg] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [hrSearchQuery, setHrSearchQuery] = useState('');
    const [assigningHrId, setAssigningHrId] = useState<string | null>(null);
    const [assignHrEmployeeId, setAssignHrEmployeeId] = useState('');
    const [manualCompanyName, setManualCompanyName] = useState('');
    const [manualWebsite, setManualWebsite] = useState('');
    const [manualIndustry, setManualIndustry] = useState('');
    const [manualLocation, setManualLocation] = useState('');
    const [manualHrName, setManualHrName] = useState('');
    const [manualHrEmail, setManualHrEmail] = useState('');
    const [manualHrPhone, setManualHrPhone] = useState('');
    const [manualHrNotes, setManualHrNotes] = useState('');
    const [manualHrStatus, setManualHrStatus] = useState('New');
    const [manualAssignedEmployeeId, setManualAssignedEmployeeId] = useState('');
    const fetchStats = async () => {
        setIsRefreshing(true);
        try {
            const data = await getLiveSystemStats();
            setStats(data);
        }
        catch (error) {
            console.error('Failed to fetch system stats:', error);
        }
        finally {
            setIsRefreshing(false);
        }
    };
    const fetchEmployees = async () => {
        try {
            const data = await getEmployees();
            setEmployeesList(data);
        }
        catch (error) {
            console.error('Failed to fetch employee list:', error);
        }
    };
    const fetchTasks = async () => {
        try {
            const data = await getTasks();
            setTasksList(data);
        }
        catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    };
    const fetchLeaves = async () => {
        try {
            const data = await getAllLeaves();
            setLeavesList(data);
        }
        catch (error) {
            console.error('Failed to fetch leaves:', error);
        }
    };
    const fetchAttendance = async () => {
        try {
            const data = await getAllAttendance();
            setAttendanceList(data);
        }
        catch (error) {
            console.error('Failed to fetch attendance logs:', error);
        }
    };
    const fetchEvents = async () => {
        try {
            const data = await getEvents();
            setEventsList(data);
        }
        catch (error) {
            console.error('Failed to fetch events:', error);
        }
    };
    const [submissionsList, setSubmissionsList] = useState<any[]>([]);
    const [submissionFilter, setSubmissionFilter] = useState<string>('All');
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const fetchSubmissions = async () => {
        try {
            const data = await getWorkSubmissions();
            setSubmissionsList(data);
        }
        catch (error) {
            console.error('Failed to fetch work submissions:', error);
        }
    };
    const handleUpdateSubmission = async (id: string, status: string) => {
        setIsUpdatingStatus(true);
        const result = await updateSubmissionStatus(id, status, reviewNote || undefined);
        if (result.success) {
            setReviewingId(null);
            setReviewNote('');
            await fetchSubmissions();
        }
        setIsUpdatingStatus(false);
    };
    const handleDeleteEmployee = async (id: string) => {
        if (!confirm('Are you sure you want to delete this employee? All related attendance, tasks, leaves, and submissions will also be deleted.'))
            return;
        const res = await deleteEmployee(id);
        if (res.success) {
            fetchEmployees();
            fetchStats();
        }
        else {
            alert('Failed to delete employee: ' + res.error);
        }
    };
    const handleDeleteTask = async (id: string) => {
        if (!confirm('Are you sure you want to delete this task?'))
            return;
        const res = await deleteTask(id);
        if (res.success) {
            fetchTasks();
            fetchStats();
        }
        else {
            alert('Failed to delete task: ' + res.error);
        }
    };
    const handleDeleteLeave = async (id: string) => {
        if (!confirm('Are you sure you want to delete this leave request?'))
            return;
        const res = await deleteLeave(id);
        if (res.success) {
            fetchLeaves();
            fetchStats();
        }
        else {
            alert('Failed to delete leave: ' + res.error);
        }
    };
    const handleDeleteAttendance = async (id: string) => {
        if (!confirm('Are you sure you want to delete this attendance log?'))
            return;
        const res = await deleteAttendance(id);
        if (res.success) {
            fetchAttendance();
            fetchStats();
        }
        else {
            alert('Failed to delete attendance: ' + res.error);
        }
    };
    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event?'))
            return;
        const res = await deleteEvent(id);
        if (res.success) {
            fetchEvents();
            fetchStats();
        }
        else {
            alert('Failed to delete event: ' + res.error);
        }
    };
    const handleDeleteWorkSubmission = async (id: string) => {
        if (!confirm('Are you sure you want to delete this work submission?'))
            return;
        const res = await deleteWorkSubmission(id);
        if (res.success) {
            fetchSubmissions();
            fetchStats();
        }
        else {
            alert('Failed to delete work submission: ' + res.error);
        }
    };
    const handleSaveEmployeeEdit = async (id: string, updatedData: any) => {
        const res = await updateEmployee(id, updatedData);
        if (res.success) {
            setEditModalType(null);
            setEditingItem(null);
            fetchEmployees();
        }
        else {
            alert('Failed to update employee: ' + res.error);
        }
    };
    const handleGiveBadge = async (employeeId: string) => {
        if (!badgeTitle.trim()) {
            setBadgeMessage('Please enter a badge title');
            return;
        }
        const res = await giveBadgeToEmployee(employeeId, {
            title: badgeTitle.trim(),
            icon: badgeIcon,
            color: badgeColor,
            description: badgeDescription.trim() || undefined,
            image: badgeImage || undefined,
        });
        if (res.success && res.employee) {
            setEditingItem(res.employee);
            fetchEmployees();
            setBadgeTitle('');
            setBadgeDescription('');
            setBadgeImage('');
            setBadgeMessage('Badge assigned successfully!');
            setTimeout(() => setBadgeMessage(null), 3000);
        }
        else {
            alert('Failed to give badge: ' + res.error);
        }
    };
    const handleDeleteBadge = async (employeeId: string, badgeId: string) => {
        if (!confirm('Are you sure you want to delete this badge?'))
            return;
        const res = await deleteBadgeFromEmployee(employeeId, badgeId);
        if (res.success && res.employee) {
            setEditingItem(res.employee);
            fetchEmployees();
            setBadgeMessage('Badge removed successfully.');
            setTimeout(() => setBadgeMessage(null), 3000);
        }
        else {
            alert('Failed to delete badge: ' + res.error);
        }
    };
    const handleSaveTaskEdit = async (id: string, updatedData: any) => {
        const res = await updateTask(id, updatedData);
        if (res.success) {
            setEditModalType(null);
            setEditingItem(null);
            fetchTasks();
        }
        else {
            alert('Failed to update task: ' + res.error);
        }
    };
    const handleSaveAttendanceEdit = async (id: string, updatedData: any) => {
        const res = await updateAttendance(id, updatedData);
        if (res.success) {
            setEditModalType(null);
            setEditingItem(null);
            fetchAttendance();
        }
        else {
            alert('Failed to update attendance: ' + res.error);
        }
    };
    const handleSaveEventEdit = async (id: string, updatedData: any) => {
        const res = await updateEvent(id, updatedData);
        if (res.success) {
            setEditModalType(null);
            setEditingItem(null);
            fetchEvents();
        }
        else {
            alert('Failed to update event: ' + res.error);
        }
    };
    const handleAddManualLeave = async (data: any) => {
        const res = await createLeave(data);
        if (res.success) {
            setShowAddManualLeave(false);
            fetchLeaves();
            fetchStats();
        }
        else {
            alert('Failed to log leave request: ' + res.error);
        }
    };
    const handleAddManualAttendance = async (data: any) => {
        const res = await createAttendance(data);
        if (res.success) {
            setShowAddManualAttendance(false);
            fetchAttendance();
            fetchStats();
        }
        else {
            alert('Failed to log attendance: ' + res.error);
        }
    };
    const [leadsList, setLeadsList] = useState<any[]>([]);
    const [leadsFilter, setLeadsFilter] = useState('All');
    const [leadsSourceFilter, setLeadsSourceFilter] = useState('All');
    const [leadsSearch, setLeadsSearch] = useState('');
    const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
    const [assignEmployeeId, setAssignEmployeeId] = useState('');
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
    const [manualAssignTo, setManualAssignTo] = useState('');
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
                assignedTo: manualAssignTo || undefined,
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
                setManualAssignTo('');
                setShowManualForm(false);
                await fetchLeads();
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
    const [crawlCity, setCrawlCity] = useState('Hyderabad');
    const [crawlCategory, setCrawlCategory] = useState('IT Services');
    const [isCrawling, setIsCrawling] = useState(false);
    const [crawlMessage, setCrawlMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const handleLeadCrawl = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCrawling(true);
        setCrawlMessage(null);
        try {
            const result = await triggerCrawl(crawlCity, crawlCategory) as any;
            if (result.success) {
                setCrawlMessage({ type: 'success', text: `Crawl successful! Imported ${result.count} new leads.` });
                await fetchLeads();
            }
            else {
                setCrawlMessage({ type: 'error', text: result.error || 'Crawl failed.' });
            }
        }
        catch (err: any) {
            setCrawlMessage({ type: 'error', text: err.message || 'Crawl failed.' });
        }
        finally {
            setIsCrawling(false);
        }
    };
    const handleLeadAllowToggle = async (id: string, allowed: boolean) => {
        setUpdatingLeadId(id);
        await allowLead(id, allowed);
        await fetchLeads();
        setUpdatingLeadId(null);
    };
    const handleAllowAll = async (ids?: string[]) => {
        setIsCrawling(true);
        await allowAllLeads(ids);
        await fetchLeads();
        setIsCrawling(false);
    };
    const handleDeleteAll = async (ids?: string[]) => {
        if (confirm(`Are you sure you want to delete all ${ids ? ids.length : 'selected'} leads?`)) {
            setIsCrawling(true);
            await deleteAllLeads(ids);
            await fetchLeads();
            setIsCrawling(false);
        }
    };
    const fetchLeads = async () => {
        try {
            const data = await getLeads();
            setLeadsList(data);
        }
        catch (error) {
            console.error('Failed to fetch leads:', error);
        }
    };
    const fetchHrCompaniesList = async () => {
        try {
            const res = await getHrCompanies();
            if (res.success && res.companies) {
                setHrCompaniesList(res.companies);
            }
        }
        catch (error) {
            console.error('Failed to fetch HR companies:', error);
        }
    };
    const fetchFeedbackSubmissions = async () => {
        try {
            const data = await getUnanimousFeedbackSubmissions();
            setFeedbackSubmissions(data);
        }
        catch (error) {
            console.error('Failed to fetch feedback submissions:', error);
        }
    };
    const handleHrCrawl = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCrawlingHr(true);
        setHrCrawlMsg(null);
        try {
            const res = await triggerHrCompaniesCrawl(crawlHrCity);
            if (res.success) {
                setHrCrawlMsg({ type: 'success', text: `Successfully crawled ${res.count} companies for ${crawlHrCity}!` });
                await fetchHrCompaniesList();
            }
            else {
                setHrCrawlMsg({ type: 'error', text: res.error || 'Crawling failed.' });
            }
        }
        catch (error: any) {
            setHrCrawlMsg({ type: 'error', text: error.message || 'An error occurred.' });
        }
        finally {
            setIsCrawlingHr(false);
        }
    };
    const handleAddManualHr = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await createHrCompany({
                companyName: manualCompanyName,
                website: manualWebsite,
                industry: manualIndustry,
                location: manualLocation,
                hrName: manualHrName,
                hrEmail: manualHrEmail,
                hrPhone: manualHrPhone,
                status: manualHrStatus,
                notes: manualHrNotes,
                assignedEmployeeId: manualAssignedEmployeeId
            });
            if (res.success) {
                setShowAddManualHr(false);
                setManualCompanyName('');
                setManualWebsite('');
                setManualIndustry('');
                setManualLocation('');
                setManualHrName('');
                setManualHrEmail('');
                setManualHrPhone('');
                setManualHrStatus('New');
                setManualHrNotes('');
                setManualAssignedEmployeeId('');
                await fetchHrCompaniesList();
            }
            else {
                alert(res.error || 'Failed to add manual record.');
            }
        }
        catch (error: any) {
            alert(error.message);
        }
    };
    const handleHrAssign = async (id: string, empId: string) => {
        await updateHrCompany(id, { assignedEmployeeId: empId || '' });
        setAssigningHrId(null);
        setAssignHrEmployeeId('');
        await fetchHrCompaniesList();
    };
    const handleHrDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this company record?')) {
            await deleteHrCompany(id);
            await fetchHrCompaniesList();
        }
    };
    const handleHrAllow = async (id: string, allowed: boolean) => {
        await allowHrCompany(id, allowed);
        await fetchHrCompaniesList();
    };
    const handleHrAllowAll = async () => {
        if (confirm('Are you sure you want to approve all crawled company records?')) {
            await allowAllHrCompanies();
            await fetchHrCompaniesList();
        }
    };
    const handleHrDeleteAllCrawled = async () => {
        if (confirm('Are you sure you want to clear all unapproved crawled companies?')) {
            await deleteAllCrawledHrCompanies();
            await fetchHrCompaniesList();
        }
    };
    const handleLeadStatusUpdate = async (id: string, status: string) => {
        setUpdatingLeadId(id);
        await updateLeadStatus(id, status);
        await fetchLeads();
        setUpdatingLeadId(null);
    };
    const handleLeadAssign = async (id: string, empId: string) => {
        await assignLead(id, empId || '');
        setAssigningLeadId(null);
        setAssignEmployeeId('');
        await fetchLeads();
    };
    const handleLeadDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this lead?')) {
            await deleteLead(id);
            await fetchLeads();
        }
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
                await fetchLeads();
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
    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAddingEvent(true);
        setEventMessage(null);
        const filledReps = selectedEventRepIds.map(empId => {
            const emp = employeesList.find(e => e.id === empId);
            return { id: empId, name: emp ? `${emp.firstName} ${emp.lastName}` : empId };
        });
        if (filledReps.length === 0) {
            setEventMessage({ type: 'error', text: 'Please select at least one company representative.' });
            setIsAddingEvent(false);
            return;
        }
        const result = await createEvent({
            title: eventTitle,
            description: eventDescription,
            organisingCollege: eventCollege,
            representatives: filledReps,
            startDate: eventStartDate,
            endDate: eventEndDate,
            startTime: eventStartTime,
            endTime: eventEndTime,
            venueAddress: eventVenue,
            imageUrl: eventImageUrl || undefined,
        });
        if (result.success) {
            setEventMessage({ type: 'success', text: 'Event created successfully.' });
            setEventTitle('');
            setEventDescription('');
            setEventCollege('');
            setEventStartDate('');
            setEventEndDate('');
            setEventStartTime('');
            setEventEndTime('');
            setEventVenue('');
            setEventImageUrl('');
            setSelectedEventRepIds([]);
            setShowEventForm(false);
            fetchEvents();
        }
        else {
            setEventMessage({ type: 'error', text: result.error || 'Failed to create event.' });
        }
        setIsAddingEvent(false);
    };
    const handleEventsCrawl = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!crawlEventCity.trim())
            return alert('Please enter a target city.');
        setIsCrawlingEvents(true);
        setEventsCrawlMsg(null);
        try {
            const res: any = await triggerEventsCrawl(crawlEventCity, crawlEventArea);
            if (res.success) {
                setEventsCrawlMsg({ type: 'success', text: `Crawler successfully parsed and imported ${res.count} events from Student Tribe, Luma, Devfolio, and Unstop.` });
                fetchEvents();
            }
            else {
                setEventsCrawlMsg({ type: 'error', text: res.error || 'Failed to crawl events.' });
            }
        }
        catch (err: any) {
            setEventsCrawlMsg({ type: 'error', text: err.message || 'Crawler failure.' });
        }
        finally {
            setIsCrawlingEvents(false);
        }
    };
    const handleAllowEvent = async (id: string) => {
        try {
            const res: any = await allowEvent(id, true);
            if (res.success) {
                fetchEvents();
            }
            else {
                alert(res.error || 'Failed to approve event.');
            }
        }
        catch (err: any) {
            console.error(err);
        }
    };
    const handleAllowAllEvents = async () => {
        if (!confirm('Are you sure you want to approve all crawled events?'))
            return;
        try {
            const res: any = await allowAllEvents();
            if (res.success) {
                alert(`Successfully approved ${res.count} crawled events.`);
                fetchEvents();
            }
            else {
                alert(res.error || 'Failed to approve all events.');
            }
        }
        catch (err: any) {
            console.error(err);
        }
    };
    const handleDeleteAllCrawledEvents = async () => {
        if (!confirm('Are you sure you want to clear all crawled events?'))
            return;
        try {
            const res: any = await deleteAllCrawledEvents();
            if (res.success) {
                alert(`Successfully deleted ${res.count} crawled events.`);
                fetchEvents();
            }
            else {
                alert(res.error || 'Failed to clear crawled events.');
            }
        }
        catch (err: any) {
            console.error(err);
        }
    };
    useEffect(() => {
        fetchStats();
        fetchEmployees();
        fetchTasks();
        fetchLeaves();
        fetchAttendance();
        fetchEvents();
        fetchSubmissions();
        fetchLeads();
        fetchHrCompaniesList();
        fetchFeedbackSubmissions();
        if (email.toLowerCase() === 'webstrixx@gmail.com') {
            fetchAdmins();
            fetchTeamLeads();
        }
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [email]);
    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        setAddMessage(null);
        try {
            const result = await addEmployee({
                firstName,
                middleName,
                lastName,
                email: empEmail,
                phone,
                wingName,
                wingLeadName,
                role: empRole,
                gender: empGender,
                remarks: empRemarks,
                monthWorked: empMonthWorked,
            });
            if (result.success && result.employee) {
                setAddMessage({
                    type: 'success',
                    text: `Employee successfully created! Generated 6-Digit ID: ${result.employee.id}`,
                });
                setFirstName('');
                setMiddleName('');
                setLastName('');
                setEmpEmail('');
                setPhone('');
                setWingName('');
                setWingLeadName('');
                setEmpRole('Employee');
                setEmpGender('UNSPECIFIED');
                setEmpRemarks('');
                setEmpMonthWorked('');
                await fetchEmployees();
            }
            else {
                setAddMessage({ type: 'error', text: 'Failed to add employee.' });
            }
        }
        catch (error) {
            setAddMessage({ type: 'error', text: 'An unexpected error occurred.' });
        }
        finally {
            setIsAdding(false);
        }
    };
    const handleRemarksSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setRemBusy(true);
        setRemMessage(null);
        const certsJson = remCertifications.filter(c => c.url.trim()).length > 0
            ? JSON.stringify(remCertifications.filter(c => c.url.trim()))
            : undefined;
        const BADGE_DESC: Record<string, string> = {
            'New Joinee': 'Welcomed as a new member of the team',
            'Super Worker': 'Consistently delivering outstanding work',
            'Slashing Dev': 'Exceptional speed and quality in development',
            'Core Dev': 'Pillar of the engineering team',
            'Pro Marketer': 'Drives growth and brand excellence',
            'Employee of the Month': 'Recognised as the best performer this month',
        };
        try {
            let resultEmployee: any = null;
            if (remSelectedEmployee) {
                const result = await updateEmployee(remSelectedEmployee.id, {
                    firstName: remFirstName,
                    middleName: remMiddleName,
                    lastName: remLastName,
                    email: remEmail,
                    phone: remPhone,
                    wingName: remWingName || 'Default Wing',
                    wingLeadName: remWingLeadName || 'Default Lead',
                    role: remRole || 'Employee',
                    gender: remGender,
                    remarks: remRemarks,
                    monthWorked: remMonthWorked,
                    companyWorkedFor: remCompanyWorkedFor,
                    overallScore: remOverallScore,
                    conduct: remConduct,
                    employmentStatus: remStatus,
                    photoUrl: remPhotoUrl || undefined,
                    certifications: certsJson,
                });
                if (result.success && result.employee) {
                    resultEmployee = result.employee;
                }
                else {
                    setRemMessage({ type: 'error', text: result.error || 'Failed to update employee.' });
                    return;
                }
            }
            else {
                const result = await addEmployee({
                    firstName: remFirstName,
                    middleName: remMiddleName,
                    lastName: remLastName,
                    email: remEmail,
                    phone: remPhone,
                    wingName: remWingName || 'Default Wing',
                    wingLeadName: remWingLeadName || 'Default Lead',
                    role: remRole || 'Employee',
                    gender: remGender,
                    remarks: remRemarks,
                    monthWorked: remMonthWorked,
                    companyWorkedFor: remCompanyWorkedFor,
                    overallScore: remOverallScore,
                    conduct: remConduct,
                    employmentStatus: remStatus,
                    photoUrl: remPhotoUrl || undefined,
                    certifications: certsJson,
                });
                if (result.success && result.employee) {
                    resultEmployee = result.employee;
                }
                else {
                    setRemMessage({ type: 'error', text: result.error || 'Failed to create employee.' });
                    return;
                }
            }
            if (remBadgeTitle && resultEmployee) {
                await giveBadgeToEmployee(resultEmployee.id, {
                    title: remBadgeTitle,
                    icon: remBadgeIcon,
                    color: remBadgeColor,
                    description: BADGE_DESC[remBadgeTitle] || '',
                });
            }
            setRemMessage({
                type: 'success',
                text: remSelectedEmployee
                    ? `Employee "${remFirstName} ${remLastName}" updated!${remBadgeTitle ? ` · Badge "${remBadgeTitle}" assigned.` : ''}${certsJson ? ' · Certifications saved.' : ''}`
                    : `Record created! ID: ${resultEmployee.id}${remBadgeTitle ? ` · Badge "${remBadgeTitle}" assigned.` : ''}${certsJson ? ' · Certifications saved.' : ''}`,
            });
            setRemPhotoUrl('');
            setRemFirstName('');
            setRemMiddleName('');
            setRemLastName('');
            setRemEmail('');
            setRemPhone('');
            setRemCompanyWorkedFor('');
            setRemStatus('Active');
            setRemRemarks('');
            setRemOverallScore('');
            setRemConduct('');
            setRemWingName('');
            setRemWingLeadName('');
            setRemRole('Employee');
            setRemGender('UNSPECIFIED');
            setRemMonthWorked('');
            setRemBadgeTitle('');
            setRemBadgeIcon('Award');
            setRemBadgeColor('blue');
            setRemSelectedEmployee(null);
            setRemEmpSearch('');
            setRemCertifications([]);
            await fetchEmployees();
        }
        catch (error: any) {
            setRemMessage({ type: 'error', text: error.message || 'An unexpected error occurred.' });
        }
        finally {
            setRemBusy(false);
        }
    };
    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setAddMessage(null);
        setIsAdding(true);
        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/);
            if (lines.length < 2) {
                setAddMessage({ type: 'error', text: 'file is empty or missing data rows' });
                setIsAdding(false);
                return;
            }
            const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
            const getIndex = (aliases: string[]) => {
                return headers.findIndex(h => aliases.includes(h));
            };
            const firstIdx = getIndex(['firstname', 'first name', 'first_name']);
            const middleIdx = getIndex(['middlename', 'middle name', 'middle_name']);
            const lastIdx = getIndex(['lastname', 'last name', 'last_name']);
            const emailIdx = getIndex(['email', 'email id', 'email_id', 'emailaddress', 'email address']);
            const phoneIdx = getIndex(['phone', 'phone number', 'phone_number', 'mobile', 'cell']);
            const wingIdx = getIndex(['wing', 'wingname', 'wing name', 'wing_name']);
            const wingLeadIdx = getIndex(['winglead', 'wing lead', 'wing lead name', 'wing_lead_name']);
            const roleIdx = getIndex(['role', 'role name', 'designation']);
            const parsedEmployees: any[] = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line)
                    continue;
                const values: string[] = [];
                let current = '';
                let inQuotes = false;
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    }
                    else if (char === ',' && !inQuotes) {
                        values.push(current.trim());
                        current = '';
                    }
                    else {
                        current += char;
                    }
                }
                values.push(current.trim());
                const getVal = (idx: number, fallbackIdx: number) => {
                    const activeIdx = idx !== -1 ? idx : fallbackIdx;
                    if (activeIdx < values.length) {
                        return values[activeIdx].replace(/^["']|["']$/g, '').trim();
                    }
                    return '';
                };
                const firstNameVal = getVal(firstIdx, 0);
                const middleNameVal = getVal(middleIdx, 1);
                const lastNameVal = getVal(lastIdx, 2);
                const emailVal = getVal(emailIdx, 3);
                const phoneVal = getVal(phoneIdx, 4);
                const wingNameVal = getVal(wingIdx, 5);
                const wingLeadNameVal = getVal(wingLeadIdx, 6);
                const roleVal = getVal(roleIdx, 7);
                if (firstNameVal && lastNameVal && emailVal) {
                    parsedEmployees.push({
                        firstName: firstNameVal,
                        middleName: middleNameVal || undefined,
                        lastName: lastNameVal,
                        email: emailVal,
                        phone: phoneVal || 'n/a',
                        wingName: wingNameVal || 'general',
                        wingLeadName: wingLeadNameVal || 'admin',
                        role: roleVal || 'employee'
                    });
                }
            }
            if (parsedEmployees.length === 0) {
                setAddMessage({ type: 'error', text: 'no valid employee rows found in file (ensure first name, last name, and email are present)' });
                setIsAdding(false);
                return;
            }
            const res = await bulkImportEmployees(parsedEmployees);
            if (res.success) {
                setAddMessage({ type: 'success', text: `successfully imported ${res.count} employees!` });
                await fetchEmployees();
                await fetchStats();
            }
            else {
                setAddMessage({ type: 'error', text: res.error || 'import failed' });
            }
        }
        catch (err: any) {
            setAddMessage({ type: 'error', text: `parse error: ${err.message}` });
        }
        finally {
            setIsAdding(false);
            e.target.value = '';
        }
    };
    const handleExportPdf = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('please allow popups to export pdf');
            return;
        }
        const toTitleCase = (str: string) => {
            if (!str)
                return '';
            return str.split(' ').map(word => {
                if (!word)
                    return '';
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');
        };
        const headers = ['Employee ID', 'Full Name', 'Wing Name', 'Wing Lead', 'Role'];
        const rows = employeesList.map(emp => {
            const fullName = `${emp.firstName} ${emp.middleName ? emp.middleName + ' ' : ''}${emp.lastName}`;
            return [
                emp.id.toUpperCase(),
                toTitleCase(fullName),
                toTitleCase(emp.wingName || 'General'),
                toTitleCase(emp.wingLeadName || 'Admin'),
                toTitleCase(emp.role || 'Employee')
            ];
        });
        const formattedDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const headersHtml = headers.map(h => `
			<th style="padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; background-color: #E61E32; border-bottom: 2px solid #b91c1c;">
				${h}
			</th>
		`).join('');
        const rowsHtml = rows.map(row => `
			<tr style="page-break-inside: avoid;">
				${row.map(val => `
					<td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #334155; font-family: system-ui, sans-serif;">
						${val}
					</td>
				`).join('')}
			</tr>
		`).join('');
        const htmlContent = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Employee Directory - Official</title>
					<style>
						@page {
							size: A4 landscape;
							margin: 15mm;
						}
						body {
							font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
							margin: 0;
							color: #1e293b;
							background: #ffffff;
							-webkit-print-color-adjust: exact;
							print-color-adjust: exact;
						}
						.letterhead {
							display: flex;
							justify-content: space-between;
							align-items: flex-end;
							border-bottom: 2px solid #E61E32;
							padding-bottom: 15px;
							margin-bottom: 30px;
						}
						.logo-area h1 {
							font-size: 24px;
							font-weight: 800;
							color: #E61E32;
							margin: 0;
							letter-spacing: -0.5px;
						}
						.logo-area p {
							font-size: 10px;
							color: #64748b;
							margin: 2px 0 0 0;
							text-transform: uppercase;
							letter-spacing: 1px;
						}
						.meta-area {
							text-align: right;
							font-size: 10px;
							color: #64748b;
							line-height: 1.5;
						}
						.doc-title {
							font-size: 18px;
							font-weight: 700;
							color: #0f172a;
							margin: 0 0 15px 0;
						}
						table {
							width: 100%;
							border-collapse: collapse;
							margin-top: 10px;
						}
						tr:nth-child(even) {
							background-color: rgba(230, 30, 50, 0.02);
						}
						tr:hover {
							background-color: #f8fafc;
						}
						.footer {
							margin-top: 50px;
							border-top: 1px solid #e2e8f0;
							padding-top: 15px;
							display: flex;
							justify-content: space-between;
							font-size: 9px;
							color: #94a3b8;
							text-transform: uppercase;
							letter-spacing: 0.5px;
						}
						@media print {
							body {
								margin: 0;
							}
						}
					</style>
				</head>
				<body>
					<div class="letterhead">
						<div class="logo-area">
							<h1>WrkSpace HQ</h1>
							<p>official personnel registry</p>
						</div>
						<div class="meta-area">
							<div><strong>Date Generated:</strong> ${formattedDate}</div>
							<div><strong>Document ID:</strong> WS-EMP-DIR-2026</div>
							<div><strong>Classification:</strong> Confidential</div>
						</div>
					</div>

					<h2 class="doc-title">Employee Directory</h2>

					<table>
						<thead>
							<tr>
								${headersHtml}
							</tr>
						</thead>
						<tbody>
							${rowsHtml}
						</tbody>
					</table>

					<div class="footer">
						<div>security status: internal use only</div>
						<div>wrkspace corporate administration</div>
						<div>page 1 of 1</div>
					</div>

					<script>
						window.onload = function() {
							setTimeout(function() {
								window.print();
							}, 500);
						};
					</script>
				</body>
			</html>
		`;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };
    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAddingTask(true);
        setTaskMessage(null);
        let assigneeId = taskAssigneeId;
        let assigneeName = '';
        if (assignToAll) {
            assigneeId = 'ALL';
            assigneeName = 'All Employees';
        }
        else {
            if (!assigneeId) {
                setTaskMessage({ type: 'error', text: 'Please select an employee or check Assign to All.' });
                setIsAddingTask(false);
                return;
            }
            const selectedEmp = employeesList.find(emp => emp.id === assigneeId);
            assigneeName = selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : assigneeId;
        }
        try {
            const result = await createTask({
                title: taskTitle,
                description: taskDescription,
                reportTo: taskReportTo,
                assigneeId,
                assigneeName,
                deadline: taskDeadline,
                status: taskStatus,
                mode: taskMode,
                allocatorName,
                allocatorRole,
            });
            if (result.success && result.task) {
                setTaskMessage({
                    type: 'success',
                    text: `Task successfully allocated! ID: ${result.task.id}`,
                });
                setTaskTitle('');
                setTaskDescription('');
                setTaskReportTo('');
                setTaskAssigneeId('');
                setTaskDeadline('');
                setTaskStatus('Pending');
                setTaskMode('Onsite');
                setAssignToAll(false);
                await fetchTasks();
            }
            else {
                setTaskMessage({ type: 'error', text: result.error || 'Failed to allocate task.' });
            }
        }
        catch (error) {
            setTaskMessage({ type: 'error', text: 'An unexpected error occurred.' });
        }
        finally {
            setIsAddingTask(false);
        }
    };
    const getTodayAttendanceSummary = () => {
        const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const todayLogs = attendanceList.filter(log => log.date === todayStr);
        const presentMap = new Map<string, any>();
        todayLogs.forEach(log => {
            presentMap.set(log.employeeId, log);
        });
        const leaveMap = new Map<string, any>();
        leavesList.forEach(leave => {
            if (leave.status === 'Approved') {
                const start = new Date(leave.startDate).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
                const end = new Date(leave.endDate).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
                if (todayStr >= start && todayStr <= end) {
                    leaveMap.set(leave.employeeId, leave);
                }
            }
        });
        const presentList: any[] = [];
        const absentList: any[] = [];
        const onLeaveList: any[] = [];
        employeesList.forEach(emp => {
            const log = presentMap.get(emp.id);
            if (log && log.status !== 'Absent') {
                presentList.push({ employee: emp, log });
            }
            else {
                const leave = leaveMap.get(emp.id);
                if (leave) {
                    onLeaveList.push({ employee: emp, leave });
                }
                else {
                    absentList.push(emp);
                }
            }
        });
        return { presentList, absentList, onLeaveList };
    };
    if (loadingProfile || hasSubmittedFeedback === null || !stats) {
        return (<main className="admin-portal min-h-screen bg-[#e8edf5] text-slate-900 flex flex-col items-center justify-center space-y-4">
				<RefreshCwIcon className="size-8 text-brand-500 animate-spin"/>
				<p className="text-zinc-400 text-xs font-mono">Initializing live environment console...</p>
			</main>);
    }
    if (hasSubmittedFeedback === false) {
        return (<UnanimousFormGate userEmail={email} userName={adminDisplayName || email} userType="ADMIN" userId={adminEmployeeId || undefined} onSuccess={() => setHasSubmittedFeedback(true)}/>);
    }
    return (<main className="admin-portal bg-[#e8edf5] text-slate-900 relative flex flex-col font-sans h-screen overflow-hidden">
			
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03),transparent_70%)] z-0 pointer-events-none"/>

			
			<header className="w-full border-b border-white/[0.08] bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
				<div className="w-full px-6 md:px-10 h-16 sm:h-20 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<img src="https://ik.imagekit.io/dypkhqxip/wrkspacenew" alt="wrkspace" className="h-10 sm:h-12 w-auto object-contain"/>
						<div className="w-px h-5 bg-white/15"/>
						<span className="text-[11px] font-bold uppercase tracking-wider text-[#E61E32] bg-[#E61E32]/20 px-2.5 py-1 rounded-md border border-[#E61E32]/30">
							Admin
						</span>
					</div>
					<div className="flex items-center gap-3">
						{isAdminTeamLead && (<button type="button" className="border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 cursor-pointer rounded-md transition-all text-xs py-2 px-3 h-9 font-medium flex items-center gap-2 shadow-xs" onClick={async () => {
                const empRes = await getEmployeeByEmail(email);
                if (empRes.success && empRes.employee) {
                    localStorage.setItem('wrkspace_employee_session', JSON.stringify(empRes.employee));
                    window.location.href = '/';
                }
                else {
                    alert(empRes.error || 'Failed to switch to employee portal.');
                }
            }}>
								<UserCheckIcon className="size-3.5"/>
								Switch to Employee Portal
							</button>)}
						<button onClick={fetchStats} disabled={isRefreshing} className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition-all rounded-md cursor-pointer disabled:opacity-50 h-9 w-9 flex items-center justify-center" title="Refresh Stats">
							<RefreshCwIcon className={`size-3.5 ${isRefreshing ? 'animate-spin text-[#E61E32]' : ''}`}/>
						</button>
						<button type="button" className="bg-[#E61E32] hover:bg-[#c9182a] border-0 cursor-pointer rounded-md transition-all text-xs font-bold py-2 px-4 h-9 flex items-center gap-2 shadow-xs" style={{ color: '#ffffff' }} onClick={onLogout}>
							<LogOutIcon className="size-3.5" style={{ color: '#ffffff' }}/>
							<span style={{ color: '#ffffff' }}>Logout</span>
						</button>
					</div>
				</div>
			</header>

			
			<div className="w-full border-b border-red-700 bg-[#E61E32] z-40 sticky top-20 shadow-sm admin-subnav">
				<div className="w-full px-6 md:px-10 flex gap-6 text-xs md:text-sm font-medium tracking-wide overflow-x-auto">
					{(isSuperAdmin || allowedTabs.includes('overview')) && (<button onClick={() => setActiveTab('overview')} className={`py-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'overview' ? 'border-brand-400 text-white font-semibold' : 'border-transparent text-brand-300/60 hover:text-white'}`}>
							Overview
						</button>)}
					<button onClick={() => setActiveTab('live_safety')} className={`py-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'live_safety' ? 'border-brand-400 text-white font-semibold' : 'border-transparent text-brand-300/60 hover:text-white'}`}>
						Live safety
					</button>
					<button onClick={() => setActiveTab('live_tracking')} className={`py-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'live_tracking' ? 'border-brand-400 text-white font-semibold' : 'border-transparent text-brand-300/60 hover:text-white'}`}>
						Live tracking
					</button>
					{(isSuperAdmin || allowedTabs.includes('employees')) && (<button onClick={() => setActiveTab('employees')} className={`py-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'employees' ? 'border-brand-400 text-white font-semibold' : 'border-transparent text-brand-300/60 hover:text-white'}`}>
							Employees
						</button>)}
					{(isSuperAdmin || allowedTabs.includes('task_allocation')) && (<button onClick={() => setActiveTab('task_allocation')} className={`py-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'task_allocation' ? 'border-brand-400 text-white font-semibold' : 'border-transparent text-brand-300/60 hover:text-white'}`}>
							Tasks
						</button>)}
					{(isSuperAdmin || allowedTabs.includes('messages')) && (<button onClick={() => setActiveTab('messages')} className={`py-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'messages' ? 'border-brand-400 text-white font-semibold' : 'border-transparent text-brand-300/60 hover:text-white'}`}>
							Messages
						</button>)}
				</div>
			</div>

			
			<div className={cn("flex-1 w-full relative z-10 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800", activeTab === 'messages' ? "h-[calc(100vh-128px)] flex flex-col overflow-hidden" : (activeTab === 'task_allocation' || activeTab === 'employees') ? "max-w-[98rem] mx-auto p-6 md:p-10 space-y-8 w-full" : "max-w-[90rem] mx-auto p-6 md:p-10 space-y-8")}>

				
				{activeTab === 'live_safety' && <AdminLiveSafetyPanel adminEmail={email}/>}
				{activeTab === 'live_tracking' && <AdminLiveTrackingPanel adminEmail={email}/>}
				{activeTab === 'alert_sender' && <AdminAlertSender />}
				{activeTab === 'shift_timings' && <AdminShiftTimingsPanel adminEmail={email}/>}
				{activeTab === 'late_checkins' && <AdminLateCheckinsPanel adminEmail={email}/>}
				{activeTab === 'payouts' && <AdminPayoutsPanel adminEmail={email}/>}

				{activeTab === 'add_remarks' && (<div className="bg-white border border-slate-200 p-6 space-y-6 rounded-xl shadow-xs max-w-4xl mx-auto">
						<div className="flex justify-between items-center border-b border-slate-100 pb-3">
							<div>
								<h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
									Add Employee Remarks & Dossier
								</h3>
								<p className="text-xs text-slate-500 mt-1">
									Register or update an employee with full remarks, conduct history, and performance score.
								</p>
							</div>
						</div>

						{remMessage && (<div className={cn("p-3 rounded-lg text-xs border font-sans", remMessage.type === 'success'
                    ? "bg-emerald-50 border-emerald-250 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800")}>
								{remMessage.text}
							</div>)}
						<form onSubmit={handleRemarksSubmit} className="space-y-6">
							
							<div className="border border-slate-200 bg-slate-50 p-4 space-y-3 rounded-lg">
								<div className="flex items-center justify-between">
									<span className="text-[10px] text-slate-700 uppercase font-bold tracking-wider font-sans">
										Select Existing Employee <span className="text-slate-500 normal-case font-normal">(optional — auto-fills fields below)</span>
									</span>
									{remSelectedEmployee && (<button type="button" onClick={() => {
                    setRemSelectedEmployee(null);
                    setRemEmpSearch('');
                    setRemPhotoUrl('');
                    setRemFirstName('');
                    setRemMiddleName('');
                    setRemLastName('');
                    setRemEmail('');
                    setRemPhone('');
                    setRemCompanyWorkedFor('');
                    setRemStatus('Active');
                    setRemRemarks('');
                    setRemOverallScore('');
                    setRemConduct('');
                    setRemWingName('');
                    setRemWingLeadName('');
                    setRemRole('Employee');
                    setRemGender('UNSPECIFIED');
                    setRemMonthWorked('');
                }} className="text-[10px] text-red-600 hover:text-red-700 font-semibold cursor-pointer transition-colors">
											✕ Clear selection
										</button>)}
								</div>

								{remSelectedEmployee ? (<div className="flex items-center gap-3 p-2.5 bg-brand-50 border border-brand-200 rounded-lg">
										{remSelectedEmployee.photoUrl && (<img src={remSelectedEmployee.photoUrl} alt="" className="size-8 rounded object-cover border border-slate-200 shrink-0"/>)}
										<div className="min-w-0">
											<p className="text-xs font-bold text-slate-800 truncate">{remSelectedEmployee.firstName} {remSelectedEmployee.lastName}</p>
											<p className="text-[10px] text-slate-500 truncate">{remSelectedEmployee.email} · ID: {remSelectedEmployee.id}</p>
										</div>
										<span className="ml-auto shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 uppercase tracking-wider">Update mode</span>
									</div>) : (<div className="relative">
										<Input placeholder="Search by name or email..." className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remEmpSearch} onChange={e => { setRemEmpSearch(e.target.value); setRemShowEmpDropdown(true); }} onFocus={() => setRemShowEmpDropdown(true)}/>
										{remShowEmpDropdown && remEmpSearch.trim().length > 0 && (() => {
                    const q = remEmpSearch.toLowerCase();
                    const matches = employeesList.filter((emp: any) => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
                        emp.email?.toLowerCase().includes(q) ||
                        emp.id?.toLowerCase().includes(q)).slice(0, 8);
                    if (matches.length === 0)
                        return null;
                    return (<div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl max-h-52 overflow-y-auto rounded-lg">
													{matches.map((emp: any) => (<button key={emp.id} type="button" onClick={() => {
                                setRemSelectedEmployee(emp);
                                setRemEmpSearch('');
                                setRemShowEmpDropdown(false);
                                setRemFirstName(emp.firstName || '');
                                setRemMiddleName(emp.middleName || '');
                                setRemLastName(emp.lastName || '');
                                setRemEmail(emp.email || '');
                                setRemPhone(emp.phone || '');
                                setRemPhotoUrl(emp.photoUrl || '');
                                setRemRole(emp.role || 'Employee');
                                setRemGender(emp.gender || 'UNSPECIFIED');
                                setRemWingName(emp.wingName || '');
                                setRemWingLeadName(emp.wingLeadName || '');
                                setRemCompanyWorkedFor(emp.companyWorkedFor || '');
                                setRemStatus(emp.employmentStatus || 'Active');
                                setRemRemarks(emp.remarks || '');
                                setRemOverallScore(emp.overallScore || '');
                                setRemConduct(emp.conduct || '');
                                setRemMonthWorked(emp.monthWorked || '');
                                try {
                                    if (emp.certifications) {
                                        setRemCertifications(JSON.parse(emp.certifications));
                                    }
                                    else {
                                        setRemCertifications([]);
                                    }
                                }
                                catch {
                                    setRemCertifications([]);
                                }
                            }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left transition-colors border-b border-slate-100 last:border-0 cursor-pointer">
															{emp.photoUrl
                                ? <img src={emp.photoUrl} alt="" className="size-7 rounded object-cover border border-slate-200 shrink-0"/>
                                : <div className="size-7 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{emp.firstName?.[0]}{emp.lastName?.[0]}</div>}
															<div className="min-w-0">
																<p className="text-xs font-semibold text-slate-800 truncate">{emp.firstName} {emp.lastName}</p>
																<p className="text-[10px] text-slate-500 truncate">{emp.email} · {emp.id}</p>
															</div>
														</button>))}
												</div>);
                })()}
									</div>)}
							</div>

							
							<div className="space-y-2">
								<label className="text-[10px] text-slate-500 uppercase font-medium">Employee Photo URL</label>
								<div className="flex gap-4 items-center">
									<Input placeholder="https://example.com/photo.jpg" className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9 flex-1" value={remPhotoUrl} onChange={e => setRemPhotoUrl(e.target.value)}/>
									{remPhotoUrl.trim() && (<div className="size-9 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
											<img src={remPhotoUrl} alt="Preview" className="size-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}/>
										</div>)}
								</div>
							</div>

							
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">First Name</label>
									<Input placeholder="First Name" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remFirstName} onChange={e => setRemFirstName(e.target.value)}/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Middle Name</label>
									<Input placeholder="Middle Name (Optional)" className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remMiddleName} onChange={e => setRemMiddleName(e.target.value)}/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Last Name</label>
									<Input placeholder="Last Name" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remLastName} onChange={e => setRemLastName(e.target.value)}/>
								</div>
							</div>

							
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Email ID</label>
									<Input type="email" placeholder="employee.email@company.com" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remEmail} onChange={e => setRemEmail(e.target.value)}/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Phone Number</label>
									<Input type="tel" placeholder="+1 (555) 000-0000" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remPhone} onChange={e => setRemPhone(e.target.value)}/>
								</div>
							</div>

							
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Company Worked For</label>
									<Input placeholder="e.g. Google / WrkSpace" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remCompanyWorkedFor} onChange={e => setRemCompanyWorkedFor(e.target.value)}/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Month(s) Worked For</label>
									<Input placeholder="e.g. October 2026, or 12 Months" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remMonthWorked} onChange={e => setRemMonthWorked(e.target.value)}/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Status</label>
									<select className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-lg h-9 px-2 focus:outline-none focus:border-brand-500" value={remStatus} onChange={e => setRemStatus(e.target.value)}>
										<option value="Active">Active</option>
										<option value="Terminated">Terminated</option>
										<option value="Inactive">Inactive</option>
									</select>
								</div>
							</div>

							
							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div className="space-y-1 col-span-2">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Wing Name</label>
									<Input placeholder="Engineering / Sales" className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remWingName} onChange={e => setRemWingName(e.target.value)}/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Role</label>
									<Input placeholder="Engineer" className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remRole} onChange={e => setRemRole(e.target.value)}/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Gender</label>
									<select className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-lg h-9 px-2 focus:outline-none focus:border-brand-500" value={remGender} onChange={e => setRemGender(e.target.value)}>
										<option value="UNSPECIFIED">Not set</option>
										<option value="FEMALE">Female</option>
										<option value="MALE">Male</option>
									</select>
								</div>
							</div>

							
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Overall Score</label>
									<Input placeholder="e.g. 9.5/10, A+, Excellent" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remOverallScore} onChange={e => setRemOverallScore(e.target.value)}/>
								</div>
								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Conduct Assessment</label>
									<Input placeholder="e.g. Exemplary, Punctual, Good team player" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9" value={remConduct} onChange={e => setRemConduct(e.target.value)}/>
								</div>
							</div>

							
							<div className="space-y-1">
								<label className="text-[10px] text-slate-500 uppercase font-medium">Remarks</label>
								<textarea placeholder="Provide complete remarks about the employee..." required rows={4} className="w-full bg-white border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-brand-500 placeholder:text-slate-400" value={remRemarks} onChange={e => setRemRemarks(e.target.value)}/>
							</div>

							
							<div className="border border-slate-200 p-4 space-y-3 bg-slate-50 rounded-lg">
								<div>
									<span className="text-[10px] text-slate-750 uppercase font-bold tracking-wider block font-sans">Assign a Badge <span className="text-slate-500 normal-case font-normal">(optional)</span></span>
									<p className="text-[10px] text-slate-500 mt-0.5">Select one to automatically publish it to this employee when the record is created.</p>
								</div>

								{(() => {
                const PRESET_BADGES = [
                    { title: 'New Joinee', icon: 'Star', color: 'blue', emoji: '🌟', image: 'https://ik.imagekit.io/dypkhqxip/e59cb781-ca16-4699-bf99-c5f16fd55383.svg' },
                    { title: 'Employee Completion', icon: 'Award', color: 'green', emoji: '🎓', image: 'https://ik.imagekit.io/dypkhqxip/14b964b5-5848-4a81-bf4d-fb5e2a6f423c.svg' },
                    { title: 'Employee Badge', icon: 'Shield', color: 'orange', emoji: '🏷️', image: 'https://ik.imagekit.io/dypkhqxip/9fc652bf-a285-41c7-bed2-7d44d2ed1d7d.svg' },
                    { title: 'Super Worker', icon: 'Trophy', color: 'yellow', emoji: '🏆', image: 'https://ik.imagekit.io/dypkhqxip/a40ea919-c9e6-4b41-973c-ee0205dbe244.svg' },
                    { title: 'Slashing Dev', icon: 'Zap', color: 'purple', emoji: '⚡', image: 'https://ik.imagekit.io/dypkhqxip/c250a00f-8bd7-43e9-81b5-9d10618e8446.svg' },
                    { title: 'Core Dev', icon: 'Shield', color: 'green', emoji: '🛡️' },
                    { title: 'Pro Marketer', icon: 'Flame', color: 'orange', emoji: '🔥' },
                ];
                return (<div className="grid grid-cols-3 gap-2">
											{PRESET_BADGES.map((badge) => {
                        const isSelected = remBadgeTitle === badge.title;
                        const ringColor = badge.color === 'blue' ? 'ring-blue-500/70 bg-blue-50 border-blue-300' :
                            badge.color === 'yellow' ? 'ring-yellow-500/70 bg-yellow-50 border-yellow-300' :
                                badge.color === 'purple' ? 'ring-purple-500/70 bg-purple-50 border-purple-300' :
                                    badge.color === 'green' ? 'ring-emerald-500/70 bg-emerald-50 border-emerald-300' :
                                        badge.color === 'orange' ? 'ring-amber-500/70 bg-amber-50 border-amber-300' :
                                            'ring-rose-500/70 bg-rose-50 border-rose-300';
                        const textColor = badge.color === 'blue' ? 'text-blue-700' :
                            badge.color === 'yellow' ? 'text-yellow-700' :
                                badge.color === 'purple' ? 'text-purple-700' :
                                    badge.color === 'green' ? 'text-emerald-700' :
                                        badge.color === 'orange' ? 'text-amber-700' :
                                            'text-rose-700';
                        return (<button key={badge.title} type="button" onClick={() => {
                                if (remBadgeTitle === badge.title) {
                                    setRemBadgeTitle('');
                                    setRemBadgeIcon('Award');
                                    setRemBadgeColor('blue');
                                }
                                else {
                                    setRemBadgeTitle(badge.title);
                                    setRemBadgeIcon(badge.icon);
                                    setRemBadgeColor(badge.color);
                                }
                            }} className={cn("flex flex-col items-center gap-1.5 p-2 rounded-lg border text-center cursor-pointer transition-all duration-150", isSelected ? `ring-2 ${ringColor}` : 'bg-white border-slate-200 hover:border-slate-400')}>
														<span className="text-xl leading-none flex items-center justify-center h-8">
															{badge.image ? (<img src={badge.image} alt={badge.title} className="w-8 h-8 object-contain"/>) : (badge.emoji)}
														</span>
														<span className={cn("text-[10px] font-bold leading-tight", isSelected ? textColor : 'text-slate-500')}>
															{badge.title}
														</span>
													</button>);
                    })}
										</div>);
            })()}

								{remBadgeTitle && (<div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg">
										<span className="text-[10px] text-slate-600">Badge selected: <strong className="text-slate-800">{remBadgeTitle}</strong></span>
										<button type="button" onClick={() => setRemBadgeTitle('')} className="text-[10px] text-slate-500 hover:text-red-650 cursor-pointer transition-colors font-medium">✕ Clear</button>
									</div>)}
							</div>

							
							<div className="border border-slate-200 p-4 space-y-3 bg-slate-50 rounded-lg">
								<div className="flex items-center justify-between">
									<div>
										<span className="text-[10px] text-slate-750 uppercase font-bold tracking-wider block font-sans">Certifications <span className="text-slate-500 normal-case font-normal">(optional)</span></span>
										<p className="text-[10px] text-slate-500 mt-0.5">Add certificate links (e.g. completion, achievement, course certificates).</p>
									</div>
									<button type="button" onClick={() => setRemCertifications(prev => [...prev, { title: '', url: '' }])} className="text-[10px] font-bold text-brand-600 hover:text-brand-700 border border-brand-200 bg-brand-50 px-2.5 py-1 rounded-lg cursor-pointer transition-colors">
										+ Add Certificate
									</button>
								</div>

								{remCertifications.length === 0 ? (<p className="text-[10px] text-slate-500 italic">No certifications added yet.</p>) : (<div className="space-y-2">
										{remCertifications.map((cert, i) => (<div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
												<Input placeholder="Certificate title" className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-8" value={cert.title} onChange={e => {
                        const updated = [...remCertifications];
                        updated[i] = { ...updated[i], title: e.target.value };
                        setRemCertifications(updated);
                    }}/>
												<Input placeholder="https://certificate-link.com/..." className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-8" value={cert.url} onChange={e => {
                        const updated = [...remCertifications];
                        updated[i] = { ...updated[i], url: e.target.value };
                        setRemCertifications(updated);
                    }}/>
												<button type="button" onClick={() => setRemCertifications(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-500 transition-colors cursor-pointer text-xs px-1">
													✕
												</button>
											</div>))}
									</div>)}
							</div>

							<Button type="submit" disabled={remBusy} className="bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-50 text-white text-xs font-semibold py-2 px-4 rounded-lg h-10 w-full cursor-pointer transition-all duration-200 shadow-sm active:scale-[0.98]">
								{remBusy
                ? (remSelectedEmployee ? 'Updating...' : 'Saving Remarks...')
                : remSelectedEmployee
                    ? `Update Employee Record${remBadgeTitle ? ` · Publish "${remBadgeTitle}"` : ''}`
                    : `Save Remarks & Create Record${remBadgeTitle ? ` · Publish "${remBadgeTitle}"` : ''}`}
							</Button>
						</form>
					</div>)}

				
				{activeTab === 'overview' && (<div className="space-y-6">
						
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
							<div className="bg-white border-transparent p-5 space-y-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[10px] font-bold uppercase tracking-wider">Employees</span>
									<UsersIcon className="size-4.5 text-brand-500"/>
								</div>
								<p className="text-2xl font-bold text-slate-800">{employeesList.length}</p>
								<p className="text-[10px] text-slate-400">Active members</p>
							</div>

							<div className="bg-white border-transparent p-5 space-y-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[10px] font-bold uppercase tracking-wider">Allocated Tasks</span>
									<FileTextIcon className="size-4.5 text-emerald-500"/>
								</div>
								<p className="text-2xl font-bold text-slate-800">{tasksList.length}</p>
								<p className="text-[10px] text-slate-400 font-medium text-emerald-600">
									{tasksList.filter(t => t.status === 'Pending').length} Pending
								</p>
							</div>

							<div className="bg-white border-transparent p-5 space-y-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[10px] font-bold uppercase tracking-wider">Attendance Registry</span>
									<ClockIcon className="size-4.5 text-amber-500"/>
								</div>
								<p className="text-2xl font-bold text-slate-800">{attendanceList.length}</p>
								<p className="text-[10px] text-slate-400">Total logged entries</p>
							</div>

							<div className="bg-white border-transparent p-5 space-y-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[10px] font-bold uppercase tracking-wider">Pending Leaves</span>
									<CalendarIcon className="size-4.5 text-red-500"/>
								</div>
								<p className="text-2xl font-bold text-slate-800">
									{leavesList.filter(l => l.status === 'Pending').length}
								</p>
								<p className="text-[10px] text-slate-400">Out of {leavesList.length} total</p>
							</div>

							<div className="bg-white border-transparent p-5 space-y-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[10px] font-bold uppercase tracking-wider">Work Submissions</span>
									<CheckCircleIcon className="size-4.5 text-brand-500"/>
								</div>
								<p className="text-2xl font-bold text-slate-800">{submissionsList.length}</p>
								<p className="text-[10px] text-slate-400 font-medium text-brand-600">
									{submissionsList.filter(s => s.status === 'Submitted').length} Pending Review
								</p>
							</div>

							<div className="bg-white border-transparent p-5 space-y-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[10px] font-bold uppercase tracking-wider">Events</span>
									<MapPinIcon className="size-4.5 text-yellow-500"/>
								</div>
								<p className="text-2xl font-bold text-slate-800">{eventsList.length}</p>
								<p className="text-[10px] text-slate-400">Total planned events</p>
							</div>

							<div className="bg-white border-transparent p-5 space-y-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[10px] font-bold uppercase tracking-wider">Server Status</span>
									<ServerIcon className="size-4.5 text-emerald-500 animate-pulse"/>
								</div>
								<p className="text-2xl font-bold text-slate-800">{stats.serverStatus}</p>
								<p className="text-[10px] text-emerald-600 font-semibold">Uptime: {stats.uptime}</p>
							</div>
						</div>

						
						<div className="space-y-4 mt-8 pt-4 border-t border-slate-100">
							<div>
								<h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
									Management Portal Directory
								</h3>
								<p className="text-xs text-slate-500 mt-1 font-sans">
									Quick access to all background tools, system logs, shift registries, and administrative settings.
								</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								<a href="/employee-verification" target="_blank" rel="noreferrer" className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
									<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
										<CheckCircleIcon className="size-5 text-[#E61E32]"/>
									</div>
									<div className="min-w-0">
										<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors flex items-center gap-1">
											Onboarding Verification <span className="text-[9px] lowercase font-normal text-slate-400 shrink-0">↗</span>
										</h4>
										<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
											Review candidate credential registrations, background checks, and verification.
										</p>
									</div>
								</a>

								{(isSuperAdmin || allowedTabs.includes('add_remarks')) && (<div onClick={() => setActiveTab('add_remarks')} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<FileTextIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Remarks & Dossier
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Record employee performance scores, conduct assessments, and dossier remarks.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('attendance')) && (<div onClick={() => {
                    setActiveTab('attendance');
                    fetchAttendance();
                }} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<ClockIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Attendance Logs
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Track clock-in/out timestamps, geofence validations, and active daily entries.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('shift_timings')) && (<div onClick={() => setActiveTab('shift_timings')} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<HistoryIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Shift & Hours Config
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Define corporate shift hours, grace period buffers, and attendance policies.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('late_checkins')) && (<div onClick={() => setActiveTab('late_checkins')} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<AlertCircleIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Late check-ins
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Audit excuse explanations and approve/decline late check-in requests.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('payouts')) && (<div onClick={() => setActiveTab('payouts')} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<LineChartIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Payouts & Salaries
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Verify and process salary disbursements and keep track of payment receipts.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('offices')) && (<div onClick={() => setActiveTab('offices')} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<MapPinIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Offices & Geofencing
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Manage physical branch locations, coordinates, and check-in QR codes.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('leaves')) && (<div onClick={() => {
                    setActiveTab('leaves');
                    fetchLeaves();
                }} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<CalendarIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Leave Applications
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Review employee sick, paid, and casual leave rosters to approve time-off requests.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('alert_sender')) && (<div onClick={() => setActiveTab('alert_sender')} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<SendIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Emergency Alert Sender
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Draft and dispatch urgent broadcast alerts, system emails, and mobile notifications.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('system_status')) && (<div onClick={() => setActiveTab('system_status')} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<ServerIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Server Health & Redis
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Check redis memory stats, server uptime counters, and background worker queues.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('events')) && (<div onClick={() => {
                    setActiveTab('events');
                    fetchEvents();
                }} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<PlusIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Events Calendar
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Schedule organization-wide tech talks, hackathons, and training webinars.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('work_submissions')) && (<div onClick={() => {
                    setActiveTab('work_submissions');
                    fetchSubmissions();
                }} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<CheckCircleIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Work Submissions
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Assess project deliverables, code repositories, and work logs submitted by developers.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('form')) && (<div onClick={() => {
                    setActiveTab('form');
                    fetchFeedbackSubmissions();
                }} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<FileTextIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Feedback & Forms
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												View anonymous feedback, employee surveys, suggestions, and form settings.
											</p>
										</div>
									</div>)}

								{isSuperAdmin && (<div onClick={() => {
                    setActiveTab('super_admin');
                    fetchAdmins();
                }} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<UserCheckIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												System Admins Panel
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Register additional admin users, set workspace permissions, and audit activity.
											</p>
										</div>
									</div>)}

								{(isSuperAdmin || allowedTabs.includes('team_leads')) && (<div onClick={() => {
                    setActiveTab('team_leads');
                    fetchTeamLeads();
                }} className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start group">
										<div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 group-hover:scale-105 transition-transform shrink-0">
											<UserPlusIcon className="size-5 text-[#E61E32]"/>
										</div>
										<div className="min-w-0">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-[#E61E32] transition-colors">
												Team Leads Registry
											</h4>
											<p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
												Assign wing managers, define lead roles, and audit wing report statuses.
											</p>
										</div>
									</div>)}
							</div>
						</div>
					</div>)}

				
				{activeTab === 'leaves' && (() => {
            const filteredLeaves = leavesList.filter((leave: any) => {
                const q = leavesSearchQuery.toLowerCase().trim();
                const matchesSearch = !q ||
                    (leave.employeeName || '').toLowerCase().includes(q) ||
                    (leave.employeeId || '').toLowerCase().includes(q) ||
                    (leave.type || '').toLowerCase().includes(q) ||
                    (leave.reason || '').toLowerCase().includes(q) ||
                    (leave.status || '').toLowerCase().includes(q);
                const matchesStatus = leavesFilter === 'All' || leave.status === leavesFilter;
                return matchesSearch && matchesStatus;
            });
            const pendingLeaves = leavesList.filter(l => l.status === 'Pending').length;
            const approvedLeaves = leavesList.filter(l => l.status === 'Approved').length;
            const cancelledLeaves = leavesList.filter(l => l.status === 'Cancelled' || l.status === 'Ignored').length;
            return (<div className="space-y-6">
							
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<div>
									<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Leave Applications</h2>
									<p className="text-xs text-slate-500 mt-0.5">
										Review employee sick, paid, and casual leave rosters to approve time-off requests
									</p>
								</div>
								<div className="flex items-center gap-2 flex-wrap">
									<div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
										{(['All', 'Pending', 'Approved', 'Cancelled', 'Ignored'] as const).map(st => (<button key={st} onClick={() => setLeavesFilter(st)} className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer", leavesFilter === st
                        ? "bg-[#E61E32] text-white font-semibold shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/80")}>
												{st} {st === 'Pending' && pendingLeaves > 0 ? `(${pendingLeaves})` : ''}
											</button>))}
									</div>
									<button onClick={() => setShowAddManualLeave(!showAddManualLeave)} className="inline-flex items-center gap-1.5 bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs">
										{showAddManualLeave ? 'Cancel Log' : '+ Log Leave'}
									</button>
									<button onClick={fetchLeaves} className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all rounded-xl cursor-pointer shadow-2xs" title="Refresh Leaves">
										<RefreshCwIcon className="size-4"/>
									</button>
								</div>
							</div>

							
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
								<div className="border border-slate-200/90 bg-slate-50 p-4 rounded-2xl shadow-2xs space-y-1">
									<p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Requests</p>
									<p className="text-2xl font-semibold text-slate-900">{leavesList.length}</p>
									<p className="text-[10px] text-slate-400 font-normal">All submitted rosters</p>
								</div>
								<div className="border border-amber-200 bg-amber-50/70 p-4 rounded-2xl shadow-2xs space-y-1">
									<p className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Pending Review</p>
									<p className="text-2xl font-semibold text-amber-700">{pendingLeaves}</p>
									<p className="text-[10px] text-amber-600 font-normal">Action needed</p>
								</div>
								<div className="border border-emerald-200 bg-emerald-50/70 p-4 rounded-2xl shadow-2xs space-y-1">
									<p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Approved Leaves</p>
									<p className="text-2xl font-semibold text-emerald-700">{approvedLeaves}</p>
									<p className="text-[10px] text-emerald-600 font-normal">Authorized time-off</p>
								</div>
								<div className="border border-rose-200 bg-rose-50/70 p-4 rounded-2xl shadow-2xs space-y-1">
									<p className="text-[11px] font-medium text-rose-700 uppercase tracking-wider">Cancelled / Ignored</p>
									<p className="text-2xl font-semibold text-rose-700">{cancelledLeaves}</p>
									<p className="text-[10px] text-rose-600 font-normal">Declined or closed</p>
								</div>
							</div>

							
							{showAddManualLeave && (<form onSubmit={async (e) => {
                        e.preventDefault();
                        const target = e.currentTarget;
                        const empId = target.employeeId.value;
                        const emp = employeesList.find(x => x.id === empId);
                        if (!emp)
                            return alert('Please select a valid employee.');
                        await handleAddManualLeave({
                            employeeId: emp.id,
                            employeeName: `${emp.firstName} ${emp.lastName}`,
                            startDate: target.startDate.value,
                            endDate: target.endDate.value,
                            type: target.type.value,
                            reason: target.reason.value,
                            status: target.status.value,
                        });
                    }} className="bg-white border border-slate-200/90 p-6 space-y-4 rounded-2xl shadow-xs">
									<div className="flex items-center justify-between pb-3 border-b border-slate-100">
										<div>
											<h4 className="text-sm font-semibold text-slate-900">Log Leave Request Manually</h4>
											<p className="text-xs text-slate-500 mt-0.5">Register an offline or pre-approved leave roster for an employee</p>
										</div>
										<button type="button" onClick={() => setShowAddManualLeave(false)} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
											Close
										</button>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div className="space-y-1">
											<label className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">Select Employee</label>
											<select name="employeeId" required className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl h-10 px-3 outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors">
												<option value="">-- Choose Employee --</option>
												{employeesList.map(e => (<option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.id})</option>))}
											</select>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">Leave Type</label>
											<select name="type" required className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl h-10 px-3 outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors">
												<option value="Sick Leave">Sick Leave</option>
												<option value="Casual Leave">Casual Leave</option>
												<option value="Paid Leave">Paid Leave</option>
												<option value="Unpaid Leave">Unpaid Leave</option>
											</select>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">Status</label>
											<select name="status" required className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl h-10 px-3 outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors">
												<option value="Approved">Approved</option>
												<option value="Pending">Pending</option>
												<option value="Cancelled">Cancelled</option>
											</select>
										</div>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-1">
											<label className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">Start Date</label>
											<Input type="date" name="startDate" required className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20 focus-visible:border-[#E61E32]/40"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">End Date</label>
											<Input type="date" name="endDate" required className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20 focus-visible:border-[#E61E32]/40"/>
										</div>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">Reason Statement</label>
										<textarea name="reason" required rows={2} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 placeholder:text-slate-400 resize-none font-normal" placeholder="Provide complete reason details..."></textarea>
									</div>
									<div className="flex items-center gap-2 pt-2">
										<Button type="submit" className="bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer shadow-xs">
											Save Leave Log
										</Button>
										<button type="button" onClick={() => setShowAddManualLeave(false)} className="text-xs text-slate-500 hover:text-slate-700 font-medium px-4 py-2 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors">
											Cancel
										</button>
									</div>
								</form>)}

							
							<div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
								<div className="relative flex-1 max-w-md">
									<SearchIcon className="absolute left-3 top-2.5 size-4 text-slate-400"/>
									<input type="text" placeholder="Search by employee name, ID, leave type, or reason..." value={leavesSearchQuery} onChange={e => setLeavesSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors"/>
								</div>
								<span className="text-xs text-slate-400 font-medium mr-2">
									{filteredLeaves.length} application{filteredLeaves.length !== 1 ? 's' : ''} found
								</span>
							</div>

							
							{filteredLeaves.length === 0 ? (<div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
									<div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
										<CalendarIcon className="size-6"/>
									</div>
									<h3 className="text-sm font-semibold text-slate-800">No Leave Applications Found</h3>
									<p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
										{leavesSearchQuery || leavesFilter !== 'All'
                        ? 'No records match your search filter criteria.'
                        : 'No employee leave requests have been logged in the system.'}
									</p>
								</div>) : (<div className="space-y-3.5">
									{filteredLeaves.map((leave: any) => {
                        const isPending = leave.status === 'Pending';
                        const isApproved = leave.status === 'Approved';
                        const isCancelled = leave.status === 'Cancelled';
                        const isIgnored = leave.status === 'Ignored';
                        const startDate = new Date(leave.startDate);
                        const endDate = new Date(leave.endDate);
                        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        return (<div key={leave.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-3.5">
												
												<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
													<div className="space-y-2 min-w-0">
														<div className="flex items-center gap-2 flex-wrap">
															<span className="font-semibold text-slate-900 text-sm">{leave.employeeName}</span>
															<span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
																{leave.employeeId}
															</span>
															<span className={cn("text-[11px] font-medium px-2.5 py-0.5 rounded-lg border", leave.type === 'Sick Leave' && "bg-rose-50 text-rose-700 border-rose-200", leave.type === 'Casual Leave' && "bg-blue-50 text-blue-700 border-blue-200", leave.type === 'Paid Leave' && "bg-emerald-50 text-emerald-700 border-emerald-200", leave.type === 'Unpaid Leave' && "bg-amber-50 text-amber-700 border-amber-200", !['Sick Leave', 'Casual Leave', 'Paid Leave', 'Unpaid Leave'].includes(leave.type) && "bg-slate-100 text-slate-700 border-slate-200")}>
																{leave.type}
															</span>
														</div>

														<div className="flex items-center flex-wrap gap-2 text-xs text-slate-500">
															<span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 font-medium text-slate-700">
																<CalendarIcon className="size-3 text-slate-400"/>
																{startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to {endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
															</span>
															<span className="font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/60 text-[11px]">
																{diffDays} Day{diffDays !== 1 ? 's' : ''} Duration
															</span>
														</div>
													</div>

													
													<div className="shrink-0">
														<span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full border shadow-2xs tracking-wide uppercase", isPending && "bg-amber-50 text-amber-800 border-amber-300", isApproved && "bg-emerald-50 text-emerald-800 border-emerald-300", isCancelled && "bg-rose-50 text-rose-800 border-rose-300", isIgnored && "bg-slate-100 text-slate-700 border-slate-300")}>
															<span className={cn("size-2 rounded-full", isPending ? "bg-amber-500" : isApproved ? "bg-emerald-500" : isCancelled ? "bg-rose-500" : "bg-slate-400")}/>
															{leave.status}
														</span>
													</div>
												</div>

												
												<div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
													<span className="font-semibold text-slate-800 block mb-1">Reason for Leave:</span>
													{leave.reason || <span className="italic text-slate-400">No reason statement provided.</span>}
												</div>

												
												<div className="pt-2 flex items-center justify-between border-t border-slate-100 flex-wrap gap-2">
													{isPending ? (<div className="flex items-center gap-2 flex-wrap">
															<button onClick={async () => {
                                    try {
                                        await updateLeaveStatus(leave.id, 'Approved');
                                        fetchLeaves();
                                    }
                                    catch (err) {
                                        console.error("Failed to approve leave", err);
                                    }
                                }} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs" style={{ backgroundColor: '#059669', color: '#ffffff' }}>
																<CheckIcon className="size-3.5 text-white"/> Approve Leave
															</button>
															<button onClick={async () => {
                                    try {
                                        await updateLeaveStatus(leave.id, 'Cancelled');
                                        fetchLeaves();
                                    }
                                    catch (err) {
                                        console.error("Failed to cancel leave", err);
                                    }
                                }} className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs" style={{ backgroundColor: '#e11d48', color: '#ffffff' }}>
																<XIcon className="size-3.5 text-white"/> Decline / Cancel
															</button>
															<button onClick={async () => {
                                    try {
                                        await updateLeaveStatus(leave.id, 'Ignored');
                                        fetchLeaves();
                                    }
                                    catch (err) {
                                        console.error("Failed to ignore leave", err);
                                    }
                                }} className="text-xs text-slate-600 hover:text-slate-800 font-medium px-3 py-2 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors">
																<EyeIcon className="size-3.5 inline mr-1 text-slate-400"/> Ignore
															</button>
														</div>) : (<span className="text-xs text-slate-400 italic">
															Application processed ({leave.status})
														</span>)}

													<button onClick={() => handleDeleteLeave(leave.id)} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-all shadow-2xs ml-auto" style={{ backgroundColor: '#dc2626', color: '#ffffff' }} title="Delete Leave Request">
														<Trash2Icon className="size-3.5 text-white"/> Delete
													</button>
												</div>
											</div>);
                    })}
								</div>)}
						</div>);
        })()}

				{activeTab === 'offices' && <OfficesPanel />}

				
				{activeTab === 'attendance' && (() => {
            const { presentList, absentList, onLeaveList } = getTodayAttendanceSummary();
            const filteredAttendance = attendanceList.filter((log: any) => {
                const q = attendanceSearchQuery.toLowerCase().trim();
                const matchesSearch = !q ||
                    (log.employeeName || '').toLowerCase().includes(q) ||
                    (log.employeeId || '').toLowerCase().includes(q) ||
                    (log.date || '').toLowerCase().includes(q) ||
                    (log.status || '').toLowerCase().includes(q);
                const matchesStatus = attendanceStatusFilter === 'All' || log.status === attendanceStatusFilter;
                return matchesSearch && matchesStatus;
            });
            return (<div className="space-y-6">
							
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<div>
									<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Employee Attendance Logs</h2>
									<p className="text-xs text-slate-500 mt-0.5">Monitor daily presence, clock-ins, leave status, and attendance records</p>
								</div>
								<div className="flex items-center gap-2 flex-wrap">
									<div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
										<button onClick={() => {
                    setShowTodayAttendanceSummary(false);
                    if (showAddManualAttendance)
                        setShowAddManualAttendance(false);
                }} className={cn("text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer", !showTodayAttendanceSummary
                    ? "bg-[#E61E32] text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80")}>
											All Logs ({attendanceList.length})
										</button>
										<button onClick={() => {
                    setShowTodayAttendanceSummary(true);
                    if (showAddManualAttendance)
                        setShowAddManualAttendance(false);
                }} className={cn("text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer", showTodayAttendanceSummary
                    ? "bg-[#E61E32] text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80")}>
											Today's Summary
										</button>
									</div>
									<button onClick={() => {
                    setShowAddManualAttendance(!showAddManualAttendance);
                }} className="inline-flex items-center gap-1.5 bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs">
										{showAddManualAttendance ? 'Cancel Log' : '+ Log Attendance'}
									</button>
									<button onClick={fetchAttendance} className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all rounded-xl cursor-pointer shadow-2xs" title="Refresh Logs">
										<RefreshCwIcon className="size-4"/>
									</button>
								</div>
							</div>

							
							{showAddManualAttendance && (<form onSubmit={async (e) => {
                        e.preventDefault();
                        const target = e.currentTarget;
                        const empId = target.employeeId.value;
                        const emp = employeesList.find(x => x.id === empId);
                        if (!emp)
                            return alert('Please select a valid employee.');
                        await handleAddManualAttendance({
                            employeeId: emp.id,
                            employeeName: `${emp.firstName} ${emp.lastName}`,
                            date: target.date.value,
                            checkIn: target.checkIn.value,
                            checkOut: target.checkOut.value || undefined,
                            status: target.status.value,
                        });
                    }} className="bg-white border border-slate-200/90 p-6 space-y-4 rounded-2xl shadow-xs">
									<div className="flex items-center justify-between pb-3 border-b border-slate-100">
										<div>
											<h4 className="text-sm font-semibold text-slate-900">Log Attendance Manually</h4>
											<p className="text-xs text-slate-500 mt-0.5">Record an offline or override attendance entry for an employee</p>
										</div>
										<button type="button" onClick={() => setShowAddManualAttendance(false)} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
											Close
										</button>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div className="space-y-1">
											<label className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">Select Employee</label>
											<select name="employeeId" required className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl h-10 px-3 outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors">
												<option value="">-- Choose Employee --</option>
												{employeesList.map(e => (<option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.id})</option>))}
											</select>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">Date</label>
											<Input type="text" name="date" required defaultValue={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })} placeholder="YYYY-MM-DD" className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20 focus-visible:border-[#E61E32]/40"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">Status</label>
											<select name="status" required className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl h-10 px-3 outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors">
												<option value="Present">Present</option>
												<option value="Checked In">Checked In</option>
											</select>
										</div>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-1">
											<label className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">Check-In Time</label>
											<Input type="text" name="checkIn" defaultValue="09:30 AM" placeholder="e.g. 09:30 AM" required className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20 focus-visible:border-[#E61E32]/40"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">Check-Out Time (Optional)</label>
											<Input type="text" name="checkOut" placeholder="e.g. 07:00 PM" className="bg-slate-50 border-slate-200 text-slate-800 text-xs rounded-xl h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20 focus-visible:border-[#E61E32]/40"/>
										</div>
									</div>
									<div className="flex items-center gap-2 pt-2">
										<Button type="submit" className="bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer shadow-xs">
											Save Attendance Log
										</Button>
										<button type="button" onClick={() => setShowAddManualAttendance(false)} className="text-xs text-slate-500 hover:text-slate-700 font-medium px-4 py-2 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors">
											Cancel
										</button>
									</div>
								</form>)}

							{showTodayAttendanceSummary ? (<div className="space-y-6">
									
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
										<div className="border border-emerald-200 bg-emerald-50/70 p-5 space-y-1 rounded-2xl shadow-2xs">
											<p className="text-[11px] uppercase tracking-wider text-emerald-700 font-medium">Present Today</p>
											<p className="text-3xl font-bold text-emerald-700">{presentList.length}</p>
											<p className="text-[10px] text-emerald-600 font-normal">Clocked in today</p>
										</div>
										<div className="border border-rose-200 bg-rose-50/70 p-5 space-y-1 rounded-2xl shadow-2xs">
											<p className="text-[11px] uppercase tracking-wider text-rose-700 font-medium">Absent Today</p>
											<p className="text-3xl font-bold text-rose-700">{absentList.length}</p>
											<p className="text-[10px] text-rose-600 font-normal">Not checked in</p>
										</div>
										<div className="border border-amber-200 bg-amber-50/70 p-5 space-y-1 rounded-2xl shadow-2xs">
											<p className="text-[11px] uppercase tracking-wider text-amber-700 font-medium">On Leave Today</p>
											<p className="text-3xl font-bold text-amber-700">{onLeaveList.length}</p>
											<p className="text-[10px] text-amber-600 font-normal">Approved leaves</p>
										</div>
									</div>

									
									<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
										
										<div className="border border-slate-200/90 bg-white p-5 space-y-4 rounded-2xl shadow-2xs">
											<div className="flex justify-between items-center pb-3 border-b border-slate-100">
												<h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
													Present Employees
												</h4>
												<span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] rounded-full font-semibold">{presentList.length}</span>
											</div>
											{presentList.length === 0 ? (<p className="text-slate-400 text-xs italic py-4 text-center">No one has clocked in today.</p>) : (<div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
													{presentList.map(({ employee, log }) => (<div key={employee.id} className="p-3.5 border border-slate-200/80 bg-slate-50/60 rounded-xl space-y-2 hover:border-slate-300 transition-colors">
															<div className="flex justify-between items-start">
																<span className="text-slate-900 text-xs font-semibold">{employee.firstName} {employee.lastName}</span>
																<span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{employee.id}</span>
															</div>
															<p className="text-[11px] text-slate-500 font-medium">{employee.wingName || 'General'} · {employee.role}</p>
															<div className="flex items-center gap-3 pt-2 text-[11px] text-slate-600 border-t border-slate-200/60">
																<div>In: <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">{log.checkIn}</span></div>
																<div>Out: <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">{log.checkOut || '--'}</span></div>
															</div>
														</div>))}
												</div>)}
										</div>

										
										<div className="border border-slate-200/90 bg-white p-5 space-y-4 rounded-2xl shadow-2xs">
											<div className="flex justify-between items-center pb-3 border-b border-slate-100">
												<div className="space-y-0.5">
													<h4 className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
														Absent Employees
													</h4>
													<button onClick={async () => {
                                if (confirm('Are you sure you want to mark all currently unchecked-in employees as Absent for today?')) {
                                    const res = await allocateAbsentEmployeesForToday();
                                    if (res.success) {
                                        alert(`Successfully allocated ${res.count} employees as Absent today.`);
                                        fetchAttendance();
                                    } else {
                                        alert(`Error: ${res.error}`);
                                    }
                                }
                            }} className="text-[10px] text-slate-500 hover:text-rose-600 transition-colors cursor-pointer block text-left">
														Sync Daily Absentees
													</button>
												</div>
												<span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 text-[11px] rounded-full font-semibold">{absentList.length}</span>
											</div>
											{absentList.length === 0 ? (<p className="text-slate-400 text-xs italic py-4 text-center">Everyone is accounted for today!</p>) : (<div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
													{absentList.map((employee: any) => (<div key={employee.id} className="p-3.5 border border-slate-200/80 bg-slate-50/60 rounded-xl space-y-1.5 hover:border-slate-300 transition-colors">
															<div className="flex justify-between items-start">
																<span className="text-slate-900 text-xs font-semibold">{employee.firstName} {employee.lastName}</span>
																<span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{employee.id}</span>
															</div>
															<p className="text-[11px] text-slate-500 font-medium">{employee.wingName || 'General'} · {employee.role}</p>
															{employee.phone && (<p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">Phone: <span className="font-mono text-slate-700">{employee.phone}</span></p>)}
														</div>))}
												</div>)}
										</div>

										
										<div className="border border-slate-200/90 bg-white p-5 space-y-4 rounded-2xl shadow-2xs">
											<div className="flex justify-between items-center pb-3 border-b border-slate-100">
												<h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
													On Approved Leave
												</h4>
												<span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-[11px] rounded-full font-semibold">{onLeaveList.length}</span>
											</div>
											{onLeaveList.length === 0 ? (<p className="text-slate-400 text-xs italic py-4 text-center">No approved leaves for today.</p>) : (<div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
													{onLeaveList.map(({ employee, leave }) => (<div key={employee.id} className="p-3.5 border border-slate-200/80 bg-slate-50/60 rounded-xl space-y-1.5 hover:border-slate-300 transition-colors">
															<div className="flex justify-between items-start">
																<span className="text-slate-900 text-xs font-semibold">{employee.firstName} {employee.lastName}</span>
																<span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{employee.id}</span>
															</div>
															<p className="text-[11px] text-slate-500 font-medium">{employee.wingName || 'General'} · {employee.role}</p>
															<div className="pt-2 border-t border-slate-200/60 space-y-1">
																<span className="inline-block text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
																	{leave.type} Leave
																</span>
																{leave.reason && (<p className="text-[11px] text-slate-600 italic">"{leave.reason}"</p>)}
															</div>
														</div>))}
												</div>)}
										</div>
									</div>
								</div>) : (<div className="space-y-3.5">
									
									<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
										<div className="relative flex-1 max-w-md">
											<SearchIcon className="absolute left-3 top-2.5 size-4 text-slate-400"/>
											<input type="text" placeholder="Search by employee name, ID, date, or status..." value={attendanceSearchQuery} onChange={e => setAttendanceSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors"/>
										</div>
										<div className="flex items-center gap-1.5 flex-wrap">
											{(['All', 'Present', 'Checked In'] as const).map(st => (<button key={st} onClick={() => setAttendanceStatusFilter(st)} className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer", attendanceStatusFilter === st
                            ? "bg-[#E61E32] text-white font-semibold shadow-xs"
                            : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100")}>
													{st}
												</button>))}
											<span className="text-xs text-slate-400 ml-2 font-medium">
												{filteredAttendance.length} logs found
											</span>
										</div>
									</div>

									
									{filteredAttendance.length === 0 ? (<div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
											<div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
												<CalendarIcon className="size-6"/>
											</div>
											<h3 className="text-sm font-semibold text-slate-800">No Attendance Logs Found</h3>
											<p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
												{attendanceSearchQuery || attendanceStatusFilter !== 'All'
                            ? 'No records match your search filter criteria.'
                            : 'No attendance logs have been recorded in the system.'}
											</p>
										</div>) : (<div className="overflow-x-auto bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
											<table className="w-full text-left text-xs border-collapse">
												<thead>
													<tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-medium text-[11px] uppercase tracking-wider">
														<th className="py-3.5 px-4">Employee</th>
														<th className="py-3.5 px-4">Date</th>
														<th className="py-3.5 px-4">Check-In Time</th>
														<th className="py-3.5 px-4">Check-Out Time</th>
														<th className="py-3.5 px-4">Status</th>
														<th className="py-3.5 px-4 text-right">Actions</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-slate-100 text-slate-700">
													{filteredAttendance.map((log: any) => (<tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
															<td className="py-3.5 px-4">
																<div className="font-medium text-slate-900">{log.employeeName}</div>
																<span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 mt-0.5 inline-block">
																	{log.employeeId}
																</span>
															</td>
															<td className="py-3.5 px-4 text-slate-600 font-medium">
																<span className="inline-flex items-center gap-1.5">
																	<CalendarIcon className="size-3.5 text-slate-400"/>
																	{log.date}
																</span>
															</td>
															<td className="py-3.5 px-4">
																<span className="inline-block font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-lg text-[11px]">
																	{log.checkIn}
																</span>
															</td>
															<td className="py-3.5 px-4">
																{log.checkOut ? (<span className="inline-block font-medium text-slate-700 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-lg text-[11px]">
																		{log.checkOut}
																	</span>) : (<span className="text-slate-400 font-normal">--</span>)}
															</td>
															<td className="py-3.5 px-4">
																<span className={cn("inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-full border shadow-2xs tracking-wide whitespace-nowrap", log.status === 'Checked In' && "bg-blue-50 text-blue-700 border-blue-200", log.status === 'Present' && "bg-emerald-50 text-emerald-700 border-emerald-200", log.status !== 'Checked In' && log.status !== 'Present' && "bg-slate-50 text-slate-700 border-slate-200")}>
																	<span className={cn("size-1.5 rounded-full", log.status === 'Checked In' ? "bg-blue-500" : log.status === 'Present' ? "bg-emerald-500" : "bg-slate-400")}/>
																	{log.status}
																</span>
															</td>
															<td className="py-3.5 px-4 text-right whitespace-nowrap">
																<div className="inline-flex items-center justify-end gap-1.5">
																	<button onClick={() => {
                                setEditingItem(log);
                                setEditModalType('attendance');
                            }} className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all cursor-pointer shadow-2xs" title="Edit Attendance Log">
																		<PencilIcon className="size-3.5"/>
																	</button>
																	<button onClick={() => handleDeleteAttendance(log.id)} className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all cursor-pointer shadow-2xs" style={{ backgroundColor: '#dc2626', color: '#ffffff' }} title="Delete Attendance Log">
																		<Trash2Icon className="size-3.5 text-white"/>
																	</button>
																</div>
															</td>
														</tr>))}
												</tbody>
											</table>
										</div>)}
								</div>)}
						</div>);
        })()}

				
				{activeTab === 'system_status' && (<div className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Server Health & Redis</h2>
								<p className="text-xs text-slate-500 mt-0.5">
									Check redis memory stats, server uptime counters, and background worker queues
								</p>
							</div>
							<div className="flex items-center gap-2">
								<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl shadow-2xs">
									<span className="size-2 rounded-full bg-emerald-500 animate-pulse"/>
									All Services Operational
								</span>
							</div>
						</div>

						
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
							<div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs space-y-1">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[11px] font-medium uppercase tracking-wider">Server Node</span>
									<ServerIcon className="size-4 text-emerald-600 animate-pulse"/>
								</div>
								<p className="text-2xl font-semibold text-slate-900">{stats.serverStatus}</p>
								<p className="text-xs text-emerald-600 font-medium">Uptime: {stats.uptime}</p>
							</div>

							<div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs space-y-1">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[11px] font-medium uppercase tracking-wider">Node Env</span>
									<CpuIcon className="size-4 text-slate-600"/>
								</div>
								<p className="text-2xl font-semibold text-slate-900 capitalize">{stats.environment}</p>
								<p className="text-xs text-slate-500 font-medium">Heap: {stats.heapMemory}</p>
							</div>

							<div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs space-y-1">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[11px] font-medium uppercase tracking-wider">NPM Packages</span>
									<PackageIcon className="size-4 text-blue-600"/>
								</div>
								<p className="text-2xl font-semibold text-slate-900">{stats.totalDependencies}</p>
								<p className="text-xs text-blue-600 font-medium">{stats.dependencies} prod, {stats.devDependencies} dev</p>
							</div>

							<div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs space-y-1">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[11px] font-medium uppercase tracking-wider">Active Team</span>
									<UsersIcon className="size-4 text-slate-600"/>
								</div>
								<p className="text-2xl font-semibold text-slate-900">{employeesList.length}</p>
								<p className="text-xs text-slate-500 font-medium">Active members</p>
							</div>

							<div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs space-y-1">
								<div className="flex items-center justify-between text-slate-500">
									<span className="text-[11px] font-medium uppercase tracking-wider">Telemetry Logs</span>
									<TerminalIcon className="size-4 text-[#E61E32]"/>
								</div>
								<p className="text-2xl font-semibold text-slate-900">{stats.logEntries.length}</p>
								<p className="text-xs text-rose-600 font-medium">Active telemetry logs</p>
							</div>
						</div>

						
						<div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-2xs space-y-4">
							<div className="flex items-center justify-between pb-3 border-b border-slate-100">
								<div className="flex items-center gap-2">
									<TerminalIcon className="size-4 text-[#E61E32]"/>
									<h3 className="text-sm font-semibold text-slate-900">System Lifecycle & Worker Logs</h3>
								</div>
								<span className="text-slate-400 font-mono text-[10px]">Auto-updates every 5s • Last: {stats.timestamp}</span>
							</div>
							<div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-slate-50/50">
								<table className="w-full text-left text-xs border-collapse">
									<thead>
										<tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-mono text-[11px]">
											<th className="p-3 font-semibold uppercase tracking-wider">Event</th>
											<th className="p-3 font-semibold uppercase tracking-wider">Details</th>
											<th className="p-3 font-semibold uppercase tracking-wider text-right">Source / Timestamp</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-200/60 font-mono text-slate-700">
										{stats.logEntries.map((log: any, idx: number) => (<tr key={idx} className="hover:bg-slate-100/60 transition-colors">
												<td className="p-3 font-semibold text-[#E61E32] whitespace-nowrap">{log.event}</td>
												<td className="p-3 text-slate-800 font-sans">{log.details}</td>
												<td className="p-3 text-slate-400 text-right text-[10px] whitespace-nowrap">{log.timestamp}</td>
											</tr>))}
									</tbody>
								</table>
							</div>
						</div>
					</div>)}

				
				{activeTab === 'messages' && (<MessagesView currentUser={{
                id: adminEmployeeId || email,
                name: adminDisplayName || 'Admin',
                email: email,
                role: 'Admin'
            }} adminEmail={email}/>)}

				
				{activeTab === 'task_allocation' && (<div className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div className="flex items-center gap-2">
								<TerminalIcon className="size-5 text-brand-400"/>
								<h2 className="text-lg font-bold text-slate-800 dark:text-white">Task/Work Allocation</h2>
							</div>
							<Button onClick={() => {
                setShowTaskForm(!showTaskForm);
                setTaskMessage(null);
            }} className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-light py-2 px-4 rounded-lg h-auto cursor-pointer shadow-sm active:scale-[0.98] transition-all animate-none">
								{showTaskForm ? 'Cancel Allocation' : (<>
										<PlusIcon className="size-4 me-2 inline"/>
										Allocate Task
									</>)}
							</Button>
						</div>

						
						{taskMessage && (<div className={cn("p-3 rounded-lg text-xs border", taskMessage.type === 'success'
                    ? "bg-emerald-50 border-emerald-250 text-emerald-700"
                    : "bg-red-50 border-red-200 text-red-700")}>
								{taskMessage.text}
							</div>)}

						
						{showTaskForm && (<form onSubmit={handleCreateTask} className="bg-white border-transparent p-6 space-y-4 rounded-xl shadow-md">
								<h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
									Create & Allocate New Task
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Task Title</label>
										<Input placeholder="Implement Login Auth Flow" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-450 focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:ring-offset-0 focus-visible:border-brand-500 rounded-lg h-9 transition-colors" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}/>
									</div>
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Report To</label>
										<Input placeholder="Admin / Team Lead Name" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-450 focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:ring-offset-0 focus-visible:border-brand-500 rounded-lg h-9 transition-colors" value={taskReportTo} onChange={e => setTaskReportTo(e.target.value)}/>
									</div>
								</div>

								<div className="space-y-1">
									<label className="text-[10px] text-slate-500 uppercase font-medium">Task Description</label>
									<textarea placeholder="Describe the tasks, objectives, and deliverables..." required rows={3} className="w-full bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-450 focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:ring-offset-0 focus-visible:border-brand-500 rounded-lg p-3 outline-none transition-colors" value={taskDescription} onChange={e => setTaskDescription(e.target.value)}/>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
									<div className="space-y-1 md:col-span-2">
										<div className="flex items-center justify-between">
											<label className="text-[10px] text-slate-500 uppercase font-medium">Whom you want to send</label>
											<button type="button" onClick={() => setAssignToAll(!assignToAll)} className={cn("text-[10px] px-2.5 py-1 rounded-full transition-all cursor-pointer border", assignToAll
                    ? "bg-brand-50 border-brand-300 text-brand-700 font-semibold"
                    : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100")}>
												{assignToAll ? '✓ Assigning All' : 'Assign to All'}
											</button>
										</div>
										<select disabled={assignToAll} value={taskAssigneeId} onChange={e => setTaskAssigneeId(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-lg h-9 px-2 outline-none focus:border-brand-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
											<option value="">-- Select Employee --</option>
											{employeesList.map((emp) => (<option key={emp.id} value={emp.id}>
													{emp.firstName} {emp.lastName} ({emp.id} - {emp.wingName})
												</option>))}
										</select>
									</div>

									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Deadline Date</label>
										<Input type="date" required className="bg-white border border-slate-200 text-slate-900 text-xs focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:ring-offset-0 focus-visible:border-brand-500 rounded-lg h-9 transition-colors" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)}/>
									</div>

									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Mode</label>
										<select value={taskMode} onChange={e => setTaskMode(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-lg h-9 px-2 outline-none focus:border-brand-500 transition-colors">
											<option value="Onsite">Onsite</option>
											<option value="Hybrid">Hybrid</option>
										</select>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Status</label>
										<select value={taskStatus} onChange={e => setTaskStatus(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-lg h-9 px-2 outline-none focus:border-brand-500 transition-colors">
											<option value="Pending">Pending</option>
											<option value="In Progress">In Progress</option>
											<option value="Completed">Completed</option>
										</select>
									</div>

									<div className="flex items-end">
										<Button type="submit" disabled={isAddingTask} className="w-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-light py-2 px-4 rounded-lg h-9 cursor-pointer transition-colors shadow-sm active:scale-[0.98] animate-none">
											{isAddingTask ? 'Allocating...' : 'Submit Allocation'}
										</Button>
									</div>
								</div>
							</form>)}

						
						<div className="bg-white border-transparent p-6 space-y-4 rounded-xl shadow-md">
							<h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
								Allocated Tasks Directory
							</h3>
							
							{tasksList.length === 0 ? (<p className="text-slate-500 text-xs italic py-4 text-center">No tasks allocated yet.</p>) : (<div className="overflow-x-auto rounded-lg border-0 bg-transparent">
									<table className="w-full text-left text-xs border-collapse">
										<thead>
											<tr className="border-b border-slate-100 text-slate-500 uppercase text-[10px] tracking-wider bg-slate-50">
												<th className="p-3">Title</th>
												<th className="p-3">Assignee</th>
												<th className="p-3">Report To</th>
												<th className="p-3">Deadline</th>
												<th className="p-3">Mode</th>
												<th className="p-3">Status</th>
												<th className="p-3">Allocated At</th>
												<th className="p-3 text-right">Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100 font-sans text-slate-600">
											{tasksList.map((task: any) => (<tr key={task.id} className={cn("transition-colors duration-150", task.status === 'Completed'
                        ? "bg-emerald-50/50 hover:bg-emerald-50"
                        : task.status === 'In Progress'
                            ? "bg-blue-50/50 hover:bg-blue-50"
                            : "hover:bg-slate-50/50")}>
													<td className="p-3">
														<div className="font-bold text-slate-900">{task.title}</div>
														<div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{task.description}</div>
													</td>
													<td className="p-3 whitespace-nowrap">
														<span className={cn("px-2 py-0.5 text-[10px] rounded border border-transparent", task.assigneeId === 'ALL'
                        ? "bg-brand-50 text-brand-700 font-bold"
                        : "bg-slate-100 text-slate-700")}>
															{task.assigneeName} {task.assigneeId !== 'ALL' && `(${task.assigneeId})`}
														</span>
													</td>
													<td className="p-3 text-slate-600 whitespace-nowrap">{task.reportTo}</td>
													<td className="p-3 text-slate-600 whitespace-nowrap">
														{new Date(task.deadline).toLocaleDateString()}
													</td>
													<td className="p-3 whitespace-nowrap">
														<span className={cn("px-2 py-0.5 text-[10px] uppercase font-bold rounded-full", task.mode === 'Remote' && "bg-cyan-50 text-cyan-700", task.mode === 'Onsite' && "bg-amber-50 text-amber-700", task.mode === 'Hybrid' && "bg-purple-50 text-purple-700")}>
															{task.mode}
														</span>
													</td>
													<td className="p-3 whitespace-nowrap">
														<span className={cn("px-2 py-0.5 text-[10px] uppercase font-bold rounded-full", task.status === 'Completed' && "bg-emerald-100 text-emerald-700", task.status === 'In Progress' && "bg-blue-100 text-blue-700", task.status === 'Pending' && "bg-yellow-100 text-yellow-700")}>
															{task.status}
														</span>
													</td>
													<td className="p-3 text-slate-500 text-[10px] whitespace-nowrap">
														{new Date(task.createdAt).toLocaleString()}
													</td>
													<td className="p-3 text-right whitespace-nowrap">
														<div className="inline-flex items-center justify-end gap-2">
															<button onClick={() => {
                        setEditingItem(task);
                        setEditModalType('task');
                    }} className="p-1.5 rounded-lg border border-slate-350 bg-slate-100 text-slate-800 hover:bg-slate-200 transition-all cursor-pointer shadow-xs" title="Edit Task">
																<PencilIcon className="size-3.5"/>
															</button>
															<button onClick={() => handleDeleteTask(task.id)} className="p-1.5 rounded-lg border border-red-600 bg-red-600 text-white hover:bg-red-700 transition-all cursor-pointer shadow-xs" title="Delete Task">
																<Trash2Icon className="size-3.5"/>
															</button>
														</div>
													</td>
												</tr>))}
										</tbody>
									</table>
								</div>)}
						</div>
					</div>)}

				
				{activeTab === 'employees' && (<div className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div className="flex items-center gap-2">
								<UsersIcon className="size-5 text-brand-500"/>
								<h2 className="text-lg font-bold text-slate-900">Employee Directory</h2>
							</div>
							<div className="flex items-center gap-3">
								<input id="employee-excel-import" type="file" accept=".csv" className="hidden" onChange={handleImportExcel}/>
								<div className="relative" onMouseLeave={() => setShowExportDropdown(false)}>
									<Button onClick={() => setShowExportDropdown(!showExportDropdown)} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-light py-2 px-4 rounded-lg h-auto cursor-pointer flex items-center gap-1.5 shadow-xs transition-all">
										<UploadIcon className="size-3.5 text-brand-500"/>
										export data <span className="text-[9px]">▼</span>
									</Button>
									{showExportDropdown && (<div className="absolute right-0 top-full pt-1 w-40 z-50">
											<div className="bg-white border border-slate-200 shadow-xl py-1 rounded-lg text-xs text-slate-700 font-sans">
												<button type="button" onClick={() => {
                    setShowExportDropdown(false);
                    document.getElementById('employee-excel-import')?.click();
                }} className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
													import csv / excel
												</button>
												<button type="button" onClick={() => {
                    setShowExportDropdown(false);
                    handleExportPdf();
                }} className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
													export to pdf
												</button>
											</div>
										</div>)}
								</div>

								<Button onClick={() => {
                setShowAddForm(!showAddForm);
                setAddMessage(null);
            }} className="bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-light py-2 px-4 rounded-lg h-auto shadow-sm active:scale-[0.98] transition-all cursor-pointer">
									{showAddForm ? 'Cancel Registration' : (<>
											<UserPlusIcon className="size-4 me-2 inline"/>
											Add New Employee
										</>)}
								</Button>
							</div>
						</div>

						{addMessage && (<div className={cn("p-3 rounded-lg text-xs border font-sans", addMessage.type === 'success'
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800")}>
								{addMessage.text}
							</div>)}

						{showAddForm && (<form onSubmit={handleAddEmployee} className="bg-white border border-slate-200 p-6 space-y-4 rounded-xl shadow-xs">
								<h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
									Register New Member
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">First Name</label>
										<Input placeholder="John" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9 transition-colors" value={firstName} onChange={e => setFirstName(e.target.value)}/>
									</div>
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Middle Name</label>
										<Input placeholder="Lee" className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9 transition-colors" value={middleName} onChange={e => setMiddleName(e.target.value)}/>
									</div>
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Last Name</label>
										<Input placeholder="Doe" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9 transition-colors" value={lastName} onChange={e => setLastName(e.target.value)}/>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Email ID</label>
										<Input type="email" placeholder="john.doe@company.com" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9 transition-colors" value={empEmail} onChange={e => setEmpEmail(e.target.value)}/>
									</div>
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Phone Number</label>
										<Input type="tel" placeholder="+1 (555) 000-0000" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9 transition-colors" value={phone} onChange={e => setPhone(e.target.value)}/>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Wing Name</label>
										<Input placeholder="Engineering / Sales / Support" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9 transition-colors" value={wingName} onChange={e => setWingName(e.target.value)}/>
									</div>
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Wing Lead Name</label>
										<Input placeholder="Jane Smith" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9 transition-colors" value={wingLeadName} onChange={e => setWingLeadName(e.target.value)}/>
									</div>
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Role</label>
										<Input placeholder="Software Engineer / Designer" required className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9 transition-colors" value={empRole} onChange={e => setEmpRole(e.target.value)}/>
									</div>
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Gender</label>
										<select className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-lg h-9 px-2 focus:outline-none focus:border-brand-500" value={empGender} onChange={e => setEmpGender(e.target.value)}>
											<option value="UNSPECIFIED">Not set (employee chooses)</option>
											<option value="FEMALE">Female</option>
											<option value="MALE">Male</option>
										</select>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Month(s) Worked For</label>
										<Input placeholder="e.g. October 2026, or 6 Months" className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9 transition-colors" value={empMonthWorked} onChange={e => setEmpMonthWorked(e.target.value)}/>
									</div>
									<div className="space-y-1">
										<label className="text-[10px] text-slate-500 uppercase font-medium">Remarks</label>
										<Input placeholder="e.g. Outstanding performance, punctual" className="bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-500 rounded-lg h-9 transition-colors" value={empRemarks} onChange={e => setEmpRemarks(e.target.value)}/>
									</div>
								</div>

								<Button type="submit" disabled={isAdding} className="bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-50 text-white text-xs font-light py-2 px-4 rounded-lg h-10 w-full shadow-sm active:scale-[0.98] transition-all cursor-pointer">
									{isAdding ? 'Registering...' : 'Register Employee & Generate ID'}
								</Button>
							</form>)}

						{employeesList.length === 0 ? (<div className="bg-white border border-slate-200 p-8 rounded-xl text-center text-slate-500 text-xs italic">
								No employees registered in directory. Click "Add New Employee" to get started.
							</div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
								{employeesList.map((emp) => (<div key={emp.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group">
										
										<span className="absolute top-4 right-4 bg-slate-50 border border-slate-200 text-slate-500 px-2 py-0.5 rounded text-[10px] font-light">
											ID: {emp.id}
										</span>

										
										<div className="flex items-center gap-3">
											<div className="relative shrink-0">
												<ChatAvatar id={emp.id} name={`${emp.firstName} ${emp.lastName}`} hasPhoto={Boolean(emp.hasPhoto)} adminEmail={email} size={44} shape="rectangle"/>
												<span className={cn('absolute -bottom-1 -right-1 block size-2.5 rounded-full border-2 border-white', emp.hasPhoto ? 'bg-emerald-500' : 'bg-slate-300')} title={emp.hasPhoto ? 'Has Photo' : 'No Photo'}/>
											</div>
											<div className="min-w-0">
												<p className="truncate text-xs font-semibold text-slate-800" title={`${emp.firstName} ${emp.lastName}`}>
													{emp.firstName} {emp.middleName ? `${emp.middleName} ` : ''}{emp.lastName}
												</p>
												<p className="text-[10px] text-rose-600 font-medium">
													{emp.role || 'Employee'}
												</p>
											</div>
										</div>

										
										<div className="grid grid-cols-1 gap-y-2.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
											<div>
												<span className="block text-[9px] text-slate-400 uppercase tracking-wide font-medium">Email ID</span>
												<span className="block truncate text-slate-750 font-light" title={emp.email}>{emp.email}</span>
											</div>
											<div className="grid grid-cols-2 gap-2">
												<div>
													<span className="block text-[9px] text-slate-400 uppercase tracking-wide font-medium">Phone</span>
													<span className="block text-slate-750 font-light">{emp.phone}</span>
												</div>
												<div>
													<span className="block text-[9px] text-slate-400 uppercase tracking-wide font-medium">Gender</span>
													<span className="block text-slate-750 font-light">
														{String(emp.gender || 'UNSPECIFIED').toUpperCase() === 'FEMALE'
                        ? 'Female'
                        : String(emp.gender || '').toUpperCase() === 'MALE'
                            ? 'Male'
                            : 'Not set'}
													</span>
												</div>
											</div>
											<div className="grid grid-cols-2 gap-2">
												<div>
													<span className="block text-[9px] text-slate-400 uppercase tracking-wide font-medium">Wing</span>
													<span className="block text-slate-750 font-light truncate" title={emp.wingName || ''}>{emp.wingName || '—'}</span>
												</div>
												<div>
													<span className="block text-[9px] text-slate-400 uppercase tracking-wide font-medium">Wing Lead</span>
													<span className="block text-slate-750 font-light truncate" title={emp.wingLeadName || ''}>{emp.wingLeadName || '—'}</span>
												</div>
											</div>
											<div>
												<span className="block text-[9px] text-slate-400 uppercase tracking-wide font-medium">Month Worked</span>
												<span className="block text-slate-750 font-light truncate" title={emp.monthWorked || ''}>{emp.monthWorked || '—'}</span>
											</div>
										</div>

										
										<div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] text-slate-600 italic">
											<span className="block text-[9px] text-slate-400 uppercase tracking-wide font-medium not-italic mb-0.5">Remarks</span>
											{emp.remarks || 'No remarks recorded.'}
										</div>

										
										<div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-auto">
											<div className="flex items-center gap-1.5">
												<button onClick={() => {
                        setViewingEmployee(emp);
                        setViewingTab('personal');
                    }} className="p-2 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-850 rounded-lg shadow-xs transition-all cursor-pointer font-semibold" title="View Employee Details">
													<EyeIcon className="size-3.5"/>
												</button>
												<button onClick={() => {
                        setEditingItem(emp);
                        setEditModalType('employee');
                    }} className="p-2 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-850 rounded-lg shadow-xs transition-all cursor-pointer font-semibold" title="Edit Employee">
													<PencilIcon className="size-3.5"/>
												</button>
												<button onClick={() => handleDeleteEmployee(emp.id)} className="p-2 border border-red-600 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs transition-all cursor-pointer font-semibold" title="Delete Employee">
													<Trash2Icon className="size-3.5"/>
												</button>
											</div>

											{String(emp.gender || '').toUpperCase() === 'FEMALE' && (<button type="button" onClick={async () => {
                            const res = await allowEmployeeHomeSetup(emp.id);
                            if (res.success) {
                                alert(`Home setup allowed for ${emp.firstName}. They will see the yellow banner on Safety and can set/update home once.`);
                                fetchEmployees();
                            }
                            else {
                                alert(res.error || 'Failed');
                            }
                        }} className="rounded-lg bg-amber-500 border border-amber-600 hover:bg-amber-600 text-white px-2.5 py-1.5 text-[10px] font-semibold shadow-xs cursor-pointer transition-colors" title="Allow employee to set/change home location once">
													Allow home setup
												</button>)}
										</div>
									</div>))}
							</div>)}
					</div>)}

				
				{activeTab === 'events' && (() => {
            const activeEvents = eventsList.filter(e => e.allowed !== false);
            const crawledEvents = eventsList.filter(e => e.allowed === false);
            const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            return (<div className="space-y-6">
							
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<div>
									<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Events Calendar</h2>
									<p className="text-xs text-slate-500 mt-0.5">
										{eventsSubTab === 'active'
                    ? `Schedule organization-wide tech talks, hackathons, and training webinars (${activeEvents.length} listed)`
                    : `Review and approve prospective events discovered by web scrapers (${crawledEvents.length} pending)`}
									</p>
								</div>
								<div className="flex items-center gap-2 flex-wrap">
									<div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
										<button onClick={() => setEventsSubTab('active')} className={cn("text-xs px-3.5 py-1.5 rounded-lg font-medium cursor-pointer transition-all", eventsSubTab === 'active' ? "bg-[#E61E32] text-white font-semibold shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-white")}>
											Active Calendar ({activeEvents.length})
										</button>
										<button onClick={() => setEventsSubTab('crawler')} className={cn("text-xs px-3.5 py-1.5 rounded-lg font-medium cursor-pointer transition-all", eventsSubTab === 'crawler' ? "bg-[#E61E32] text-white font-semibold shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-white")}>
											Events Crawler ({crawledEvents.length})
										</button>
									</div>
									
									{eventsSubTab === 'active' && (<button onClick={() => { setShowEventForm(v => !v); setEventMessage(null); }} className="inline-flex items-center gap-1.5 bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs">
											<PlusIcon className="size-3.5"/>
											{showEventForm ? 'Cancel' : 'Create Event'}
										</button>)}
								</div>
							</div>

							{eventMessage && (<div className={cn("p-3.5 rounded-xl text-xs flex items-center gap-2 border shadow-2xs", eventMessage.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200")}>
									{eventMessage.type === 'success' ? <CheckCircleIcon className="size-4 text-emerald-600 shrink-0"/> : <AlertCircleIcon className="size-4 text-rose-600 shrink-0"/>}
									<span>{eventMessage.text}</span>
								</div>)}

							
							{eventsSubTab === 'active' && showEventForm && (<form onSubmit={handleCreateEvent} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
									<div className="pb-3 border-b border-slate-100">
										<h3 className="text-sm font-semibold text-slate-900">New Event Details</h3>
										<p className="text-xs text-slate-500 mt-0.5">Publish an internal or public technical session, hackathon, or seminar</p>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Event Title *</label>
											<Input value={eventTitle} onChange={e => setEventTitle(e.target.value)} required placeholder="e.g. AI & Cloud Architecture Summit 2026" className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl text-xs h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20 focus-visible:border-[#E61E32]/40"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Organising Institution / College *</label>
											<Input value={eventCollege} onChange={e => setEventCollege(e.target.value)} required placeholder="e.g. IIT Hyderabad / Redlix Academy" className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl text-xs h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20 focus-visible:border-[#E61E32]/40"/>
										</div>
									</div>

									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Event Description *</label>
										<textarea value={eventDescription} onChange={e => setEventDescription(e.target.value)} required rows={3} placeholder="Brief description of the event agenda, topics covered, and prerequisites..." className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl text-xs p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40"/>
									</div>

									<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Start Date *</label>
											<Input type="date" value={eventStartDate} onChange={e => setEventStartDate(e.target.value)} required className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl text-xs h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">End Date *</label>
											<Input type="date" value={eventEndDate} onChange={e => setEventEndDate(e.target.value)} required className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl text-xs h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Start Time *</label>
											<Input type="time" value={eventStartTime} onChange={e => setEventStartTime(e.target.value)} required className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl text-xs h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">End Time *</label>
											<Input type="time" value={eventEndTime} onChange={e => setEventEndTime(e.target.value)} required className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl text-xs h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20"/>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Venue / Address *</label>
											<Input value={eventVenue} onChange={e => setEventVenue(e.target.value)} required placeholder="e.g. Main Auditorium, Campus Hub, Hyderabad 500081" className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl text-xs h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Banner Image Link (URL)</label>
											<Input value={eventImageUrl} onChange={e => setEventImageUrl(e.target.value)} placeholder="e.g. https://images.unsplash.com/photo-..." className="bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl text-xs h-10 px-3 focus-visible:ring-2 focus-visible:ring-[#E61E32]/20"/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider block">Company Representatives</label>
										<div className="grid grid-cols-2 md:grid-cols-3 gap-2 border border-slate-200 p-3.5 bg-slate-50/60 max-h-44 overflow-y-auto rounded-xl">
											{employeesList.map(emp => {
                        const fullName = `${emp.firstName} ${emp.lastName}`;
                        const isChecked = selectedEventRepIds.includes(emp.id);
                        return (<label key={emp.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900 select-none">
														<input type="checkbox" checked={isChecked} onChange={() => {
                                if (isChecked) {
                                    setSelectedEventRepIds(selectedEventRepIds.filter(id => id !== emp.id));
                                }
                                else {
                                    setSelectedEventRepIds([...selectedEventRepIds, emp.id]);
                                }
                            }} className="rounded border-slate-300 text-[#E61E32] focus:ring-[#E61E32] size-3.5 accent-[#E61E32]"/>
														<span className="truncate">{fullName} ({emp.id})</span>
													</label>);
                    })}
										</div>
									</div>

									<div className="flex justify-end pt-3 border-t border-slate-100">
										<button type="submit" disabled={isAddingEvent} className="bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-semibold px-6 py-2.5 rounded-xl cursor-pointer transition-colors disabled:opacity-50 shadow-xs">
											{isAddingEvent ? 'Creating...' : 'Publish Event'}
										</button>
									</div>
								</form>)}

							
							{eventsSubTab === 'crawler' && (<div className="space-y-6">
									<form onSubmit={handleEventsCrawl} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
										<div className="flex items-center justify-between border-b border-slate-100 pb-3">
											<div>
												<h3 className="text-sm font-semibold text-slate-900">Automated Events Scraper</h3>
												<p className="text-xs text-slate-500 mt-0.5">Discovers upcoming hackathons & tech events from Student Tribe, Luma, Devfolio, and Unstop</p>
											</div>
										</div>
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
											<div className="space-y-1">
												<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Target City *</label>
												<select value={crawlEventCity} onChange={e => {
                        const city = e.target.value;
                        setCrawlEventCity(city);
                        const areas = cityAreas[city] || [];
                        setCrawlEventArea(areas[0] || "");
                    }} required className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 rounded-xl">
													<option value="">Select City</option>
													{citiesList.map(c => (<option key={c} value={c}>{c}</option>))}
												</select>
											</div>
											<div className="space-y-1">
												<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Target Area / Venue</label>
												<select value={crawlEventArea} onChange={e => setCrawlEventArea(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 rounded-xl" disabled={!crawlEventCity}>
													<option value="">Select Area</option>
													{(cityAreas[crawlEventCity] || []).map(a => (<option key={a} value={a}>{a}</option>))}
												</select>
											</div>
											<div className="flex items-end">
												<button type="submit" disabled={isCrawlingEvents} className="w-full bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer transition-colors disabled:opacity-50 shadow-xs">
													{isCrawlingEvents ? 'Searching Platforms...' : 'Run Events Scraper'}
												</button>
											</div>
										</div>

										{eventsCrawlMsg && (<div className={cn("p-3 rounded-xl text-xs border shadow-2xs", eventsCrawlMsg.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800")}>
												{eventsCrawlMsg.text}
											</div>)}
									</form>

									
									<div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
										<div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs space-y-0.5">
											<p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Total Scraped</p>
											<p className="text-xl font-semibold text-slate-900">{crawledEvents.length}</p>
										</div>
										<div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs space-y-0.5">
											<p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Student Tribe</p>
											<p className="text-xl font-semibold text-slate-900">{crawledEvents.filter(e => e.source === 'Student Tribe').length}</p>
										</div>
										<div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs space-y-0.5">
											<p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Luma</p>
											<p className="text-xl font-semibold text-slate-900">{crawledEvents.filter(e => e.source === 'Luma').length}</p>
										</div>
										<div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs space-y-0.5">
											<p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Devfolio</p>
											<p className="text-xl font-semibold text-slate-900">{crawledEvents.filter(e => e.source === 'Devfolio').length}</p>
										</div>
										<div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs space-y-0.5">
											<p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Unstop</p>
											<p className="text-xl font-semibold text-slate-900">{crawledEvents.filter(e => e.source === 'Unstop').length}</p>
										</div>
									</div>

									{crawledEvents.length > 0 && (<div className="flex gap-2 justify-end">
											<button onClick={handleAllowAllEvents} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-semibold cursor-pointer shadow-2xs" style={{ backgroundColor: '#059669', color: '#ffffff' }}>
												Approve All Crawled
											</button>
											<button onClick={handleDeleteAllCrawledEvents} className="text-xs bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-xl font-semibold cursor-pointer shadow-2xs" style={{ backgroundColor: '#dc2626', color: '#ffffff' }}>
												Clear All Crawled
											</button>
										</div>)}
								</div>)}

							
							{eventsSubTab === 'active' ? (activeEvents.length === 0 ? (<div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
										<div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
											<CalendarIcon className="size-6"/>
										</div>
										<h3 className="text-sm font-semibold text-slate-800">No Events Listed in Calendar</h3>
										<p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
											Click &quot;Create Event&quot; above to schedule your first conference, workshop, or hackathon.
										</p>
									</div>) : (<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
										{activeEvents.map((event: any) => {
                        const reps: {
                            id: string;
                            name: string;
                        }[] = JSON.parse(event.representatives || '[]');
                        const startD = new Date(event.startDate);
                        const endD = new Date(event.endDate);
                        return (<div key={event.id} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all">
													
													<div className="h-44 w-full relative overflow-hidden bg-slate-100 flex items-center justify-center border-b border-slate-100">
														{event.imageUrl ? (<img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"/>) : (<div className="h-full w-full bg-gradient-to-br from-red-50 via-slate-100 to-slate-200 relative flex items-center justify-center">
																<CalendarIcon className="size-10 text-slate-400"/>
															</div>)}
														<span className="absolute top-3 right-3 text-[11px] bg-white/90 border border-slate-200 text-slate-800 font-semibold backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-2xs">
															{event.source || 'Event'}
														</span>
													</div>

													<div className="p-5 flex-1 flex flex-col justify-between space-y-4">
														<div className="space-y-2.5">
															<div>
																<h3 className="text-sm font-semibold text-slate-900">
																	{event.sourceUrl ? (<a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#E61E32] hover:underline transition-all">
																			{event.title}
																		</a>) : (event.title)}
																</h3>
																<p className="text-xs text-[#E61E32] font-medium mt-0.5">{event.organisingCollege}</p>
															</div>

															<p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{event.description}</p>

															<div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
																<div>
																	<p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Start Date & Time</p>
																	<p className="text-slate-750 font-medium">{fmt(startD)} · {event.startTime}</p>
																</div>
																<div>
																	<p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">End Date & Time</p>
																	<p className="text-slate-750 font-medium">{fmt(endD)} · {event.endTime}</p>
																</div>
															</div>

															<div className="flex items-start gap-2 text-xs text-slate-600">
																<MapPinIcon className="size-3.5 mt-0.5 text-slate-400 shrink-0"/>
																<span className="line-clamp-2">{event.venueAddress}</span>
															</div>

															{reps.length > 0 && (<div className="space-y-1 pt-1">
																	<p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Representatives</p>
																	<div className="flex flex-wrap gap-1.5">
																		{reps.map((r, i) => (<span key={i} className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium">
																				{r.name}
																			</span>))}
																	</div>
																</div>)}
														</div>

														<div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
															<button onClick={() => {
                                setEditingItem(event);
                                setEditModalType('event');
                                setEditEventImageUrl(event.imageUrl || '');
                                try {
                                    const parsed = JSON.parse(event.representatives || '[]');
                                    setEditEventRepIds(parsed.map((p: any) => p.id));
                                }
                                catch (e) {
                                    setEditEventRepIds([]);
                                }
                            }} className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs" title="Edit Event">
																<PencilIcon className="size-3.5"/>
															</button>
															<button onClick={() => handleDeleteEvent(event.id)} className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-all shadow-2xs" style={{ backgroundColor: '#dc2626', color: '#ffffff' }} title="Delete Event">
																<Trash2Icon className="size-3.5 text-white"/> Delete
															</button>
														</div>
													</div>
												</div>);
                    })}
									</div>)) : (crawledEvents.length === 0 ? (<div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs text-xs italic text-slate-400">
										No crawled events. Specify Target City & Area above and run the events scraper.
									</div>) : (<div className="bg-white border border-slate-200/90 rounded-2xl overflow-x-auto shadow-2xs">
										<table className="w-full min-w-[1000px] text-left text-xs text-slate-700">
											<thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
												<tr>
													<th className="p-4 font-semibold">Event Title</th>
													<th className="p-4 font-semibold">Organiser</th>
													<th className="p-4 font-semibold">Platform</th>
													<th className="p-4 font-semibold">Date & Time</th>
													<th className="p-4 font-semibold">Venue Address</th>
													<th className="p-4 font-semibold text-right">Actions</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-slate-100">
												{crawledEvents.map((event: any) => {
                        const startD = new Date(event.startDate);
                        return (<tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
															<td className="p-4 font-semibold text-slate-900">
																{event.sourceUrl ? (<a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#E61E32] hover:underline transition-all">
																		{event.title}
																	</a>) : (event.title)}
															</td>
															<td className="p-4 text-slate-600">{event.organisingCollege}</td>
															<td className="p-4">
																<span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-700 rounded-md">
																	{event.source}
																</span>
															</td>
															<td className="p-4 text-slate-600">
																{fmt(startD)} · {event.startTime}
															</td>
															<td className="p-4 text-slate-600 truncate max-w-[220px]" title={event.venueAddress}>
																{event.venueAddress}
															</td>
															<td className="p-4 text-right">
																<div className="inline-flex items-center justify-end gap-1.5">
																	<button onClick={() => handleAllowEvent(event.id)} className="p-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all cursor-pointer" title="Approve / Allow Event">
																		<CheckIcon className="size-3.5"/>
																	</button>
																	<button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all cursor-pointer" style={{ backgroundColor: '#dc2626', color: '#ffffff' }} title="Delete Scraped Event">
																		<Trash2Icon className="size-3.5 text-white"/>
																	</button>
																</div>
															</td>
														</tr>);
                    })}
											</tbody>
										</table>
									</div>))}
						</div>);
        })()}
				{activeTab === 'work_submissions' && (<div className="space-y-6">
						
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Work Submissions</h2>
								<p className="text-xs text-slate-500 mt-0.5">Review, verify, and approve daily employee deliverables and timesheets</p>
							</div>
							<div className="flex items-center gap-1.5 flex-wrap bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
								{(['All', 'Submitted', 'Reviewed', 'Approved', 'Needs Revision'] as const).map(f => (<button key={f} onClick={() => setSubmissionFilter(f)} className={cn("text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer", submissionFilter === f
                    ? "bg-[#E61E32] text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80")}>
										{f}
									</button>))}
							</div>
						</div>

						
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
							{[
                { label: 'Total Submissions', count: submissionsList.length, color: 'text-slate-800', bg: 'bg-slate-50', border: 'border-slate-200/90', sub: 'All recorded logs' },
                { label: 'Pending Review', count: submissionsList.filter(s => s.status === 'Submitted').length, color: 'text-amber-600', bg: 'bg-amber-50/70', border: 'border-amber-200', sub: 'Awaiting review' },
                { label: 'Approved', count: submissionsList.filter(s => s.status === 'Approved').length, color: 'text-emerald-600', bg: 'bg-emerald-50/70', border: 'border-emerald-200', sub: 'Verified work' },
                { label: 'Needs Revision', count: submissionsList.filter(s => s.status === 'Needs Revision').length, color: 'text-rose-600', bg: 'bg-rose-50/70', border: 'border-rose-200', sub: 'Action requested' },
            ].map(stat => (<div key={stat.label} className={cn("p-4 rounded-2xl border shadow-2xs transition-all", stat.bg, stat.border)}>
									<p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
									<p className={cn("text-2xl font-semibold mt-1", stat.color)}>{stat.count}</p>
									<p className="text-[10px] text-slate-400 font-normal mt-0.5">{stat.sub}</p>
								</div>))}
						</div>

						
						{submissionsList.filter(s => submissionFilter === 'All' || s.status === submissionFilter).length === 0 ? (<div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
								<div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
									<FileTextIcon className="size-6"/>
								</div>
								<h3 className="text-sm font-semibold text-slate-800">No Submissions Found</h3>
								<p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
									{submissionFilter !== 'All'
                    ? `There are currently no employee submissions matching the "${submissionFilter}" filter.`
                    : 'No employee work submissions have been logged yet.'}
								</p>
							</div>) : (<div className="space-y-3.5">
								{submissionsList
                    .filter(s => submissionFilter === 'All' || s.status === submissionFilter)
                    .map((sub: any) => {
                    const STATUS_PILL: Record<string, {
                        bg: string;
                        text: string;
                        border: string;
                        dot: string;
                        label: string;
                    }> = {
                        'Submitted': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500', label: 'Submitted' },
                        'Reviewed': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-500', label: 'Reviewed' },
                        'Approved': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500', label: 'Approved' },
                        'Needs Revision': { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-500', label: 'Needs Revision' },
                    };
                    const pill = STATUS_PILL[sub.status] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-500', label: sub.status };
                    const isReviewing = reviewingId === sub.id;
                    return (<div key={sub.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-3.5">
												
												<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
													<div className="space-y-2 min-w-0">
														<h3 className="text-base font-semibold text-slate-900 leading-snug">{sub.title}</h3>
														
														
														<div className="flex items-center flex-wrap gap-2 text-xs">
															
															<span className="inline-flex items-center gap-1.5 font-medium text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200/70">
																<span className="size-2 rounded-full bg-[#E61E32]"/>
																{sub.employeeName}
															</span>

															
															<span className="font-mono text-[11px] font-normal text-slate-600 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/70">
																{sub.employeeId}
															</span>

															
															<span className="inline-flex items-center gap-1 text-slate-500 text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 font-normal">
																<CalendarIcon className="size-3 text-slate-400"/>
																{new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
															</span>

															
															<span className="inline-flex items-center gap-1 font-medium text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
																<ClockIcon className="size-3 text-amber-600"/>
																{sub.hoursSpent}h logged
															</span>
														</div>
													</div>

													
													<div className="shrink-0">
														<span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full border shadow-2xs tracking-wide", pill.bg, pill.text, pill.border)}>
															<span className={cn("size-2 rounded-full", pill.dot)}/>
															{pill.label}
														</span>
													</div>
												</div>

												
												<div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/60 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
													{sub.description}
												</div>

												
												{sub.taskTitle && (<div className="inline-flex items-center gap-2 text-xs bg-blue-50/80 text-blue-800 border border-blue-200/80 px-3 py-1.5 rounded-xl font-normal">
														<ClockIcon className="size-3.5 text-blue-600 shrink-0"/>
														<span>Linked Task: <span className="font-semibold text-blue-900">{sub.taskTitle}</span></span>
													</div>)}

												
												{sub.adminNote && (<div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 text-xs text-amber-900">
														<div className="font-semibold flex items-center gap-1.5 text-amber-800 mb-0.5">
															<AlertCircleIcon className="size-3.5 text-amber-600"/>
															Admin Feedback Note:
														</div>
														<p className="text-amber-800/90 pl-5 font-normal">{sub.adminNote}</p>
													</div>)}

												
												{isReviewing ? (<div className="space-y-3 pt-3 border-t border-slate-200/80">
														<div className="space-y-1">
															<label className="text-xs font-medium text-slate-700">Admin Note / Feedback (Optional):</label>
															<textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} placeholder="Enter notes or revision instructions for employee..." className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl text-xs p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 focus:border-[#E61E32]/40 transition-colors font-normal"/>
														</div>
														<div className="flex items-center gap-2 flex-wrap">
															<button onClick={() => handleUpdateSubmission(sub.id, 'Approved')} disabled={isUpdatingStatus} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors disabled:opacity-50 shadow-sm" style={{ backgroundColor: '#059669', color: '#ffffff' }}>
																<CheckCircleIcon className="size-3.5 text-white"/> Approve Submission
															</button>
															<button onClick={() => handleUpdateSubmission(sub.id, 'Needs Revision')} disabled={isUpdatingStatus} className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors disabled:opacity-50 shadow-sm" style={{ backgroundColor: '#e11d48', color: '#ffffff' }}>
																<XCircleIcon className="size-3.5 text-white"/> Request Revision
															</button>
															<button onClick={() => handleUpdateSubmission(sub.id, 'Reviewed')} disabled={isUpdatingStatus} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors disabled:opacity-50 shadow-sm" style={{ backgroundColor: '#2563eb', color: '#ffffff' }}>
																<AlertCircleIcon className="size-3.5 text-white"/> Mark Reviewed
															</button>
															<button onClick={() => { setReviewingId(null); setReviewNote(''); }} className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
																Cancel
															</button>
														</div>
													</div>) : (<div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
														<button onClick={() => { setReviewingId(sub.id); setReviewNote(sub.adminNote || ''); }} className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-all shadow-2xs" title="Review Submission">
															<PencilIcon className="size-3.5 text-slate-400"/> Review / Update Status
														</button>
														<button onClick={() => handleDeleteWorkSubmission(sub.id)} className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-all shadow-2xs" style={{ backgroundColor: '#dc2626', color: '#ffffff' }} title="Delete Submission">
															<Trash2Icon className="size-3.5 text-white"/> Delete
														</button>
													</div>)}
											</div>);
                })}
							</div>)}
					</div>)}

				{activeTab === 'form' && (<div className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Feedback & Forms</h2>
								<p className="text-xs text-slate-500 mt-0.5">
									Review anonymous feedback, employee surveys, suggestions, and form settings
								</p>
							</div>
						</div>

						
						<div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-wrap gap-3 items-center justify-between">
							<div className="flex items-center gap-3 flex-wrap flex-1 min-w-[280px]">
								<div className="relative flex-1 min-w-[200px]">
									<SearchIcon className="absolute left-3 top-2.5 size-3.5 text-slate-400"/>
									<input type="text" placeholder="Search email or name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"/>
								</div>
								<select value={filterUserType} onChange={(e) => setFilterUserType(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none cursor-pointer">
									<option value="ALL">All Roles</option>
									<option value="EMPLOYEE">Employees Only</option>
									<option value="ADMIN">Admins Only</option>
								</select>
								<select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none cursor-pointer">
									<option value="ALL">All Severities</option>
									<option value="Low">Low</option>
									<option value="Moderate">Moderate</option>
									<option value="Serious">Serious</option>
									<option value="Urgent">Urgent</option>
								</select>
							</div>

							<div className="text-xs text-slate-400 font-medium">
								{feedbackSubmissions.filter(fb => {
                const matchesSearch = fb.userName.toLowerCase().includes(searchQuery.toLowerCase()) || fb.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesRole = filterUserType === 'ALL' || fb.userType === filterUserType;
                const matchesSeverity = filterSeverity === 'ALL' || fb.severity === filterSeverity;
                return matchesSearch && matchesRole && matchesSeverity;
            }).length} submissions found
							</div>
						</div>

						
						<div className="grid grid-cols-1 gap-4">
							{feedbackSubmissions
                .filter(fb => {
                const matchesSearch = fb.userName.toLowerCase().includes(searchQuery.toLowerCase()) || fb.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesRole = filterUserType === 'ALL' || fb.userType === filterUserType;
                const matchesSeverity = filterSeverity === 'ALL' || fb.severity === filterSeverity;
                return matchesSearch && matchesRole && matchesSeverity;
            })
                .map((fb) => (<div key={fb.id} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs hover:shadow-xs transition-all space-y-4">
										
										<div className="flex justify-between items-start gap-4 flex-wrap pb-3 border-b border-slate-100">
											<div className="space-y-1">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="font-semibold text-slate-900 text-sm">{fb.userName}</span>
													<span className={`px-2.5 py-0.5 rounded-md text-[10px] uppercase font-semibold border ${fb.userType === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
														{fb.userType}
													</span>
													<span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${fb.comfortableSharing === 'Yes' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
														{fb.comfortableSharing === 'Yes' ? 'Has Concerns' : 'No Concerns'}
													</span>
												</div>
												<div className="text-xs text-slate-500">{fb.userEmail}</div>
											</div>
											<div className="flex items-center gap-2 text-xs">
												<span className="text-slate-400">{new Date(fb.createdAt).toLocaleString()}</span>
												{fb.comfortableSharing === 'Yes' && fb.severity && (<span className={`px-2.5 py-0.5 rounded-full font-semibold border text-[11px] ${fb.severity === 'Urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        fb.severity === 'Serious' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            fb.severity === 'Moderate' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
														{fb.severity} Severity
													</span>)}
											</div>
										</div>

										
										{fb.comfortableSharing === 'Yes' ? (<div className="space-y-3.5">
												<div>
													<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">What they want to tell us:</span>
													<p className="text-slate-800 text-xs whitespace-pre-wrap leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">{fb.feedbackText}</p>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div>
														<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Concern categories:</span>
														<div className="flex flex-wrap gap-1.5">
															{fb.concerns.split(',').map((c: string) => (<span key={c.trim()} className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-lg">
																	{c.trim()}
																</span>))}
														</div>
													</div>
													<div>
														<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">How long it has been happening:</span>
														<span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-lg inline-block">
															{fb.duration}
														</span>
													</div>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div>
														<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Involves someone else?</span>
														<span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-lg inline-block">
															{fb.involvesOthers}
														</span>
													</div>
													<div>
														<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Action they would like us to take:</span>
														<div className="flex flex-wrap gap-1.5">
															{fb.desiredAction.split(',').map((a: string) => (<span key={a.trim()} className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-lg">
																	{a.trim()}
																</span>))}
														</div>
													</div>
												</div>
												{fb.additionalNotes && (<div>
														<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Additional context:</span>
														<p className="text-slate-700 text-xs whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">{fb.additionalNotes}</p>
													</div>)}
											</div>) : (<div className="text-xs text-slate-400 italic py-2">
												Submitted &quot;No&quot; — No direct concerns reported.
											</div>)}
									</div>))}
							{feedbackSubmissions.length === 0 && (<div className="bg-white border border-slate-200/90 rounded-2xl p-16 text-center text-slate-400 text-xs italic shadow-2xs">
									No feedback submissions recorded yet.
								</div>)}
						</div>
					</div>)}

				{activeTab === 'super_admin' && isSuperAdmin && (<div className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold text-slate-900 tracking-tight">System Admins Panel</h2>
								<p className="text-xs text-slate-500 mt-0.5">Register additional admin users, set workspace permissions, and audit activity</p>
							</div>
						</div>

						{superAdminMsg && (<div className={cn("p-3.5 rounded-xl text-xs border shadow-2xs", superAdminMsg.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800")}>
								{superAdminMsg.text}
							</div>)}

						{allocatedLink && (<div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-2">
								<h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Generated Invitation Link</h4>
								<p className="text-slate-500 text-xs">Send this URL to the invited admin. They will be directed to the login page with their email prefilled:</p>
								<div className="flex items-center gap-2">
									<input type="text" readOnly value={allocatedLink} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs p-2.5 focus:outline-none"/>
									<button onClick={() => {
                    navigator.clipboard.writeText(allocatedLink);
                    alert('Invite URL copied to clipboard!');
                }} className="bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors shadow-xs">
										Copy Link
									</button>
								</div>
							</div>)}

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							
							<div className="lg:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
								<h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">Allocate New Admin</h3>
								<form onSubmit={handleAllocateAdmin} className="space-y-4">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Admin Email Address *</label>
										<input type="email" required value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="e.g. admin@domain.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Organization Name *</label>
										<input type="text" required value={newAdminOrgName} onChange={e => setNewAdminOrgName(e.target.value)} placeholder="e.g. Acme Corp" className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Initial Password *</label>
										<input type="password" required value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} placeholder="admin123" className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20"/>
									</div>

									<div className="space-y-2">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider block">Select Allowed Pages</label>
										<div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/70">
											{[
                { id: 'overview', name: 'Overview Stats' },
                { id: 'employees', name: 'Employees Directory' },
                { id: 'task_allocation', name: 'Task Allocation' },
                { id: 'attendance', name: 'Attendance Logs' },
                { id: 'shift_timings', name: 'Shift Timings' },
                { id: 'late_checkins', name: 'Late Check-ins' },
                { id: 'payouts', name: 'Payouts' },
                { id: 'leaves', name: 'Leave Requests' },
                { id: 'clients', name: 'Clients Tab' },
                { id: 'messages', name: 'Chat Messages' },
                { id: 'system_status', name: 'System Resource Status' },
                { id: 'events', name: 'Events Calendar' },
                { id: 'work_submissions', name: 'Work Submissions' },
                { id: 'leads', name: 'Leads CRM Pipeline' },
                { id: 'hr_companies', name: 'HR & Companies' },
                { id: 'form', name: 'Unanimous Form' }
            ].map(item => (<label key={item.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900 select-none">
													<input type="checkbox" checked={newAdminPages.includes(item.id)} onChange={() => togglePagePermission(item.id)} className="rounded border-slate-300 text-[#E61E32] focus:ring-[#E61E32]"/>
													<span>{item.name}</span>
												</label>))}
										</div>
									</div>

									<button type="submit" disabled={isAllocating} className="w-full bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer transition-colors disabled:opacity-50 shadow-xs">
										{isAllocating ? 'Allocating Admin...' : 'Allocate Admin'}
									</button>
								</form>
							</div>

							
							<div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
								<h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">Active Admin Directories</h3>
								<div className="overflow-x-auto">
									<table className="w-full text-left text-xs text-slate-700">
										<thead>
											<tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
												<th className="p-3 font-semibold">Admin Email</th>
												<th className="p-3 font-semibold">Organization</th>
												<th className="p-3 font-semibold">Page Access</th>
												<th className="p-3 font-semibold text-right">Action</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100">
											{adminsList.map((adm: any) => (<tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
													<td className="p-3 font-semibold text-slate-900">{adm.email}</td>
													<td className="p-3 text-slate-600">{adm.organizationName || 'WrkSpace Headquarters'}</td>
													<td className="p-3 text-slate-600 max-w-[240px]" title={adm.allowedPages || ''}>
														{adm.allowedPages ? (<div className="flex flex-wrap gap-1">
																{(adm.allowedPages || '').split(',').map((p: string) => (<span key={p} className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded capitalize">
																		{p.replace('_', ' ')}
																	</span>))}
															</div>) : '—'}
													</td>
													<td className="p-3 text-right">
														{adm.email.toLowerCase() !== 'webstrixx@gmail.com' ? (<div className="inline-flex justify-end gap-1.5">
																<button onClick={() => {
                        const inviteUrl = `${window.location.origin}/admin?invite=${adm.inviteToken}`;
                        navigator.clipboard.writeText(inviteUrl);
                        alert('Invite URL copied to clipboard!');
                    }} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs" title="Copy Invite URL">
																	<CopyIcon className="size-3.5"/>
																</button>
																<button onClick={() => handleDeleteAdmin(adm.email)} className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all cursor-pointer shadow-2xs" style={{ backgroundColor: '#dc2626', color: '#ffffff' }} title="Revoke Admin Access">
																	<Trash2Icon className="size-3.5 text-white"/>
																</button>
															</div>) : (<span className="text-[11px] text-slate-400 italic">Primary Super Admin</span>)}
													</td>
												</tr>))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>)}

				{activeTab === 'team_leads' && (isSuperAdmin || allowedTabs.includes('team_leads')) && (<div className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold text-slate-900 tracking-tight">Team Leads Registry</h2>
								<p className="text-xs text-slate-500 mt-0.5">
									Assign wing managers, define lead roles, and allocate dedicated dashboard tabs
								</p>
							</div>
							<Button onClick={() => {
                setShowLeadForm(!showLeadForm);
                setLeadMsg(null);
            }} className="bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer shadow-xs">
								{showLeadForm ? 'Cancel Allocation' : (<>
										<UserPlusIcon className="size-4 me-2 inline"/>
										Allocate Team Lead
									</>)}
							</Button>
						</div>

						{leadMsg && (<div className={cn("p-3.5 rounded-xl text-xs border shadow-2xs", leadMsg.type === 'success'
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800")}>
								{leadMsg.text}
							</div>)}

						{showLeadForm && (<form onSubmit={handleAllocateTeamLead} className="bg-white border border-slate-200/90 p-6 space-y-4 rounded-2xl shadow-2xs">
								<h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
									Create Login & Dedicated Pages Allocation
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Select Employee *</label>
										<select required className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 cursor-pointer h-10" value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)}>
											<option value="">-- Choose Employee --</option>
											{employeesList
                    .filter(emp => !teamLeadsList.some(tl => tl.employeeId === emp.id))
                    .map(emp => (<option key={emp.id} value={emp.id}>
														{emp.firstName} {emp.lastName} ({emp.id} - {emp.wingName})
													</option>))}
										</select>
									</div>

									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Assign Login Password *</label>
										<Input type="password" placeholder="leadpassword123" required className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 h-10" value={leadPassword} onChange={e => setLeadPassword(e.target.value)}/>
									</div>
								</div>

								<div className="space-y-2">
									<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider block">DEDICATE ALLOWED PAGES *</label>
									<div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-slate-200 rounded-xl p-4 bg-slate-50/70">
										{[
                    { id: 'overview', name: 'Overview' },
                    { id: 'employees', name: 'Employees' },
                    { id: 'task_allocation', name: 'Tasks' },
                    { id: 'attendance', name: 'Attendance' },
                    { id: 'leaves', name: 'Leaves' },
                    { id: 'clients', name: 'Clients' },
                    { id: 'messages', name: 'Messages' },
                    { id: 'system_status', name: 'System Resource' },
                    { id: 'events', name: 'Events Calendar' },
                    { id: 'work_submissions', name: 'Submissions' },
                    { id: 'leads', name: 'Leads CRM' },
                    { id: 'hr_companies', name: 'HR & Companies' },
                    { id: 'form', name: 'Unanimous Form' }
                ].map(item => (<label key={item.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900 select-none">
												<input type="checkbox" checked={leadAllowedPages.includes(item.id)} onChange={() => toggleLeadPagePermission(item.id)} className="rounded border-slate-300 text-[#E61E32] focus:ring-[#E61E32]"/>
												<span>{item.name}</span>
											</label>))}
									</div>
								</div>

								<Button type="submit" disabled={isAllocatingLead} className="bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-4 rounded-xl h-10 w-full cursor-pointer transition-all shadow-xs">
									{isAllocatingLead ? 'Allocating...' : 'Allocate Login & Pages'}
								</Button>
							</form>)}

						<div className="bg-white border border-slate-200/90 rounded-2xl overflow-x-auto shadow-2xs w-full">
							<table className="w-full min-w-[1000px] text-left text-xs text-slate-700">
								<thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
									<tr>
										<th className="p-4 font-semibold w-36">Employee ID</th>
										<th className="p-4 font-semibold w-52">Full Name</th>
										<th className="p-4 font-semibold w-64">Email (Login)</th>
										<th className="p-4 font-semibold w-40">Wing</th>
										<th className="p-4 font-semibold">Dedicated Pages</th>
										<th className="p-4 font-semibold text-right w-36">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{teamLeadsList.length === 0 ? (<tr>
											<td colSpan={6} className="p-8 text-center text-slate-400 text-xs italic">
												No Team Leads allocated yet. Click "Allocate Team Lead" to create a team lead login.
											</td>
										</tr>) : (teamLeadsList.map((tl) => (<tr key={tl.id} className="hover:bg-slate-50/70 transition-colors">
												<td className="p-4 font-semibold text-[#E61E32]">{tl.employeeId || '—'}</td>
												<td className="p-4 text-slate-900 font-medium">
													{tl.employee ? `${tl.employee.firstName} ${tl.employee.lastName}` : 'Unknown Employee'}
												</td>
												<td className="p-4 font-semibold text-slate-900">{tl.email}</td>
												<td className="p-4 text-slate-600">{tl.employee?.wingName || '—'}</td>
												<td className="p-4">
													<div className="flex flex-wrap gap-1">
														{tl.allowedPages ? (tl.allowedPages.split(',').map((p: string) => (<span key={p} className="text-[10px] px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded capitalize">
																	{p.replace('_', ' ')}
																</span>))) : (<span className="text-slate-400 italic">None</span>)}
													</div>
												</td>
												<td className="p-4 text-right">
													<div className="inline-flex items-center justify-end gap-1.5">
														<button onClick={() => {
                    setEditingLead(tl);
                    setEditLeadPassword('');
                    setEditLeadAllowedPages(tl.allowedPages ? tl.allowedPages.split(',') : []);
                    setShowEditLeadModal(true);
                }} className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs" title="Edit Team Lead">
															<PencilIcon className="size-3.5"/>
														</button>
														<button onClick={() => handleDeleteTeamLead(tl.id)} className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all cursor-pointer shadow-2xs" style={{ backgroundColor: '#dc2626', color: '#ffffff' }} title="Revoke Lead Access">
															<Trash2Icon className="size-3.5 text-white"/>
														</button>
													</div>
												</td>
											</tr>)))}
								</tbody>
							</table>
						</div>
					</div>)}

			</div>

			{editModalType && editingItem && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
					<div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-2xl relative">
						<div className="flex justify-between items-center border-b border-slate-100 pb-3">
							<h3 className="text-sm font-semibold text-slate-900">
								Edit {editModalType === 'employee' ? 'Employee Profile' : editModalType === 'task' ? 'Task Allocation' : editModalType === 'attendance' ? 'Attendance Log' : editModalType === 'event' ? 'Event Details' : editModalType === 'hr_company' ? 'HR & Company' : 'Details'}
							</h3>
							<button onClick={() => { setEditModalType(null); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700 font-semibold text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors">
								✕
							</button>
						</div>

						{editModalType === 'employee' && (<div className="max-h-[70vh] overflow-y-auto pr-1.5 space-y-6">
								<form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    await handleSaveEmployeeEdit(editingItem.id, {
                        firstName: formData.get('firstName') as string,
                        middleName: formData.get('middleName') as string,
                        lastName: formData.get('lastName') as string,
                        email: formData.get('email') as string,
                        phone: formData.get('phone') as string,
                        wingName: formData.get('wingName') as string,
                        wingLeadName: formData.get('wingLeadName') as string,
                        role: formData.get('role') as string,
                        gender: formData.get('gender') as string,
                        remarks: formData.get('remarks') as string,
                        monthWorked: formData.get('monthWorked') as string,
                    });
                }} className="space-y-4">
								<div className="grid grid-cols-3 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">First Name</label>
										<Input name="firstName" defaultValue={editingItem.firstName} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Middle Name</label>
										<Input name="middleName" defaultValue={editingItem.middleName || ''} className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Last Name</label>
										<Input name="lastName" defaultValue={editingItem.lastName} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Email</label>
										<Input type="email" name="email" defaultValue={editingItem.email} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Phone</label>
										<Input name="phone" defaultValue={editingItem.phone} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Wing Name</label>
										<Input name="wingName" defaultValue={editingItem.wingName} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Wing Lead</label>
										<Input name="wingLeadName" defaultValue={editingItem.wingLeadName} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Role</label>
										<Input name="role" defaultValue={editingItem.role || ''} className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Gender</label>
										<select name="gender" defaultValue={String(editingItem.gender || 'UNSPECIFIED').toUpperCase()} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl h-9 px-2 focus:outline-none cursor-pointer">
											<option value="UNSPECIFIED">Not set (employee chooses)</option>
											<option value="FEMALE">Female</option>
											<option value="MALE">Male</option>
										</select>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Month(s) Worked For</label>
										<Input name="monthWorked" defaultValue={editingItem.monthWorked || ''} className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Remarks</label>
										<Input name="remarks" defaultValue={editingItem.remarks || ''} className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
								</div>
								<div className="space-y-2 pt-2 border-t border-slate-100">
									<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Employee ID card</label>
									<p className="text-xs text-slate-500">Upload the complete ID card image. Employee will see it in Mobile More → ID card and Website ID card tab.</p>
									{editingItem.idCardUrl ? (<img src={editingItem.idCardUrl} alt="ID card" className="w-full max-h-40 object-contain border border-slate-200 rounded-xl bg-slate-50"/>) : (<div className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl p-3 text-center">No ID card uploaded yet</div>)}
									<div className="flex flex-wrap gap-2">
										<label className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-[#E61E32] hover:bg-[#c9182a] px-3.5 py-2 rounded-xl cursor-pointer shadow-xs">
											Upload ID card
											<input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file)
                        return;
                    try {
                        const dataUrl = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(String(reader.result || ''));
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                        });
                        if (dataUrl.length > 900000) {
                            alert('Image too large — use a smaller photo of the ID card');
                            return;
                        }
                        const res = await updateEmployeeIdCard(editingItem.id, dataUrl);
                        if (res.success && res.employee) {
                            setEditingItem(res.employee);
                            fetchEmployees();
                            alert('ID card uploaded');
                        }
                        else {
                            alert(res.error || 'Upload failed');
                        }
                    }
                    catch {
                        alert('Could not read image');
                    }
                }}/>
										</label>
										{editingItem.idCardUrl && (<button type="button" className="text-xs font-semibold text-rose-600 border border-rose-200 rounded-xl px-3.5 py-2 hover:bg-rose-50 cursor-pointer shadow-2xs" onClick={async () => {
                        const res = await updateEmployeeIdCard(editingItem.id, null);
                        if (res.success && res.employee) {
                            setEditingItem(res.employee);
                            fetchEmployees();
                        }
                        else {
                            alert(res.error || 'Remove failed');
                        }
                    }}>
												Remove ID card
											</button>)}
									</div>
								</div>
								<div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
									<Button type="button" variant="outline" onClick={() => { setEditModalType(null); setEditingItem(null); }} className="text-xs rounded-xl h-9 cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</Button>
									<Button type="submit" className="bg-[#E61E32] hover:bg-[#c9182a] text-xs rounded-xl h-9 text-white cursor-pointer shadow-xs">Save Changes</Button>
								</div>
							</form>

							
							<div className="border-t border-slate-100 pt-6 space-y-4">
								<div>
									<h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
										Badge Management
									</h4>
									<p className="text-xs text-slate-500 mt-0.5">
										Award professional badges to this employee. These badges will appear on their verification dossier.
									</p>
								</div>

								{badgeMessage && (<div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl">
										{badgeMessage}
									</div>)}

								
								<div className="space-y-2">
									<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Assigned Badges</label>
									{(() => {
                    let badgesList: any[] = [];
                    try {
                        if (editingItem.badges) {
                            badgesList = JSON.parse(editingItem.badges);
                        }
                    }
                    catch { }
                    if (badgesList.length === 0) {
                        return (<p className="text-xs text-slate-400 italic">No badges assigned yet.</p>);
                    }
                    return (<div className="grid grid-cols-1 gap-2">
												{badgesList.map((b: any) => (<div key={b.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
														<div className="flex items-center gap-2">
															<span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${b.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                b.color === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    b.color === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        b.color === 'orange' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            b.color === 'red' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                b.color === 'yellow' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                                    'bg-slate-100 text-slate-700 border-slate-200'}`}>
																{b.title}
															</span>
															{b.description && (<span className="text-xs text-slate-500 truncate max-w-[180px]">
																	— {b.description}
																</span>)}
														</div>
														<button type="button" onClick={() => handleDeleteBadge(editingItem.id, b.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer">
															Remove
														</button>
													</div>))}
											</div>);
                })()}
								</div>

								
								<div className="space-y-3">
									<span className="text-[11px] text-slate-700 uppercase font-semibold tracking-wider block">Select a Badge to Issue</span>

									{(() => {
                    const PRESET_BADGES = [
                        { title: 'New Joinee', icon: 'Star', color: 'blue', description: 'Welcomed as a new member of the team', emoji: '🌟', image: 'https://ik.imagekit.io/dypkhqxip/e59cb781-ca16-4699-bf99-c5f16fd55383.svg' },
                        { title: 'Employee Completion', icon: 'Award', color: 'green', description: 'Successfully completed the project / milestones', emoji: '🎓', image: 'https://ik.imagekit.io/dypkhqxip/14b964b5-5848-4a81-bf4d-fb5e2a6f423c.svg' },
                        { title: 'Employee Badge', icon: 'Shield', color: 'orange', description: 'Awarded official verified employee credentials badge', emoji: '🏷️', image: 'https://ik.imagekit.io/dypkhqxip/9fc652bf-a285-41c7-bed2-7d44d2ed1d7d.svg' },
                        { title: 'Super Worker', icon: 'Trophy', color: 'yellow', description: 'Consistently delivering outstanding work', emoji: '🏆', image: 'https://ik.imagekit.io/dypkhqxip/a40ea919-c9e6-4b41-973c-ee0205dbe244.svg' },
                        { title: 'Slashing Dev', icon: 'Zap', color: 'purple', description: 'Exceptional speed and quality in development', emoji: '⚡', image: 'https://ik.imagekit.io/dypkhqxip/c250a00f-8bd7-43e9-81b5-9d10618e8446.svg' },
                        { title: 'Core Dev', icon: 'Shield', color: 'green', description: 'Pillar of the engineering team', emoji: '🛡️' },
                        { title: 'Pro Marketer', icon: 'Flame', color: 'orange', description: 'Drives growth and brand excellence', emoji: '🔥' },
                    ];
                    return (<div className="grid grid-cols-2 gap-2">
												{PRESET_BADGES.map((badge) => {
                            const isSelected = badgeTitle === badge.title;
                            return (<button key={badge.title} type="button" onClick={() => {
                                    setBadgeTitle(badge.title);
                                    setBadgeIcon(badge.icon);
                                    setBadgeColor(badge.color);
                                    setBadgeDescription(badge.description || '');
                                    setBadgeImage((badge as any).image || '');
                                }} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center cursor-pointer transition-all ${isSelected
                                    ? 'ring-2 ring-[#E61E32] bg-rose-50/40 border-[#E61E32]'
                                    : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'}`}>
															<span className="text-xl leading-none flex items-center justify-center h-8">
																{badge.image ? (<img src={badge.image} alt={badge.title} className="w-8 h-8 object-contain"/>) : (badge.emoji)}
															</span>
															<span className={`text-xs font-semibold leading-tight ${isSelected ? 'text-[#E61E32]' : 'text-slate-800'}`}>
																{badge.title}
															</span>
														</button>);
                        })}
											</div>);
                })()}

									{badgeTitle && (<div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
											<span className="text-xs text-slate-500">Selected:</span>
											<span className="text-xs font-semibold text-slate-900">{badgeTitle}</span>
										</div>)}

									<Button type="button" disabled={!badgeTitle} onClick={() => handleGiveBadge(editingItem.id)} className="w-full bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-40 text-white text-xs font-semibold h-10 cursor-pointer flex items-center justify-center gap-2 rounded-xl transition-all shadow-xs">
										<span>🚀</span> Publish Badge to Employee
									</Button>
								</div>
							</div>

							</div>)}

						{editModalType === 'task' && (<form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const assignId = formData.get('assigneeId') as string;
                    let assignName = 'ALL MEMBERS';
                    if (assignId !== 'ALL') {
                        const matched = employeesList.find(x => x.id === assignId);
                        if (matched)
                            assignName = `${matched.firstName} ${matched.lastName}`;
                    }
                    await handleSaveTaskEdit(editingItem.id, {
                        title: formData.get('title') as string,
                        description: formData.get('description') as string,
                        reportTo: formData.get('reportTo') as string,
                        assigneeId: assignId,
                        assigneeName: assignName,
                        deadline: formData.get('deadline') as string,
                        status: formData.get('status') as string,
                        mode: formData.get('mode') as string
                    });
                }} className="space-y-4">
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Task Title</label>
										<Input name="title" defaultValue={editingItem.title} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Report To</label>
										<Input name="reportTo" defaultValue={editingItem.reportTo} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
								</div>
								<div className="space-y-1">
									<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Task Description</label>
									<textarea name="description" defaultValue={editingItem.description} required rows={3} className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#E61E32]/20 resize-none"/>
								</div>
								<div className="grid grid-cols-3 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Assign To</label>
										<select name="assigneeId" defaultValue={editingItem.assigneeId} className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl h-9 px-2 outline-none cursor-pointer">
											<option value="ALL">ALL MEMBERS</option>
											{employeesList.map(e => (<option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.id})</option>))}
										</select>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Deadline Date</label>
										<Input type="date" name="deadline" defaultValue={new Date(editingItem.deadline).toISOString().split('T')[0]} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400 cursor-pointer"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Mode</label>
										<select name="mode" defaultValue={editingItem.mode} className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl h-9 px-2 outline-none cursor-pointer">
											<option value="Onsite">Onsite</option>
											<option value="Hybrid">Hybrid</option>
										</select>
									</div>
								</div>
								<div className="space-y-1">
									<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Status</label>
									<select name="status" defaultValue={editingItem.status} className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl h-9 px-2 outline-none cursor-pointer">
										<option value="Pending">Pending</option>
										<option value="In Progress">In Progress</option>
										<option value="Completed">Completed</option>
									</select>
								</div>
								<div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
									<Button type="button" variant="outline" onClick={() => { setEditModalType(null); setEditingItem(null); }} className="text-xs rounded-xl h-9 cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</Button>
									<Button type="submit" className="bg-[#E61E32] hover:bg-[#c9182a] text-xs rounded-xl h-9 text-white cursor-pointer shadow-xs">Save Changes</Button>
								</div>
							</form>)}

						{editModalType === 'attendance' && (<form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    await handleSaveAttendanceEdit(editingItem.id, {
                        date: formData.get('date') as string,
                        checkIn: formData.get('checkIn') as string,
                        checkOut: (formData.get('checkOut') as string) || undefined,
                        status: formData.get('status') as string
                    });
                }} className="space-y-4">
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Date</label>
										<Input name="date" defaultValue={editingItem.date} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Status</label>
										<select name="status" defaultValue={editingItem.status} className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl h-9 px-2 outline-none cursor-pointer">
											<option value="Present">Present</option>
											<option value="Checked In">Checked In</option>
										</select>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Check-In Time</label>
										<Input name="checkIn" defaultValue={editingItem.checkIn} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Check-Out Time (Optional)</label>
										<Input name="checkOut" defaultValue={editingItem.checkOut || ''} className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
								</div>
								<div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
									<Button type="button" variant="outline" onClick={() => { setEditModalType(null); setEditingItem(null); }} className="text-xs rounded-xl h-9 cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</Button>
									<Button type="submit" className="bg-[#E61E32] hover:bg-[#c9182a] text-xs rounded-xl h-9 text-white cursor-pointer shadow-xs">Save Changes</Button>
								</div>
							</form>)}

						{editModalType === 'event' && (() => {
                return (<form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const repsList = editEventRepIds.map(empId => {
                            const emp = employeesList.find(e => e.id === empId);
                            return { id: empId, name: emp ? `${emp.firstName} ${emp.lastName}` : empId };
                        });
                        await handleSaveEventEdit(editingItem.id, {
                            title: formData.get('title') as string,
                            description: formData.get('description') as string,
                            organisingCollege: formData.get('organisingCollege') as string,
                            representatives: repsList,
                            startDate: formData.get('startDate') as string,
                            endDate: formData.get('endDate') as string,
                            startTime: formData.get('startTime') as string,
                            endTime: formData.get('endTime') as string,
                            venueAddress: formData.get('venueAddress') as string,
                            imageUrl: (formData.get('imageUrl') as string) || null,
                        });
                    }} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
									<div className="grid grid-cols-2 gap-2">
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Event Title</label>
											<Input name="title" defaultValue={editingItem.title} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Organising College</label>
											<Input name="organisingCollege" defaultValue={editingItem.organisingCollege} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
										</div>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Description</label>
										<textarea name="description" defaultValue={editingItem.description} required rows={2} className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#E61E32]/20 resize-none"/>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Start Date</label>
											<Input type="date" name="startDate" defaultValue={new Date(editingItem.startDate).toISOString().split('T')[0]} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400 cursor-pointer"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">End Date</label>
											<Input type="date" name="endDate" defaultValue={new Date(editingItem.endDate).toISOString().split('T')[0]} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400 cursor-pointer"/>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Start Time</label>
											<Input type="time" name="startTime" defaultValue={editingItem.startTime} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400 cursor-pointer"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">End Time</label>
											<Input type="time" name="endTime" defaultValue={editingItem.endTime} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400 cursor-pointer"/>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Venue Address</label>
											<Input name="venueAddress" defaultValue={editingItem.venueAddress} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
										</div>
										<div className="space-y-1">
											<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Image Banner Link (URL)</label>
											<Input name="imageUrl" defaultValue={editingItem.imageUrl || ''} placeholder="https://example.com/banner.jpg" className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
										</div>
									</div>
									<div className="space-y-1.5">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider block">Company Representatives *</label>
										<div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-xl p-3 bg-slate-50/70 max-h-32 overflow-y-auto">
											{employeesList.map(emp => {
                        const fullName = `${emp.firstName} ${emp.lastName}`;
                        const isChecked = editEventRepIds.includes(emp.id);
                        return (<label key={emp.id} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer hover:text-slate-900 select-none">
														<input type="checkbox" checked={isChecked} onChange={() => {
                                if (isChecked) {
                                    setEditEventRepIds(editEventRepIds.filter(id => id !== emp.id));
                                }
                                else {
                                    setEditEventRepIds([...editEventRepIds, emp.id]);
                                }
                            }} className="rounded border-slate-300 text-[#E61E32] focus:ring-[#E61E32] size-3.5"/>
														<span className="truncate">{fullName} ({emp.id})</span>
													</label>);
                    })}
										</div>
									</div>
									<div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
										<Button type="button" variant="outline" onClick={() => { setEditModalType(null); setEditingItem(null); }} className="text-xs rounded-xl h-9 cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</Button>
										<Button type="submit" className="bg-[#E61E32] hover:bg-[#c9182a] text-xs rounded-xl h-9 text-white cursor-pointer shadow-xs">Save Changes</Button>
									</div>
								</form>);
            })()}

						{editModalType === 'hr_company' && (<form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const res = await updateHrCompany(editingItem.id, {
                        companyName: formData.get('companyName') as string,
                        website: formData.get('website') as string,
                        industry: formData.get('industry') as string,
                        location: formData.get('location') as string,
                        hrName: formData.get('hrName') as string,
                        hrEmail: formData.get('hrEmail') as string,
                        hrPhone: formData.get('hrPhone') as string,
                        status: formData.get('status') as string,
                        notes: formData.get('notes') as string,
                        assignedEmployeeId: formData.get('assignedEmployeeId') as string,
                    });
                    if (res.success) {
                        setEditModalType(null);
                        setEditingItem(null);
                        await fetchHrCompaniesList();
                    }
                    else {
                        alert(res.error || 'Failed to save changes.');
                    }
                }} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs text-slate-800">
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Company Name</label>
										<Input name="companyName" defaultValue={editingItem.companyName} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Website</label>
										<Input name="website" defaultValue={editingItem.website || ''} className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Industry / Job Role</label>
										<Input name="industry" defaultValue={editingItem.industry || ''} className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Location</label>
										<Input name="location" defaultValue={editingItem.location || ''} className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
								</div>
								<div className="border-t border-slate-100 pt-2">
									<h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">HR Contact</h4>
								</div>
								<div className="grid grid-cols-3 gap-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">HR Name</label>
										<Input name="hrName" defaultValue={editingItem.hrName} required className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">HR Email</label>
										<Input name="hrEmail" type="email" defaultValue={editingItem.hrEmail || ''} className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">HR Phone</label>
										<Input name="hrPhone" defaultValue={editingItem.hrPhone || ''} className="bg-slate-50 border-slate-200 text-xs text-slate-800 rounded-xl h-9 focus-visible:ring-0 focus-visible:border-slate-400"/>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2 pt-2">
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Allocate Agent</label>
										<select name="assignedEmployeeId" defaultValue={editingItem.assignedEmployeeId || ''} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs p-2 rounded-xl focus:outline-none cursor-pointer">
											<option value="">Unassigned</option>
											{employeesList.map(emp => (<option key={emp.id} value={emp.id}>
													{emp.firstName} {emp.lastName} ({emp.id})
												</option>))}
										</select>
									</div>
									<div className="space-y-1">
										<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Status</label>
										<select name="status" defaultValue={editingItem.status} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs p-2 rounded-xl focus:outline-none cursor-pointer">
											<option value="New">New</option>
											<option value="Contacted">Contacted</option>
											<option value="Rejected">Rejected</option>
											<option value="Hired">Hired</option>
										</select>
									</div>
								</div>
								<div className="space-y-1">
									<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Notes / Logs</label>
									<textarea name="notes" defaultValue={editingItem.notes || ''} rows={2} className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#E61E32]/20 resize-none"/>
								</div>
								<div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
									<Button type="button" variant="outline" onClick={() => { setEditModalType(null); setEditingItem(null); }} className="text-xs rounded-xl h-9 cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</Button>
									<Button type="submit" className="bg-[#E61E32] hover:bg-[#c9182a] text-xs rounded-xl h-9 text-white cursor-pointer shadow-xs">Save Changes</Button>
								</div>
							</form>)}
					</div>
				</div>)}

			{viewingEmployee && (() => {
				const emp = viewingEmployee;
				const parsedProfile = profileFromEmployee(emp);
				
				// Calculate attendance statistics
				const empLogs = attendanceList.filter((log: any) => log.employeeId === emp.id);
				const presentCount = empLogs.filter((log: any) => log.status === 'Present' || log.status === 'Checked In').length;
				const absentCount = empLogs.filter((log: any) => log.status === 'Absent').length;
				const totalLogsCount = empLogs.length;
				const attendanceRate = totalLogsCount > 0 ? ((presentCount / totalLogsCount) * 100).toFixed(1) : '100.0';

				// Parse badges
				let badgesList: any[] = [];
				try {
					if (emp.badges) {
						badgesList = JSON.parse(emp.badges);
					}
				} catch (e) {}

				const initials = (first: string, last: string) => {
					return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
				};

				return (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans">
						<div className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
							{/* Header Banner */}
							<div className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
								<div className="flex items-center gap-4">
									<div className="size-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center font-bold text-brand-600 text-xl uppercase shrink-0 shadow-sm">
										{initials(emp.firstName, emp.lastName)}
									</div>
									<div>
										<div className="flex items-center gap-2 flex-wrap">
											<h3 className="text-lg font-bold text-slate-900 leading-tight">
												{emp.firstName} {emp.middleName ? `${emp.middleName} ` : ''}{emp.lastName}
											</h3>
											<span className={cn(
												"px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider border",
												emp.employmentStatus === 'Active' 
													? "bg-emerald-50 text-emerald-700 border-emerald-200" 
													: "bg-amber-50 text-amber-700 border-amber-200"
											)}>
												{emp.employmentStatus || 'Active'}
											</span>
										</div>
										<p className="text-xs text-brand-600 font-semibold mt-0.5">{emp.role || 'Employee'}</p>
										<div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1.5">
											<span>ID: {emp.id}</span>
											<span>•</span>
											<span>Wing: {emp.wingName || '—'}</span>
											<span>•</span>
											<span>Lead: {emp.wingLeadName || '—'}</span>
										</div>
									</div>
								</div>
								<button 
									onClick={() => { setViewingEmployee(null); setViewingTab('personal'); }} 
									className="text-slate-400 hover:text-slate-700 font-semibold text-sm cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors sm:self-start"
								>
									✕ Close
								</button>
							</div>

							{/* Navigation Tabs */}
							<div className="flex border-b border-slate-100 bg-white px-6 shrink-0 overflow-x-auto scrollbar-none">
								{(['personal', 'verification', 'attendance'] as const).map((t) => (
									<button
										key={t}
										onClick={() => setViewingTab(t)}
										className={cn(
											"py-3 px-4 border-b-2 text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all whitespace-nowrap",
											viewingTab === t 
												? "border-[#E61E32] text-slate-900" 
												: "border-transparent text-slate-400 hover:text-slate-650"
										)}
									>
										{t === 'personal' && 'Personal & Contact'}
										{t === 'verification' && 'Verification & Dossier'}
										{t === 'attendance' && 'Attendance & Stats'}
									</button>
								))}
							</div>

							{/* Scrollable Content Pane */}
							<div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
								{viewingTab === 'personal' && (
									<div className="space-y-6">
										{/* Personal & Contact Grid */}
										<div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
												Basic Information
											</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
												<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
													<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Email Address</span>
													<a href={`mailto:${emp.email}`} className="text-brand-600 hover:underline font-medium break-all select-all">{emp.email}</a>
												</div>
												<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
													<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Phone Number</span>
													<a href={`tel:${emp.phone}`} className="text-slate-800 hover:underline font-medium select-all">{emp.phone}</a>
												</div>
												<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
													<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Gender / Sex</span>
													<span className="text-slate-800 font-medium">
														{String(emp.gender || 'UNSPECIFIED').toUpperCase() === 'FEMALE' ? 'Female' : 
														 String(emp.gender || 'UNSPECIFIED').toUpperCase() === 'MALE' ? 'Male' : 'Not Specified'}
													</span>
												</div>
												<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
													<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Registered Since</span>
													<span className="text-slate-800 font-medium">
														{new Date(emp.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
													</span>
												</div>
											</div>
										</div>

										{/* Address details */}
										<div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
												Home Setup & Location
											</h4>
											<div className="space-y-3 text-xs">
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
														<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Home Address</span>
														<span className="text-slate-800 font-medium leading-relaxed">{emp.homeAddress || 'No home address recorded'}</span>
													</div>
													<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
														<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Plus Code</span>
														<span className="text-slate-800 font-mono font-medium">{emp.homePlusCode || 'No location coordinates linked'}</span>
													</div>
												</div>
											</div>
										</div>

										{/* Emergency Contacts */}
										<div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
												Emergency Contact Details
											</h4>
											<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
												<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
													<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Contact Person</span>
													<span className="text-slate-800 font-semibold">{emp.emergencyContactName || '—'}</span>
												</div>
												<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
													<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Phone Number</span>
													{emp.emergencyContactPhone ? (
														<a href={`tel:${emp.emergencyContactPhone}`} className="text-[#E61E32] hover:underline font-medium">{emp.emergencyContactPhone}</a>
													) : (
														<span className="text-slate-400 font-medium">—</span>
													)}
												</div>
												<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
													<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Relationship</span>
													<span className="text-slate-800 font-medium">{emp.emergencyContactRelation || '—'}</span>
												</div>
											</div>
										</div>
									</div>
								)}

								{viewingTab === 'verification' && (
									<div className="space-y-6">
										{/* Dossier Files */}
										<div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
												Dossier Attachments & Credentials
											</h4>
											<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
												{emp.personalFileUrl ? (
													<a href={emp.personalFileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/80 rounded-xl transition-all cursor-pointer">
														<span className="font-semibold text-slate-700 truncate">Personal Dossier (PDF/Image)</span>
														<span className="text-brand-600 font-bold shrink-0">View ↗</span>
													</a>
												) : (
													<div className="p-3.5 bg-slate-50/40 border border-dashed border-slate-200 text-slate-400 rounded-xl text-center">
														No Personal File attached
													</div>
												)}
												{emp.summaryFileUrl ? (
													<a href={emp.summaryFileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/80 rounded-xl transition-all cursor-pointer">
														<span className="font-semibold text-slate-700 truncate">Summary / Resume File</span>
														<span className="text-brand-600 font-bold shrink-0">View ↗</span>
													</a>
												) : (
													<div className="p-3.5 bg-slate-50/40 border border-dashed border-slate-200 text-slate-400 rounded-xl text-center">
														No Resume File attached
													</div>
												)}
												{emp.skillsFileUrl ? (
													<a href={emp.skillsFileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/80 rounded-xl transition-all cursor-pointer">
														<span className="font-semibold text-slate-700 truncate">Skills & Certifications Dossier</span>
														<span className="text-brand-600 font-bold shrink-0">View ↗</span>
													</a>
												) : (
													<div className="p-3.5 bg-slate-50/40 border border-dashed border-slate-200 text-slate-400 rounded-xl text-center">
														No Skills File attached
													</div>
												)}
											</div>
											{emp.idCardUrl && (
												<div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center">
													<span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-2 self-start">ID Card Preview</span>
													<img src={emp.idCardUrl} alt="Employee ID card" className="max-h-48 object-contain border border-slate-200 rounded-xl shadow-xs" />
												</div>
											)}
										</div>

										{/* Performance Parameters */}
										<div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
												Performance & Conduct Verification
											</h4>
											<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
												<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
													<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Overall score</span>
													<span className="text-slate-900 font-bold font-sans text-sm">{emp.overallScore || '—'}</span>
												</div>
												<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
													<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Conduct review</span>
													<span className="text-slate-900 font-semibold">{emp.conduct || '—'}</span>
												</div>
												<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
													<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Months Worked</span>
													<span className="text-slate-900 font-medium">{emp.monthWorked || '—'}</span>
												</div>
												<div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3">
													<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">Former Company</span>
													<span className="text-slate-900 font-medium">{emp.companyWorkedFor || '—'}</span>
												</div>
											</div>
											
											{/* Badges Grid */}
											<div className="mt-4 pt-4 border-t border-slate-100">
												<span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2">Awarded Badges</span>
												{badgesList.length === 0 ? (
													<p className="text-xs text-slate-400 italic">No badges assigned yet.</p>
												) : (
													<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
														{badgesList.map((badge: any) => (
															<div key={badge.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs shadow-2xs">
																<div className="shrink-0 size-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
																	<BadgeIcon name={badge.icon} className={cn(
																		"size-4.5",
																		badge.color === 'blue' && "text-blue-500",
																		badge.color === 'green' && "text-emerald-500",
																		badge.color === 'purple' && "text-purple-500",
																		badge.color === 'orange' && "text-amber-500",
																		badge.color === 'red' && "text-rose-500",
																		badge.color === 'yellow' && "text-yellow-600",
																		!badge.color && "text-slate-500"
																	)} />
																</div>
																<div className="min-w-0">
																	<p className="font-bold text-slate-800 truncate">{badge.title}</p>
																	{badge.description && <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">{badge.description}</p>}
																</div>
															</div>
														))}
													</div>
												)}
											</div>

											{/* Remarks */}
											<div className="mt-4 bg-amber-50/40 border border-amber-200/60 rounded-xl p-3.5 text-xs text-slate-700 italic">
												<span className="block text-[10px] text-amber-800 font-bold uppercase tracking-wider not-italic mb-1">Official Remarks</span>
												"{emp.remarks || 'No remarks recorded for this period.'}"
											</div>
										</div>

										{/* Tech Profiles & Social Links */}
										<div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
												Professional Profiles & Social Links
											</h4>
											<div className="flex flex-wrap gap-2.5">
												{emp.linkedinUrl && (
													<a href={emp.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all">
														LinkedIn ↗
													</a>
												)}
												{emp.githubUrl && (
													<a href={emp.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all">
														GitHub ↗
													</a>
												)}
												{emp.portfolioUrl && (
													<a href={emp.portfolioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all">
														Portfolio ↗
													</a>
												)}
												{emp.leetcodeUrl && (
													<a href={emp.leetcodeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all">
														LeetCode ↗
													</a>
												)}
												{emp.codeforcesUrl && (
													<a href={emp.codeforcesUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all">
														Codeforces ↗
													</a>
												)}
												{emp.codechefUrl && (
													<a href={emp.codechefUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all">
														CodeChef ↗
													</a>
												)}
												{emp.hackerrankUrl && (
													<a href={emp.hackerrankUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all">
														HackerRank ↗
													</a>
												)}
												{!emp.linkedinUrl && !emp.githubUrl && !emp.portfolioUrl && !emp.leetcodeUrl && !emp.codeforcesUrl && !emp.codechefUrl && !emp.hackerrankUrl && (
													<p className="text-xs text-slate-400 italic">No social or coding profiles linked.</p>
												)}
											</div>
										</div>

										{/* Education & Experience Details */}
										<div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-5">
											<div>
												<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
													Professional Dossier Summary
												</h4>
												{emp.professionalTitle && (
													<p className="text-xs font-semibold text-slate-700 mt-2">Title: <span className="text-slate-900 font-bold">{emp.professionalTitle}</span></p>
												)}
												{emp.careerObjective && (
													<div className="mt-3 bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs text-slate-650 leading-relaxed">
														<span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Career Objective</span>
														{emp.careerObjective}
													</div>
												)}
											</div>

											{/* Experience History */}
											<div>
												<span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2.5">Work History & Experience</span>
												{parsedProfile.experience.length === 0 ? (
													<p className="text-xs text-slate-400 italic">No professional work experience listed.</p>
												) : (
													<div className="space-y-3">
														{parsedProfile.experience.map((exp) => (
															<div key={exp.id} className="border border-slate-200/75 p-3 rounded-xl bg-slate-50/40 text-xs">
																<div className="flex justify-between items-start gap-2 flex-wrap">
																	<div>
																		<h5 className="font-bold text-slate-950">{exp.title}</h5>
																		<p className="text-slate-600 mt-0.5">{exp.company} {exp.location ? `• ${exp.location}` : ''}</p>
																	</div>
																	<span className="px-2 py-0.5 bg-slate-200 text-slate-755 font-semibold rounded text-[10px] tracking-wide shrink-0">
																		{exp.from} - {exp.current ? 'Present' : exp.to}
																	</span>
																</div>
																{exp.description && <p className="text-slate-600 mt-2 whitespace-pre-line leading-relaxed">{exp.description}</p>}
																{exp.technologiesUsed && <p className="text-[10px] text-slate-500 font-mono mt-1.5"><span className="font-bold text-slate-600">Tech Stack:</span> {exp.technologiesUsed}</p>}
															</div>
														))}
													</div>
												)}
											</div>

											{/* Education History */}
											<div>
												<span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2.5">Education History</span>
												{parsedProfile.education.length === 0 ? (
													<p className="text-xs text-slate-400 italic">No education details recorded.</p>
												) : (
													<div className="space-y-3">
														{parsedProfile.education.map((edu) => (
															<div key={edu.id} className="border border-slate-200/75 p-3 rounded-xl bg-slate-50/40 text-xs">
																<div className="flex justify-between items-start gap-2 flex-wrap">
																	<div>
																		<h5 className="font-bold text-slate-950">{edu.degree} {edu.specialization ? `in ${edu.specialization}` : ''}</h5>
																		<p className="text-slate-650 mt-0.5">{edu.institution}</p>
																	</div>
																	<span className="px-2 py-0.5 bg-slate-200 text-slate-755 font-semibold rounded text-[10px] tracking-wide shrink-0">
																		{edu.from} - {edu.to}
																	</span>
																</div>
																{edu.cgpa && <p className="text-[11px] font-bold text-[#E61E32] mt-1.5">CGPA/Percentage: {edu.cgpa}</p>}
															</div>
														))}
													</div>
												)}
											</div>

											{/* Projects */}
											<div>
												<span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2.5">Projects Built</span>
												{parsedProfile.projects.length === 0 ? (
													<p className="text-xs text-slate-400 italic">No projects listed.</p>
												) : (
													<div className="space-y-3">
														{parsedProfile.projects.map((proj) => (
															<div key={proj.id} className="border border-slate-200/75 p-3 rounded-xl bg-slate-50/40 text-xs">
																<div className="flex justify-between items-start gap-2 flex-wrap">
																	<div>
																		<h5 className="font-bold text-slate-950">{proj.name}</h5>
																		<p className="text-[#E61E32] font-semibold text-[10px] mt-0.5">Role: {proj.role}</p>
																	</div>
																	<div className="flex gap-2 shrink-0">
																		{proj.githubUrl && <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="text-blue-650 font-semibold hover:underline text-[10px]">GitHub ↗</a>}
																		{proj.liveUrl && <a href={proj.liveUrl} target="_blank" rel="noreferrer" className="text-emerald-650 font-semibold hover:underline text-[10px]">Live URL ↗</a>}
																	</div>
																</div>
																{proj.description && <p className="text-slate-605 mt-2 leading-relaxed">{proj.description}</p>}
																{proj.tech && <p className="text-[10px] text-slate-500 font-mono mt-1.5"><span className="font-bold text-slate-600">Tech Stack:</span> {proj.tech}</p>}
															</div>
														))}
													</div>
												)}
											</div>
										</div>
									</div>
								)}

								{viewingTab === 'attendance' && (
									<div className="space-y-6 animate-in fade-in duration-200">
										{/* Statistics Grid */}
										<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
											<div className="bg-white border border-slate-250/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
												<span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Logs</span>
												<span className="text-2xl font-black text-slate-900 mt-2">{totalLogsCount} Days</span>
											</div>
											<div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
												<span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Days Present</span>
												<span className="text-2xl font-black text-emerald-700 mt-2">{presentCount} Days</span>
											</div>
											<div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
												<span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider">Days Absent</span>
												<span className="text-2xl font-black text-rose-700 mt-2">{absentCount} Days</span>
											</div>
											<div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
												<span className="text-[10px] text-blue-800 font-bold uppercase tracking-wider">Attendance Rate</span>
												<span className="text-2xl font-black text-blue-700 mt-2">{attendanceRate}%</span>
											</div>
										</div>

										{/* Attendance logs list */}
										<div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
											<h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
												Attendance History Logs ({empLogs.length})
											</h4>
											
											{empLogs.length === 0 ? (
												<p className="text-xs text-slate-400 italic text-center py-6">No attendance logs found in directory for this employee.</p>
											) : (
												<div className="overflow-x-auto max-h-[40vh] scrollbar-thin">
													<table className="w-full text-xs text-left border-collapse">
														<thead>
															<tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
																<th className="py-2.5 px-3">Date</th>
																<th className="py-2.5 px-3">Check-In</th>
																<th className="py-2.5 px-3">Check-Out</th>
																<th className="py-2.5 px-3">Status</th>
															</tr>
														</thead>
														<tbody>
															{empLogs.map((log: any) => (
																<tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/40 text-slate-700">
																	<td className="py-2.5 px-3 font-semibold text-slate-900">{log.date}</td>
																	<td className="py-2.5 px-3">
																		<span className={cn(
																			"px-1.5 py-0.5 rounded text-[10px] font-mono",
																			log.checkIn === 'Absent' ? "text-rose-700 bg-rose-50" : "text-slate-800 bg-slate-100"
																		)}>
																			{log.checkIn}
																		</span>
																	</td>
																	<td className="py-2.5 px-3">
																		{log.checkOut ? (
																			<span className={cn(
																				"px-1.5 py-0.5 rounded text-[10px] font-mono",
																				log.checkOut === 'Absent' ? "text-rose-700 bg-rose-50" : "text-slate-800 bg-slate-100"
																			)}>
																				{log.checkOut}
																			</span>
																		) : (
																			<span className="text-slate-400 font-light">—</span>
																		)}
																	</td>
																	<td className="py-2.5 px-3">
																		<span className={cn(
																			"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
																			(log.status === 'Checked In' || log.status === 'Present') 
																				? "bg-emerald-50 text-emerald-700 border-emerald-150" 
																				: "bg-rose-50 text-rose-700 border-rose-150"
																		)}>
																			<span className={cn(
																				"size-1.5 rounded-full",
																				(log.status === 'Checked In' || log.status === 'Present') ? "bg-emerald-500" : "bg-rose-500"
																			)}/>
																			{log.status}
																		</span>
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											)}
										</div>
									</div>
								)}
							</div>

							{/* Footer */}
							<div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end shrink-0">
								<Button 
									onClick={() => { setViewingEmployee(null); setViewingTab('personal'); }} 
									className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-5 rounded-xl cursor-pointer"
								>
									Close View
								</Button>
							</div>
						</div>
					</div>
				)
			})()}

			{showEditLeadModal && editingLead && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
					<div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-2xl relative">
						<div className="flex justify-between items-center border-b border-slate-100 pb-3">
							<h3 className="text-sm font-semibold text-slate-900">
								Edit Team Lead Permission
							</h3>
							<button onClick={() => { setShowEditLeadModal(false); setEditingLead(null); }} className="text-slate-400 hover:text-slate-700 font-semibold text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors">
								✕
							</button>
						</div>

						<form onSubmit={handleSaveTeamLeadEdit} className="space-y-4">
							<div className="space-y-1">
								<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Login Email</label>
								<Input type="text" disabled className="bg-slate-100 border-slate-200 text-slate-500 text-xs rounded-xl h-10 opacity-70" value={editingLead.email}/>
							</div>

							<div className="space-y-1">
								<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Update Login Password (optional)</label>
								<Input type="password" placeholder="Leave blank to keep current password" className="bg-slate-50 border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61E32]/20 rounded-xl h-10 transition-colors" value={editLeadPassword} onChange={e => setEditLeadPassword(e.target.value)}/>
							</div>

							<div className="space-y-2">
								<label className="text-[11px] font-medium text-slate-700 uppercase tracking-wider block">DEDICATE ALLOWED PAGES *</label>
								<div className="grid grid-cols-2 gap-3 border border-slate-200 rounded-xl p-4 bg-slate-50/70">
									{[
                { id: 'overview', name: 'Overview' },
                { id: 'employees', name: 'Employees' },
                { id: 'task_allocation', name: 'Tasks' },
                { id: 'attendance', name: 'Attendance' },
                { id: 'leaves', name: 'Leaves' },
                { id: 'clients', name: 'Clients' },
                { id: 'messages', name: 'Messages' },
                { id: 'system_status', name: 'System Resource' },
                { id: 'events', name: 'Events Calendar' },
                { id: 'work_submissions', name: 'Submissions' },
                { id: 'leads', name: 'Leads CRM' },
                { id: 'hr_companies', name: 'HR & Companies' },
                { id: 'form', name: 'Unanimous Form' }
            ].map(item => (<label key={item.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900 select-none">
											<input type="checkbox" checked={editLeadAllowedPages.includes(item.id)} onChange={() => toggleEditLeadPagePermission(item.id)} className="rounded border-slate-300 text-[#E61E32] focus:ring-[#E61E32]"/>
											<span>{item.name}</span>
										</label>))}
								</div>
							</div>

							<div className="flex gap-3 pt-2">
								<button type="button" onClick={() => { setShowEditLeadModal(false); setEditingLead(null); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl cursor-pointer transition-colors">
									Cancel
								</button>
								<button type="submit" className="flex-1 bg-[#E61E32] hover:bg-[#c9182a] text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer transition-colors shadow-xs">
									Save Changes
								</button>
							</div>
						</form>
					</div>
				</div>)}
		</main>);
}
