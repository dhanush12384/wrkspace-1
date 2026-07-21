'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Lock, Search, Send } from 'lucide-react';
import { ChatAvatar } from '@/components/ui/chat-avatar';
import { apiGet, apiPost, employeeDisplayName } from '@/lib/mobile-api';
import { memberChatColor } from '@/lib/chat-member-color';
import { cn } from '@/lib/utils';

type Props = {
	employee: any;
	onChatOpenChange?: (open: boolean) => void;
};

const ALL_CHANNELS = ['public', 'marketing', 'technical', 'core'] as const;
const CHANNEL_COLORS: Record<string, string> = {
	public: '#059669',
	marketing: '#D97706',
	technical: '#0284C7',
	core: '#7C3AED',
};

type Person = {
	id: string;
	name: string;
	email?: string;
	role?: string;
	wingName?: string;
	hasPhoto?: boolean;
};

type Thread = {
	peerId: string;
	lastMessage?: string;
	peer?: Person & { photoUrl?: string | null };
};

type Msg = {
	id: string;
	content?: string;
	senderId?: string;
	senderName?: string;
	createdAt?: string;
	attachmentType?: string | null;
	attachmentUrl?: string | null;
	attachmentName?: string | null;
};

function labelChannel(c: string) {
	return c.charAt(0).toUpperCase() + c.slice(1);
}

function formatTime(iso?: string) {
	if (!iso) return '';
	try {
		const d = new Date(iso);
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	} catch {
		return '';
	}
}

