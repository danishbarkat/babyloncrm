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

const docsByOrder: Record<string, { name: string; requiredFor: string; link?: string }[]> = {
  'ff6c4a07-61c3-43c4-960e-ccf31f85f2c4': [
    { name: 'Order Confirmation', requiredFor: 'confirmed' },
    { name: 'Packing List', requiredFor: 'packed' },
  ],
  '973db48e-48ee-4ae9-9e04-aa8587bc6588': [
    { name: 'Allocation Summary', requiredFor: 'allocated' },
  ],
};

const docsByRequest: Record<string, { name: string; requiredFor: string }[]> = {
  'a1136548-8ad8-4bb5-bd00-f1a3680dad61': [
    { name: 'SDS Sheet', requiredFor: 'submitted' },
  ],
};

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
