import React, { useState } from 'react';

/**
 * ToggleButton Component
 * 
 * Props:
 * - label: custom string or element for the toggle text
 * - defaultEnabled: initial boolean state (default: false)
 * - onChange: callback function returning the active state
 */
export default function ToggleButton({ 
  label = "Enable Option", 
  defaultEnabled = false, 
  onChange 
}) {
  const [isEnabled, setIsEnabled] = useState(defaultEnabled);

  const handleToggle = () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    if (onChange) {
      onChange(nextState);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`px-2.5 py-0.5 rounded-full border-2 border-[#5FA5DA] cursor-pointer transition-colors duration-200 text-[0.8vw] ${
        isEnabled
          ? 'bg-[#5FA5DA] text-white hover:bg-[#4d90c3]'
          : 'bg-[#F4F8FB] text-[#5FA5DA] hover:bg-[#5FA5DA] hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}