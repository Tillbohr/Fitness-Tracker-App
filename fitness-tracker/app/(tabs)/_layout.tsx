import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
    return(
        <Tabs screenOptions = {{
            tabBarActiveTintColor: '#42a6ce',
            headerShadowVisible: false,
            tabBarStyle: {
                backgroundColor: '#25292e',
                borderTopColor: '#3a3f45',
                borderTopWidth: 1,
                shadowColor: 'transparent',
                shadowOpacity: 0,
                shadowOffset: {
                    height: 0,
                    width: 0,
                },
                shadowRadius: 0,
                elevation: 0,
            },
        }}>
            <Tabs.Screen name = "calendar" options={{
                headerShown: false,
                title: 'Calendar',
                tabBarIcon: ({color, focused}) => (
                    <Ionicons name = {focused ? "calendar" : "calendar-outline"} color={color} size={24} />
                )
                }}
            />
            <Tabs.Screen name = "graphs" options={{
                headerShown: false,
                title: 'Graphs',
                tabBarIcon: ({color, focused}) => (
                    <Ionicons name = {focused ? "bar-chart" : "bar-chart-outline"} color={color} size={24} />
                )
                }} 
            />
        </Tabs>
    )
}