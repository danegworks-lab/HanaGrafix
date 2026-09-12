import React, { useState } from 'react';

/**
 * CreateCollectionReceiptModal
 * 
 * Props:
 * - isOpen: boolean to control visibility
 * - onClose: function to close the modal
 * - onSubmit: function that receives the collection receipt form data
 */
export default function CreateCollectionReceiptModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    dateIssued: '',
    registeredName: '',
    tin: '',
    businessAddress: '',
    paymentType: 'cash',
    totalPaidAmount: 0,
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-xl shadow-xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b p-4 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">Create Collection Receipt</h2>
          <button 
            type="button" 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-6 gap-4">
          
          {/* Row 1: Registered Name & Date Issued */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-gray-600">Registered Name</label>
              <input
                type="text"
                name="registeredName"
                required
                placeholder="Business / Account Name"
                value={formData.registeredName}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA]"
              />
            </div>
            <div className="flex flex-col gap-1 w-1/3">
              <label className="text-xs font-semibold text-gray-600">Date Issued</label>
              <input
                type="date"
                name="dateIssued"
                required
                value={formData.dateIssued}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA]"
              />
            </div>
          </div>

          {/* Row 2: TIN, Payment Type & Total Paid Amount */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 w-1/3">
              <label className="text-xs font-semibold text-gray-600">TIN</label>
              <input
                type="text"
                name="tin"
                placeholder="000-000-000-000"
                value={formData.tin}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA]"
              />
            </div>
            <div className="flex flex-col gap-1 w-1/3">
              <label className="text-xs font-semibold text-gray-600">Payment Type</label>
              <select
                name="paymentType"
                value={formData.paymentType}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA] bg-white cursor-pointer"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 w-1/3">
              <label className="text-xs font-semibold text-gray-600">Total Paid Amount ($)</label>
              <input
                type="number"
                name="totalPaidAmount"
                step="any"
                min="0"
                required
                placeholder="0.00"
                value={formData.totalPaidAmount}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA]"
              />
            </div>
          </div>

          {/* Row 3: Business Address */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Business Address</label>
            <input
              type="text"
              name="businessAddress"
              placeholder="Enter registered business address"
              value={formData.businessAddress}
              onChange={handleChange}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t mt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-sm rounded bg-[#5FA5DA] text-white hover:bg-[#4d90c3] transition-colors cursor-pointer"
            >
              Create Receipt
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}