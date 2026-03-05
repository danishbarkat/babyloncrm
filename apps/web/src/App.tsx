import { useEffect, useState } from 'react';
import './App.css';
import logo from './assets/babylon-logo.png';
import {
  fetchRequests,
  fetchRequestThread,
  fetchRfqs,
  fetchRfqDetail,
  fetchOrders,
  fetchOrderDetail,
  fetchNotifications,
  postRequestMessage,
  transitionRequest,
  fetchMeta,
  fetchCatalog,
  fetchServices,
  fetchRd,
  fetchServiceAssignments,
  assignService,
  approveService,
  advanceRd,
  fetchInventoryEvents,
  type RequestItem,
  type ThreadMessage,
  type RfqItem,
  type OrderItem,
  type NotificationItem,
  type OrderDetail,
} from './api';
import { TabNav, type TabKey } from './components/TabNav';
import { useOrderDocuments } from './hooks/useDocuments';

type Actor = 'customer' | 'internal';
type AuthCtx = { customerId: string; membershipId: string; actor: Actor };

const USERS: Record<string, { email: string; password: string; actor: Actor }> = {
  admin: { email: 'admin@babylonll.com', password: 'admin123', actor: 'internal' },
  customer: { email: 'customer@acme.com', password: 'customer123', actor: 'customer' },
};

function buildAuth(actor: Actor): AuthCtx {
  const customerId = import.meta.env.VITE_CUSTOMER_ID as string;
  const customerMembership = import.meta.env.VITE_MEMBERSHIP_ID as string;
  const internalMembership =
    (import.meta.env.VITE_INTERNAL_MEMBERSHIP_ID as string | undefined) || customerMembership;
  return {
    customerId,
    membershipId: actor === 'internal' ? internalMembership : customerMembership,
    actor,
  };
}

