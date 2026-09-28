// src/pages/SalesInvoicesMain.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ChargeInvoiceDetailsModal from '../components/ChargeInvoiceDetailsModal';
import SpreadsheetUploadModal from '../components/SpreadsheetUploadModal';
import { supabase } from '../lib/supabaseClient';

function SalesInvoicesMain() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // 1. TanStack Query: Fetch Sales Invoices from Supabase
    const { 
        data: invoices = [], 
        isLoading: loading,
        error: fetchError
    } = useQuery({
        queryKey: ['sales_invoices'],
        queryFn: async () => {
            // First attempt: fetch with items if relationship exists
            let { data, error } = await supabase
                .from('sales_invoices')
                .select(`*, sales_invoice_items (*)`)
                .order('date_issued', { ascending: false });

            // Fallback: If sales_invoice_items relation is missing, fetch sales_invoices alone
            if (error) {
                console.warn('[SalesInvoicesMain] Fetch with items failed, falling back to base table:', error.message);
                const baseRes = await supabase
                    .from('sales_invoices')
                    .select('*')
                    .order('date_issued', { ascending: false });

                if (baseRes.error) {
                    console.error('[SalesInvoicesMain] Base fetch error:', baseRes.error);
                    throw baseRes.error;
                }
                data = baseRes.data;
            }

            return (data || []).map((row) => ({
                id: row.id,
                siNumber: row.si_number || row.siNumber,
                dateIssued: row.date_issued || row.dateIssued,
                customerName: row.customer_name || row.customerName || 'Walk-in',
                legacyOrderDetails: row.legacy_order_details || row.details || row.legacyOrderDetails || '',
                amountTotal: Number(row.amount ?? row.legacy_amount ?? row.amount_total ?? 0),
                items: row.sales_invoice_items || row.items || []
            }));
        },
        staleTime: 0,
        refetchOnMount: 'always',
        refetchInterval: 10000 // Polling every 10 seconds to catch background updates
    });

    // Customer directory for provisioning checks
    const existingCustomers = useMemo(() => {
        const uniqueNames = new Set(
            invoices.map((inv) => (inv.customerName || '').trim()).filter(Boolean)
        );
        return Array.from(uniqueNames);
    }, [invoices]);

    // Search & Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [isInputRowOpen, setIsInputRowOpen] = useState(false);
    const [isIdChaining, setIsIdChaining] = useState(true);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({
        key: 'dateIssued',
        direction: 'desc'
    });

    // Setup Modal & Manual Entry States
    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
    const [entryMode, setEntryMode] = useState('auto'); // 'auto' | 'manual'
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activePad, setActivePad] = useState(1);
    const [manualSiNumber, setManualSiNumber] = useState('');

    // Input Row States
    const [siIdInput, setSiIdInput] = useState('');
    const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
    const [customerInput, setCustomerInput] = useState('');
    const [detailsInput, setDetailsInput] = useState('');
    const [amountInput, setAmountInput] = useState('');
    const [itemizedList, setItemizedList] = useState([]);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isCreateAccountPromptOpen, setIsCreateAccountPromptOpen] = useState(false);

    // Pad calculation: 1-50 = Pad 1, 51-100 = Pad 2, etc.
    const computePadNumber = (siNum) => {
        const num = parseInt(siNum, 10);
        if (isNaN(num) || num < 1) return 1;
        return Math.floor((num - 1) / 50) + 1;
    };

    // Auto-calculate the next sequence number from existing database records
    const computeNextSequenceFromData = (targetYear) => {
        const yearStr = String(targetYear);
        let maxSi = 0;
        let associatedPad = 1;

        invoices.forEach((inv) => {
            if (!inv || !inv.siNumber) return;
            const clean = String(inv.siNumber).replace(/^SI-/i, '');
            const parts = clean.trim().split('-');
            
            if (parts.length >= 2 && parts[0] === yearStr) {
                const pad = parts.length === 3 ? parseInt(parts[1], 10) : 1;
                const seq = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(seq) && seq > maxSi) {
                    maxSi = seq;
                    associatedPad = !isNaN(pad) ? pad : associatedPad;
                }
            }
        });

        if (maxSi === 0) {
            return { nextPad: 1, nextSi: 1 };
        }

        const nextSi = maxSi + 1;
        const nextPad = computePadNumber(nextSi);

        return { nextPad, nextSi };
    };

    const handleConfirmSetup = () => {
        const today = new Date();
        const defaultDate = `${selectedYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setDateInput(defaultDate);

        if (entryMode === 'manual') {
            if (manualSiNumber.trim()) {
                const cleaned = manualSiNumber.trim().replace(/^SI-/i, '');
                const parts = cleaned.split('-');
                if (parts.length === 3) {
                    setSelectedYear(parseInt(parts[0], 10) || selectedYear);
                    setActivePad(parseInt(parts[1], 10) || 1);
                    setSiIdInput(parts[2]);
                } else {
                    setSiIdInput(cleaned);
                }
            } else {
                setSiIdInput('');
            }
        } else {
            const { nextPad, nextSi } = computeNextSequenceFromData(selectedYear);
            setActivePad(nextPad);
            setSiIdInput(String(nextSi));
        }

        setIsSetupModalOpen(false);
        setIsInputRowOpen(true);
    };

    const resetFormFields = () => {
        setCustomerInput('');
        setDetailsInput('');
        setAmountInput('');
        setItemizedList([]);
    };

    // 2. Mutation: Create Sales Invoice in Database (uses schema columns `amount` and `details`)
    const createInvoiceMutation = useMutation({
        mutationFn: async (payload) => {
            const { data: created, error } = await supabase
                .from('sales_invoices')
                .insert([{
                    si_number: payload.siNumber,
                    date_issued: payload.dateIssued,
                    customer_name: payload.customerName,
                    details: payload.legacyOrderDetails,
                    legacy_order_details: payload.legacyOrderDetails,
                    amount: payload.amountTotal,
                    legacy_amount: payload.amountTotal
                }])
                .select()
                .single();

            if (error) throw error;

            if (payload.items && payload.items.length > 0) {
                try {
                    const itemsPayload = payload.items.map((it) => ({
                        sales_invoice_id: created.id,
                        item_name: it.name || it.itemName || 'Item',
                        quantity: Number(it.quantity) || 1,
                        unit_price: Number(it.price) || 0
                    }));

                    await supabase.from('sales_invoice_items').insert(itemsPayload);
                } catch (itErr) {
                    console.warn('[SalesInvoicesMain] Item insert skipped or failed:', itErr);
                }
            }

            return created;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sales_invoices'] });
            resetFormFields();

            if (isIdChaining && entryMode === 'auto') {
                const parts = variables.siNumber.replace(/^SI-/i, '').split('-');
                const currentSeq = parseInt(parts[parts.length - 1], 10);
                const nextSeq = (isNaN(currentSeq) ? 0 : currentSeq) + 1;
                const nextPad = computePadNumber(nextSeq);

                setActivePad(nextPad);
                setSiIdInput(String(nextSeq));
                setIsInputRowOpen(true);
            } else {
                setSiIdInput('');
                setIsInputRowOpen(false);
            }

            alert('Sales invoice saved successfully!');
        },
        onError: (err) => {
            console.error('Error saving sales invoice:', err);
            alert(`Failed to save invoice: ${err.message}`);
        }
    });

    // 3. Mutation: Delete Sales Invoice
    const deleteInvoiceMutation = useMutation({
        mutationFn: async (id) => {
            try {
                await supabase.from('sales_invoice_items').delete().eq('sales_invoice_id', id);
            } catch (_) {}
            const { error } = await supabase.from('sales_invoices').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales_invoices'] });
            alert('Sales invoice deleted successfully.');
        },
        onError: (err) => alert(`Failed to delete invoice: ${err.message}`)
    });

    // Save Row Logic
    const handleSaveRowInvoice = () => {
        if (!customerInput.trim()) {
            alert('Please enter a Customer Name before saving.');
            return;
        }

        const customerExists = existingCustomers.some(
            (name) => name.toLowerCase() === customerInput.trim().toLowerCase()
        );

        if (!customerExists && existingCustomers.length > 0) {
            setIsCreateAccountPromptOpen(true);
        } else {
            executeSaveInvoice();
        }
    };

    const executeSaveInvoice = () => {
        let finalSiNumber = '';
        if (entryMode === 'manual') {
            const rawVal = siIdInput.trim();
            if (!rawVal) {
                alert('Please enter a valid SI ID.');
                return;
            }
            finalSiNumber = rawVal.startsWith('SI-') ? rawVal : `SI-${rawVal}`;
        } else {
            const num = parseInt(siIdInput, 10);
            if (isNaN(num) || num < 1) {
                alert('Please enter a valid SI number sequence.');
                return;
            }
            finalSiNumber = `SI-${selectedYear}-${activePad}-${num}`;
        }

        const isDuplicate = invoices.some((inv) => inv.siNumber === finalSiNumber);
        if (isDuplicate) {
            if (!window.confirm(`Invoice ${finalSiNumber} already exists in your database! Do you still want to proceed?`)) {
                return;
            }
        }

        const hasItemized = itemizedList && itemizedList.length > 0;
        const finalLegacyDetails = hasItemized ? null : (detailsInput.trim() || null);
        const finalItems = hasItemized ? itemizedList : [];

        createInvoiceMutation.mutate({
            siNumber: finalSiNumber,
            dateIssued: dateInput,
            customerName: customerInput.trim(),
            legacyOrderDetails: finalLegacyDetails,
            amountTotal: parseFloat(amountInput) || 0,
            items: finalItems
        });
    };

    const handleConfirmAccountCreation = () => {
        setIsCreateAccountPromptOpen(false);
        executeSaveInvoice();
    };

    const handleDeleteInvoice = (id, siNumber) => {
        if (!window.confirm(`Are you sure you want to delete invoice ${siNumber}?`)) return;
        deleteInvoiceMutation.mutate(id);
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

    const handleSort = (columnKey) => {
        setSortConfig((prev) => ({
            key: columnKey,
            direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const renderSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <i className="far fa-sort text-gray-300 ml-1 text-[0.65vw] group-hover:text-gray-500 transition-colors"></i>;
        }
        return sortConfig.direction === 'asc' ? (
            <i className="fas fa-sort-up text-[#5FA5DA] ml-1 text-[0.7vw]"></i>
        ) : (
            <i className="fas fa-sort-down text-[#5FA5DA] ml-1 text-[0.7vw]"></i>
        );
    };

    // Filter and Sort Pipeline
    const processedInvoices = useMemo(() => {
        const filtered = invoices.filter((inv) => {
            if (!inv) return false;
            const term = searchTerm.toLowerCase();
            const si = (inv.siNumber || '').toLowerCase();
            const cust = (inv.customerName || '').toLowerCase();
            const details = (inv.legacyOrderDetails || '').toLowerCase();

            const matchesSearch = si.includes(term) || cust.includes(term) || details.includes(term);
            const matchesDate = !filterDate || inv.dateIssued === filterDate;

            return matchesSearch && matchesDate;
        });

        return filtered.sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA = a[key];
            let valB = b[key];

            if (key === 'amountTotal') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
                return direction === 'asc' ? valA - valB : valB - valA;
            }

            if (key === 'dateIssued') {
                const timeA = new Date(valA || 0).getTime();
                const timeB = new Date(valB || 0).getTime();
                return direction === 'asc' ? timeA - timeB : timeB - timeA;
            }

            const strA = String(valA || '').toLowerCase();
            const strB = String(valB || '').toLowerCase();
            if (strA < strB) return direction === 'asc' ? -1 : 1;
            if (strA > strB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [invoices, searchTerm, filterDate, sortConfig]);

    const handleSpreadsheetUpload = () => {
        queryClient.invalidateQueries({ queryKey: ['sales_invoices'] });
        setIsUploadModalOpen(false);
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div id="pageHeader" className="flex items-center justify-between p-6 shrink-0">
                <h1 className="text-xl font-bold">Sales Invoices</h1>
                <div className="flex items-center max-w-62.5 gap-2.5 bg-[#F4F8FB] text-[#5FA5DA] text-[0.8vw] border-3 border-[#5FA5DA] rounded-full px-4 py-2">
                    <i className="fal fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search by SI ID or Customer"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full focus:outline-none"
                    />
                </div>
            </div>

            {/* Table Container */}
            <div id="tableContainer" className="flex-1 overflow-auto scrollbar-none">
                <table className="min-w-full">
                    <thead className="sticky top-0 bg-white z-10 border-b border-gray-200 select-none">
                        <tr>
                            <th 
                                className="w-[14%] px-3 py-2 text-center cursor-pointer hover:bg-gray-50 group transition-colors"
                                onClick={() => handleSort('siNumber')}
                            >
                                <div className="inline-flex items-center justify-center font-semibold text-gray-700">
                                    SI ID {renderSortIcon('siNumber')}
                                </div>
                            </th>
                            <th 
                                className="w-[10%] px-3 py-2 text-center cursor-pointer hover:bg-gray-50 group transition-colors"
                                onClick={() => handleSort('dateIssued')}
                            >
                                <div className="inline-flex items-center justify-center font-semibold text-gray-700">
                                    Date {renderSortIcon('dateIssued')}
                                </div>
                            </th>
                            <th 
                                className="w-[20%] px-3 py-2 text-left cursor-pointer hover:bg-gray-50 group transition-colors"
                                onClick={() => handleSort('customerName')}
                            >
                                <div className="inline-flex items-center font-semibold text-gray-700">
                                    Customer {renderSortIcon('customerName')}
                                </div>
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Details</th>
                            <th 
                                className="w-[12%] px-3 py-2 text-right cursor-pointer hover:bg-gray-50 group transition-colors"
                                onClick={() => handleSort('amountTotal')}
                            >
                                <div className="inline-flex items-center justify-end font-semibold text-gray-700">
                                    Amount {renderSortIcon('amountTotal')}
                                </div>
                            </th>
                            <th className="w-[8%] px-3 py-2 font-semibold text-gray-700 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Inline Input Row */}
                        {isInputRowOpen && (
                            <tr id="inputRow" className="text-center border-b-2 border-[#5FA5DA] bg-[#F4F8FB]">
                                <td className="px-3 py-2">
                                    <div className="flex items-center bg-[#EEF8FF] border border-[#5FA5DA] rounded px-2 py-1 gap-1">
                                        {entryMode === 'auto' ? (
                                            <>
                                                <span className="text-[0.75vw] font-bold text-[#5FA5DA] select-none whitespace-nowrap">
                                                    SI-{selectedYear}-{activePad}-
                                                </span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="1"
                                                    value={siIdInput}
                                                    onChange={(e) => {
                                                        const numericOnly = e.target.value.replace(/\D/g, '');
                                                        setSiIdInput(numericOnly);
                                                        if (numericOnly) {
                                                            setActivePad(computePadNumber(numericOnly));
                                                        }
                                                    }}
                                                    className="w-full bg-transparent text-[0.78vw] focus:outline-none font-bold text-gray-800"
                                                />
                                                <button
                                                    type="button"
                                                    title="Switch to manual custom ID"
                                                    onClick={() => setEntryMode('manual')}
                                                    className="text-gray-400 hover:text-[#5FA5DA] text-[0.7vw] cursor-pointer"
                                                >
                                                    <i className="far fa-edit"></i>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    placeholder="SI-2026-1-10"
                                                    value={siIdInput}
                                                    onChange={(e) => setSiIdInput(e.target.value)}
                                                    className="w-full bg-transparent text-[0.78vw] focus:outline-none font-bold text-gray-800"
                                                />
                                                <button
                                                    type="button"
                                                    title="Switch back to auto sequence"
                                                    onClick={() => setEntryMode('auto')}
                                                    className="text-amber-500 hover:text-amber-700 text-[0.65vw] font-bold cursor-pointer"
                                                >
                                                    Auto
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="date"
                                        value={dateInput}
                                        onChange={(e) => {
                                            setDateInput(e.target.value);
                                            if (e.target.value) {
                                                setSelectedYear(new Date(e.target.value).getFullYear());
                                            }
                                        }}
                                        className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-1 py-1 text-[0.75vw] focus:outline-none"
                                    />
                                </td>
                                <td className="px-3 py-2 text-left">
                                    <input
                                        type="text"
                                        value={customerInput}
                                        onChange={(e) => setCustomerInput(e.target.value)}
                                        placeholder="Enter Customer Name"
                                        className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 text-[0.78vw] focus:outline-none"
                                    />
                                </td>
                                <td className="px-3 py-2 text-left">
                                    <div className="flex items-center gap-1.5">
                                        <textarea
                                            rows={Math.max(1, detailsInput.split('\n').length)}
                                            value={detailsInput}
                                            onChange={(e) => setDetailsInput(e.target.value)}
                                            placeholder="Enter details or click + for items"
                                            className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 text-[0.78vw] focus:outline-none resize-none overflow-hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(true)}
                                            title="Add itemized details"
                                            className="border-2 border-[#5FA5DA] text-[#5FA5DA] rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs shrink-0 hover:bg-[#5FA5DA] hover:text-white transition-colors cursor-pointer"
                                        >
                                            +
                                        </button>
                                    </div>
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={amountInput}
                                        onChange={(e) => setAmountInput(e.target.value)}
                                        className="w-full bg-[#EEF8FF] border-b border-[#EAEAEA] px-2 py-1 text-right text-[0.78vw] focus:outline-none"
                                    />
                                </td>
                                <td className="px-3 py-2 text-md">
                                    <div className="flex items-center justify-center gap-2">
                                        <i
                                            className="far fa-check cursor-pointer text-[#22E11F] hover:scale-110 transition-transform font-bold"
                                            title="Save invoice"
                                            onClick={handleSaveRowInvoice}
                                        ></i>
                                        <i
                                            className="far fa-times cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                                            title="Cancel and close"
                                            onClick={() => {
                                                setSiIdInput('');
                                                resetFormFields();
                                                setIsInputRowOpen(false);
                                            }}
                                        ></i>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* Database Records & Centered Empty State */}
                        {loading && invoices.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-16 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <i className="fal fa-spinner-third fa-spin text-3xl text-[#5FA5DA]"></i>
                                        <span className="text-[0.9vw] font-medium text-gray-600">Loading sales invoices from database...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : processedInvoices.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-16 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 py-10 select-none">
                                        <div className="w-20 h-20 rounded-full bg-[#F4F8FB] border border-[#5FA5DA]/30 flex items-center justify-center text-[#5FA5DA] shadow-xs">
                                            <i className="fal fa-file-invoice-dollar text-4xl"></i>
                                        </div>
                                        <div className="flex flex-col gap-1 items-center">
                                            <span className="text-base font-bold text-gray-700">No Sales Invoices Yet</span>
                                            <span className="text-xs text-gray-400 max-w-sm">
                                                {searchTerm || filterDate
                                                    ? 'No invoices match your filter criteria. Try clearing your search or date filter.'
                                                    : 'There are currently no recorded sales invoices. Click "+ New Entry" below to create your first invoice.'}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            processedInvoices.map((inv) => {
                                const hasLegacy = Boolean(inv.legacyOrderDetails && inv.legacyOrderDetails.trim());
                                const linkedItems = inv.items || [];
                                const itemizedText = linkedItems.length > 0
                                    ? linkedItems.map((item) => `${item.quantity} ${item.name || item.item_name || 'Item'}`).join(', ')
                                    : '—';

                                return (
                                    <tr key={inv.id || inv.siNumber} className="text-center border-b border-gray-200 hover:bg-[#F4F8FB] text-[0.78vw]">
                                        <td className="px-3 py-2.5 font-semibold text-gray-800">{inv.siNumber}</td>
                                        <td className="px-3 py-2.5 text-gray-600">{inv.dateIssued}</td>
                                        <td className="px-3 py-2.5 text-left font-medium text-gray-800">{inv.customerName}</td>
                                        
                                        <td className="px-3 py-2.5 text-left text-gray-600 truncate max-w-xs">
                                            {hasLegacy ? (
                                                <span title={inv.legacyOrderDetails}>{inv.legacyOrderDetails}</span>
                                            ) : (
                                                <span title={itemizedText} className="text-gray-800 font-medium">
                                                    {itemizedText}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-3 py-2.5 text-right font-semibold text-[#FF8DCE]">
                                            ₱ {inv.amountTotal ? Number(inv.amountTotal).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                        </td>

                                        <td className="px-3 py-2.5 text-md">
                                            <div className="flex items-center justify-center gap-2">
                                                <i
                                                    className="far fa-trash cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Delete invoice"
                                                    onClick={() => handleDeleteInvoice(inv.id, inv.siNumber)}
                                                ></i>
                                                <i
                                                    className="far fa-eye cursor-pointer text-gray-400 hover:text-[#5FA5DA] transition-colors"
                                                    title="View details"
                                                    onClick={() => navigate(`/sales-invoices-details/${inv.siNumber || inv.id}`)}
                                                ></i>
                                            </div>
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
                <div className="flex gap-3 items-center text-[0.9vw]">
                    <label className="font-semibold text-gray-700">Tools:</label>
                    <button
                        type="button"
                        onClick={() => {
                            if (isInputRowOpen) {
                                setIsInputRowOpen(false);
                            } else {
                                setIsSetupModalOpen(true);
                            }
                        }}
                        className={`px-3 py-1 text-[0.8vw] rounded-full border-2 font-medium transition-colors cursor-pointer ${
                            isInputRowOpen
                                ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                : 'bg-[#F4F8FB] text-[#5FA5DA] border-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white'
                        }`}
                    >
                        {isInputRowOpen ? '✕ Close Entry' : '+ New Entry'}
                    </button>
                    
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="px-3 py-1 text-[0.8vw] rounded-full border-2 border-[#5FA5DA] bg-[#F4F8FB] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white transition-colors cursor-pointer"
                    >
                        + Upload Spreadsheet
                    </button>
                </div>

                {/* Date Filter & Count */}
                <div className="flex gap-4 items-center text-[0.8vw]">
                    <div className="flex gap-2 items-center">
                        <label className="text-gray-600 font-medium">Date Filter:</label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="px-2.5 py-1 border border-gray-300 rounded-full focus:outline-none text-[0.75vw]"
                        />
                        {filterDate && (
                            <button
                                onClick={() => setFilterDate('')}
                                className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                                title="Clear date filter"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="text-[0.75vw] text-gray-500 font-medium ml-2">
                        Showing <span className="font-bold text-gray-700">{processedInvoices.length}</span> of {invoices.length} invoices
                    </div>
                </div>
            </div>

            {/* Entry Configuration Modal */}
            {isSetupModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-gray-100 flex flex-col gap-5">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="text-[1.1vw] font-bold text-gray-800">New Sales Invoice Settings</h2>
                            <button
                                onClick={() => setIsSetupModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-[1vw] cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 text-[0.8vw]">
                            {/* Mode Toggle */}
                            <div className="flex items-center bg-[#F4F8FB] p-1 rounded-xl border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setEntryMode('auto')}
                                    className={`flex-1 py-1.5 rounded-lg font-semibold text-[0.75vw] transition-all cursor-pointer ${
                                        entryMode === 'auto'
                                            ? 'bg-white text-[#5FA5DA] shadow-xs'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    Auto-Sequence
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEntryMode('manual')}
                                    className={`flex-1 py-1.5 rounded-lg font-semibold text-[0.75vw] transition-all cursor-pointer ${
                                        entryMode === 'manual'
                                            ? 'bg-white text-[#5FA5DA] shadow-xs'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    Manual Custom ID
                                </button>
                            </div>

                            {entryMode === 'auto' ? (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="font-semibold text-gray-700">Invoice Year:</label>
                                        <input
                                            type="number"
                                            min="2020"
                                            max="2035"
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                                            className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5FA5DA]"
                                        />
                                        <span className="text-[0.7vw] text-gray-500">
                                            Calculates the next pad and sequential SI ID based on saved invoices for this year.
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between bg-[#F4F8FB] border border-gray-200 p-3 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-800">Enable ID Chaining</span>
                                            <span className="text-[0.65vw] text-gray-500">Increment sequence automatically for the next entry</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={isIdChaining}
                                            onChange={(e) => setIsIdChaining(e.target.checked)}
                                            className="w-4 h-4 text-[#5FA5DA] rounded focus:ring-0 cursor-pointer"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <label className="font-semibold text-gray-700">Specific SI ID / Sequence:</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SI-2026-1-10 or 10"
                                        value={manualSiNumber}
                                        onChange={(e) => setManualSiNumber(e.target.value)}
                                        className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5FA5DA] text-[0.85vw]"
                                    />
                                    <span className="text-[0.7vw] text-gray-500">
                                        Type a full ID or a sequence number to insert an entry out of order.
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button
                                onClick={() => setIsSetupModalOpen(false)}
                                className="px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 text-[0.75vw] hover:bg-gray-100 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSetup}
                                className="px-4 py-1.5 rounded-full bg-[#5FA5DA] text-white font-medium text-[0.75vw] hover:bg-[#4d90c3] transition-colors cursor-pointer shadow-xs"
                            >
                                Start Entry
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Provisioning Confirmation Modal */}
            {isCreateAccountPromptOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 flex flex-col gap-4 border border-gray-200">
                        <div className="flex items-center gap-3">
                            <i className="far fa-user-plus text-xl text-[#5FA5DA]"></i>
                            <h3 className="text-[1.05vw] font-bold text-gray-800">New Customer Account</h3>
                        </div>

                        <p className="text-[0.8vw] text-gray-600 leading-relaxed">
                            <strong>"{customerInput}"</strong> is not in your registered customer directory. Would you like to automatically create a customer account for them?
                        </p>

                        <div className="flex justify-end gap-2 mt-2">
                            <button 
                                type="button"
                                onClick={executeSaveInvoice}
                                className="px-3.5 py-1.5 text-[0.75vw] rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                Save Invoice Only
                            </button>
                            <button 
                                type="button"
                                onClick={handleConfirmAccountCreation}
                                className="px-3.5 py-1.5 text-[0.75vw] rounded-full bg-[#5FA5DA] text-white hover:bg-[#4d90c3] font-semibold transition-colors cursor-pointer"
                            >
                                Save Invoice & Register Account
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reusable Itemized Details Modal */}
            <ChargeInvoiceDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveModalItems}
                initialItems={itemizedList}
            />

            {/* Reusable Spreadsheet Upload Modal */}
            <SpreadsheetUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={handleSpreadsheetUpload}
            />
        </div>
    );
}

export default SalesInvoicesMain;