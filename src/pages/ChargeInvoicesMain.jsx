import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatusSelector from '../components/ChargeInvoiceStatusSelector';
import DeliveryReceiptStatusSelector from '../components/DeliveryReceiptStatusSelector';
import ChargeInvoiceDetailsModal from '../components/ChargeInvoiceDetailsModal';
import SpreadsheetUploadModal from '../components/SpreadsheetUploadModal';
import { chargeInvoiceService } from '../services/chargeInvoiceService';

function CImain() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // TanStack Query: Cached Data Fetching
    const { 
        data: invoices = [], 
        isLoading: loading,
        refetch: refetchInvoices 
    } = useQuery({
        queryKey: ['charge_invoices'],
        queryFn: () => chargeInvoiceService.getChargeInvoices(),
        staleTime: 0,
        refetchOnMount: 'always',
    });
    
    // UI, Filter & Tool States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
    const [filterDeliveryStatus, setFilterDeliveryStatus] = useState('all');
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
    const [manualCiNumber, setManualCiNumber] = useState('');

    // Input Row States
    const [ciIdInput, setCiIdInput] = useState('');
    const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
    const [companyInput, setCompanyInput] = useState('');
    const [detailsInput, setDetailsInput] = useState('');
    const [amountInput, setAmountInput] = useState('');
    const [paymentStatusInput, setPaymentStatusInput] = useState('unpaid');
    const [deliveryStatusInput, setDeliveryStatusInput] = useState('pending');
    const [itemizedList, setItemizedList] = useState([]);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // 1-50 = Pad 1, 51-100 = Pad 2, etc.
    const computePadNumber = (ciNum) => {
        const num = parseInt(ciNum, 10);
        if (isNaN(num) || num < 1) return 1;
        return Math.floor((num - 1) / 50) + 1;
    };

    // Find highest sequence from database for a target year
    const computeNextSequenceFromData = (targetYear) => {
        const yearStr = String(targetYear);
        let maxCi = 0;
        let associatedPad = 1;

        invoices.forEach((inv) => {
            if (!inv || !inv.ciNumber) return;
            const parts = String(inv.ciNumber).trim().split('-');
            
            if (parts.length === 3 && parts[0] === yearStr) {
                const pad = parseInt(parts[1], 10);
                const ci = parseInt(parts[2], 10);
                if (!isNaN(ci) && ci > maxCi) {
                    maxCi = ci;
                    associatedPad = !isNaN(pad) ? pad : associatedPad;
                }
            }
        });

        if (maxCi === 0) {
            return { nextPad: 1, nextCi: 1 };
        }

        const nextCi = maxCi + 1;
        const nextPad = computePadNumber(nextCi);

        return { nextPad, nextCi };
    };

    const handleConfirmSetup = () => {
        const today = new Date();
        const defaultDate = `${selectedYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setDateInput(defaultDate);

        if (entryMode === 'manual') {
            if (manualCiNumber.trim()) {
                const cleaned = manualCiNumber.trim();
                const parts = cleaned.split('-');
                if (parts.length === 3) {
                    setSelectedYear(parseInt(parts[0], 10) || selectedYear);
                    setActivePad(parseInt(parts[1], 10) || 1);
                    setCiIdInput(parts[2]);
                } else {
                    setCiIdInput(cleaned);
                }
            } else {
                setCiIdInput('');
            }
        } else {
            const { nextPad, nextCi } = computeNextSequenceFromData(selectedYear);
            setActivePad(nextPad);
            setCiIdInput(String(nextCi));
        }

        setIsSetupModalOpen(false);
        setIsInputRowOpen(true);
    };

    const resetFormFields = () => {
        setCompanyInput('');
        setDetailsInput('');
        setAmountInput('');
        setItemizedList([]);
        setPaymentStatusInput('unpaid');
        setDeliveryStatusInput('pending');
    };

    // Mutation: Create Invoice
    const createInvoiceMutation = useMutation({
        mutationFn: (newInvoice) => chargeInvoiceService.createChargeInvoice(newInvoice),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });
            resetFormFields();

            if (isIdChaining && entryMode === 'auto') {
                const parts = variables.ciNumber.split('-');
                const currentCi = parseInt(parts[2], 10);
                const nextCi = (isNaN(currentCi) ? 0 : currentCi) + 1;
                const nextPad = computePadNumber(nextCi);

                setActivePad(nextPad);
                setCiIdInput(String(nextCi));
                setIsInputRowOpen(true);
            } else {
                setCiIdInput('');
                setIsInputRowOpen(false);
            }

            alert('Charge Invoice saved successfully!');
        },
        onError: (err) => {
            console.error('Error saving invoice:', err);
            alert(`Failed to save invoice: ${err.message}`);
        }
    });

    const handleSaveRowInvoice = () => {
        if (!companyInput.trim()) {
            alert('Please enter a Company name before saving.');
            return;
        }

        let finalCiNumber = '';
        if (entryMode === 'manual') {
            const rawVal = ciIdInput.trim();
            if (!rawVal) {
                alert('Please enter a valid CI ID.');
                return;
            }
            if (rawVal.includes('-')) {
                finalCiNumber = rawVal;
            } else {
                const num = parseInt(rawVal, 10);
                if (isNaN(num)) {
                    alert('Please enter a numeric CI sequence.');
                    return;
                }
                finalCiNumber = `${selectedYear}-${activePad}-${num}`;
            }
        } else {
            const num = parseInt(ciIdInput, 10);
            if (isNaN(num) || num < 1) {
                alert('Please enter a valid CI number sequence (e.g. 1).');
                return;
            }
            finalCiNumber = `${selectedYear}-${activePad}-${num}`;
        }

        const isDuplicate = invoices.some((inv) => inv.ciNumber === finalCiNumber);
        if (isDuplicate) {
            if (!window.confirm(`Invoice ${finalCiNumber} already exists in your database! Do you still want to proceed?`)) {
                return;
            }
        }

        const hasItemized = itemizedList && itemizedList.length > 0;
        const finalLegacyDetails = hasItemized ? null : (detailsInput.trim() || null);
        const finalItems = hasItemized ? itemizedList : [];

        createInvoiceMutation.mutate({
            ciNumber: finalCiNumber,
            dateIssued: dateInput,
            customerName: companyInput,
            legacyOrderDetails: finalLegacyDetails,
            status: paymentStatusInput,
            deliveryStatus: deliveryStatusInput,
            amountTotal: parseFloat(amountInput) || 0,
            items: finalItems
        });
    };

    const handlePaymentStatusUpdate = (identifier, newStatus) => {
        chargeInvoiceService.updateStatus(identifier, newStatus).then(() => {
            queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });
        }).catch((err) => {
            alert(`Failed to update payment status: ${err.message}`);
        });
    };

    const handleDeliveryStatusUpdate = (identifier, newDeliveryStatus) => {
        const updateFn = chargeInvoiceService.updateDeliveryStatus || chargeInvoiceService.updateStatus;
        updateFn(identifier, newDeliveryStatus).then(() => {
            queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });
        }).catch((err) => {
            alert(`Failed to update delivery status: ${err.message}`);
        });
    };

    const handleDeleteInvoice = (id, ciNumber) => {
        if (!window.confirm(`Are you sure you want to delete invoice ${ciNumber}?`)) return;
        chargeInvoiceService.deleteChargeInvoice(id || ciNumber).then(() => {
            queryClient.invalidateQueries({ queryKey: ['charge_invoices'] });
        });
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
        setSortConfig((prev) => {
            if (prev.key === columnKey) {
                return {
                    key: columnKey,
                    direction: prev.direction === 'asc' ? 'desc' : 'asc'
                };
            }
            return {
                key: columnKey,
                direction: 'asc'
            };
        });
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
            const ci = (inv.ciNumber || '').toLowerCase();
            const cust = (inv.customerName || '').toLowerCase();
            const details = (inv.legacyOrderDetails || inv.itemSummary || '').toLowerCase();
            const pStatus = inv.status || 'unpaid';
            const dStatus = inv.deliveryStatus || inv.delivery_status || 'pending';

            const matchesSearch = 
                ci.includes(searchTerm.toLowerCase()) || 
                cust.includes(searchTerm.toLowerCase()) ||
                details.includes(searchTerm.toLowerCase());

            const matchesPayment = filterPaymentStatus === 'all' || pStatus === filterPaymentStatus;
            const matchesDelivery = filterDeliveryStatus === 'all' || dStatus === filterDeliveryStatus;

            return matchesSearch && matchesPayment && matchesDelivery;
        });

        return filtered.sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA = a[key];
            let valB = b[key];

            if (key === 'ciNumber') {
                const parseCi = (str) => {
                    const parts = String(str || '').split('-').map((v) => parseInt(v, 10));
                    return {
                        year: parts[0] || 0,
                        pad: parts[1] || 0,
                        seq: parts[2] || parts[0] || 0
                    };
                };
                const parsedA = parseCi(valA);
                const parsedB = parseCi(valB);

                if (parsedA.year !== parsedB.year) {
                    return direction === 'asc' ? parsedA.year - parsedB.year : parsedB.year - parsedA.year;
                }
                if (parsedA.pad !== parsedB.pad) {
                    return direction === 'asc' ? parsedA.pad - parsedB.pad : parsedB.pad - parsedA.pad;
                }
                return direction === 'asc' ? parsedA.seq - parsedB.seq : parsedB.seq - parsedA.seq;
            }

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
    }, [invoices, searchTerm, filterPaymentStatus, filterDeliveryStatus, sortConfig]);

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
            <div id="tableContainer" className="flex-1 overflow-auto scrollbar-none">
                <table className="min-w-full">
                    <thead className="sticky top-0 bg-white z-10 border-b border-gray-200 select-none">
                        <tr>
                            <th 
                                className="w-[14%] px-3 py-2 text-center cursor-pointer hover:bg-gray-50 group transition-colors"
                                onClick={() => handleSort('ciNumber')}
                            >
                                <div className="inline-flex items-center justify-center font-semibold text-gray-700">
                                    CI ID {renderSortIcon('ciNumber')}
                                </div>
                            </th>
                            <th 
                                className="w-[8%] px-3 py-2 text-center cursor-pointer hover:bg-gray-50 group transition-colors"
                                onClick={() => handleSort('dateIssued')}
                            >
                                <div className="inline-flex items-center justify-center font-semibold text-gray-700">
                                    Date {renderSortIcon('dateIssued')}
                                </div>
                            </th>
                            <th 
                                className="w-[18%] px-3 py-2 text-left cursor-pointer hover:bg-gray-50 group transition-colors"
                                onClick={() => handleSort('customerName')}
                            >
                                <div className="inline-flex items-center font-semibold text-gray-700">
                                    Company {renderSortIcon('customerName')}
                                </div>
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Details</th>
                            <th 
                                className="w-[10%] px-3 py-2 text-right cursor-pointer hover:bg-gray-50 group transition-colors"
                                onClick={() => handleSort('amountTotal')}
                            >
                                <div className="inline-flex items-center justify-end font-semibold text-gray-700">
                                    Amount {renderSortIcon('amountTotal')}
                                </div>
                            </th>
                            <th 
                                className="w-[8%] px-3 py-2 text-center cursor-pointer hover:bg-gray-50 group transition-colors"
                                onClick={() => handleSort('status')}
                            >
                                <div className="inline-flex items-center justify-center font-semibold text-gray-700">
                                    Payment {renderSortIcon('status')}
                                </div>
                            </th>
                            <th 
                                className="w-[8%] px-3 py-2 text-center cursor-pointer hover:bg-gray-50 group transition-colors"
                                onClick={() => handleSort('deliveryStatus')}
                            >
                                <div className="inline-flex items-center justify-center font-semibold text-gray-700">
                                    Delivery {renderSortIcon('deliveryStatus')}
                                </div>
                            </th>
                            <th className="w-[7%] px-3 py-2 font-semibold text-gray-700">Actions</th>
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
                                                    {selectedYear}-{activePad}-
                                                </span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="1"
                                                    value={ciIdInput}
                                                    onChange={(e) => {
                                                        const numericOnly = e.target.value.replace(/\D/g, '');
                                                        setCiIdInput(numericOnly);
                                                        if (numericOnly) {
                                                            setActivePad(computePadNumber(numericOnly));
                                                        }
                                                    }}
                                                    className="w-full bg-transparent text-[0.78vw] focus:outline-none font-bold text-gray-800"
                                                />
                                                <button
                                                    type="button"
                                                    title="Switch to manual editing"
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
                                                    placeholder="2025-2-75"
                                                    value={ciIdInput}
                                                    onChange={(e) => setCiIdInput(e.target.value)}
                                                    className="w-full bg-transparent text-[0.78vw] focus:outline-none font-bold text-gray-800"
                                                />
                                                <button
                                                    type="button"
                                                    title="Switch back to auto"
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
                                        value={companyInput}
                                        onChange={(e) => setCompanyInput(e.target.value)}
                                        placeholder="Enter Company"
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
                                {/* Payment Status Selector */}
                                <td className="px-2 py-2">
                                    <StatusSelector
                                        initialStatus={paymentStatusInput}
                                        value={paymentStatusInput}
                                        onChange={setPaymentStatusInput}
                                    />
                                </td>
                                {/* Delivery Status Selector */}
                                <td className="px-2 py-2">
                                    <DeliveryReceiptStatusSelector
                                        initialStatus={deliveryStatusInput}
                                        value={deliveryStatusInput}
                                        onChange={setDeliveryStatusInput}
                                        isChargeInvoice={true}
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
                                                setCiIdInput('');
                                                resetFormFields();
                                                setIsInputRowOpen(false);
                                            }}
                                        ></i>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* Database Records */}
                        {loading && invoices.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="p-8 text-center text-gray-500 text-[0.85vw]">
                                    Loading charge invoices...
                                </td>
                            </tr>
                        ) : processedInvoices.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="p-8 text-center text-gray-500 text-[0.85vw]">
                                    No charge invoices found.
                                </td>
                            </tr>
                        ) : (
                            processedInvoices.map((inv) => {
                                const hasLegacy = Boolean(inv.legacyOrderDetails && inv.legacyOrderDetails.trim());
                                const linkedItems = inv.items || [];
                                const itemizedText = linkedItems.length > 0
                                    ? linkedItems.map((item) => `${item.quantity} ${item.name || 'Item'}`).join(', ')
                                    : '—';
                                const dStatus = inv.deliveryStatus || inv.delivery_status || 'pending';

                                return (
                                    <tr key={inv.id || inv.ciNumber} className="text-center border-b border-gray-200 hover:bg-[#F4F8FB] text-[0.78vw]">
                                        <td className="px-3 py-2.5 font-semibold text-gray-800">{inv.ciNumber}</td>
                                        <td className="px-3 py-2.5">{inv.dateIssued}</td>
                                        <td className="px-3 py-2.5 text-left font-medium">{inv.customerName}</td>
                                        
                                        <td className="px-3 py-2.5 text-left text-gray-600 truncate max-w-xs">
                                            {hasLegacy ? (
                                                <span title={inv.legacyOrderDetails}>{inv.legacyOrderDetails}</span>
                                            ) : (
                                                <span title={itemizedText} className="text-gray-800">
                                                    {itemizedText}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-3 py-2.5 text-right font-semibold text-[#FF8DCE]">
                                            ₱ {inv.amountTotal ? Number(inv.amountTotal).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                        </td>

                                        {/* Payment Status Selector */}
                                        <td className="px-2 py-2.5">
                                            <StatusSelector
                                                initialStatus={inv.status || 'unpaid'}
                                                value={inv.status || 'unpaid'}
                                                onChange={(newStatus) => handlePaymentStatusUpdate(inv.id || inv.ciNumber, newStatus)}
                                            />
                                        </td>

                                        {/* Delivery Receipt Status Selector Component */}
                                        <td className="px-2 py-2.5">
                                            <DeliveryReceiptStatusSelector
                                                initialStatus={dStatus}
                                                value={dStatus}
                                                onChange={(newDeliveryStatus) => handleDeliveryStatusUpdate(inv.id || inv.ciNumber, newDeliveryStatus)}
                                                isChargeInvoice={true}
                                            />
                                        </td>

                                        <td className="px-3 py-2.5 text-md">
                                            <div className="flex items-center justify-center gap-2">
                                                <i
                                                    className="far fa-trash cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Delete invoice"
                                                    onClick={() => handleDeleteInvoice(inv.id, inv.ciNumber)}
                                                ></i>
                                                <i
                                                    className="far fa-eye cursor-pointer text-gray-400 hover:text-[#5FA5DA] transition-colors"
                                                    title="View details"
                                                    onClick={() => navigate(`/charge-invoice-details/${inv.ciNumber}`)}
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

                {/* Status Filters */}
                <div className="flex gap-4 items-center text-[0.8vw]">
                    <div className="flex gap-2 items-center">
                        <label className="text-gray-600 font-medium">Payment:</label>
                        <select
                            value={filterPaymentStatus}
                            onChange={(e) => setFilterPaymentStatus(e.target.value)}
                            className="px-2.5 py-1 border border-gray-300 rounded-full focus:outline-none"
                        >
                            <option value="all">All</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="flex gap-2 items-center">
                        <label className="text-gray-600 font-medium">Delivery:</label>
                        <select
                            value={filterDeliveryStatus}
                            onChange={(e) => setFilterDeliveryStatus(e.target.value)}
                            className="px-2.5 py-1 border border-gray-300 rounded-full focus:outline-none"
                        >
                            <option value="all">All</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="no_delivery">No Delivery</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Entry Configuration Modal */}
            {isSetupModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-gray-100 flex flex-col gap-5">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="text-[1.1vw] font-bold text-gray-800">New Entry Settings</h2>
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
                                            Checks existing records for this year to automatically calculate the next Pad and CI number.
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between bg-[#F4F8FB] border border-gray-200 p-3 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-800">Enable ID Chaining</span>
                                            <span className="text-[0.65vw] text-gray-500">Auto-increment ID for the next invoice</span>
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
                                    <label className="font-semibold text-gray-700">Specific CI ID / Sequence:</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2024-3-125 or 125"
                                        value={manualCiNumber}
                                        onChange={(e) => setManualCiNumber(e.target.value)}
                                        className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-[#5FA5DA] text-[0.85vw]"
                                    />
                                    <span className="text-[0.7vw] text-gray-500">
                                        Type a full ID (e.g. 2024-3-125) or a sequence number to insert an entry out of order.
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