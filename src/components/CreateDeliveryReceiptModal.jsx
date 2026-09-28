// src/components/CreateDeliveryReceiptModal.jsx
import React, { useState, useEffect, useMemo } from 'react';

/**
 * CreateDeliveryReceiptModal
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: func
 * - onSubmit: func
 * - companyName: customer/company name
 * - customerName: fallback customer name
 * - ciNumber: string
 * - invoiceItems: array of items from parent invoice
 * - legacyOrderDetails: string from parent invoice
 * - existingDeliveries: array of previous delivery receipts for this invoice
 */
export default function CreateDeliveryReceiptModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  companyName = '', 
  customerName = '',
  ciNumber = '',
  invoiceItems = [],
  legacyOrderDetails = '',
  existingDeliveries = []
}) {
  const initialCompany = companyName || customerName || '';
  const isLegacyInvoice = Boolean(legacyOrderDetails && legacyOrderDetails.trim()) && (!invoiceItems || invoiceItems.length === 0);

  const [formData, setFormData] = useState({
    drNumber: '',
    dateIssued: new Date().toISOString().split('T')[0],
    deliveredTo: initialCompany,
    tin: '',
    businessAddress: '',
    paymentType: 'cash',
    status: 'pending delivery',
    totalPaidAmount: '',
    deliveryDetailsLegacy: '',
  });

  // Track item quantities being allocated for this delivery receipt: { [itemName]: quantityToDeliver }
  const [selectedQuantities, setSelectedQuantities] = useState({});

  // Calculate previously delivered quantities across prior delivery receipts
  const itemDeliveryBreakdown = useMemo(() => {
    if (isLegacyInvoice || !invoiceItems || invoiceItems.length === 0) return [];

    const deliveredMap = {};
    (existingDeliveries || [])
      .filter((dr) => String(dr.status).toLowerCase() !== 'cancelled')
      .forEach((dr) => {
        const drItems = dr.delivery_receipt_items || dr.items || [];
        drItems.forEach((it) => {
          const name = it.item_name || it.name;
          if (name) {
            deliveredMap[name] = (deliveredMap[name] || 0) + Number(it.quantity || 0);
          }
        });
      });

    return invoiceItems.map((invItem) => {
      const name = invItem.name || invItem.item_name || 'Item';
      const ordered = Number(invItem.quantity || 0);
      const deliveredBefore = deliveredMap[name] || 0;
      const remaining = Math.max(0, ordered - deliveredBefore);
      const price = Number(invItem.price || 0);

      return {
        name,
        ordered,
        deliveredBefore,
        remaining,
        price
      };
    });
  }, [invoiceItems, existingDeliveries, isLegacyInvoice]);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const initialSelected = {};
      let calculatedTotal = 0;

      itemDeliveryBreakdown.forEach((item) => {
        initialSelected[item.name] = item.remaining;
        calculatedTotal += item.remaining * item.price;
      });
      setSelectedQuantities(initialSelected);

      const allWillBeCompleted = itemDeliveryBreakdown.every(
        (item) => (initialSelected[item.name] || 0) >= item.remaining
      );

      setFormData({
        drNumber: `DR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        dateIssued: new Date().toISOString().split('T')[0],
        deliveredTo: companyName || customerName || '',
        tin: '',
        businessAddress: '',
        paymentType: 'cash',
        status: allWillBeCompleted ? 'completed' : 'pending delivery',
        totalPaidAmount: calculatedTotal > 0 ? String(calculatedTotal.toFixed(2)) : '',
        deliveryDetailsLegacy: isLegacyInvoice ? legacyOrderDetails : '',
      });
    }
  }, [isOpen, companyName, customerName, isLegacyInvoice, legacyOrderDetails, itemDeliveryBreakdown]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQtyChange = (itemName, maxAllowed, val) => {
    const parsed = Math.max(0, Math.min(Number(val) || 0, maxAllowed));
    const updated = { ...selectedQuantities, [itemName]: parsed };
    setSelectedQuantities(updated);

    // Auto-update total paid amount according to delivered items value
    let newCalculatedTotal = 0;
    itemDeliveryBreakdown.forEach((item) => {
      const qty = item.name === itemName ? parsed : (updated[item.name] || 0);
      newCalculatedTotal += qty * item.price;
    });

    const allCompleted = itemDeliveryBreakdown.every(
      (item) => (updated[item.name] || 0) >= item.remaining
    );

    setFormData((prev) => ({
      ...prev,
      totalPaidAmount: newCalculatedTotal > 0 ? String(newCalculatedTotal.toFixed(2)) : '',
      status: allCompleted ? 'completed' : 'pending delivery'
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.drNumber.trim()) {
      alert('Please enter a DR number.');
      return;
    }

    const payload = {
      ...formData,
      totalPaidAmount: parseFloat(formData.totalPaidAmount) || 0,
      ciNumber
    };

    if (isLegacyInvoice) {
      onSubmit({
        ...payload,
        deliveryDetails: [],
        legacyOrderDetails: formData.deliveryDetailsLegacy
      });
    } else {
      const activeDeliveryItems = itemDeliveryBreakdown
        .map((item) => ({
          name: item.name,
          quantity: Number(selectedQuantities[item.name] || 0),
          price: item.price
        }))
        .filter((item) => item.quantity > 0);

      if (activeDeliveryItems.length === 0) {
        alert('Please specify at least 1 item with quantity greater than 0 to deliver.');
        return;
      }

      onSubmit({
        ...payload,
        deliveryDetails: activeDeliveryItems
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl shadow-xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b p-4 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800">Create Delivery Receipt</h2>
            {ciNumber && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-[#5FA5DA] font-semibold border border-blue-200">
                CI #{ciNumber}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isLegacyInvoice ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {isLegacyInvoice ? 'Legacy Mode' : 'Itemized Mode'}
            </span>
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
          
          {/* Row 1: DR Number, Delivered To, Date Issued */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 w-1/4">
              <label className="text-xs font-semibold text-gray-600">DR Number *</label>
              <input
                type="text"
                name="drNumber"
                required
                value={formData.drNumber}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA] font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-gray-600">Delivered To *</label>
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
            <div className="flex flex-col gap-1 w-1/4">
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

          {/* Row 2: TIN, Payment Type, Total Paid Amount & Status */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 w-1/4">
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
            <div className="flex flex-col gap-1 w-1/4">
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
            <div className="flex flex-col gap-1 w-1/4">
              <label className="text-xs font-semibold text-gray-600">Total Paid Amount (₱)</label>
              <input
                type="number"
                name="totalPaidAmount"
                step="any"
                min="0"
                placeholder="0.00"
                value={formData.totalPaidAmount}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA] font-semibold text-emerald-600"
              />
            </div>
            <div className="flex flex-col gap-1 w-1/4">
              <label className="text-xs font-semibold text-gray-600">Delivery Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA] bg-white cursor-pointer font-medium"
              >
                <option value="pending delivery">Pending Delivery</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Row 3: Business Address */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Business Address</label>
            <input
              type="text"
              name="businessAddress"
              placeholder="Delivery address..."
              value={formData.businessAddress}
              onChange={handleChange}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA]"
            />
          </div>

          {/* Dynamic Delivery Details Section */}
          <div className="flex flex-col gap-2 pt-2 border-t">
            {isLegacyInvoice ? (
              /* Legacy Mode */
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-700">Delivery Details (Legacy Notes)</label>
                  <span className="text-[0.68rem] text-gray-500">Inherited from Charge Invoice</span>
                </div>
                <textarea
                  name="deliveryDetailsLegacy"
                  rows={4}
                  value={formData.deliveryDetailsLegacy}
                  onChange={handleChange}
                  placeholder="Enter legacy delivery descriptions..."
                  className="w-full border border-gray-300 rounded p-2.5 text-sm focus:outline-none focus:border-[#5FA5DA] resize-none"
                />
              </div>
            ) : (
              /* Itemized Mode */
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-xs font-bold text-gray-800">Select Items to Deliver</label>
                    <p className="text-[0.7rem] text-gray-500">
                      Cross-referenced with previous deliveries. Fully delivered items are locked at 0.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const maxRemaining = {};
                      let totalVal = 0;
                      itemDeliveryBreakdown.forEach((i) => { 
                        maxRemaining[i.name] = i.remaining;
                        totalVal += i.remaining * i.price;
                      });
                      setSelectedQuantities(maxRemaining);
                      setFormData((prev) => ({
                        ...prev,
                        totalPaidAmount: totalVal > 0 ? String(totalVal.toFixed(2)) : '',
                        status: 'completed'
                      }));
                    }}
                    className="text-[0.7rem] text-[#5FA5DA] hover:underline font-medium cursor-pointer"
                  >
                    Select All Remaining
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 font-semibold text-left">
                        <th className="p-2">Item Name</th>
                        <th className="p-2 text-center">Ordered</th>
                        <th className="p-2 text-center">Prev. Delivered</th>
                        <th className="p-2 text-center">Remaining</th>
                        <th className="p-2 text-center w-28">Deliver Now</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                      {itemDeliveryBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-4 text-center text-gray-400">
                            No items available on this invoice.
                          </td>
                        </tr>
                      ) : (
                        itemDeliveryBreakdown.map((item, idx) => {
                          const isFullyDelivered = item.remaining === 0;
                          return (
                            <tr key={idx} className={isFullyDelivered ? 'bg-gray-50/60 opacity-60' : 'hover:bg-gray-50'}>
                              <td className="p-2 font-medium">
                                {item.name}
                                {isFullyDelivered && (
                                  <span className="ml-2 text-[0.65rem] text-emerald-600 font-semibold">
                                    ✓ All Delivered
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-center">{item.ordered}</td>
                              <td className="p-2 text-center text-gray-500">{item.deliveredBefore}</td>
                              <td className="p-2 text-center font-bold text-gray-800">
                                {item.remaining}
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.remaining}
                                  disabled={isFullyDelivered}
                                  value={selectedQuantities[item.name] ?? 0}
                                  onChange={(e) => handleQtyChange(item.name, item.remaining, e.target.value)}
                                  className="w-20 border border-gray-300 rounded px-2 py-1 text-center text-xs font-semibold focus:outline-none focus:border-[#5FA5DA] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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