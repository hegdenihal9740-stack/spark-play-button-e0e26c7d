import { supabase } from '@/integrations/supabase/client';
import type { WatchTone } from '@/lib/watches';

export type OrderLine = { id: WatchTone; qty: number; price: number };
export type OrderAddress = { name: string; mobile: string; address: string; locality?: string; city: string; state: string; pincode: string; landmark?: string; type?: string };
export type Order = { id: string; items: OrderLine[]; total: number; payment: string; placedAt: string; address: OrderAddress };

const KEY = 'pf-orders';

type Legacy = Partial<Order> & { item?: WatchTone; qty?: number; price?: number };
const normalize = (o: Legacy): Order => ({
  id: o.id ?? '',
  items: o.items ?? (o.item ? [{ id: o.item, qty: o.qty ?? 1, price: (o.price ?? 0) / (o.qty ?? 1) }] : []),
  total: o.total ?? o.price ?? 0,
  payment: o.payment ?? 'cod',
  placedAt: o.placedAt ?? new Date().toISOString(),
  address: o.address as OrderAddress,
});

const readLocal = (): Order[] => { try { return (JSON.parse(localStorage.getItem(KEY) ?? '[]') as Legacy[]).map(normalize); } catch { return []; } };

export async function saveOrder(o: Order) {
  try { localStorage.setItem(KEY, JSON.stringify([...readLocal(), o])); } catch { /* ignore */ }
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from('orders').insert({ id: o.id, user_id: data.user.id, items: o.items, total: o.total, payment: o.payment, address: o.address });
}

export async function loadOrders(): Promise<Order[]> {
  const local = readLocal();
  const { data: u } = await supabase.auth.getUser();
  let remote: Order[] = [];
  if (u.user) {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    remote = (data ?? []).map((r) => ({ id: r.id, items: r.items as unknown as OrderLine[], total: r.total, payment: r.payment, placedAt: r.created_at, address: r.address as unknown as OrderAddress }));
  }
  const seen = new Set(remote.map((r) => r.id));
  return [...remote, ...local.filter((l) => !seen.has(l.id)).reverse()].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

export function orderStatus(placedAt: string) {
  const days = (Date.now() - new Date(placedAt).getTime()) / 86400000;
  const steps = ['Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'];
  const i = days < 0.5 ? 0 : days < 1 ? 1 : days < 2 ? 2 : days < 3 ? 3 : 4;
  return { steps, index: i };
}
