import React from 'react';
import CollectionReceiptStatusSelector from './CollectionReceiptStatusSelector';

/**
 * CollectionReceiptBlock
 * 
 * Props:
 * - crNumber: string (e.g. "CR# 001")
 * - dateIssued: string (e.g. "01/01/2026")
 * - initialStatus: 'full' | 'partial' (default: 'full')
 * - onStatusChange: function callback when status is updated
 */
export default function CollectionReceiptBlock({
  crNumber = 'CR# 001',
  dateIssued = '01/01/2026',
  initialStatus = 'full',
  onStatusChange
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-2 border-[#5FA5DA] rounded-2xl p-4 bg-white">
      <div className="flex flex-col gap-1">  
        <label className="font-bold text-gray-800 text-[0.9vw]">{crNumber}</label>
        <label className="text-xs text-gray-500">Date Issued: {dateIssued}</label>
      </div>
      <CollectionReceiptStatusSelector 
        initialStatus={initialStatus} 
        onChange={onStatusChange} 
      />
    </div>
  );
}