import React, { useState } from 'react';

const STATUSES = {
  completed: { label: 'Completed', bg: '#22E11F', text: '#FFFFFF' },
  cancelled: { label: 'Cancelled', bg: '#DC1D10', text: '#FFFFFF' },
};

export default function DeliveryReceiptStatusSelector({ initialStatus = 'completed', onChange }) {
  const [status, setStatus] = useState(initialStatus);

  const handleSelect = (e) => {
    const selected = e.target.value;
    setStatus(selected);
    if (onChange) onChange(selected);
  };

  const current = STATUSES[status] || STATUSES.completed;

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
      {Object.entries(STATUSES).map(([key, value]) => (
        <option key={key} value={key} style={{ backgroundColor: '#fff', color: '#000' }}>
          {value.label}
        </option>
      ))}
    </select>
  );
}