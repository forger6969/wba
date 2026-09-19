import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, PackagePlus, ShoppingBag, CheckCircle2, XCircle, Coins, Archive, Plus, X } from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { useAdminShopItems, useAdminShopOrders, useInvalidate } from '../../queries.js';
import { api } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { EmptyState, Kpi, RowSkeleton } from '../mentor/_ui.jsx';

const statusMap = (t) => ({
  pending: { label: t('admin.shop.statusPending'), bg: '#F5A62315', text: '#F5A623' },
  fulfilled: { label: t('admin.shop.statusFulfilled'), bg: '#2ECC7115', text: '#2ECC71' },
  cancelled: { label: t('admin.shop.statusCancelled'), bg: '#E8543E15', text: '#E8543E' },
});

function ItemRow({ item, onRestock, busy }) {
  const { t } = useTranslation();
  const [stock, setStock] = useState(String(item.stock));
  useEffect(() => setStock(String(item.stock)), [item.stock]);
  const dirty = Number(stock) !== item.stock;
  return (
    <div className="card bg-base-100 p-4 flex flex-row items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-base-200 grid place-items-center shrink-0 overflow-hidden">
        {item.image_key ? (
          <img src={item.image_key} alt="" className="w-full h-full object-cover" />
        ) : (
          <Gift size={20} className="text-base-content/35" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-base-content truncate">{item.name}</span>
          <span className={`badge badge-sm ${item.is_global ? 'badge-primary badge-outline' : 'badge-ghost'}`}>
            {item.is_global ? t('admin.shop.fromCeo') : t('admin.shop.branchItem')}
          </span>
          {item.is_archived && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-base-200 text-base-content/45">
              <Archive size={10} /> {t('admin.shop.archived')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-base-content/45 mt-0.5">
          <Coins size={11} className="text-warning" /> {t('admin.shop.coinsPrice', { price: item.coin_price })}
          <span className="mx-1">·</span>
          <span className={`font-bold ${Number(item.stock) <= 3 ? 'text-error' : 'text-success'}`}>
            {t('admin.shop.stockLeft', { count: Number(item.stock) || 0 })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-base-content/45">{t('admin.shop.newStock')}</span>
          <input
            type="number" min="0" step="1"
            className="input input-bordered input-sm w-24 text-center"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </label>
        <button
          className="btn btn-sm btn-primary gap-1 self-end"
          disabled={busy || !dirty || stock === '' || Number(stock) < 0}
          onClick={() => onRestock(item.id, Number(stock))}
        >
          {busy ? <span className="loading loading-spinner loading-xs" /> : <PackagePlus size={13} />}
          {t('admin.shop.update')}
        </button>
      </div>
    </div>
  );
}

function OrderRow({ order, onFulfill, onCancel, busy }) {
  const { t } = useTranslation();
  const STATUS = statusMap(t);
  const s = STATUS[order.status] || STATUS.pending;
  return (
    <div className="card bg-base-100 p-4 flex flex-row items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-base-content truncate">{order.itemName}</div>
        <div className="text-[11px] text-base-content/45">{t('admin.shop.orderCoins', { name: order.studentName, price: order.coinPrice })}</div>
      </div>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
        style={{ background: s.bg, color: s.text }}>
        {s.label}
      </span>
      {order.status === 'pending' && (
        <div className="flex items-center gap-1.5">
          <button className="btn btn-sm btn-ghost gap-1 text-success" disabled={busy} onClick={() => onFulfill(order.id)}>
            <CheckCircle2 size={14} /> {t('admin.shop.fulfill')}
          </button>
          <button className="btn btn-sm btn-ghost gap-1 text-error" disabled={busy} onClick={() => onCancel(order.id)}>
            <XCircle size={14} /> {t('admin.shop.cancel')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminShop() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const invalidate = useInvalidate();
  const [tab, setTab] = useState('items');
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', imageKey: '', coinPrice: '', stock: '0' });

  const itemsQ = useAdminShopItems();
  const ordersQ = useAdminShopOrders();

  const items = itemsQ.data?.items || [];
  const orders = ordersQ.data?.orders || [];
  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  const restock = async (itemId, stock) => {
    setBusyId(itemId); setErr('');
    try {
      await api.adminRestockShopItem(token, itemId, stock);
      invalidate(['admin-shop-items']);
    } catch (e) { setErr(e.message || t('admin.shop.restockFailed')); }
    finally { setBusyId(null); }
  };

  const createItem = async () => {
    setBusyId('create'); setErr('');
    try {
      await api.adminCreateShopItem(token, {
        name: newItem.name.trim(), imageKey: newItem.imageKey.trim() || undefined,
        coinPrice: Number(newItem.coinPrice), stock: Number(newItem.stock),
      });
      setCreateOpen(false);
      setNewItem({ name: '', imageKey: '', coinPrice: '', stock: '0' });
      invalidate(['admin-shop-items']);
    } catch (e) { setErr(e.message || t('admin.shop.createFailed')); }
    finally { setBusyId(null); }
  };

  const fulfill = async (orderId) => {
    setBusyId(orderId); setErr('');
    try {
      await api.adminFulfillShopOrder(token, orderId);
      invalidate(['admin-shop-orders']);
    } catch (e) { setErr(e.message || t('admin.shop.fulfillFailed')); }
    finally { setBusyId(null); }
  };

  const cancel = async (orderId) => {
    if (!confirm(t('admin.shop.confirmCancel'))) return;
    setBusyId(orderId); setErr('');
    try {
      await api.adminCancelShopOrder(token, orderId);
      invalidate(['admin-shop-orders']);
      invalidate(['admin-shop-items']);
    } catch (e) { setErr(e.message || t('admin.shop.cancelFailed')); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title={t('admin.shop.title')} subtitle={t('admin.shop.subtitle')}>
        <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setCreateOpen(true)}><Plus size={16} /> {t('admin.shop.newItem')}</button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi Icon={Gift} title={t('admin.shop.itemsCount')} value={items.length} tone="neutral" />
        <Kpi Icon={ShoppingBag} title={t('admin.shop.ordersCount')} value={orders.length} tone="neutral" />
        <Kpi Icon={PackagePlus} title={t('admin.shop.pendingFulfillment')} value={pendingCount} tone="warning" />
      </div>

      <div role="tablist" className="tabs tabs-boxed w-fit">
        <button role="tab" className={`tab ${tab === 'items' ? 'tab-active' : ''}`} onClick={() => setTab('items')}>{t('admin.shop.tabItems')}</button>
        <button role="tab" className={`tab ${tab === 'orders' ? 'tab-active' : ''}`} onClick={() => setTab('orders')}>{t('admin.shop.tabOrders')}</button>
      </div>

      {err && <div className="alert alert-error py-2 text-sm">{err}</div>}

      {tab === 'items' && (
        itemsQ.isLoading ? (
          <RowSkeleton count={3} />
        ) : items.length === 0 ? (
          <EmptyState icon={Gift} title={t('admin.shop.noItemsTitle')} hint={t('admin.shop.noItemsHint')} />
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} onRestock={restock} busy={busyId === item.id} />
            ))}
          </div>
        )
      )}

      {tab === 'orders' && (
        ordersQ.isLoading ? (
          <RowSkeleton count={3} />
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title={t('admin.shop.noOrdersTitle')} hint={t('admin.shop.noOrdersHint')} />
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} onFulfill={fulfill} onCancel={cancel} busy={busyId === order.id} />
            ))}
          </div>
        )
      )}

      {createOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-bold text-lg">{t('admin.shop.newBranchItem')}</h3><p className="text-xs text-base-content/50">{t('admin.shop.newBranchItemHint')}</p></div>
              <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setCreateOpen(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input className="input input-bordered w-full" placeholder={t('admin.shop.namePlaceholder')} value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
              <input className="input input-bordered w-full" placeholder={t('admin.shop.imagePlaceholder')} value={newItem.imageKey} onChange={(e) => setNewItem({ ...newItem, imageKey: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="1" className="input input-bordered w-full" placeholder={t('admin.shop.pricePlaceholder')} value={newItem.coinPrice} onChange={(e) => setNewItem({ ...newItem, coinPrice: e.target.value })} />
                <input type="number" min="0" className="input input-bordered w-full" placeholder={t('admin.shop.stockPlaceholder')} value={newItem.stock} onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })} />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setCreateOpen(false)}>{t('admin.shop.cancelBtn')}</button>
              <button className="btn btn-primary btn-sm" onClick={createItem} disabled={busyId === 'create' || !newItem.name.trim() || Number(newItem.coinPrice) <= 0 || Number(newItem.stock) < 0}>
                {busyId === 'create' && <span className="loading loading-spinner loading-xs" />} {t('admin.shop.add')}
              </button>
            </div>
          </div>
          <button className="modal-backdrop" onClick={() => setCreateOpen(false)}>close</button>
        </div>
      )}
    </div>
  );
}
