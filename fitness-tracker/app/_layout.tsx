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
            </Stack>
        </GestureHandlerRootView>
    )
}
