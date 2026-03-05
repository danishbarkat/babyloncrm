import { Router } from 'express';

export const demoRouter = Router();

const brands = [
  {
    id: 'brand-aurum',
    name: 'Aurum Beauty',
    skus: [
      {
        id: 'sku-vit-c-serum',
        name: 'Vitamin C Serum',
        revisions: [
          { id: 'rev-1', version: '1.0', status: 'active', updated_at: '2026-02-01' },
          { id: 'rev-2', version: '1.1', status: 'draft', updated_at: '2026-03-01' },
        ],
        moq: 500,
      },
      {
        id: 'sku-overnight-mask',
        name: 'Overnight Repair Mask',
        revisions: [
          { id: 'rev-3', version: '2.0', status: 'active', updated_at: '2026-01-10' },
        ],
        moq: 300,
      },
    ],
  },
  {
    id: 'brand-babylon-labs',
    name: 'Babylon Labs',
    skus: [
      {
        id: 'sku-spf50',
        name: 'Mineral SPF 50',
        revisions: [
          { id: 'rev-4', version: '3.2', status: 'active', updated_at: '2026-02-15' },
        ],
        moq: 1000,
      },
    ],
  },
];

const services = [
  { id: 'svc-formulation', name: 'Custom Formulation', attachTo: 'RFQ/Order', chargeable: true, status: 'available' },
  { id: 'svc-stability', name: 'Stability Testing', attachTo: 'Order', chargeable: true, status: 'available' },
  { id: 'svc-creative', name: 'Creative & Artwork Prep', attachTo: 'RFQ', chargeable: false, status: 'available' },
  { id: 'svc-docs', name: 'Regulatory Document Pack', attachTo: 'Request', chargeable: true, status: 'available' },
];

const rdRequests = [
  { id: 'rd-101', title: 'New fragrance variant', state: 'in_progress', owner: 'Babylon', customer_visible: true },
  { id: 'rd-102', title: 'Reformulation: remove allergen', state: 'awaiting_customer', owner: 'Customer', customer_visible: true },
  { id: 'rd-103', title: 'Claim adjustment for SPF', state: 'submitted', owner: 'Customer', customer_visible: true },
];

const inventory = [
  { sku: 'sku-vit-c-serum', lot: 'LOT-101', status: 'available', qty: 540 },
  { sku: 'sku-spf50', lot: 'LOT-202', status: 'allocated', qty: 1200 },
];

type Doc = { name: string; requiredFor: string; link?: string; version: number };
const docsByOrder: Record<string, Doc[]> = {
  'ff6c4a07-61c3-43c4-960e-ccf31f85f2c4': [
    { name: 'Order Confirmation', requiredFor: 'confirmed', version: 1 },
    { name: 'Packing List', requiredFor: 'packed', version: 1 },
  ],
  '973db48e-48ee-4ae9-9e04-aa8587bc6588': [
    { name: 'Allocation Summary', requiredFor: 'allocated', version: 1 },
  ],
};

const docsByRequest: Record<string, Doc[]> = {
  'a1136548-8ad8-4bb5-bd00-f1a3680dad61': [
    { name: 'SDS Sheet', requiredFor: 'submitted', version: 1 },
  ],
};

const serviceAssignments: Record<string, { serviceId: string; status: string }[]> = {};

const inventoryEvents = [
  { ts: new Date().toISOString(), type: 'production', order_number: 'ORD-2002', detail: 'Batch BATCH-02 in production' },
  { ts: new Date().toISOString(), type: 'allocation', order_number: 'ORD-2004', detail: 'Lots allocated: LOT-300, LOT-301' },
  { ts: new Date().toISOString(), type: 'shipping', order_number: 'ORD-2003', detail: 'Shipped via DHL TRK-2003' },
];

demoRouter.get('/catalog', (_req, res) => res.json({ brands }));
demoRouter.get('/services', (_req, res) => res.json({ services }));
demoRouter.get('/rd', (_req, res) => res.json({ rdRequests }));
demoRouter.get('/inventory', (_req, res) => res.json({ inventory }));
demoRouter.get('/documents/order/:id', (req, res) => {
  res.json({ documents: docsByOrder[req.params.id] || [] });
});
demoRouter.get('/documents/request/:id', (req, res) => {
  res.json({ documents: docsByRequest[req.params.id] || [] });
});
demoRouter.post('/documents/order/:id', (req, res) => {
  const { name, requiredFor } = req.body;
  const list = docsByOrder[req.params.id] || [];
  list.push({ name: name || 'Uploaded Doc', requiredFor: requiredFor || 'any', version: (list[list.length - 1]?.version || 0) + 1 });
  docsByOrder[req.params.id] = list;
  res.json({ documents: list });
});
demoRouter.post('/documents/request/:id', (req, res) => {
  const { name, requiredFor } = req.body;
  const list = docsByRequest[req.params.id] || [];
  list.push({ name: name || 'Uploaded Doc', requiredFor: requiredFor || 'any', version: (list[list.length - 1]?.version || 0) + 1 });
  docsByRequest[req.params.id] = list;
  res.json({ documents: list });
});

demoRouter.get('/services/assignments/:entityId', (req, res) => {
  res.json({ assignments: serviceAssignments[req.params.entityId] || [] });
});
demoRouter.post('/services/assign', (req, res) => {
  const { entityId, serviceId } = req.body;
  if (!entityId || !serviceId) return res.status(400).json({ error: 'entityId and serviceId required' });
  const list = serviceAssignments[entityId] || [];
  list.push({ serviceId, status: 'pending_approval' });
  serviceAssignments[entityId] = list;
  res.json({ assignments: list });
});
demoRouter.post('/services/approve', (req, res) => {
  const { entityId, serviceId } = req.body;
  const list = serviceAssignments[entityId] || [];
  list.forEach((a) => { if (a.serviceId === serviceId) a.status = 'approved'; });
  res.json({ assignments: list });
});

const rdStates = ['submitted', 'in_progress', 'awaiting_customer', 'approved', 'resolved'];
demoRouter.post('/rd/:id/advance', (req, res) => {
  const item = rdRequests.find((r) => r.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const idx = rdStates.indexOf(item.state);
  item.state = rdStates[(idx + 1) % rdStates.length];
  res.json({ rd: item });
});

demoRouter.get('/inventory/events', (_req, res) => res.json({ events: inventoryEvents }));
