import { useState } from "react";

export const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function initDaysArray(month: number, year: number) {
  const daysInMonth = getDaysInMonth(month, year);
  let dayArray = [];

  for(let i = 0; i < new Date(year, month, 1).getDay() + daysInMonth + (6 - new Date(year, month, daysInMonth).getDay()); i++) {
    if(i < new Date(year, month, 1).getDay() || i > daysInMonth + new Date(year, month, 1).getDay() - 1) {
      dayArray.push("");
    } else {
      dayArray.push(i - new Date(year, month, 1).getDay() + 1);
    }
  }
  return dayArray;
}

export function useCalendarLogic() {
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const daysArray = initDaysArray(month, year);


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
  return { month, year, daysArray, daysOfWeek, monthNames, getPreviousMonth, getNextMonth, getDaysInMonth, initDaysArray };
}