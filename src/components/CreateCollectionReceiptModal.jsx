import React, { useState, useEffect } from 'react';

/**
 * CreateCollectionReceiptModal
 * 
 * Props:
 * - isOpen: boolean to control visibility
 * - onClose: function to close the modal
 * - onSubmit: function that receives the collection receipt form data
 * - companyName: customer/company name passed from ChargeInvoiceDetails
 * - ciNumber: linked invoice identifier
 * - invoiceTotal: target total or remaining balance of the charge invoice
 */
export default function CreateCollectionReceiptModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  companyName = '', 
  customerName = '',
  ciNumber = '',
  invoiceTotal = 0
}) {
  const initialCompany = companyName || customerName || '';

  const [formData, setFormData] = useState({
    crNumber: '',
    dateIssued: new Date().toISOString().split('T')[0],
    registeredName: initialCompany,
    tin: '',
    businessAddress: '',
    paymentType: 'cash',
    amountCollected: '',
    status: 'full',
    remarks: '',
  });

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        crNumber: '',
        dateIssued: new Date().toISOString().split('T')[0],
        registeredName: companyName || customerName || '',
        tin: '',
        businessAddress: '',
        paymentType: 'cash',
        amountCollected: invoiceTotal > 0 ? String(invoiceTotal) : '',
        status: 'full',
        remarks: '',
      });
    }
  }, [isOpen, companyName, customerName, invoiceTotal]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-calculate partial vs full status when amount changes
      if (name === 'amountCollected') {
        const paid = parseFloat(value) || 0;
        const target = parseFloat(invoiceTotal) || 0;
        if (target > 0 && paid > 0 && paid < target) {
          updated.status = 'partial';
        } else {
          updated.status = 'full';
        }
      }

      return updated;
    });
  };

  const handleGenerateCrNumber = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({
      ...prev,
      crNumber: `CR-${new Date().getFullYear()}-${randomSuffix}`
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.crNumber.trim()) {
      alert('Please enter a CR Number.');
      return;
    }

    const numericAmount = parseFloat(formData.amountCollected) || 0;
    if (numericAmount <= 0) {
      alert('Please enter a valid amount collected.');
      return;
    }

    if (onSubmit) {
      onSubmit({
        ...formData,
        amountCollected: numericAmount,
        totalPaidAmount: numericAmount, // fallback safety for legacy callers
        amount: numericAmount,          // fallback safety
        ciNumber
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-xl shadow-xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b p-4 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800">Create Collection Receipt</h2>
            {ciNumber && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-[#5FA5DA] font-semibold border border-blue-200">
                CI #{ciNumber}
              </span>
            )}
          </div>
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
          
          {/* Row 1: CR Number & Date Issued */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-600">CR Number *</label>
                <button
                  type="button"
                  onClick={handleGenerateCrNumber}
                  className="text-[0.65rem] text-[#5FA5DA] hover:underline cursor-pointer font-medium"
                >
                  Generate Auto
                </button>
              </div>
              <input
                type="text"
                name="crNumber"
                required
                placeholder="e.g. CR-2026-001"
                value={formData.crNumber}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA] font-medium"
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

          {/* Row 2: Registered Name */}
          <div className="flex flex-col gap-1">
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

          {/* Row 3: TIN & Payment Type */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 w-1/2">
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
            <div className="flex flex-col gap-1 w-1/2">
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
          </div>

          {/* Row 4: Amount Collected & Auto Status */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 w-2/3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-600">Amount Collected (₱) *</label>
                {invoiceTotal > 0 && (
                  <span className="text-[0.68rem] text-gray-500">
                    Invoice Total: ₱{Number(invoiceTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <input
                type="number"
                name="amountCollected"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={formData.amountCollected}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA] font-semibold text-gray-800"
              />
            </div>

            <div className="flex flex-col gap-1 w-1/3">
              <label className="text-xs font-semibold text-gray-600">Receipt Status</label>
              <div className="flex items-center h-full">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  formData.status === 'partial' 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {formData.status === 'partial' ? 'Partial Payment' : 'Full Payment'}
                </span>
              </div>
            </div>
          </div>

          {/* Row 5: Business Address */}
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
              className="px-4 py-1.5 text-sm rounded bg-[#5FA5DA] text-white hover:bg-[#4d90c3] transition-colors cursor-pointer font-medium"
            >
              Create Receipt
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}