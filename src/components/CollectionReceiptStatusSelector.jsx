// src/components/CollectionReceiptStatusSelector.jsx
import React, { useState, useEffect } from 'react';

const STATUSES = {
  full: { label: 'Full', bg: '#22E11F', text: '#FFFFFF' },
  partial: { label: 'Partial', bg: '#F5E12A', text: '#FFFFFF' },
  pending: { label: 'Pending', bg: '#DC1D10', text: '#FFFFFF' },
  cancelled: { label: 'Cancelled', bg: '#8B5CF6', text: '#FFFFFF' },
};

export default function CollectionReceiptStatusSelector({ initialStatus = 'full', value, onChange }) {
  // Normalize incoming values like 'paid' to 'full'
  const rawStatus = value !== undefined ? value : initialStatus;
  const currentStatus = String(rawStatus || '').toLowerCase() === 'paid' ? 'full' : (rawStatus || 'full');

  const [status, setStatus] = useState(currentStatus);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleSelect = (e) => {
    const selected = e.target.value;
    setStatus(selected);
    if (onChange) onChange(selected);
  };

  const current = STATUSES[status] || STATUSES.full;

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