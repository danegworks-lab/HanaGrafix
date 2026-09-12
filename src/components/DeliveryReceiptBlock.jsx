import React from 'react';
import DeliveryReceiptStatusSelector from './DeliveryReceiptStatusSelector';

/**
 * DeliveryReceiptBlock
 * 
 * Props:
 * - drNumber: string (e.g. "DR# 001")
 * - dateIssued: string (e.g. "01/01/2026")
 * - initialStatus: 'completed' | 'cancelled' (default: 'completed')
 * - onStatusChange: function callback when status is updated
 */
export default function DeliveryReceiptBlock({
  drNumber = 'DR# 001',
  dateIssued = '01/01/2026',
  initialStatus = 'completed',
  onStatusChange
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-2 border-[#5FA5DA] rounded-2xl p-4 bg-white">
      <div className="flex flex-col gap-1">  
        <label className="font-bold text-gray-800 text-[0.9vw]">{drNumber}</label>
        <label className="text-xs text-gray-500">Date Issued: {dateIssued}</label>
      </div>
      <DeliveryReceiptStatusSelector 
        initialStatus={initialStatus} 
        onChange={onStatusChange} 
      />
    </div>
  );
}