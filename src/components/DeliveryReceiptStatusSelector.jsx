// src/components/DeliveryReceiptStatusSelector.jsx
import React, { useState, useEffect } from 'react';

const STATUSES = {
  'pending delivery': { label: 'Pending Delivery', bg: '#DC1D10', text: '#FFFFFF' },
  'completed': { label: 'Completed', bg: '#22E11F', text: '#FFFFFF' },
  'cancelled': { label: 'Cancelled', bg: '#8B5CF6', text: '#FFFFFF' }
};

export default function DeliveryReceiptStatusSelector({ 
  initialStatus = 'pending delivery', 
  value, 
  onChange 
}) {
  const rawStatus = value !== undefined ? value : initialStatus;
  const normalized = String(rawStatus || '').toLowerCase().trim();
  const currentStatus = normalized === 'pending' ? 'pending delivery' : (normalized || 'pending delivery');

  const [status, setStatus] = useState(currentStatus);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleSelect = (e) => {
    const selected = e.target.value;
    setStatus(selected);
    if (onChange) onChange(selected);
  };

  const current = STATUSES[status] || STATUSES['pending delivery'];

  return (
    <select
      value={status}
      onChange={handleSelect}
      style={{
        backgroundColor: current.bg,
        color: current.text,
        padding: '2px 12px',
        borderRadius: '20px',
        fontWeight: 400,
        fontSize: '0.8vw',
        border: 'none',
        outline: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      }}
    >
      {Object.entries(STATUSES).map(([key, item]) => (
        <option key={key} value={key} style={{ backgroundColor: '#fff', color: '#000' }}>
          {item.label}
        </option>
      ))}
    </select>
  );
}