import { Text, View, FlatList, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { router } from "expo-router";
import { useCalendarLogic } from "../hooks/calendar_logic";
import { styles } from "../../styles/defaultStyle";
import { toDateString } from "../../database";

export default function Calendar() {
  const {month, year, daysArray, daysOfWeek, monthNames, getPreviousMonth, getNextMonth} = useCalendarLogic();

  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const cellHeight = (containerHeight - headerHeight - insets.top) / 6;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      {/* Header with month and navigation */}
      <View style={styles.header}>

        <TouchableOpacity onPress={() => getPreviousMonth(month, year)}>
          <Text style={styles.text}>{"<"}</Text>
        </TouchableOpacity>

        <Text style={styles.header} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          {monthNames[month]} {year}
        </Text>

        <TouchableOpacity onPress={() => getNextMonth(month, year)}>
          <Text style={styles.text}>{">"}</Text>
        </TouchableOpacity>

      </View>

      <View style={[styles.daysHeader, ]} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        {daysOfWeek.map((day) => (
          <Text key={day} style={styles.headerCell}>
            {day}
          </Text>
        ))}
      </View>

      {/* Render Calendar Grid. Tapping a day pushes the day summary screen, which
          owns the per-day totals and the add-entry forms. */}
      <FlatList
        style={styles.grid}
        data={daysArray}
        numColumns={7}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => item === "" ? (
          <View style={[styles.cell, { height: cellHeight }]} />
        ) : (
          <TouchableOpacity style={[styles.cell, { height: cellHeight }]} onPress={() => {
            router.push({
              pathname: '/day/[date]',
              params: { date: toDateString(new Date(year, month, Number(item))) },
            });
          }}>
            <Text style={[styles.text, { height: cellHeight }]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

    </View>
  );
}
