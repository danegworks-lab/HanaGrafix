// src/components/DeliveryReceiptBlock.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DeliveryReceiptBlock({ 
  id, 
  drNumber, 
  dateIssued, 
  amount, 
  initialStatus = 'completed' 
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/delivery-receipts-details/${id || drNumber}`);
  };

  const isCompleted = ['completed', 'delivered'].includes(String(initialStatus).toLowerCase());

  return (
    <div
      onClick={handleClick}
      title="Click to view Delivery Receipt details"
      className="group relative flex items-center justify-between gap-3 bg-[#F4F8FB] hover:bg-[#EBF3F9] border border-[#5FA5DA]/40 hover:border-[#5FA5DA] rounded-xl px-3.5 py-2 cursor-pointer transition-all duration-150 shadow-xs hover:shadow-sm"
    >
      {/* DR Details */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-[0.8vw] font-bold text-gray-800 group-hover:text-[#5FA5DA] transition-colors">
            {drNumber || 'DR-Pending'}
          </span>
          <span className={`text-[0.6vw] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-blue-100 text-blue-800 border border-blue-300'
          }`}>
            {initialStatus || 'Pending'}
          </span>
        </div>
        <span className="text-[0.68vw] text-gray-500 font-medium">
          {dateIssued || 'No Date'}
        </span>
      </div>

      {/* Amount Display */}
      <div className="flex flex-col items-end pl-2 border-l border-gray-200">
        <span className="text-[0.62vw] text-gray-400 font-semibold uppercase tracking-wider">Paid / Value</span>
        <span className="text-[0.8vw] font-bold text-gray-800">
          ₱ {Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <i className="far fa-chevron-right text-[0.65vw] text-gray-400 group-hover:text-[#5FA5DA] group-hover:translate-x-0.5 transition-all"></i>
    </div>
  );
}