import React, { useState, useRef } from 'react';

export default function SpreadsheetUploadModal({ isOpen, onClose, onUpload }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) validateAndSetFile(file);
    };

    const validateAndSetFile = (file) => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];
        if (validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
            setSelectedFile(file);
        } else {
            alert('Please select a valid CSV or Excel file (.csv, .xlsx).');
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleUploadSubmit = () => {
        if (!selectedFile) return;
        if (onUpload) onUpload(selectedFile);
        handleClose();
    };

    const handleClose = () => {
        setSelectedFile(null);
        setIsDragging(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-125 shadow-lg flex flex-col gap-4">
                <div className="flex justify-between items-center border-b pb-2">
                    <h2 className="text-lg font-bold text-gray-800">Upload Spreadsheet</h2>
                    <button 
                        type="button" 
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
                    >
                        &times;
                    </button>
                </div>

                {/* Drag and Drop Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                        isDragging 
                            ? 'border-[#5FA5DA] bg-[#EEF8FF]' 
                            : 'border-gray-300 hover:border-[#5FA5DA] bg-[#F4F8FB]'
                    }`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".csv, .xlsx, .xls"
                        className="hidden"
                    />
                    <i className="far fa-file-excel text-4xl text-[#5FA5DA] mb-2"></i>
                    <p className="text-sm font-medium text-gray-700">
                        {selectedFile ? selectedFile.name : 'Click to upload or drag & drop'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Supports CSV, XLSX, or XLS
                    </p>
                </div>

                {/* File Selected State */}
                {selectedFile && (
                    <div className="flex items-center justify-between bg-[#EEF8FF] px-3 py-2 rounded text-xs text-[#5FA5DA]">
                        <span className="truncate font-medium">{selectedFile.name}</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                            }}
                            className="text-red-500 font-bold ml-2 cursor-pointer"
                        >
                            Remove
                        </button>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-1.5 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!selectedFile}
                        onClick={handleUploadSubmit}
                        className={`px-4 py-1.5 text-sm rounded text-white transition-colors cursor-pointer ${
                            selectedFile 
                                ? 'bg-[#5FA5DA] hover:bg-[#4d90c3]' 
                                : 'bg-gray-300 cursor-not-allowed'
                        }`}
                    >
                        Upload File
                    </button>
                </div>
            </div>
        </div>
    );
}