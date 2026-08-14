import { useState } from "react";

export const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// A month spans at most six weeks, and every month is padded out to all six so
// the grid's row height is the same whichever month is on screen. The padding
// isn't blank: leading cells carry the tail of the previous month and trailing
// cells the head of the next, flagged with inMonth: false so the screen can dim
// them and leave them untappable.
const WEEKS_SHOWN = 6;
const DAYS_PER_WEEK = 7;

export type CalendarCell = { day: number; inMonth: boolean };

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function initDaysArray(month: number, year: number): CalendarCell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const dayArray: CalendarCell[] = [];

  for (let i = 0; i < WEEKS_SHOWN * DAYS_PER_WEEK; i++) {
    // Day numbers below 1 or past the end of the month roll into the
    // neighbouring month on their own - including across a year boundary - so
    // the same offset that positions the grid also names the adjacent days.
    const date = new Date(year, month, i - firstWeekday + 1);
    dayArray.push({ day: date.getDate(), inMonth: date.getMonth() === month });
  }
  return dayArray;
}

// The screen renders a row per week rather than one flat list, so each row can
// take an equal share of the leftover height via flex.
function toWeeks(dayArray: CalendarCell[]): CalendarCell[][] {
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < dayArray.length; i += DAYS_PER_WEEK) {
    weeks.push(dayArray.slice(i, i + DAYS_PER_WEEK));
  }
  return weeks;
}

export function useCalendarLogic() {
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const weeks = toWeeks(initDaysArray(month, year));


    function getPreviousMonth(month: number, year: number) {
    if(month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function getNextMonth(month: number, year: number) {
    if(month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }
  return { month, year, weeks, daysOfWeek, monthNames, getPreviousMonth, getNextMonth, getDaysInMonth, initDaysArray };
}