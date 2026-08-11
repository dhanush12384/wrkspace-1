import { db } from '@/lib/db';






export async function enrichMessagesWithPhotos<T extends { senderId: string }>(messages: T[]) {
	if (!messages.length) {
		return messages as Array<T & { senderPhotoUrl: string | null; senderHasPhoto: boolean }>;
	}
	const ids = [...new Set(messages.map((m) => m.senderId))];
	const emps = await db.employee.findMany({
		where: { id: { in: ids } },
		select: { id: true, photoUrl: true },
	});
	const has = new Set(
		emps.filter((e) => e.photoUrl && String(e.photoUrl).trim()).map((e) => e.id),
	);
	return messages.map((m) => ({
		...m,
		senderHasPhoto: has.has(m.senderId),
		
		senderPhotoUrl: null as string | null,
	}));
}
