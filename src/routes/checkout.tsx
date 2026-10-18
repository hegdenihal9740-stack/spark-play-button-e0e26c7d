import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { ShopHeader } from '@/components/ShopHeader';
import { prices } from '@/lib/cart';
import { watches, type WatchTone } from '@/lib/watches';

type Address = { name: string; mobile: string; pincode: string; locality: string; address: string; city: string; state: string; landmark: string; type: 'Home' | 'Work' };
const EMPTY: Address = { name: '', mobile: '', pincode: '', locality: '', address: '', city: '', state: '', landmark: '', type: 'Home' };
const KEY = 'private-flight-address';
const usd = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const Route = createFileRoute('/checkout')({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { item?: WatchTone } => (watches.some((w) => w.id === s['item']) ? { item: s['item'] as WatchTone } : {}),
  head: () => ({ meta: [{ title: 'Checkout — Private Flight Store' }, { name: 'description', content: 'Add your delivery address and place your watch order.' }, { property: 'og:title', content: 'Checkout — Private Flight Store' }, { property: 'og:description', content: 'Add your delivery address and place your watch order.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: Checkout,
});

function Checkout() {
  const { item } = Route.useSearch();
  const w = watches.find((x) => x.id === (item ?? 'steel'))!;
  const [a, setA] = useState<Address>(EMPTY);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [qty, setQty] = useState(1);
  const [orderId, setOrderId] = useState<string | null>(null);
  useEffect(() => { try { const r = localStorage.getItem(KEY); if (r) setA(JSON.parse(r) as Address); } catch { /* ignore */ } }, []);
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setA({ ...a, [k]: e.target.value });
  const saveAddress = () => {
    if (!a.name.trim() || !/^[6-9]\d{9}$/.test(a.mobile) || !/^\d{6}$/.test(a.pincode) || !a.address.trim() || !a.city.trim() || !a.state.trim()) { toast.error('Fill name, 10-digit mobile, 6-digit pincode, address, city and state'); return; }
    localStorage.setItem(KEY, JSON.stringify(a)); setStep(2);
  };
  const price = prices[w.id] * qty;
  return <main className="shop-page">
    <ShopHeader />
    <div className="co-grid">
      <div className="co-steps">
        <section className="co-step">
          <h2><span>1</span> Delivery address</h2>
          {step === 1 ? <div className="co-form">
            <input className="shop-input" placeholder="Full name" value={a.name} onChange={set('name')} />
            <input className="shop-input" placeholder="10-digit mobile number" inputMode="numeric" maxLength={10} value={a.mobile} onChange={(e) => setA({ ...a, mobile: e.target.value.replace(/\D/g, '') })} />
            <input className="shop-input" placeholder="Pincode" inputMode="numeric" maxLength={6} value={a.pincode} onChange={(e) => setA({ ...a, pincode: e.target.value.replace(/\D/g, '') })} />
            <input className="shop-input" placeholder="Locality" value={a.locality} onChange={set('locality')} />
            <textarea className="shop-input co-wide" rows={3} placeholder="Address (house no, building, street, area)" value={a.address} onChange={set('address')} />
            <input className="shop-input" placeholder="City / District / Town" value={a.city} onChange={set('city')} />
            <input className="shop-input" placeholder="State" value={a.state} onChange={set('state')} />
            <input className="shop-input co-wide" placeholder="Landmark (optional)" value={a.landmark} onChange={set('landmark')} />
            <div className="co-type co-wide">Address type
              {(['Home', 'Work'] as const).map((t) => <label key={t}><input type="radio" checked={a.type === t} onChange={() => setA({ ...a, type: t })} /> {t}</label>)}
            </div>
            <button type="button" className="fk-buy co-wide" onClick={saveAddress}>Save and deliver here</button>
          </div> : <div className="co-summary-line"><MapPin size={16} /><p><b>{a.name}</b> <span className="co-tag">{a.type}</span> {a.mobile}<br />{a.address}, {a.locality && `${a.locality}, `}{a.city}, {a.state} — <b>{a.pincode}</b></p><button type="button" className="co-change" onClick={() => setStep(1)}>Change</button></div>}
        </section>
        <section className="co-step">
          <h2><span>2</span> Order summary</h2>
          {step >= 2 && <div className="co-item">
            <img src={w.image} alt={w.name} />
            <div><p className="fk-title co-item-name">{w.name}</p><p className="fk-muted">{w.finish}</p><p className="fk-price">{usd(prices[w.id])}</p>
              <div className="co-qty"><button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span>{qty}</span><button type="button" onClick={() => setQty(qty + 1)}>+</button></div></div>
            {step === 2 && <button type="button" className="fk-buy co-continue" onClick={() => setStep(3)}>Continue</button>}
          </div>}
        </section>
        <section className="co-step">
          <h2><span>3</span> Payment</h2>
          {step === 3 && !orderId && <div className="co-pay">
            <label><input type="radio" checked readOnly /> Cash on delivery — pay when your watch arrives</label>
            <button type="button" className="fk-buy" onClick={() => {
              const id = `PF${Date.now().toString(36).toUpperCase()}`;
              try {
                const orders = JSON.parse(localStorage.getItem('pf-orders') ?? '[]') as unknown[];
                orders.push({ id, item: w.id, qty, price, address: a, payment: 'cod', placedAt: new Date().toISOString() });
                localStorage.setItem('pf-orders', JSON.stringify(orders));
              } catch { /* ignore */ }
              setOrderId(id);
              toast.success('Order placed!', { icon: <CheckCircle2 /> });
            }}>Place order · {usd(price)}</button>
          </div>}
          {orderId && <div className="co-pay">
            <p><CheckCircle2 size={18} className="fk-delivery-free" /> <b>Order confirmed!</b></p>
            <p>Order ID: <b>{orderId}</b></p>
            <p>Pay <b>{usd(price)}</b> in cash when your {w.name} is delivered to {a.city}. We will call {a.mobile} to confirm.</p>
            <Link to="/shop/$watchId" params={{ watchId: w.id }} className="fk-buy co-continue">Continue shopping</Link>
          </div>}
        </section>
      </div>
      <aside className="co-price">
        <h3>Price details</h3>
        <div><span>Price ({qty} item{qty > 1 ? 's' : ''})</span><span>{usd(price)}</span></div>
        <div><span>Delivery charges</span><span className="fk-delivery-free">Free</span></div>
        <div className="co-total"><span>Total amount</span><span>{usd(price)}</span></div>
        <Link to="/shop/$watchId" params={{ watchId: w.id }} className="co-change">← Back to product</Link>
      </aside>
    </div>
  </main>;
}
