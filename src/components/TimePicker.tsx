import React, { useState, useEffect } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showFormatToggle?: boolean;
}

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Select Time",
  className = "",
  showFormatToggle = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [use24Hour, setUse24Hour] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(0);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('AM');

  // Parse initial value
  useEffect(() => {
    if (value) {
      parseTimeValue(value);
    }
  }, [value]);

  const parseTimeValue = (timeStr: string) => {
    // Handle 12-hour format (e.g., "1:30 PM")
    const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hour = parseInt(ampmMatch[1]);
      const minute = parseInt(ampmMatch[2]);
      const ampm = ampmMatch[3].toUpperCase() as 'AM' | 'PM';
      
      if (hour === 12) {
        hour = ampm === 'PM' ? 12 : 0;
      } else if (ampm === 'PM') {
        hour += 12;
      }
      
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedAmPm(ampm);
      setUse24Hour(false);
      return;
    }

    // Handle 24-hour format (e.g., "13:30")
    const hour24Match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (hour24Match) {
      const hour = parseInt(hour24Match[1]);
      const minute = parseInt(hour24Match[2]);
      
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedAmPm(hour >= 12 ? 'PM' : 'AM');
      setUse24Hour(true);
    }
  };

  const formatTimeForDisplay = () => {
    if (!value) return placeholder;
    
    if (use24Hour) {
      const hour = selectedHour.toString().padStart(2, '0');
      const minute = selectedMinute.toString().padStart(2, '0');
      return `${hour}:${minute}`;
    } else {
      let displayHour = selectedHour;
      if (displayHour === 0) displayHour = 12;
      else if (displayHour > 12) displayHour -= 12;
      
      const hour = displayHour.toString();
      const minute = selectedMinute.toString().padStart(2, '0');
      return `${hour}:${minute} ${selectedAmPm}`;
    }
  };

  const handleTimeSelect = (hour: number, minute: number, ampm?: 'AM' | 'PM') => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    if (ampm) setSelectedAmPm(ampm);
    
    // Format the time string based on the selected format
    let timeString: string;
    
    if (use24Hour) {
      timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    } else {
      let displayHour = hour;
      if (displayHour === 0) displayHour = 12;
      else if (displayHour > 12) displayHour -= 12;
      
      timeString = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm || selectedAmPm}`;
    }
    
    onChange(timeString);
    setIsOpen(false);
  };

  const generateHours = () => {
    if (use24Hour) {
      return Array.from({ length: 24 }, (_, i) => i);
    } else {
      return [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }
  };

  const generateMinutes = () => {
    return [0, 15, 30, 45];
  };

  const convertTo24Hour = (hour: number, ampm: 'AM' | 'PM') => {
    if (hour === 12) {
      return ampm === 'PM' ? 12 : 0;
    }
    return ampm === 'PM' ? hour + 12 : hour;
  };

  const convertFrom24Hour = (hour24: number) => {
    if (hour24 === 0) return { hour: 12, ampm: 'AM' as const };
    if (hour24 === 12) return { hour: 12, ampm: 'PM' as const };
    if (hour24 > 12) return { hour: hour24 - 12, ampm: 'PM' as const };
    return { hour: hour24, ampm: 'AM' as const };
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer hover:border-gray-400'
        }`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {formatTimeForDisplay()}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-4">
            {/* Format Toggle */}
            {showFormatToggle && (
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Time Format:</span>
                <div className="flex bg-gray-100 rounded-md p-1">
                  <button
                    type="button"
                    onClick={() => setUse24Hour(false)}
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      !use24Hour ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    12 Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => setUse24Hour(true)}
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      use24Hour ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    24 Hour
                  </button>
                </div>
              </div>
            )}

            {/* Time Picker Grid */}
            <div className="grid grid-cols-3 gap-2">
              {/* Hours */}
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2 text-center">Hours</div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                  {generateHours().map((hour) => {
                    const isSelected = use24Hour 
                      ? hour === selectedHour
                      : convertFrom24Hour(selectedHour).hour === hour && convertFrom24Hour(selectedHour).ampm === selectedAmPm;
                    
                    return (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => {
                          if (use24Hour) {
                            handleTimeSelect(hour, selectedMinute);
                          } else {
                            const hour24 = convertTo24Hour(hour, selectedAmPm);
                            handleTimeSelect(hour24, selectedMinute, selectedAmPm);
                          }
                        }}
                        className={`w-full px-3 py-2 text-sm text-center hover:bg-blue-50 ${
                          isSelected ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {hour.toString().padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes */}
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2 text-center">Minutes</div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                  {generateMinutes().map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => handleTimeSelect(selectedHour, minute)}
                      className={`w-full px-3 py-2 text-sm text-center hover:bg-blue-50 ${
                        minute === selectedMinute ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {minute.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              {/* AM/PM (only for 12-hour format) */}
              {!use24Hour && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2 text-center">AM/PM</div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                    {(['AM', 'PM'] as const).map((ampm) => (
                      <button
                        key={ampm}
                        type="button"
                        onClick={() => {
                          const hour24 = convertTo24Hour(convertFrom24Hour(selectedHour).hour, ampm);
                          handleTimeSelect(hour24, selectedMinute, ampm);
                        }}
                        className={`w-full px-3 py-2 text-sm text-center hover:bg-blue-50 ${
                          ampm === selectedAmPm ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {ampm}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Time Buttons */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-2">Quick Select:</div>
              <div className="grid grid-cols-4 gap-2">
                {['6:00 AM', '9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '9:00 PM', '12:00 AM', '3:00 AM'].map((quickTime) => (
                  <button
                    key={quickTime}
                    type="button"
                    onClick={() => {
                      parseTimeValue(quickTime);
                      onChange(quickTime);
                      setIsOpen(false);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                  >
                    {quickTime}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;

