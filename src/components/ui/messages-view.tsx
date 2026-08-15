'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
	HashIcon,
	SendIcon,
	UsersIcon,
	MessageSquareIcon,
	SearchIcon,
	CircleIcon,
	ArrowLeftIcon,
	ShieldAlertIcon,
	CheckIcon,
	XIcon,
	ChevronDownIcon,
	PencilIcon,
	PaperclipIcon,
	CopyIcon,
	Trash2Icon,
	LockIcon,
	ClockIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { memberChatColor } from '@/lib/chat-member-color';
import { ChatAvatar, clearChatAvatarCache } from './chat-avatar';
import { connectRealtime } from '@/lib/realtime-client';
import {
	getMessages,
	postMessage,
	postMessageWithAttachment,
	editMessage,
	deleteMessage,
	toggleMessageReaction,
	getChatMembers,
	requestChannelAccess,
	getChannelAccessStatus,
	getPendingChannelAccessRequests,
	approveChannelAccessRequest,
	rejectChannelAccessRequest,
} from '@/app/admin/actions';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;
const EDIT_WINDOW_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 1500; // blazing fast polling

const CHANNEL_META: Record<string, { label: string; accent: string; iconColor: string; bg: string }> = {
	public: {
		label: 'Public Chat',
		accent: '#E61E32',
		iconColor: '#E61E32',
		bg: 'rgba(230,30,50,0.07)',
	},
	marketing: {
		label: 'Marketing Team',
		accent: '#d97706',
		iconColor: '#d97706',
		bg: 'rgba(217,119,6,0.07)',
	},
	technical: {
		label: 'Technical Team',
		accent: '#0284c7',
		iconColor: '#0284c7',
		bg: 'rgba(2,132,199,0.07)',
	},
	core: {
		label: 'Core Team',
		accent: '#7c3aed',
		iconColor: '#7c3aed',
		bg: 'rgba(124,58,237,0.07)',
	},
};

interface ChatMember {
	id: string;
	name: string;
	email: string;
	role: string;
	hasPhoto?: boolean;
}

interface ReactionType {
	id: string;
	messageId: string;
	userId: string;
	userName: string;
	emoji: string;
}

interface MessageType {
	id: string;
	channel: string;
	senderId: string;
	senderName: string;
	content: string;
	createdAt: Date | string;
	editedAt?: Date | string | null;
	reactions?: ReactionType[];
	senderPhotoUrl?: string | null;
	attachmentType?: 'image' | 'video' | 'file' | null;
	attachmentName?: string | null;
	attachmentUrl?: string | null;
	_optimistic?: boolean;
}

interface MessagesViewProps {
	currentUser: {
		id: string;
		name: string;
		email: string;
		role: 'Admin' | 'Employee';
		photoUrl?: string | null;
	};
	adminEmail?: string;
}