/** Flutter MessagesTab parity: All / Direct lists → full-screen chat. */
export function MobileMessagesTab({ employee, onChatOpenChange }: Props) {
	const myId = String(employee?.id || '');
	const myName = employeeDisplayName(employee);

	const [topTab, setTopTab] = useState<0 | 1>(0);
	const [unlocked, setUnlocked] = useState<string[]>(['public']);
	const [channelsReady, setChannelsReady] = useState(false);

	const [threads, setThreads] = useState<Thread[]>([]);
	const [people, setPeople] = useState<Person[]>([]);
	const [directReady, setDirectReady] = useState(false);
	const [search, setSearch] = useState('');

	const [inChannelChat, setInChannelChat] = useState(false);
	const [channel, setChannel] = useState('public');
	const [dmPeerId, setDmPeerId] = useState<string | null>(null);
	const [dmPeerName, setDmPeerName] = useState<string | null>(null);
	const [dmPeerHasPhoto, setDmPeerHasPhoto] = useState(true);

	const [messages, setMessages] = useState<Msg[]>([]);
	const [msgLoading, setMsgLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [draft, setDraft] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [toast, setToast] = useState<string | null>(null);

	const listRef = useRef<HTMLDivElement>(null);
	const inDm = Boolean(dmPeerId);
	const inChat = inChannelChat || inDm;

	const setChatOpen = useCallback(
		(open: boolean) => {
			onChatOpenChange?.(open);
		},
		[onChatOpenChange],
	);

	const showToast = (t: string) => {
		setToast(t);
		window.setTimeout(() => setToast(null), 2500);
	};

	const loadChannels = useCallback(async () => {
		try {
			const data = await apiGet<{ channels?: string[] }>('/api/messages/channels');
			const list = Array.isArray(data.channels) ? data.channels.map(String) : ['public'];
			setUnlocked(list.length ? list : ['public']);
		} catch {
			setUnlocked(['public']);
		} finally {
			setChannelsReady(true);
		}
	}, []);

	const loadDirect = useCallback(async () => {
		try {
			const [dms, dir] = await Promise.all([
				apiGet<{ threads?: Thread[] }>('/api/messages/dms'),
				apiGet<{ people?: Person[] }>('/api/messages/directory'),
			]);
			setThreads(Array.isArray(dms.threads) ? dms.threads : []);
			setPeople(Array.isArray(dir.people) ? dir.people : []);
			setDirectReady(true);
		} catch (e: any) {
			setError(e?.message || 'Failed to load directory');
			setDirectReady(true);
		}
	}, []);

	useEffect(() => {
		void loadChannels();
		void loadDirect();
	}, [loadChannels, loadDirect]);

	useEffect(() => {
		if (!inChat) return;
		const el = listRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages, inChat]);

	const closeChat = () => {
		setInChannelChat(false);
		setDmPeerId(null);
		setDmPeerName(null);
		setMessages([]);
		setError(null);
		setDraft('');
		setChatOpen(false);
	};

	const openChannel = async (c: string) => {
		const ok = unlocked.includes(c);
		if (!ok) {
			try {
				await apiPost('/api/permissions/channel-request', { channel: c });
				showToast(`Access requested for #${c}`);
			} catch (e: any) {
				showToast(e?.message || 'Request failed');
			}
			return;
		}
		setChannel(c);
		setInChannelChat(true);
		setDmPeerId(null);
		setDmPeerName(null);
		setChatOpen(true);
		setMsgLoading(true);
		setError(null);
		try {
			const data = await apiGet<{ messages?: Msg[] }>(
				`/api/messages?channel=${encodeURIComponent(c)}`,
			);
			setMessages(Array.isArray(data.messages) ? data.messages : []);
		} catch (e: any) {
			setError(e?.message || 'Failed to load messages');
			setMessages([]);
		} finally {
			setMsgLoading(false);
		}
	};

	const openDm = async (peerId: string, name?: string, hasPhoto = true) => {
		setDmPeerId(peerId);
		setDmPeerName(name || 'Chat');
		setDmPeerHasPhoto(hasPhoto);
		setInChannelChat(false);
		setChatOpen(true);
		setMsgLoading(true);
		setError(null);
		try {
			const data = await apiGet<{ messages?: Msg[]; peer?: Person }>(
				`/api/messages?peerId=${encodeURIComponent(peerId)}`,
			);
			setMessages(Array.isArray(data.messages) ? data.messages : []);
			if (data.peer?.name) setDmPeerName(data.peer.name);
		} catch (e: any) {
			setError(e?.message || 'Failed to open chat');
			setMessages([]);
		} finally {
			setMsgLoading(false);
		}
	};

	const send = async () => {
		const text = draft.trim();
		if (!text || sending) return;
		setSending(true);
		try {
			const body = inDm
				? { content: text, peerId: dmPeerId }
				: { content: text, channel };
			const res = await apiPost<{ message?: Msg }>('/api/messages', body as any);
			if (res.message) {
				setMessages((prev) => [...prev, res.message!]);
			}
			setDraft('');
		} catch (e: any) {
			showToast(e?.message || 'Send failed');
		} finally {
			setSending(false);
		}
	};

	const title = inDm
		? dmPeerName || 'Chat'
		: inChannelChat
			? `#${labelChannel(channel)}`
			: 'Messages';

	const q = search.trim().toLowerCase();
	const filteredPeople = people.filter((p) => {
		if (p.id === myId) return false;
		if (!q) return true;
		return (
			p.name?.toLowerCase().includes(q) ||
			p.email?.toLowerCase().includes(q) ||
			p.role?.toLowerCase().includes(q)
		);
	});
	const threadIds = new Set(threads.map((t) => t.peerId));

	return (
		<div className="flex h-full min-h-0 flex-col bg-[#F0F3FF] pt-[env(safe-area-inset-top)]">
			{/* Header */}
			<div className="shrink-0 border-b border-[#E2E8F0] bg-white px-2 pb-2.5 pt-2">
				<div className="flex items-center gap-1">
					{inChat ? (
						<button
							type="button"
							onClick={closeChat}
							className="flex size-10 items-center justify-center rounded-full text-[#0F172A]"
							aria-label="Back"
						>
							<ArrowLeft className="size-6" strokeWidth={2.2} />
						</button>
					) : (
						<div className="w-2" />
					)}
					{inDm ? (
						<>
							<ChatAvatar
								id={dmPeerId}
								name={dmPeerName || 'Chat'}
								hasPhoto={dmPeerHasPhoto}
								size={36}
							/>
							<span className="w-2.5" />
						</>
					) : null}
					<p className="min-w-0 flex-1 truncate text-[17px] font-extrabold text-[#0F172A]">
						{title}
					</p>
				</div>

				{!inChat ? (
					<div className="mx-2 mt-1 flex rounded-full border border-[#E2E8F0] bg-[#F0F3FF] p-1">
						<button
							type="button"
							onClick={() => setTopTab(0)}
							className={cn(
								'flex-1 rounded-full py-2.5 text-[13.5px] font-bold transition-colors',
								topTab === 0 ? 'bg-[#0047FF] text-white' : 'text-[#64748B]',
							)}
						>
							All
						</button>
						<button
							type="button"
							onClick={() => {
								setTopTab(1);
								void loadDirect();
							}}
							className={cn(
								'flex-1 rounded-full py-2.5 text-[13.5px] font-bold transition-colors',
								topTab === 1 ? 'bg-[#0047FF] text-white' : 'text-[#64748B]',
							)}
						>
							Direct
						</button>
					</div>
				) : null}
			</div>

			{toast ? (
				<div className="bg-[#0047FF] px-3 py-2 text-center text-xs font-semibold text-white">
					{toast}
				</div>
			) : null}

			{/* Lists */}
			{!inChat && topTab === 0 ? (
				!channelsReady ? (
					<div className="h-0.5 animate-pulse bg-[#0047FF]/40" />
				) : (
					<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[160px] pt-3.5">
						<p className="mb-2.5 pl-1 text-xs font-bold tracking-[0.4px] text-[#64748B]">
							Channels
						</p>
						{ALL_CHANNELS.map((c) => {
							const color = CHANNEL_COLORS[c];
							const open = unlocked.includes(c);
							return (
								<button
									key={c}
									type="button"
									onClick={() => void openChannel(c)}
									className="mb-2.5 flex w-full items-center gap-3 rounded-[14px] border border-[#E2E8F0] bg-white px-3.5 py-3.5 text-left"
								>
									<span
										className="flex size-[42px] items-center justify-center rounded-xl text-lg font-black"
										style={{ backgroundColor: `${color}1F`, color }}
									>
										#
									</span>
									<span className="min-w-0 flex-1">
										<span className="block text-[15.5px] font-extrabold text-[#0F172A]">
											{labelChannel(c)}
										</span>
										<span
											className="block text-xs"
											style={{ color: open ? '#64748B' : color }}
										>
											{open ? 'Open channel' : 'Locked · tap to request access'}
										</span>
									</span>
									{open ? (
										<ChevronRight className="size-[22px] text-[#94A3B8]" />
									) : (
										<Lock className="size-5 text-[#94A3B8]" />
									)}
								</button>
							);
						})}
					</div>
				)
			) : null}

			{!inChat && topTab === 1 ? (
				!directReady ? (
					<div className="h-0.5 animate-pulse bg-[#0047FF]/40" />
				) : (
					<div className="flex min-h-0 flex-1 flex-col">
						<div className="px-4 pb-2 pt-3">
							<div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5">
								<Search className="size-5 text-[#94A3B8]" />
								<input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search colleagues…"
									className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#94A3B8]"
								/>
							</div>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[160px]">
							{threads.length === 0 ? (
								<div className="mb-3.5 rounded-[14px] bg-[#E8EFFF] p-4 text-[13px] font-semibold leading-snug text-[#0F172A]">
									No direct messages yet. Tap a colleague below to start chatting.
								</div>
							) : (
								<>
									<p className="mb-1 pl-1 text-[11px] font-bold tracking-[0.8px] text-[#64748B]">
										RECENT
									</p>
									{threads.map((t) => (
										<PersonRow
											key={t.peerId}
											id={t.peerId}
											name={t.peer?.name || 'Colleague'}
											subtitle={t.lastMessage || ''}
											role={t.peer?.role}
											wing={t.peer?.wingName}
											hasPhoto={t.peer?.hasPhoto !== false}
											onClick={() =>
												void openDm(
													t.peerId,
													t.peer?.name,
													t.peer?.hasPhoto !== false,
												)
											}
										/>
									))}
									<div className="h-3" />
								</>
							)}
							<p className="mb-1 pl-1 text-[11px] font-bold tracking-[0.8px] text-[#64748B]">
								ALL COLLEAGUES
							</p>
							{filteredPeople
								.filter((p) => !threadIds.has(p.id))
								.map((p) => (
									<PersonRow
										key={p.id}
										id={p.id}
										name={p.name}
										subtitle={p.email || ''}
										role={p.role}
										wing={p.wingName}
										hasPhoto={p.hasPhoto !== false}
										onClick={() => void openDm(p.id, p.name, p.hasPhoto !== false)}
									/>
								))}
							{filteredPeople.length === 0 ? (
								<p className="py-8 text-center text-sm text-[#64748B]">No colleagues found</p>
							) : null}
						</div>
					</div>
				)
			) : null}

			{/* Chat */}
			{inChat ? (
				<>
					<div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
						{msgLoading ? (
							<div className="flex justify-center py-16">
								<div className="size-6 animate-spin rounded-full border-2 border-[#0047FF] border-t-transparent" />
							</div>
						) : error ? (
							<p className="px-4 py-10 text-center text-sm text-[#B42318]">{error}</p>
						) : messages.length === 0 ? (
							<p className="py-16 text-center text-sm text-[#64748B]">No messages yet</p>
						) : (
							messages.map((m) => {
								const mine = String(m.senderId) === myId;
								const color = memberChatColor(m.senderId || m.senderName);
								return (
									<div
										key={m.id}
										className={cn('mb-2.5 flex gap-2', mine ? 'flex-row-reverse' : 'flex-row')}
									>
										{!mine ? (
											<ChatAvatar
												id={m.senderId}
												name={m.senderName || '?'}
												hasPhoto
												size={32}
											/>
										) : (
											<ChatAvatar
												id={myId}
												name={myName}
												photoUrl={employee?.photoUrl}
												size={32}
											/>
										)}
										<div
											className="max-w-[78%] rounded-2xl px-3 py-2"
											style={{
												backgroundColor: color.bg,
												color: color.fg,
												borderBottomRightRadius: mine ? 6 : 16,
												borderBottomLeftRadius: mine ? 16 : 6,
											}}
										>
											{!mine && !inDm ? (
												<p className="mb-0.5 text-[11px] font-bold opacity-90">
													{m.senderName}
												</p>
											) : null}
											{m.attachmentType === 'image' && m.attachmentUrl ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={m.attachmentUrl}
													alt=""
													className="mb-1 max-h-48 max-w-full rounded-lg object-cover"
												/>
											) : null}
											{m.content ? (
												<p className="whitespace-pre-wrap break-words text-[14.5px] font-medium leading-snug">
													{m.content}
												</p>
											) : null}
											<p className="mt-1 text-right text-[10px] font-semibold opacity-70">
												{formatTime(m.createdAt)}
											</p>
										</div>
									</div>
								);
							})
						)}
					</div>
					<div className="shrink-0 border-t border-[#E2E8F0] bg-white px-2 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
						<form
							className="flex items-end gap-2"
							onSubmit={(e) => {
								e.preventDefault();
								void send();
							}}
						>
							<input
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								placeholder={inDm ? 'Type a message…' : `Message #${channel}…`}
								className="min-w-0 flex-1 rounded-[22px] bg-[#F0F3FF] px-4 py-2.5 text-sm outline-none"
							/>
							<button
								type="submit"
								disabled={sending || !draft.trim()}
								className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#0047FF] text-white disabled:bg-[#94A3B8]"
								aria-label="Send"
							>
								<Send className="size-5" />
							</button>
						</form>
					</div>
				</>
			) : null}
		</div>
	);
}

function PersonRow({
	id,
	name,
	subtitle,
	role,
	wing,
	hasPhoto,
	onClick,
}: {
	id: string;
	name: string;
	subtitle: string;
	role?: string;
	wing?: string;
	hasPhoto?: boolean;
	onClick: () => void;
}) {
	const meta = [role, wing].filter(Boolean).join(' · ');
	return (
		<button
			type="button"
			onClick={onClick}
			className="mb-2.5 flex w-full items-center gap-3 rounded-[14px] border border-[#E2E8F0] bg-white px-3 py-3 text-left"
		>
			<ChatAvatar id={id} name={name} hasPhoto={hasPhoto !== false} size={44} />
			<span className="min-w-0 flex-1">
				<span className="block truncate text-[15px] font-extrabold text-[#0F172A]">{name}</span>
				{subtitle ? (
					<span className="block truncate text-xs text-[#64748B]">{subtitle}</span>
				) : null}
				{meta ? (
					<span className="mt-0.5 block truncate text-xs font-semibold text-[#0047FF]">
						{meta}
					</span>
				) : null}
			</span>
			<ChevronRight className="size-5 text-[#94A3B8]" />
		</button>
	);
}
