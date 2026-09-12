import React, { useState, useEffect } from 'react';

/**
 * ChargeInvoiceDetailsModal
 * 
 * Props:
 * - isOpen: boolean to control visibility
 * - onClose: function to close the modal
 * - onSave: function that receives the array of items upon saving
 * - initialItems: optional array of items to pre-fill when editing
 */
export default function ChargeInvoiceDetailsModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialItems = [] 
}) {
  const [items, setItems] = useState([
    { name: '', quantity: 1, price: 0 }
  ]);

  useEffect(() => {
    if (isOpen) {
      if (initialItems && initialItems.length > 0) {
        setItems(initialItems);
      } else {
        setItems([{ name: '', quantity: 1, price: 0 }]);
      }
    }
  }, [isOpen, initialItems]);

  if (!isOpen) return null;

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { name: '', quantity: 1, price: 0 }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(items);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {/* Fixed width (680px) and fixed height (450px) */}
      <div className="bg-white rounded-lg p-6 w-170 h-112.5 shadow-lg flex flex-col justify-between">
        
        {/* Header Section */}
        <div className="flex justify-between items-center border-b pb-2 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">Add Itemized Details</h2>
          <button 
            type="button" 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Table Headers */}
        <div className="flex gap-3 text-xs font-semibold text-gray-500 px-1 mt-3 shrink-0">
          <span className="flex-1">Item Name</span>
          <span className="w-24 text-center">Qty</span>
          <span className="w-32 text-right">Price</span>
          <span className="w-8"></span>
        </div>
        
        {/* Item Rows */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 my-2 pr-1">
          {items.map((item, index) => (
            <div key={index} className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="Item Name"
                value={item.name}
                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5FA5DA]"
              />
              <input
                type="number"
                placeholder="Qty"
                min="1"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-[#5FA5DA] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <input
                type="number"
                placeholder="Price"
                min="0"
                step="any"
                value={item.price}
                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                className="w-32 border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-[#5FA5DA] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                disabled={items.length === 1}
                onClick={() => removeItemRow(index)}
                className={`w-8 text-center font-bold text-lg cursor-pointer ${
                  items.length === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700'
                }`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        {/* Footer Section */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={addItemRow}
            className="text-sm text-[#5FA5DA] hover:underline font-medium flex items-center gap-1 cursor-pointer mb-2"
          >
            <span>+</span> Add Item
          </button>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-sm rounded bg-[#5FA5DA] text-white hover:bg-[#4d90c3] transition-colors cursor-pointer"
            >
              Save Details
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}