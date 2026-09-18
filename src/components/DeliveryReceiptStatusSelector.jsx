// src/components/DeliveryReceiptStatusSelector.jsx
import React, { useState, useEffect } from 'react';

const BASE_STATUSES = {
  pending: { label: 'Pending', bg: '#5FA5DA', text: '#FFFFFF' },
  completed: { label: 'Completed', bg: '#22E11F', text: '#FFFFFF' },
  cancelled: { label: 'Cancelled', bg: '#DC1D10', text: '#FFFFFF' },
};

const NO_DELIVERY_STATUS = {
  no_delivery: { label: 'No Delivery', bg: '#9CA3AF', text: '#FFFFFF' },
};

export default function DeliveryReceiptStatusSelector({ 
  initialStatus = 'pending', 
  value, 
  onChange,
  isChargeInvoice = false 
}) {
  const availableStatuses = isChargeInvoice 
    ? { ...BASE_STATUSES, ...NO_DELIVERY_STATUS } 
    : BASE_STATUSES;

  const [status, setStatus] = useState(value !== undefined ? value : initialStatus);

  useEffect(() => {
    if (value !== undefined) {
      setStatus(value);
    }
  }, [value]);

  const handleSelect = (e) => {
    const selected = e.target.value;
    setStatus(selected);
    if (onChange) onChange(selected);
  };

  const current = availableStatuses[status] || availableStatuses.pending || availableStatuses.completed;

  return (
    <select
      value={status}
      onChange={handleSelect}
      style={{
        backgroundColor: current.bg,
        color: current.text,
        padding: '2px 10px',
        borderRadius: '20px',
        fontWeight: 500,
        fontSize: '0.7vw',
        border: 'none',
        outline: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      }}
    >
      {Object.entries(availableStatuses).map(([key, item]) => (
        <option key={key} value={key} style={{ backgroundColor: '#fff', color: '#000' }}>
          {item.label}
        </option>
      ))}
    </select>
  );
}