function App() {
  const [auth, setAuth] = useState<AuthCtx | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('dashboard');

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [rfqs, setRfqs] = useState<RfqItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [meta, setMeta] = useState<{
    orderStates: { state: string; docs: string[]; notes: string }[];
    requestStates: string[];
  } | null>(null);
  const [catalog, setCatalog] = useState<{ id: string; name: string; skus: any[] }[]>([]);
  const [services, setServices] = useState<
    { id: string; name: string; attachTo: string; chargeable: boolean; status: string }[]
  >([]);
  const [rdRequests, setRdRequests] = useState<
    { id: string; title: string; state: string; owner: string; customer_visible: boolean }[]
  >([]);
  const [inventoryEvents, setInventoryEvents] = useState<
    { ts: string; type: string; order_number: string; detail: string }[]
  >([]);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [serviceAssignments, setServiceAssignments] = useState<{ serviceId: string; status: string }[]>([]);

  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [rfqDetail, setRfqDetail] = useState<{ rfq: RfqItem; items: { sku: string; qty: number }[] } | null>(
    null
  );

  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<{ load?: string; thread?: string; rfq?: string; order?: string }>({});
  const [newDocName, setNewDocName] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const {
    docs: orderDocs,
    load: loadOrderDocs,
    upload: uploadOrderDoc,
    loading: docsLoading,
    error: docError,
  } = useOrderDocuments(selectedOrderId);

  useEffect(() => {
    if (!auth) return;
    const load = async () => {
      try {
        const [reqs, rfqData, orderData, notifData, metaData, catalogData, servicesData, rdData, inventoryData] =
          await Promise.all([
            fetchRequests(auth),
            fetchRfqs(auth),
            fetchOrders(auth),
            fetchNotifications(auth),
            fetchMeta(),
            fetchCatalog(),
            fetchServices(),
            fetchRd(),
            fetchInventoryEvents(),
          ]);

        setRequests(reqs);
        setRfqs(rfqData);
        setOrders(orderData);
        setNotifications(notifData);
        setMeta(metaData);
        setCatalog(catalogData.brands);
        setServices(servicesData.services);
        setRdRequests(rdData.rdRequests);
        setInventoryEvents(inventoryData.events);

        if (reqs.length) await selectRequest(reqs[0].id, false);
        if (orderData.length) await selectOrder(orderData[0].id, false);
        if (rfqData.length) await selectRfq(rfqData[0].id, false);
      } catch (e: any) {
        setErrors({ load: e.message });
      }
    };
    load();
  }, [auth]);

  useEffect(() => {
    loadOrderDocs();
  }, [selectedOrderId, loadOrderDocs]);

  const handleLogin = () => {
    const { email, password } = loginForm;
    if (email === USERS.admin.email && password === USERS.admin.password) {
      setAuth(buildAuth('internal'));
      setLoginError(null);
      return;
    }
    if (email === USERS.customer.email && password === USERS.customer.password) {
      setAuth(buildAuth('customer'));
      setLoginError(null);
      return;
    }
    setLoginError('Invalid credentials');
  };

  const logout = () => {
    setAuth(null);
    setLoginForm({ email: '', password: '' });
    setRequests([]);
    setRfqs([]);
    setOrders([]);
    setNotifications([]);
    setThread([]);
    setMeta(null);
    setCatalog([]);
    setServices([]);
    setRdRequests([]);
    setInventoryEvents([]);
    setSelectedRequestId(null);
    setSelectedOrderId(null);
    setSelectedRfqId(null);
    setServiceAssignments([]);
    setNewDocName('');
    setSelectedServiceId('');
    setTab('dashboard');
  };

  const selectRequest = async (id: string, moveToTab = true) => {
    setSelectedRequestId(id);
    if (moveToTab) setTab('requests');
    try {
      if (!auth) return;
      const t = await fetchRequestThread(id, auth);
      setThread(t.messages);
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, thread: e.message }));
    }
  };

  const sendComment = async () => {
    if (!selectedRequestId || !comment.trim()) return;
    if (!auth) return;
    await postRequestMessage(selectedRequestId, comment.trim(), auth);
    setComment('');
    const t = await fetchRequestThread(selectedRequestId, auth);
    setThread(t.messages);
  };

  const doTransition = async (key: string) => {
    if (!selectedRequestId) return;
    if (!auth) return;
    await transitionRequest(selectedRequestId, key, auth);
    const reqs = await fetchRequests(auth);
    setRequests(reqs);
    const t = await fetchRequestThread(selectedRequestId, auth);
    setThread(t.messages);
  };

  const selectOrder = async (id: string, moveToTab = true) => {
    setSelectedOrderId(id);
    if (moveToTab) setTab('orders');
    try {
      if (!auth) return;
      const detail = await fetchOrderDetail(id, auth);
      setOrderDetail(detail);
      const assignments = await fetchServiceAssignments(id);
      setServiceAssignments(assignments.assignments);
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, order: e.message }));
    }
  };

  const selectRfq = async (id: string, moveToTab = true) => {
    setSelectedRfqId(id);
    if (moveToTab) setTab('rfqs');
    try {
      if (!auth) return;
      const detail = await fetchRfqDetail(id, auth);
      setRfqDetail(detail);
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, rfq: e.message }));
    }
  };

  const handleUploadDoc = async () => {
    if (!newDocName.trim()) return;
    await uploadOrderDoc(newDocName.trim(), orderDetail?.order.state);
    setNewDocName('');
  };

  const handleAttachService = async () => {
    if (!selectedOrderId || !selectedServiceId) return;
    const resp = await assignService(selectedOrderId, selectedServiceId);
    setServiceAssignments(resp.assignments);
  };

  const handleApproveService = async (serviceId: string) => {
    if (!selectedOrderId) return;
    const resp = await approveService(selectedOrderId, serviceId);
    setServiceAssignments(resp.assignments);
  };

  const nextRdState = async (id: string) => {
    await advanceRd(id);
    const rd = await fetchRd();
    setRdRequests(rd.rdRequests);
  };

  const selectedRequest = selectedRequestId ? requests.find((r) => r.id === selectedRequestId) : null;
  const orderEvents = orderDetail
    ? inventoryEvents.filter((e) => e.order_number === orderDetail.order.order_number)
    : inventoryEvents.slice(0, 4);

  const stats = [
    { label: 'Requests', value: requests.length },
    { label: 'RFQs', value: rfqs.length },
    { label: 'Orders', value: orders.length },
    { label: 'Notifications', value: notifications.length },
  ];

  if (!auth) {
    return (
      <div className="shell">
        <aside className="sidebar">
          <div className="logo-block">
            <img src={logo} alt="Babylon" />
            <p className="eyebrow">Babylon Portal</p>
          </div>
        </aside>
        <main className="content">
          <div className="auth-hero">
            <div>
              <div className="hero-badge">Dual-side portal · Babylon & Customers</div>
              <h1 className="auth-title">Sign in to the Babylon Console</h1>
              <p className="auth-subtitle">Use the demo credentials to preview both internal and customer experiences.</p>
              <ul className="muted-list">
                <li>Admin (internal): admin@babylonll.com / admin123</li>
                <li>Customer: customer@acme.com / customer123</li>
              </ul>
            </div>
            <div className="auth-card">
              <label className="muted small">Email</label>
              <input
                className="input"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="admin@babylonll.com or customer@acme.com"
              />
              <label className="muted small" style={{ marginTop: 10 }}>Password</label>
              <input
                className="input"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••"
              />
              <div className="pill-row">
                <button className="pill-btn" onClick={() => setLoginForm({ email: USERS.admin.email, password: USERS.admin.password })}>
                  Use admin (internal)
                </button>
                <button className="pill-btn" onClick={() => setLoginForm({ email: USERS.customer.email, password: USERS.customer.password })}>
                  Use customer (external)
                </button>
              </div>
              {loginError && <p className="error">{loginError}</p>}
              <button className="primary" style={{ width: '100%', marginTop: 10 }} onClick={handleLogin}>Login</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const renderDashboard = () => (
    <>
      <section className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="card stat">
            <p className="stat-value">{s.value}</p>
            <p className="muted">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="grid two">
        <div className="card">
          <div className="section-head">
            <h3>Catalog & SKUs</h3>
            <span className="muted">Brand · SKU · MOQ</span>
          </div>
          <div className="list small">
            {catalog.map((b) => (
              <div key={b.id} className="row-line">
                <div className="req-title">{b.name}</div>
                <div className="mini-list">
                  {b.skus.map((s: any) => (
                    <div key={s.id} className="muted tiny">
                      {s.name} — MOQ {s.moq} · rev {s.revisions[0]?.version ?? 'n/a'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {catalog.length === 0 && <p className="muted">No catalog items.</p>}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h3>R&D collaborations</h3>
            <span className="muted">NPD / Reformulation</span>
          </div>
          <div className="list small">
            {rdRequests.map((r) => (
              <div key={r.id} className="row-line">
                <span className="pill tiny">{r.state}</span>
                <div className="req-title">{r.title}</div>
                <button className="link-btn" onClick={() => nextRdState(r.id)}>Advance</button>
              </div>
            ))}
            {rdRequests.length === 0 && <p className="muted">No R&D items.</p>}
          </div>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <div className="section-head">
            <h3>Services marketplace</h3>
            <span className="muted">Attach to RFQ/Order</span>
          </div>
          <div className="list small">
            {services.map((s) => (
              <div key={s.id} className="row-line">
                <div className="req-title">{s.name}</div>
                <div className="muted tiny">{s.attachTo} · {s.chargeable ? 'Chargeable' : 'Included'} · {s.status}</div>
              </div>
            ))}
            {services.length === 0 && <p className="muted">No services listed.</p>}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h3>Inventory & production</h3>
            <span className="muted">Recent events</span>
          </div>
          <div className="list small">
            {inventoryEvents.slice(0, 6).map((e, idx) => (
              <div key={idx} className="row-line">
                <span className="pill tiny">{e.type}</span>
                <div className="req-title">{e.order_number}</div>
                <span className="muted tiny">{e.detail}</span>
              </div>
            ))}
            {inventoryEvents.length === 0 && <p className="muted">No events yet.</p>}
          </div>
        </div>
      </section>
    </>
  );

  const renderRequests = () => (
    <section className="grid two">
      <div className="card">
        <div className="section-head">
          <h2>Requests</h2>
          <span className="muted">Live</span>
        </div>
        <div className="list">
          {requests.map((r) => (
            <button
              key={r.id}
              className={`row-btn ${selectedRequestId === r.id ? 'active' : ''}`}
              onClick={() => selectRequest(r.id)}
            >
              <div className="pill small">{r.state}</div>
              <div className="row-body">
                <div className="req-title">{r.title}</div>
                <div className="req-meta">
                  <span>{r.priority || 'normal'}</span>
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </button>
          ))}
          {requests.length === 0 && <p className="muted">No requests yet.</p>}
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <h2>Thread</h2>
          <div className="actions">
            <button onClick={() => doTransition('submit_request')}>Submit</button>
            {auth.actor === 'internal' && (
              <>
                <button className="ghost" onClick={() => doTransition('start_processing')}>Start</button>
                <button className="ghost" onClick={() => doTransition('complete_request')}>Complete</button>
              </>
            )}
          </div>
        </div>
        {selectedRequest && (
          <div className="req-detail">
            <span className="pill tiny">{selectedRequest.state}</span>
            <span className="muted tiny">Category: {selectedRequest.category || '-'}</span>
            <span className="muted tiny">Created: {new Date(selectedRequest.created_at).toLocaleString()}</span>
          </div>
        )}
        <div className="thread">
          {thread.map((m) => (
            <div key={m.id} className={`bubble ${m.message_type === 'system_state_change' ? 'system' : 'customer'}`}>
              {m.body}
              <div className="muted tiny">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))}
          {thread.length === 0 && <p className="muted">Select a request to view thread.</p>}
        </div>
        <div className="composer">
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment..." />
          <button onClick={sendComment}>Send</button>
        </div>
      </div>
    </section>
  );

  const renderRfqs = () => (
    <section className="grid two">
      <div className="card">
        <div className="section-head">
          <h3>RFQs</h3>
          <span className="muted">Negotiation</span>
        </div>
        <div className="list small">
          {rfqs.map((r) => (
            <button key={r.id} className={`row-line btn-line ${selectedRfqId === r.id ? 'active' : ''}`} onClick={() => selectRfq(r.id)}>
              <span className="pill tiny">{r.state}</span>
              <div className="req-title">{r.rfq_number}</div>
              <span className="muted tiny">{new Date(r.created_at).toLocaleDateString()}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <h3>RFQ detail</h3>
          <span className="muted">Items & target</span>
        </div>
        {rfqDetail ? (
          <div className="order-detail">
            <p className="muted tiny">Target ship: {rfqDetail.rfq.target_ship_date ? new Date(rfqDetail.rfq.target_ship_date).toLocaleDateString() : '-'}</p>
            <p className="muted tiny">SKU count: {rfqDetail.rfq.sku_count || '-'}</p>
            <div className="muted tiny">Items:</div>
            <ul className="mini-list">
              {rfqDetail.items.map((i, idx) => (
                <li key={idx}>{i.sku} - {i.qty}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="muted">Select an RFQ to view detail.</p>
        )}
      </div>
    </section>
  );

  const renderOrders = () => (
    <section className="grid two">
      <div className="card">
        <div className="section-head">
          <h3>Orders</h3>
          <span className="muted">Lifecycle</span>
        </div>
        <div className="list small">
          {orders.map((o) => (
            <button key={o.id} className={`row-line btn-line ${selectedOrderId === o.id ? 'active' : ''}`} onClick={() => selectOrder(o.id)}>
              <span className="pill tiny">{o.state}</span>
              <div className="req-title">{o.order_number}</div>
              <span className="muted tiny">{new Date(o.created_at).toLocaleDateString()}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <h3>Order detail</h3>
          <span className="muted">Docs · Services · Shipments</span>
        </div>
        {orderDetail ? (
          <div className="order-detail">
            <p className="muted tiny">Batch: {orderDetail.order.batch_number || '-'}</p>
            <p className="muted tiny">Tracking: {orderDetail.order.tracking_number || '-'}</p>
            <p className="muted tiny">ETA: {orderDetail.order.eta ? new Date(orderDetail.order.eta).toLocaleString() : '-'}</p>
            {meta && (
              <>
                <div className="muted tiny">Required docs for state “{orderDetail.order.state}”:</div>
                <ul className="mini-list">
                  {(meta.orderStates.find((s) => s.state === orderDetail.order.state)?.docs || ['Not specified']).map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </>
            )}

            <div className="muted tiny">Documents:</div>
            <ul className="mini-list">
              {orderDocs.map((d) => (
                <li key={`${d.name}-${d.version ?? 1}`}>{d.name} (for {d.requiredFor}) v{d.version ?? 1}</li>
              ))}
              {orderDocs.length === 0 && <li className="muted">No documents yet.</li>}
            </ul>
            <div className="composer">
              <input
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Upload placeholder name"
                disabled={docsLoading}
              />
              <button onClick={handleUploadDoc} disabled={docsLoading}>Upload</button>
            </div>
            {docError && <p className="error">{docError}</p>}

            <div className="muted tiny" style={{ marginTop: 10 }}>Services attached:</div>
            <ul className="mini-list">
              {serviceAssignments.map((s) => (
                <li key={s.serviceId}>
                  {services.find((x) => x.id === s.serviceId)?.name || s.serviceId} — {s.status}
                  {auth.actor === 'internal' && s.status !== 'approved' && (
                    <button className="link-btn" onClick={() => handleApproveService(s.serviceId)}>Approve</button>
                  )}
                </li>
              ))}
              {serviceAssignments.length === 0 && <li className="muted">None yet.</li>}
            </ul>
            <div className="composer">
              <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
                <option value="">Attach a service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · {s.attachTo}</option>
                ))}
              </select>
              <button onClick={handleAttachService}>Attach</button>
            </div>

            <div className="muted tiny" style={{ marginTop: 10 }}>Allocations:</div>
            <ul className="mini-list">
              {orderDetail.allocations.map((a) => (
                <li key={a.lot}>{a.lot} - {a.status} - {a.qty}</li>
              ))}
            </ul>
            <div className="muted tiny">Shipments:</div>
            <ul className="mini-list">
              {orderDetail.shipments.map((s, idx) => (
                <li key={idx}>{s.carrier} - {s.tracking} - {s.eta ? new Date(s.eta).toLocaleString() : '-'}</li>
              ))}
            </ul>
            <div className="muted tiny">Inventory / production events:</div>
            <ul className="mini-list">
              {orderEvents.map((e, idx) => (
                <li key={idx}>{e.type} — {e.detail}</li>
              ))}
              {orderEvents.length === 0 && <li className="muted">No events yet.</li>}
            </ul>
          </div>
        ) : (
          <p className="muted">Select an order to view detail.</p>
        )}
      </div>
    </section>
  );

  const renderNotifications = () => (
    <section className="card">
      <div className="section-head">
        <h3>Notifications</h3>
        <span className="muted">Outbox</span>
      </div>
      <div className="list small">
        {notifications.map((n) => (
          <div key={n.id} className="row-line">
            <span className="pill tiny">{n.event_type}</span>
            <div className="req-title">
              {n.payload?.rfq_number || n.payload?.order_number || n.payload?.request_title || 'Event'}
            </div>
            <span className="muted tiny">{new Date(n.created_at).toLocaleString()}</span>
          </div>
        ))}
        {notifications.length === 0 && <p className="muted">No notifications.</p>}
      </div>
    </section>
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo-block">
          <img src={logo} alt="Babylon" />
          <p className="eyebrow">Babylon Portal</p>
        </div>
        <div className="actor-switch">
          <p>View</p>
          <div className="switch">
            <button className={auth.actor === 'customer' ? 'active' : ''} onClick={() => setAuth(buildAuth('customer'))}>Customer</button>
            <button className={auth.actor === 'internal' ? 'active' : ''} onClick={() => setAuth(buildAuth('internal'))}>Babylon</button>
          </div>
          <small className="muted">Controls which actions are enabled</small>
          <button className="link danger" onClick={logout}>Logout</button>
        </div>
        <div className="mini-card">
          <p className="muted small">Customer ID</p>
          <p className="code">{auth.customerId}</p>
          <p className="muted small">Membership ID</p>
          <p className="code">{auth.membershipId}</p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>CRM Ops Console</h1>
            <p className="muted">Dual-side workflow, messaging, documents, and notifications.</p>
          </div>
          <div className="badges">
            <span className="pill bold">Tenant isolation</span>
            <span className="pill">Workflow driven</span>
          </div>
        </header>

        {errors.load && <div className="error">{errors.load}</div>}

        <TabNav active={tab} onChange={setTab} />

        {tab === 'dashboard' && renderDashboard()}
        {tab === 'requests' && renderRequests()}
        {tab === 'rfqs' && renderRfqs()}
        {tab === 'orders' && renderOrders()}
        {tab === 'notifications' && renderNotifications()}
      </main>
    </div>
  );
}

export default App;
