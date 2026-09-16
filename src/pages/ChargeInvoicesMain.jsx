import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatusSelector from '../components/ChargeInvoiceStatusSelector';
import ChargeInvoiceDetailsModal from '../components/ChargeInvoiceDetailsModal';
import ToggleButton from '../components/ToggleButton';
import SpreadsheetUploadModal from '../components/SpreadsheetUploadModal';
import { chargeInvoiceService } from '../services/chargeInvoiceService';

function CImain() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // TanStack Query: Cached Data Fetching
    const { 
        data: invoices = [], 
        isLoading: loading 
    } = useQuery({
        queryKey: ['charge_invoices'],
        queryFn: () => chargeInvoiceService.getChargeInvoices(),
    });

    // UI & Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Input Row States
    const [ciIdInput, setCiIdInput] = useState('');
    const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
    const [companyInput, setCompanyInput] = useState('');
    const [detailsInput, setDetailsInput] = useState('');
    const [amountInput, setAmountInput] = useState('');
    const [statusInput, setStatusInput] = useState('unpaid');
    const [itemizedList, setItemizedList] = useState([]);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Auto-Format CI Number to (year)-(pad)-(ci)
    const formatCiNumber = (rawNumber, dateStr) => {
        if (!rawNumber) return '';
        if (rawNumber.includes('-')) return rawNumber.trim();
        const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
        const num = parseInt(rawNumber, 10);
        const padNo = isNaN(num) ? 1 : Math.max(1, Math.floor((num - 701) / 50));
        return `${year}-${padNo}-${rawNumber.trim()}`;
    };

    // Mutation: Create Invoice
    const createInvoiceMutation = useMutation({
        mutationFn: (newInvoice) => chargeInvoiceService.createChargeInvoice(newInvoice),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });
            // Reset input row
            setCiIdInput('');
            setCompanyInput('');
            setDetailsInput('');
            setAmountInput('');
            setItemizedList([]);
            setStatusInput('unpaid');
            alert('Charge Invoice saved successfully!');
        },
        onError: (err) => {
            console.error('Error saving invoice:', err);
            alert(`Failed to save invoice: ${err.message}`);
        }
    });

    // Mutation: Status Update
    const updateStatusMutation = useMutation({
        mutationFn: ({ identifier, newStatus }) => chargeInvoiceService.updateStatus(identifier, newStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });
        },
        onError: (err) => {
            console.error('Error updating status:', err);
            alert(`Failed to update status: ${err.message}`);
        }
    });

    // Mutation: Delete Invoice
    const deleteInvoiceMutation = useMutation({
        mutationFn: (targetId) => chargeInvoiceService.deleteChargeInvoice(targetId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });
        },
        onError: (err) => {
            console.error('Error deleting invoice:', err);
            alert('Failed to delete invoice.');
        }
    });

    // Save Row Action
    const handleSaveRowInvoice = () => {
        if (!companyInput.trim()) {
            alert('Please enter a Company name before saving.');
            return;
        }

        const finalCiNumber = formatCiNumber(ciIdInput || `${Date.now()}`.slice(-4), dateInput);
        const hasItemized = itemizedList && itemizedList.length > 0;
        const finalLegacyDetails = hasItemized ? null : (detailsInput.trim() || null);
        const finalItems = hasItemized ? itemizedList : [];

        createInvoiceMutation.mutate({
            ciNumber: finalCiNumber,
            dateIssued: dateInput,
            customerName: companyInput,
            legacyOrderDetails: finalLegacyDetails,
            status: statusInput,
            amountTotal: parseFloat(amountInput) || 0,
            items: finalItems
        });
    };

    // Status Change Handler
    const handleStatusUpdate = (identifier, newStatus) => {
        updateStatusMutation.mutate({ identifier, newStatus });
    };

    // Delete Action Handler
    const handleDeleteInvoice = (id, ciNumber) => {
        if (!window.confirm(`Are you sure you want to delete invoice ${ciNumber}?`)) return;
        deleteInvoiceMutation.mutate(id || ciNumber);
    };

    const handleSaveModalItems = (items) => {
        setItemizedList(items);

        const multilineSummary = items
            .filter((item) => item.name)
            .map((item) => `${item.quantity} ${item.name} at ₱${item.price} each`)
            .join('\n');

        setDetailsInput(multilineSummary);

        const total = items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.price)), 0);
        setAmountInput(total.toFixed(2));
    };

    // Filter Logic
    const filteredInvoices = invoices.filter((inv) => {
        if (!inv) return false;
        const ci = (inv.ciNumber || '').toLowerCase();
        const cust = (inv.customerName || '').toLowerCase();
        const details = (inv.legacyOrderDetails || inv.itemSummary || '').toLowerCase();
        const currentStatus = inv.status || 'unpaid';

        const matchesSearch = 
            ci.includes(searchTerm.toLowerCase()) || 
            cust.includes(searchTerm.toLowerCase()) ||
            details.includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || currentStatus === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex items-center justify-between p-6 shrink-0">
                <h1>Charge Invoices</h1>
                <div className="flex items-center max-w-62.5 gap-2.5 bg-[#F4F8FB] text-[#5FA5DA] text-[0.8vw] border-3 border-[#5FA5DA] rounded-full px-4 py-2">
                    <i className="fal fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search by ID or Company"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full focus:outline-none"
                    />
                </div>
            </div>

            {/* Invoices Table */}
            <div id="tableContainer" className="flex-1 overflow-auto">
                <table className="min-w-full">
                    <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
                        <tr>
                            <th className="w-[12%] px-4 py-2">CI ID</th>
                            <th className="w-[8%] px-4 py-2">Date</th>
                            <th className="w-[20%] px-4 py-2 text-left">Company</th>
                            <th className="px-4 py-2 text-left">Details</th>
                            <th className="w-[10%] px-4 py-2 text-right">Amount</th>
                            <th className="w-[8%] px-4 py-2">Status</th>
                            <th className="w-[8%] px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Input Row for New CI */}
                        <tr id="inputRow" className="text-center border-b border-gray-200 hover:bg-[#F4F8FB]">
                            <td className="px-4 py-2">
                                <input
                                    type="text"
                                    placeholder="e.g. 751 or 2026-1-751"
                                    value={ciIdInput}
                                    onChange={(e) => setCiIdInput(e.target.value)}
                                    className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 text-[0.8vw] focus:outline-none"
                                />
                            </td>
                            <td className="px-4 py-2">
                                <input
                                    type="date"
                                    value={dateInput}
                                    onChange={(e) => setDateInput(e.target.value)}
                                    className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 text-[0.8vw] focus:outline-none"
                                />
                            </td>
                            <td className="px-4 py-2 text-left">
                                <input
                                    type="text"
                                    value={companyInput}
                                    onChange={(e) => setCompanyInput(e.target.value)}
                                    placeholder="Enter Company"
                                    className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 text-[0.8vw] focus:outline-none"
                                />
                            </td>
                            <td className="px-4 py-2 text-left">
                                <div className="flex items-center gap-1.5">
                                    <textarea
                                        rows={Math.max(1, detailsInput.split('\n').length)}
                                        value={detailsInput}
                                        onChange={(e) => setDetailsInput(e.target.value)}
                                        placeholder="Enter details or click + for items"
                                        className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 text-[0.8vw] focus:outline-none resize-none overflow-hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(true)}
                                        title="Add itemized details"
                                        className="border-2 border-[#5FA5DA] text-[#5FA5DA] rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0 hover:bg-[#5FA5DA] hover:text-white transition-colors cursor-pointer"
                                    >
                                        +
                                    </button>
                                </div>
                            </td>
                            <td className="px-4 py-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={amountInput}
                                    onChange={(e) => setAmountInput(e.target.value)}
                                    className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 text-right text-[0.8vw] focus:outline-none"
                                />
                            </td>
                            <td className="px-4 py-2.5">
                                <StatusSelector
                                    initialStatus={statusInput}
                                    value={statusInput}
                                    onChange={setStatusInput}
                                />
                            </td>
                            <td className="px-4 py-2 text-md">
                                <i
                                    className="far fa-check cursor-pointer text-[#22E11F] hover:scale-110 transition-transform font-bold"
                                    title="Save invoice"
                                    onClick={handleSaveRowInvoice}
                                ></i>
                            </td>
                        </tr>

                        {/* Database Records */}
                        {loading && invoices.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-gray-500 text-[0.85vw]">
                                    Loading charge invoices...
                                </td>
                            </tr>
                        ) : filteredInvoices.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-gray-500 text-[0.85vw]">
                                    No charge invoices found.
                                </td>
                            </tr>
                        ) : (
                            filteredInvoices.map((inv) => {
                                const hasLegacy = Boolean(inv.legacyOrderDetails && inv.legacyOrderDetails.trim());
                                const linkedItems = inv.items || [];
                                const itemizedText = linkedItems.length > 0
                                    ? linkedItems.map((item) => `${item.quantity} ${item.name || 'Item'}`).join(', ')
                                    : '—';

                                return (
                                    <tr key={inv.id || inv.ciNumber} className="text-center border-b border-gray-200 hover:bg-[#F4F8FB] text-[0.8vw]">
                                        <td className="px-4 py-2.5 font-semibold text-gray-800">{inv.ciNumber}</td>
                                        <td className="px-4 py-2.5">{inv.dateIssued}</td>
                                        <td className="px-4 py-2.5 text-left font-medium">{inv.customerName}</td>
                                        
                                        {/* Streamlined Details Display */}
                                        <td className="px-4 py-2.5 text-left text-gray-600 truncate max-w-xs">
                                            {hasLegacy ? (
                                                <span title={inv.legacyOrderDetails}>{inv.legacyOrderDetails}</span>
                                            ) : (
                                                <span title={itemizedText} className="text-gray-800">
                                                    {itemizedText}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-2.5 text-right font-semibold text-[#FF8DCE]">
                                            ₱ {inv.amountTotal ? Number(inv.amountTotal).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <StatusSelector
                                                initialStatus={inv.status || 'unpaid'}
                                                value={inv.status || 'unpaid'}
                                                onChange={(newStatus) => handleStatusUpdate(inv.id || inv.ciNumber, newStatus)}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-md flex items-center justify-center gap-3">
                                            <i
                                                className="far fa-trash cursor-pointer text-gray-500 hover:text-red-500 transition-colors"
                                                title="Delete invoice"
                                                onClick={() => handleDeleteInvoice(inv.id, inv.ciNumber)}
                                            ></i>
                                            <i
                                                className="far fa-eye cursor-pointer text-gray-500 hover:text-[#5FA5DA] transition-colors"
                                                title="View details"
                                                onClick={() => navigate(`/charge-invoice-details/${inv.ciNumber}`)}
                                            ></i>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bottom Toolbar */}
            <div id="toolBar" className="flex items-center justify-between p-6 border-t border-gray-200 shrink-0 bg-white">
                <div className="flex gap-2 items-center text-[0.9vw]">
                    <label>Tools:</label>
                    <ToggleButton label="Enable ID Chaining" onChange={() => {}} />
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="px-2.5 py-0.5 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] bg-[#F4F8FB] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors"
                    >
                        + Upload Spreadsheet
                    </button>
                </div>
                <div className="flex gap-4 items-center text-[0.8vw]">
                    <div className="flex gap-2 items-center">
                        <label>Filter Status:</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-2.5 py-1 border border-gray-300 rounded-full focus:outline-none"
                        >
                            <option value="all">All Statuses</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            <ChargeInvoiceDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveModalItems}
                initialItems={itemizedList}
            />

            <SpreadsheetUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={() => queryClient.invalidateQueries({ queryKey: ['charge_invoices'] })}
            />
        </div>
    );
}

export default CImain;