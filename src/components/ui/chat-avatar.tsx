'use client';

import React, { useEffect, useState } from 'react';
import { memberChatColor, memberInitials } from '@/lib/chat-member-color';
import { loadEmployeeAvatar } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

type Props = {
	id?: string | null;
	name: string;
	/** Optional preloaded data URL */
	photoUrl?: string | null;
	/** Hint that a photo exists — triggers load */
	hasPhoto?: boolean;
	size?: number;
	className?: string;
};

const _cache = new Map<string, string | null>();

/**
 * WhatsApp-style chat avatar — loads real profile photo by employee id.
 */
export function ChatAvatar({ id, name, photoUrl, hasPhoto = true, size = 32, className }: Props) {
	const color = memberChatColor(id || name);
	const initials = memberInitials(name);
	const [src, setSrc] = useState<string | null>(() => {
		const u = (photoUrl || '').trim();
		if (u) return u;
		if (id && _cache.has(id)) return _cache.get(id) || null;
		return null;
	});
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		const direct = (photoUrl || '').trim();
		if (direct) {
			setSrc(direct);
			setFailed(false);
			if (id) _cache.set(id, direct);
			return;
		}
		if (!id || hasPhoto === false) return;
		if (_cache.has(id)) {
			setSrc(_cache.get(id) || null);
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				const res = await loadEmployeeAvatar(id);
				const url = (res.photoUrl || '').trim() || null;
				_cache.set(id, url);
				if (!cancelled) {
					setSrc(url);
					setFailed(!url);
				}
			} catch {
				_cache.set(id, null);
				if (!cancelled) setFailed(true);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [id, photoUrl, hasPhoto]);

	if (src && !failed) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={src}
				alt={name}
				width={size}
				height={size}
				className={cn('rounded-full object-cover shrink-0 bg-zinc-200', className)}
				style={{ width: size, height: size }}
				onError={() => setFailed(true)}
			/>
		);
	}

	return (
		<span
			className={cn('rounded-full flex items-center justify-center font-bold shrink-0', className)}
			style={{
				width: size,
				height: size,
				backgroundColor: color.bg,
				color: color.fg,
				fontSize: Math.max(10, size * 0.36),
			}}
			aria-hidden
		>
			{initials}
		</span>
	);
}
