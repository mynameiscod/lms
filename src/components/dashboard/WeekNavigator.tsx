import React from 'react';
import './WeekNavigator.css';

interface WeekNavigatorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  selectedDate,
  onDateSelect,
  onPrevWeek,
  onNextWeek,
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

  return (
    <div className="week-navigator">
      <button className="nav-arrow prev-week" onClick={onPrevWeek} title="Previous Week">
        ❮❮
      </button>

      <div className="week-header">
        <div className="week-range">{weekRange}</div>
      </div>

      <div className="days-container">
        {weekDays.map((day, index) => (
          <button
            key={index}
            className={`day-button ${isSelected(day.date) ? 'active' : ''}`}
            onClick={() => onDateSelect(day.date)}
          >
            <div className="day-name">{day.name}</div>
            <div className="day-date">{day.dateStr}</div>
          </button>
        ))}
      </div>

      <button className="nav-arrow next-week" onClick={onNextWeek} title="Next Week">
        ❯❯
      </button>
    </div>
  );
};

export default WeekNavigator;