export function MessagesView({ currentUser, adminEmail }: MessagesViewProps) {
	const avatarAdminEmail = adminEmail || (currentUser.role === 'Admin' ? currentUser.email : undefined);
	const [members, setMembers] = useState<ChatMember[]>([]);
	const [activeChannel, setActiveChannel] = useState<string>('public');
	const [channelTitle, setChannelTitle] = useState<string>('Public Chat');
	const [messages, setMessages] = useState<MessageType[]>([]);
	const [messageText, setMessageText] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const [accessStatus, setAccessStatus] = useState<'Approved' | 'Pending' | 'Rejected' | 'None'>('Approved');
	const [isCheckingAccess, setIsCheckingAccess] = useState(false);
	const [isRequestingAccess, setIsRequestingAccess] = useState(false);
	const [pendingRequests, setPendingRequests] = useState<any[]>([]);

	const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
	const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editText, setEditText] = useState('');
	const [reactBusyId, setReactBusyId] = useState<string | null>(null);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const attachInputRef = useRef<HTMLInputElement>(null);
	const activeChannelRef = useRef(activeChannel);
	activeChannelRef.current = activeChannel;

	const normalizeUserId = (value: string | null | undefined) => String(value || '').trim().toLowerCase();
	const isCurrentUserMessage = (
		senderId: string | null | undefined,
		senderName?: string | null,
	) =>
		normalizeUserId(senderId) === normalizeUserId(currentUser.id) ||
		normalizeUserId(senderName) === normalizeUserId(currentUser.name);
	const maxAttachBytes = 10 * 1024 * 1024;

	const fileToDataUrl = (file: File): Promise<string> =>
		new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result || ''));
			reader.onerror = () => reject(new Error('Could not read file'));
			reader.readAsDataURL(file);
		});

	const canEditMessage = (msg: MessageType) => {
		if (!isCurrentUserMessage(msg.senderId, msg.senderName)) return false;
		const created = new Date(msg.createdAt).getTime();
		return Date.now() - created <= EDIT_WINDOW_MS;
	};

	const handleReact = async (messageId: string, emoji: string) => {
		setReactBusyId(messageId);
		try {
			await toggleMessageReaction(messageId, currentUser.id, currentUser.name, emoji);
			await fetchMessages(false);
		} catch (err) {
			console.error(err);
		} finally {
			setReactBusyId(null);
			setMenuMsgId(null);
		}
	};

	const handleSaveEdit = async () => {
		if (!editingId || !editText.trim()) return;
		const res = await editMessage(editingId, currentUser.id, editText);
		if (res.success) {
			setEditingId(null);
			setEditText('');
			await fetchMessages(false);
		} else {
			alert(res.error || 'Could not edit message');
		}
	};

	const handleDeleteMessage = async (msg: MessageType) => {
		const ok = window.confirm('Delete this message for everyone?');
		if (!ok) return;
		const res = await deleteMessage(msg.id, currentUser.id);
		if (res.success) {
			setMessages((prev) => prev.filter((m) => m.id !== msg.id));
			setMenuMsgId(null);
			return;
		}
		alert(res.error || 'Could not delete message');
	};

	const handleCopyMessage = async (content: string) => {
		try {
			await navigator.clipboard.writeText(content || '');
		} catch {
			alert('Could not copy message');
		} finally {
			setMenuMsgId(null);
		}
	};

	const handleFilePick = async (file: File | null) => {
		if (!file || isSending) return;
		if (file.size > maxAttachBytes) {
			alert('File too large. Keep under 10 MB.');
			return;
		}
		setIsSending(true);
		try {
			const dataUrl = await fileToDataUrl(file);
			const mime = file.type || 'application/octet-stream';
			const type: 'image' | 'video' | 'file' =
				mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'file';
			const res = await postMessageWithAttachment(
				activeChannel,
				currentUser.id,
				currentUser.role === 'Admin' ? 'Admin' : currentUser.name,
				'',
				currentUser.role,
				{
					attachmentUrl: dataUrl,
					attachmentType: type,
					attachmentName: file.name,
				},
			);
			if (res.success && res.message) {
				const createdMessage = res.message as MessageType;
				setMessages((prev) => (prev.some((item) => item.id === createdMessage.id) ? prev : [...prev, createdMessage]));
				requestAnimationFrame(scrollMessagesToBottom);
			} else if (!res.success) {
				alert(res.error || 'Could not send attachment');
			}
		} catch (err) {
			console.error(err);
			alert('Could not send attachment');
		} finally {
			setIsSending(false);
		}
	};

	// Load members once
	useEffect(() => {
		const loadMembers = async () => {
			const res = await getChatMembers();
			if (res.success && res.members) {
				const filtered = res.members.filter(m => m.id !== currentUser.id);
				setMembers(filtered);
			}
		};
		loadMembers();
	}, [currentUser.id]);

	// Close menu on outside click
	useEffect(() => {
		const closeMenu = (event: MouseEvent | TouchEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) return;
			if (target.closest('[data-msg-menu]') || target.closest('[data-msg-menu-trigger]')) return;
			setMenuMsgId(null);
		};
		document.addEventListener('mousedown', closeMenu);
		document.addEventListener('touchstart', closeMenu);
		return () => {
			document.removeEventListener('mousedown', closeMenu);
			document.removeEventListener('touchstart', closeMenu);
		};
	}, []);

	// Realtime socket subscription
	useEffect(() => {
		const token =
			typeof window !== 'undefined'
				? localStorage.getItem('wrkspace_employee_token') ||
					(() => {
						try {
							const s = localStorage.getItem('wrkspace_employee_session');
							return s ? (JSON.parse(s) as { token?: string }).token || '' : '';
						} catch {
							return '';
						}
					})()
				: '';
		if (!token) return;
		const stop = connectRealtime({
			token,
			onSafety: (p) => {
				if (String(p.kind || '') !== 'photo_updated') return;
				const id = String(p.employeeId || '');
				clearChatAvatarCache(id || undefined);
				setMembers((prev) =>
					prev.map((m) =>
						m.id === id ? { ...m, hasPhoto: Boolean(p.hasPhoto) } : { ...m },
					),
				);
				setMessages((prev) => [...prev]);
			},
			onMessage: (p) => {
				const targetChannel = String(p.channel || '');
				if (!targetChannel || targetChannel !== activeChannelRef.current) return;
				const shouldStickToBottom = isNearBottom();
				void fetchMessages(false).then(() => {
					if (shouldStickToBottom) {
						requestAnimationFrame(scrollMessagesToBottom);
					}
				});
			},
		});
		return stop;
	}, [currentUser.id, currentUser.role]);

	// Access check
	const checkAccess = useCallback(async (channelId: string) => {
		if (channelId === 'public' || channelId.startsWith('dm:')) {
			setAccessStatus('Approved');
			return;
		}
		if (currentUser.role === 'Admin') {
			setAccessStatus('Approved');
			loadPendingRequests(channelId);
			return;
		}
		setIsCheckingAccess(true);
		try {
			const res = await getChannelAccessStatus(currentUser.id, channelId);
			if (res.success && res.status) {
				setAccessStatus(res.status as any);
			} else {
				setAccessStatus('None');
			}
		} catch {
			setAccessStatus('None');
		} finally {
			setIsCheckingAccess(false);
		}
	}, [currentUser.id, currentUser.role]);

	const loadPendingRequests = async (channelId: string) => {
		if (currentUser.role !== 'Admin') return;
		try {
			const res = await getPendingChannelAccessRequests(channelId, currentUser.role);
			if (res.success && res.requests) {
				setPendingRequests(res.requests);
			}
		} catch (err) {
			console.error(err);
		}
	};

	const fetchMessages = useCallback(async (showLoading = false) => {
		if (showLoading) setIsLoading(true);
		try {
			const res = await getMessages(activeChannelRef.current, currentUser.id, currentUser.role);
			if (res.success && res.messages) {
				setMessages(res.messages as any);
				if (showLoading) {
					requestAnimationFrame(scrollMessagesToBottom);
				}
			}
		} catch (err) {
			console.error(err);
		} finally {
			if (showLoading) setIsLoading(false);
		}
	}, [currentUser.id, currentUser.role]);

	// Fast polling + access checks
	useEffect(() => {
		checkAccess(activeChannel);
		fetchMessages(true);

		const interval = setInterval(() => {
			const isUnrestricted = activeChannel === 'public' || activeChannel.startsWith('dm:') || currentUser.role === 'Admin';
			if (isUnrestricted || accessStatus === 'Approved') {
				fetchMessages(false);
			}

			if (currentUser.role === 'Admin' && (activeChannel === 'marketing' || activeChannel === 'technical' || activeChannel === 'core')) {
				loadPendingRequests(activeChannel);
			} else if (currentUser.role === 'Employee' && (activeChannel === 'marketing' || activeChannel === 'technical' || activeChannel === 'core')) {
				getChannelAccessStatus(currentUser.id, activeChannel).then(res => {
					if (res.success && res.status) {
						setAccessStatus(res.status as any);
					}
				});
			}
		}, POLL_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [activeChannel, accessStatus, currentUser.id, currentUser.role]);

	const scrollMessagesToBottom = () => {
		const el = messagesEndRef.current?.parentElement;
		if (el) el.scrollTop = el.scrollHeight;
	};

	const isNearBottom = () => {
		const el = messagesEndRef.current?.parentElement;
		if (!el) return true;
		return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
	};

	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!messageText.trim() || isSending) return;

		const tempText = messageText;
		setMessageText('');

		// Optimistic message for instant feedback
		const optimisticMsg: MessageType = {
			id: `optimistic-${Date.now()}`,
			channel: activeChannel,
			senderId: currentUser.id,
			senderName: currentUser.role === 'Admin' ? 'Admin' : currentUser.name,
			content: tempText,
			createdAt: new Date().toISOString(),
			reactions: [],
			_optimistic: true,
		};
		setMessages((prev) => [...prev, optimisticMsg]);
		requestAnimationFrame(scrollMessagesToBottom);

		setIsSending(true);
		try {
			const res = await postMessage(
				activeChannel,
				currentUser.id,
				currentUser.role === 'Admin' ? 'Admin' : currentUser.name,
				tempText,
				currentUser.role,
			);
			if (res.success) {
				// Remove optimistic and get real messages
				await fetchMessages(false);
				requestAnimationFrame(scrollMessagesToBottom);
			} else {
				// Rollback
				setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
				setMessageText(tempText);
			}
		} catch (err) {
			console.error(err);
			setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
			setMessageText(tempText);
		} finally {
			setIsSending(false);
		}
	};

	const handleRequestAccess = async () => {
		setIsRequestingAccess(true);
		try {
			const res = await requestChannelAccess(currentUser.id, currentUser.name, activeChannel);
			if (res.success && res.request) {
				setAccessStatus(res.request.status as any);
			}
		} catch (err) {
			console.error(err);
		} finally {
			setIsRequestingAccess(false);
		}
	};

	const handleApproveRequest = async (requestId: string) => {
		try {
			const res = await approveChannelAccessRequest(requestId, currentUser.role);
			if (res.success) {
				await loadPendingRequests(activeChannel);
			}
		} catch (err) {
			console.error(err);
		}
	};

	const handleRejectRequest = async (requestId: string) => {
		try {
			const res = await rejectChannelAccessRequest(requestId, currentUser.role);
			if (res.success) {
				await loadPendingRequests(activeChannel);
			}
		} catch (err) {
			console.error(err);
		}
	};

	const selectChannel = (channelId: string, title: string) => {
		setActiveChannel(channelId);
		setChannelTitle(title);
		setMessages([]);
		setMobileView('chat');
		setPendingRequests([]);
		checkAccess(channelId);
	};

	const selectDM = (member: ChatMember) => {
		const sortedIds = [currentUser.id, member.id].sort();
		const dmChannelId = `dm:${sortedIds[0]}:${sortedIds[1]}`;
		selectChannel(dmChannelId, member.name);
	};

	const filteredMembers = members.filter(m =>
		m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		m.email.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const formatTime = (dateStr: Date | string) => {
		const date = new Date(dateStr);
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();
		if (isToday) {
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	return (
		<div className="w-full h-full min-w-0 bg-white flex overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
			<input
				ref={attachInputRef}
				type="file"
				className="hidden"
				accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
				onChange={(e) => {
					const file = e.target.files?.[0] || null;
					e.target.value = '';
					void handleFilePick(file);
				}}
			/>

			{/* ── SIDEBAR ── */}
			<div className={cn(
				"w-full md:w-72 border-r border-slate-150 flex flex-col bg-slate-50 shrink-0",
				mobileView === 'chat' ? "hidden md:flex" : "flex"
			)}>
				{/* Search */}
				<div className="p-3 border-b border-slate-150 bg-white">
					<div className="relative">
						<SearchIcon className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
						<input
							type="text"
							placeholder="Search people..."
							className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E61E32]/30 focus:border-[#E61E32]/40 transition-colors"
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				{/* Channels + DMs */}
				<div className="flex-1 overflow-y-auto py-3 space-y-5">
					{/* Channels section */}
					<div className="space-y-1 px-3">
						<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Channels</p>
						{(['public', 'marketing', 'technical', 'core'] as const).map((id) => {
							const meta = CHANNEL_META[id];
							const restricted = id !== 'public' && currentUser.role === 'Employee';
							const active = activeChannel === id;
							return (
								<button
									key={id}
									type="button"
									onClick={() => selectChannel(id, meta.label)}
									className={cn(
										"w-full text-left px-3 py-2.5 text-xs flex items-center justify-between gap-2 transition-all cursor-pointer rounded-lg font-medium",
										active
											? "text-white shadow-sm"
											: "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
									)}
									style={active ? { backgroundColor: meta.accent } : undefined}
								>
									<span className="flex items-center gap-2.5 min-w-0">
										{id === 'public' ? (
											<UsersIcon
												className="size-3.5 shrink-0"
												style={!active ? { color: meta.iconColor } : undefined}
											/>
										) : (
											<HashIcon
												className="size-3.5 shrink-0"
												style={!active ? { color: meta.iconColor } : undefined}
											/>
										)}
										<span className="truncate">{meta.label}</span>
									</span>
									{restricted && (
										<LockIcon className="size-3 shrink-0 opacity-60" />
									)}
								</button>
							);
						})}
					</div>

					{/* DMs section */}
					<div className="px-3 space-y-1">
						<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Direct Messages</p>
						{filteredMembers.length === 0 ? (
							<p className="px-3 text-xs text-slate-400 italic">No members found</p>
						) : (
							filteredMembers.map((member) => {
								const sortedIds = [currentUser.id, member.id].sort();
								const dmId = `dm:${sortedIds[0]}:${sortedIds[1]}`;
								const isSelected = activeChannel === dmId;

								return (
									<button
										key={member.id}
										onClick={() => selectDM(member)}
										className={cn(
											"w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-all cursor-pointer rounded-lg",
											isSelected
												? "bg-[#E61E32]/10 border border-[#E61E32]/20 text-[#E61E32] font-semibold"
												: "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
										)}
									>
										<div className="flex items-center gap-2.5 overflow-hidden min-w-0">
											<ChatAvatar
												id={member.id}
												name={member.name}
												hasPhoto={member.hasPhoto !== false}
												adminEmail={avatarAdminEmail}
												size={26}
											/>
											<span className="truncate font-medium">{member.name}</span>
										</div>
										<span className={cn(
											"text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide shrink-0",
											member.role === 'Admin'
												? "bg-[#E61E32] text-white"
												: "bg-slate-200 text-slate-600"
										)}>
											{member.role === 'Admin' ? 'ADM' : member.role.slice(0, 3).toUpperCase()}
										</span>
									</button>
								);
							})
						)}
					</div>
				</div>

				{/* Current user footer */}
				<div className="p-3 border-t border-slate-150 bg-white flex items-center justify-between">
					<div className="flex items-center gap-2.5 overflow-hidden">
						{currentUser.role === 'Admin' && !currentUser.photoUrl ? (
							<span className="size-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#E61E32] text-white shrink-0">
								AD
							</span>
						) : (
							<ChatAvatar
								id={currentUser.id}
								name={currentUser.name}
								photoUrl={currentUser.photoUrl}
								adminEmail={avatarAdminEmail}
								size={30}
							/>
						)}
						<div className="overflow-hidden">
							<p className="text-xs font-semibold text-slate-800 truncate">{currentUser.name}</p>
							<p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
						</div>
					</div>
					<div className="flex items-center gap-1.5 shrink-0">
						<CircleIcon className="size-2 text-emerald-500 fill-emerald-500" />
						<span className="text-[9px] text-emerald-600 font-semibold">Online</span>
					</div>
				</div>
			</div>

			{/* ── MAIN CHAT AREA ── */}
			<div className={cn(
				"flex-1 min-w-0 flex flex-col bg-white",
				mobileView === 'sidebar' ? "hidden md:flex" : "flex"
			)}>
				{/* Chat Header */}
				<div className="px-5 py-3 border-b border-slate-150 flex items-center gap-3 bg-white shadow-xs">
					<button
						type="button"
						onClick={() => setMobileView('sidebar')}
						className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors shrink-0"
					>
						<ArrowLeftIcon className="size-4" />
					</button>
					{activeChannel.startsWith('dm:') ? (
						<div className="size-8 shrink-0 flex items-center justify-center rounded-full bg-slate-100 text-slate-600">
							<UsersIcon className="size-4" />
						</div>
					) : (
						<div
							className="size-8 shrink-0 flex items-center justify-center rounded-lg"
							style={{ backgroundColor: CHANNEL_META[activeChannel]?.bg || 'rgba(230,30,50,0.07)' }}
						>
							{activeChannel === 'public' ? (
								<UsersIcon className="size-4" style={{ color: CHANNEL_META[activeChannel]?.iconColor || '#E61E32' }} />
							) : (
								<HashIcon className="size-4" style={{ color: CHANNEL_META[activeChannel]?.iconColor || '#E61E32' }} />
							)}
						</div>
					)}
					<div className="min-w-0">
						<p className="text-sm font-semibold text-slate-900 truncate">{channelTitle}</p>
						<p className="text-[10px] text-slate-400">
							{activeChannel.startsWith('dm:') ? 'Direct message' : CHANNEL_META[activeChannel]?.label || 'Channel'}
						</p>
					</div>
				</div>

				{/* Pending access requests banner (Admin only) */}
				{currentUser.role === 'Admin' && pendingRequests.length > 0 && (
					<div className="bg-amber-50 border-b border-amber-200 px-5 py-3 space-y-2">
						<p className="text-xs text-amber-700 font-bold flex items-center gap-2">
							<span className="size-2 rounded-full bg-amber-500 animate-ping shrink-0" />
							{pendingRequests.length} Pending Channel Access Request{pendingRequests.length > 1 ? 's' : ''}
						</p>
						<div className="max-h-36 overflow-y-auto space-y-2">
							{pendingRequests.map((req) => (
								<div key={req.id} className="flex items-center justify-between text-xs py-1.5 border-t border-amber-100">
									<div>
										<span className="font-semibold text-slate-800">{req.employeeName}</span>
										<span className="ml-2 text-[10px] text-slate-500">({req.employeeId})</span>
									</div>
									<div className="flex gap-2">
										<button
											onClick={() => handleApproveRequest(req.id)}
											className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors rounded"
											title="Approve"
										>
											<CheckIcon className="size-3" />
										</button>
										<button
											onClick={() => handleRejectRequest(req.id)}
											className="p-1.5 bg-red-600 hover:bg-red-500 text-white cursor-pointer transition-colors rounded"
											title="Decline"
										>
											<XIcon className="size-3" />
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Messages area */}
				<div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-6 space-y-3 bg-slate-50/50 flex flex-col justify-start">
					{isCheckingAccess ? (
						<div className="h-full flex items-center justify-center">
							<div className="flex items-center gap-3 text-slate-500">
								<span className="size-5 border-2 border-[#E61E32]/30 border-t-[#E61E32] rounded-full animate-spin" />
								<span className="text-sm">Verifying access...</span>
							</div>
						</div>
					) : accessStatus === 'None' ? (
						<div className="max-w-sm mx-auto my-auto text-center space-y-5 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
							<div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto">
								<ShieldAlertIcon className="size-7 text-[#E61E32]" />
							</div>
							<div className="space-y-2">
								<h3 className="text-sm font-bold text-slate-800">Access Required</h3>
								<p className="text-xs text-slate-500 leading-relaxed">
									The <span className="font-semibold text-slate-700">#{activeChannel}</span> channel is restricted to approved department members.
								</p>
							</div>
							<button
								onClick={handleRequestAccess}
								disabled={isRequestingAccess}
								className="w-full bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-6 rounded-lg cursor-pointer transition-all"
							>
								{isRequestingAccess ? 'Sending request...' : 'Request Access'}
							</button>
						</div>
					) : accessStatus === 'Pending' ? (
						<div className="max-w-sm mx-auto my-auto text-center space-y-5 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
							<div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto">
								<ClockIcon className="size-7 text-amber-500" />
							</div>
							<div className="space-y-2">
								<h3 className="text-sm font-bold text-slate-800">Access Pending</h3>
								<p className="text-xs text-slate-500 leading-relaxed">
									Your request to join <span className="font-semibold text-slate-700">#{activeChannel}</span> is in the queue, awaiting admin approval.
								</p>
							</div>
						</div>
					) : accessStatus === 'Rejected' ? (
						<div className="max-w-sm mx-auto my-auto text-center space-y-5 p-8 bg-white rounded-2xl border border-red-100 shadow-sm">
							<div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto">
								<ShieldAlertIcon className="size-7 text-red-500" />
							</div>
							<div className="space-y-2">
								<h3 className="text-sm font-bold text-slate-800">Request Declined</h3>
								<p className="text-xs text-slate-500 leading-relaxed">
									Your request to join <span className="font-semibold text-slate-700">#{activeChannel}</span> was declined.
								</p>
							</div>
							<button
								onClick={handleRequestAccess}
								disabled={isRequestingAccess}
								className="w-full bg-[#E61E32] hover:bg-[#c9182a] disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-6 rounded-lg cursor-pointer transition-all"
							>
								{isRequestingAccess ? 'Resubmitting...' : 'Re-submit Request'}
							</button>
						</div>
					) : (
						<>
							{isLoading ? (
								<div className="h-full flex items-center justify-center">
									<div className="flex items-center gap-3 text-slate-500">
										<span className="size-5 border-2 border-[#E61E32]/30 border-t-[#E61E32] rounded-full animate-spin" />
										<span className="text-sm">Loading messages...</span>
									</div>
								</div>
							) : messages.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center text-center p-4 my-auto">
									<div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
										<MessageSquareIcon className="size-7 text-slate-400" />
									</div>
									<p className="text-sm font-semibold text-slate-700">No messages yet</p>
									<p className="text-xs text-slate-400 mt-1 max-w-[220px]">
										Be the first to say something!
									</p>
								</div>
							) : (
								messages.map((msg) => {
									const isSelf = isCurrentUserMessage(msg.senderId, msg.senderName);
									const timeStr = formatTime(msg.createdAt);
									const color = memberChatColor(msg.senderId || msg.senderName);
									const reactions = msg.reactions || [];
									const attachmentType = msg.attachmentType || null;
									const attachmentUrl = msg.attachmentUrl || '';
									const attachmentName = msg.attachmentName || 'Attachment';
									const hasAttachment = Boolean(attachmentType && attachmentUrl);
									const textOnlyContent = hasAttachment && msg.content && msg.content.length <= 12 &&
										(msg.content.includes('Photo') || msg.content.includes('Video') || msg.content.includes('File'))
										? ''
										: msg.content;
									const byEmoji = QUICK_EMOJIS.map((emoji) => ({
										emoji,
										count: reactions.filter((r) => r.emoji === emoji).length,
										mine: reactions.some((r) => r.emoji === emoji && r.userId === currentUser.id),
									})).filter((r) => r.count > 0);
									const menuOpen = menuMsgId === msg.id;
									const isEditing = editingId === msg.id;
									const isOptimistic = Boolean(msg._optimistic);

									return (
										<div
											key={msg.id}
											className={cn(
												"flex gap-2.5 max-w-full sm:max-w-[82%] lg:max-w-[72%] first:mt-auto group",
												isSelf ? "ml-auto flex-row-reverse" : "mr-auto flex-row",
												isOptimistic && "opacity-70"
											)}
										>
											{/* Avatar */}
											<div className="shrink-0 mt-5" title={msg.senderName}>
												<ChatAvatar
													id={msg.senderId}
													name={msg.senderName}
													photoUrl={
														isSelf
															? currentUser.photoUrl
															: msg.senderPhotoUrl
													}
													hasPhoto
													adminEmail={avatarAdminEmail}
													size={30}
												/>
											</div>

											{/* Bubble column */}
											<div className={cn("flex flex-col min-w-0 max-w-full relative", isSelf ? "items-end" : "items-start")}>
												{/* Sender + time */}
												<div className="flex items-center gap-2 mb-1.5 px-1">
													<span
														className="text-[11px] font-semibold"
														style={{ color: isSelf ? '#E61E32' : color.accent }}
													>
														{msg.senderName}
													</span>
													<span className="text-[10px] text-slate-400 flex items-center gap-1">
														{timeStr}
														{isOptimistic && <span className="text-[9px] text-slate-300 italic">sending…</span>}
													</span>
													{msg.editedAt && (
														<span className="text-[10px] text-slate-400 italic">(edited)</span>
													)}
												</div>

												{/* Context menu trigger */}
												<div className="relative w-full">
													<button
														type="button"
														onClick={() => setMenuMsgId(menuOpen ? null : msg.id)}
														data-msg-menu-trigger
														className={cn(
															"absolute -top-1 z-10 size-6 rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-slate-50",
															isSelf ? "-left-8" : "-right-8",
															menuOpen && "opacity-100"
														)}
														aria-label="Message actions"
													>
														<ChevronDownIcon className="size-3.5" />
													</button>

													{/* Context menu */}
													{menuOpen && (
														<div
															data-msg-menu
															className={cn(
																"absolute z-20 top-0 p-1.5 rounded-xl bg-white border border-slate-200 shadow-xl min-w-[200px]",
																isSelf ? "right-0" : "left-0"
															)}
														>
															{/* Emoji row */}
															<div className="flex gap-0.5 mb-1.5 p-1 bg-slate-50 rounded-lg">
																{QUICK_EMOJIS.map((emoji) => (
																	<button
																		key={emoji}
																		type="button"
																		disabled={reactBusyId === msg.id}
																		onClick={() => handleReact(msg.id, emoji)}
																		className="size-8 text-base hover:bg-white hover:shadow-sm rounded-lg cursor-pointer transition-all flex items-center justify-center"
																	>
																		{emoji}
																	</button>
																))}
															</div>
															<div className="space-y-0.5">
																{canEditMessage(msg) && (
																	<button
																		type="button"
																		onClick={() => {
																			setEditingId(msg.id);
																			setEditText(msg.content);
																			setMenuMsgId(null);
																		}}
																		className="w-full flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg cursor-pointer transition-colors"
																	>
																		<PencilIcon className="size-3.5 text-slate-400" />
																		Edit message
																	</button>
																)}
																<button
																	type="button"
																	onClick={() => handleCopyMessage(msg.content || '')}
																	className="w-full flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg cursor-pointer transition-colors"
																>
																	<CopyIcon className="size-3.5 text-slate-400" />
																	Copy text
																</button>
																{isSelf && (
																	<button
																		type="button"
																		onClick={() => void handleDeleteMessage(msg)}
																		className="w-full flex items-center gap-2 text-xs text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg cursor-pointer transition-colors"
																	>
																		<Trash2Icon className="size-3.5" />
																		Delete message
																	</button>
																)}
															</div>
														</div>
													)}

													{/* Edit mode */}
													{isEditing ? (
														<div className="w-full space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
															<textarea
																value={editText}
																onChange={(e) => setEditText(e.target.value)}
																rows={3}
																className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-800 p-2.5 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#E61E32]/30 focus:border-[#E61E32]/40 transition-colors"
															/>
															<div className="flex justify-end gap-2">
																<button
																	type="button"
																	onClick={() => { setEditingId(null); setEditText(''); }}
																	className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
																>
																	Cancel
																</button>
																<button
																	type="button"
																	onClick={handleSaveEdit}
																	className="text-xs bg-[#E61E32] hover:bg-[#c9182a] text-white px-3 py-1.5 rounded-lg cursor-pointer font-semibold transition-colors"
																>
																	Save
																</button>
															</div>
														</div>
													) : (
														/* Message bubble */
														<div
															className={cn(
																"px-4 py-2.5 text-sm rounded-2xl leading-relaxed break-words text-start w-full max-w-full shadow-xs",
																isSelf
																	? "rounded-tr-sm"
																	: "rounded-tl-sm"
															)}
															style={isSelf
																? {
																	background: 'linear-gradient(135deg, #E61E32, #c9182a)',
																	color: '#ffffff',
																}
																: {
																	backgroundColor: '#f1f5f9',
																	color: '#1e293b',
																	border: '1px solid #e2e8f0',
																}
															}
														>
															{hasAttachment && attachmentType === 'image' && (
																<img
																	src={attachmentUrl}
																	alt={attachmentName}
																	className="mb-2 max-h-64 w-auto rounded-xl object-contain"
																/>
															)}
															{hasAttachment && attachmentType === 'video' && (
																<video
																	src={attachmentUrl}
																	controls
																	className="mb-2 max-h-64 w-full rounded-xl"
																/>
															)}
															{hasAttachment && attachmentType === 'file' && (
																<a
																	href={attachmentUrl}
																	download={attachmentName}
																	target="_blank"
																	rel="noreferrer"
																	className="mb-2 inline-flex text-xs underline opacity-80"
																>
																	📎 {attachmentName}
																</a>
															)}
															{textOnlyContent && (
																<span>{textOnlyContent}</span>
															)}
														</div>
													)}
												</div>

												{/* Reactions */}
												{byEmoji.length > 0 && (
													<div className={cn("flex flex-wrap gap-1 mt-1.5 px-1", isSelf ? "justify-end" : "justify-start")}>
														{byEmoji.map((r) => (
															<button
																key={r.emoji}
																type="button"
																onClick={() => handleReact(msg.id, r.emoji)}
																className={cn(
																	"text-[11px] px-2 py-0.5 rounded-full border cursor-pointer transition-all font-medium",
																	r.mine
																		? "bg-[#E61E32]/10 border-[#E61E32]/30 text-[#E61E32]"
																		: "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
																)}
															>
																{r.emoji} {r.count}
															</button>
														))}
													</div>
												)}
											</div>
										</div>
									);
								})
							)}
							<div ref={messagesEndRef} />
						</>
					)}
				</div>

				{/* ── Message Input ── */}
				{accessStatus === 'Approved' && (
					<form
						onSubmit={handleSendMessage}
						className="p-4 border-t border-slate-150 bg-white flex items-center gap-3"
					>
						<button
							type="button"
							disabled={isSending}
							onClick={() => attachInputRef.current?.click()}
							className="size-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-xl shrink-0 cursor-pointer transition-colors"
						>
							<PaperclipIcon className="size-4" />
						</button>
						<input
							type="text"
							placeholder={`Message ${channelTitle}...`}
							className="flex-1 bg-slate-100 border border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E61E32]/30 focus:border-[#E61E32]/40 transition-colors"
							value={messageText}
							onChange={e => setMessageText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									void handleSendMessage(e as any);
								}
							}}
						/>
						<button
							type="submit"
							disabled={!messageText.trim() || isSending}
							className="size-10 flex items-center justify-center bg-[#E61E32] hover:bg-[#c9182a] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl shrink-0 cursor-pointer transition-all shadow-sm hover:shadow-md"
						>
							<SendIcon className="size-4" />
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
