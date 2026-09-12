import React, { useState } from 'react';
import ChargeInvoiceDetailsModal from './ChargeInvoiceDetailsModal';

/**
 * CreateDeliveryReceiptModal
 * 
 * Props:
 * - isOpen: boolean to control visibility
 * - onClose: function to close the modal
 * - onSubmit: function that receives the receipt form data
 */
export default function CreateDeliveryReceiptModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    dateIssued: '',
    deliveredTo: '',
    tin: '',
    businessAddress: '',
    deliveryDetailsLegacy: '',
    paymentType: 'cash',
    totalPaidAmount: 0,
  });

  // State for itemized delivery details
  const [deliveryItems, setDeliveryItems] = useState([
    { name: '', quantity: 1, price: 0 }
  ]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveDeliveryItems = (newItems) => {
    const sanitized = newItems.map((item) => ({
      name: item.name,
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
    }));
    setDeliveryItems(sanitized);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        ...formData,
        deliveryDetails: deliveryItems,
      });
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-3xl shadow-xl flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b p-4 shrink-0">
            <h2 className="text-lg font-bold text-gray-800">Create Delivery Receipt</h2>
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
            
            {/* Row 1: Delivered To & Date Issued */}
            <div className="flex gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-semibold text-gray-600">Delivered To</label>
                <input
                  type="text"
                  name="deliveredTo"
                  required
                  placeholder="Client / Company Name"
                  value={formData.deliveredTo}
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

            {/* Row 2: TIN, Payment Type & Paid Amount */}
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
                placeholder="Enter full business address"
                value={formData.businessAddress}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA]"
              />
            </div>

            {/* Row 4: Side-by-Side Delivery Details */}
            <div className="flex gap-4 items-stretch">
              {/* Delivery Details (Legacy) */}
              <div className="flex flex-col gap-1 w-1/2">
                <label className="text-xs font-semibold text-gray-600">Delivery Details (Legacy)</label>
                <textarea
                  name="deliveryDetailsLegacy"
                  placeholder="Enter unformatted legacy delivery notes..."
                  value={formData.deliveryDetailsLegacy}
                  onChange={handleChange}
                  className="flex-1 w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-[#5FA5DA] resize-none min-h-30"
                />
              </div>

              {/* Delivery Details (Itemized) */}
              <div className="flex flex-col gap-1 w-1/2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-600">Delivery Details</label>
                  <button
                    type="button"
                    onClick={() => setIsItemModalOpen(true)}
                    className="px-2 py-0.5 text-[0.7rem] rounded-full border border-[#5FA5DA] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors cursor-pointer font-medium"
                  >
                    + Add / Edit Items
                  </button>
                </div>

                <div className="flex-1 border border-gray-300 rounded-md overflow-hidden max-h-33.75 overflow-y-auto">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-300">
                      <tr className="text-xs text-gray-600">
                        <th className="p-1.5 text-left">Item</th>
                        <th className="p-1.5 text-center">Qty</th>
                        <th className="p-1.5 text-right">Price</th>
                        <th className="p-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
                      {deliveryItems.map((item, index) => (
                        <tr key={index}>
                          <td className="p-1.5 text-left">{item.name || '—'}</td>
                          <td className="p-1.5 text-center">{item.quantity}</td>
                          <td className="p-1.5 text-right">${Number(item.price).toFixed(2)}</td>
                          <td className="p-1.5 text-right">${(Number(item.quantity) * Number(item.price)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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

      {/* Embedded Add Item Modal */}
      <ChargeInvoiceDetailsModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveDeliveryItems}
        initialItems={deliveryItems}
      />
    </>
  );
}