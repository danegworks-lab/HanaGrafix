import React from 'react';

function CustomerBlock({ 
    customerName = 'Davao Medical School Foundation', 
    totalOrders = 0, 
    onClick 
}) {
    return (
        <div 
            onClick={onClick}
            className="flex items-center justify-between p-3.5 bg-[#F4F8FB] border border-[#5FA5DA] rounded-xl shadow-xs hover:border-[#4d90c3] hover:shadow-sm transition-all cursor-pointer w-full max-w-xs"
        >
            <div className="flex flex-col gap-1 overflow-hidden pr-2">
                {/* Customer Name */}
                <span className="text-[0.85vw] font-semibold text-gray-800 truncate" title={customerName}>
                    {customerName}
                </span>
                
                {/* Total Orders Badge */}
                <div className="flex items-center gap-1.5">
                    <span className="text-[0.7vw] font-medium text-gray-500">Total Orders:</span>
                    <span className="text-[0.75vw] font-bold px-2 py-0.5 bg-[#EEF8FF] text-[#5FA5DA] border border-[#5FA5DA]/30 rounded-full">
                        {totalOrders}
                    </span>
                </div>
            </div>

            {/* Action Arrow Icon */}
            <div className="text-[#5FA5DA] text-[0.8vw] shrink-0">
                <i className="far fa-chevron-right"></i>
            </div>
        </div>
    );
}

export default CustomerBlock;