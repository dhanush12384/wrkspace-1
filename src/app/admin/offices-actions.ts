'use server';

import { db } from '@/lib/db';

export async function listOfficesWithQr() {
  try {
    return await db.office.findMany({
      orderBy: { createdAt: 'desc' },
      include: { qrs: { orderBy: { createdAt: 'desc' } } },
    });
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function createOfficeAction(data: {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  plusCode?: string | null;
  radiusMeters?: number;
  geofenceM?: number;
}) {
  try {
    const office = await db.office.create({
      data: {
        name: data.name,
        address: data.address || null,
        lat: data.lat,
        lng: data.lng,
        plusCode: data.plusCode || null,
        radiusMeters: data.radiusMeters || 75,
        geofenceM: data.geofenceM || 150,
        active: true,
      },
    });
    return { success: true, office };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateOfficeAction(
  id: string,
  data: Partial<{
    name: string;
    address: string;
    lat: number;
    lng: number;
    plusCode: string | null;
    radiusMeters: number;
    geofenceM: number;
    active: boolean;
  }>
) {
  try {
    const office = await db.office.update({ where: { id }, data });
    return { success: true, office };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addOfficeQrAction(officeId: string, label: string) {
  try {
    const token = `SFQR_${Math.random().toString(36).slice(2, 10).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;
    const qr = await db.officeQr.create({
      data: { officeId, label: label || 'Entry', token, active: true },
    });
    return { success: true, qr };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleOfficeQrAction(id: string, active: boolean) {
  try {
    const qr = await db.officeQr.update({ where: { id }, data: { active } });
    return { success: true, qr };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
