const v = (id, owner_id, name, type, capacity_qtl, district, lat, lng, rate_per_km, min_charge, availability, verified, rating, trips) =>
  ({ id, owner_id, name, type, capacity_qtl, district, lat, lng, rate_per_km, min_charge, availability, verified, rating, trips });

export default {
  vehicles: [
    v(1, 2, 'Tata 407 Truck (HR-12)', 'truck', 120, 'Rohtak', 28.90, 76.60, 22, 1200, 'available', true, 4.7, 214),
    v(2, 2, 'Mahindra Mini Truck', 'mini_truck', 60, 'Rohtak', 28.88, 76.63, 17, 800, 'available', true, 4.5, 156),
    v(3, 14, 'Swaraj Tractor Trolley', 'tractor', 40, 'Rohtak', 28.92, 76.57, 14, 600, 'available', true, 4.2, 98),
    v(4, 15, 'Eicher Truck Sonipat', 'truck', 100, 'Sonipat', 28.99, 77.02, 21, 1100, 'available', true, 4.4, 180),
    v(5, 16, 'Bolero Pickup Jhajjar', 'pickup', 25, 'Jhajjar', 28.61, 76.66, 15, 450, 'available', false, 3.8, 41),
    v(6, 17, 'Ashok Leyland Hisar', 'truck', 200, 'Hisar', 29.15, 75.72, 24, 1500, 'busy', true, 4.6, 260),
    v(7, 18, 'Karnal Mini Truck', 'mini_truck', 50, 'Karnal', 29.69, 76.99, 18, 800, 'available', false, 4.0, 63),
    v(8, 19, 'Panipat Tractor', 'tractor', 35, 'Panipat', 29.39, 76.96, 13, 550, 'available', false, 3.6, 27),
    v(9, 20, 'Gurugram Truck', 'truck', 100, 'Gurugram', 28.46, 77.03, 23, 1300, 'available', false, 0, 0),
  ],
  transport_requests: [
    { id: 1, farmer_id: 11, vehicle_id: 1, crop_id: 101, lot_id: null, pickup_text: 'Sampla, Rohtak · Tomorrow morning', destination_text: 'Sonipat Food Processors', quantity_qtl: 40, distance_km: 56, est_cost: 1300, status: 'accepted', created_at: '2026-10-07T08:00:00.000Z', updated_at: '2026-10-07T09:10:00.000Z', timeline: { requested: '2026-10-07T08:00:00.000Z', accepted: '2026-10-07T09:10:00.000Z' } },
    { id: 2, farmer_id: 12, vehicle_id: 2, crop_id: 102, lot_id: null, pickup_text: 'Kalanaur, Rohtak · Today evening', destination_text: 'Rohtak Mandi', quantity_qtl: 30, distance_km: 22, est_cost: 800, status: 'requested', created_at: '2026-10-08T05:30:00.000Z', updated_at: '2026-10-08T05:30:00.000Z', timeline: { requested: '2026-10-08T05:30:00.000Z' } },
    { id: 3, farmer_id: 13, vehicle_id: 2, crop_id: 103, lot_id: null, pickup_text: 'Meham, Rohtak · Today evening', destination_text: 'Sonipat Mandi', quantity_qtl: 25, distance_km: 60, est_cost: 1020, status: 'delivered', created_at: '2026-10-05T07:00:00.000Z', updated_at: '2026-10-06T12:00:00.000Z', timeline: { requested: '2026-10-05T07:00:00.000Z', accepted: '2026-10-05T08:00:00.000Z', pickup: '2026-10-06T06:00:00.000Z', delivered: '2026-10-06T12:00:00.000Z' } },
  ],
  fpo_lots: [{ id: 1, creator_id: 4, crop: 'Tomato', grade: 'A', district: 'Rohtak', total_qtl: 60, target_buyer_id: 1, status: 'open', created_at: '2026-10-07T10:00:00.000Z' }],
  fpo_lot_members: [
    { id: 1, lot_id: 1, farmer_id: 11, crop_id: 101, quantity_qtl: 20 },
    { id: 2, lot_id: 1, farmer_id: 12, crop_id: 102, quantity_qtl: 25 },
    { id: 3, lot_id: 1, farmer_id: 13, crop_id: 103, quantity_qtl: 15 },
  ],
};
