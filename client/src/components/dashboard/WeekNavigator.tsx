import React from 'react';
import './WeekNavigator.css';

interface WeekNavigatorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  minDate?: Date; // Minimum date (e.g., batch start date)
}

const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  selectedDate,
  onDateSelect,
  onPrevWeek,
  onNextWeek,
  minDate,
}) => {
  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());

    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      days.push({
        name: dayNames[i],
        date: currentDate,
        dateStr: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }

    return days;
  };

  const getWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const year = startOfWeek.getFullYear();

    return `${startStr} - ${endStr}, ${year}`;
  };

  const weekDays = getWeekDays(selectedDate);
  const weekRange = getWeekRange(selectedDate);

  const isSelected = (compareDate: Date) => {
    return (
      compareDate.getDate() === selectedDate.getDate() &&
      compareDate.getMonth() === selectedDate.getMonth() &&
      compareDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Check if a date is before the minimum date
  const isBeforeMinDate = (date: Date) => {
    if (!minDate) return false;
    const compareDate = new Date(date);
    const min = new Date(minDate);
    compareDate.setHours(0, 0, 0, 0);
    min.setHours(0, 0, 0, 0);
    return compareDate < min;
  };

  // Check if prev week button should be disabled
  const isPrevWeekDisabled = () => {
    if (!minDate) return false;
    // Get the start of the previous week
    const startOfCurrentWeek = new Date(selectedDate);
    startOfCurrentWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    const startOfPrevWeek = new Date(startOfCurrentWeek);
    startOfPrevWeek.setDate(startOfCurrentWeek.getDate() - 7);
    // Disable if the entire previous week would be before minDate
    const endOfPrevWeek = new Date(startOfPrevWeek);
    endOfPrevWeek.setDate(startOfPrevWeek.getDate() + 6);
    return isBeforeMinDate(endOfPrevWeek);
  };

  const handlePrevWeek = () => {
    if (!isPrevWeekDisabled()) {
      onPrevWeek();
    }
  };

  return (
    <div className="week-navigator">
      <button 
        className={`nav-arrow prev-week ${isPrevWeekDisabled() ? 'disabled' : ''}`} 
        onClick={handlePrevWeek} 
        title={isPrevWeekDisabled() ? 'Cannot go before batch start date' : 'Previous Week'}
        disabled={isPrevWeekDisabled()}
      >
        ❮❮
      </button>

      <div className="week-header">
        <div className="week-range">{weekRange}</div>
      </div>

      <div className="days-container">
        {weekDays.map((day, index) => {
          const disabled = isBeforeMinDate(day.date);
          return (
            <button
              key={index}
              className={`day-button ${isSelected(day.date) ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => !disabled && onDateSelect(day.date)}
              disabled={disabled}
              title={disabled ? 'Before batch start date' : ''}
            >
              <div className="day-name">{day.name}</div>
              <div className="day-date">{day.dateStr}</div>
            </button>
          );
        })}
      </div>

      <button className="nav-arrow next-week" onClick={onNextWeek} title="Next Week">
        ❯❯
      </button>
    </div>
  );
};

export default WeekNavigator;
