import {Stack} from 'expo-router';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

export default function RootLayout() {
    // Required for react-native-gesture-handler to receive touches on Android -
    // without it the graphs chart's press-to-select gesture never fires.
    return(
        <GestureHandlerRootView style={{flex: 1}}>
            <Stack>
                <Stack.Screen name = "index" options={{headerShown: false}} />
                <Stack.Screen name = "(tabs)" options={{headerShown: false}} />
                {/* Pushed over the tab bar from the calendar grid. Draws its own
                    header (back / date / add), so the stack header stays off. */}
                <Stack.Screen name = "day/[date]" options={{headerShown: false}} />
                {/* The saved libraries, pushed from the Profile tab. Like the day
                    summary they sit on the root stack rather than in (tabs), so
                    they cover the tab bar, and they draw their own header. */}
                <Stack.Screen name = "saved/meals" options={{headerShown: false}} />
                <Stack.Screen name = "saved/exercises" options={{headerShown: false}} />
            </Stack>
        </GestureHandlerRootView>
    )
}
