import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StatusBar, Text, View } from "react-native";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "./src/store/AuthContext";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { GroupsScreen } from "./src/screens/GroupsScreen";
import { GroupDetailScreen } from "./src/screens/GroupDetailScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { colors } from "./src/theme/colors";
import type { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const ONBOARDING_KEY = "ajo.mobile.onboardingDone";
const linking = {
  prefixes: ["contripay://"],
  config: {
    screens: {
      Dashboard: "",
      GroupDetail: "groups/:groupId",
    },
  },
};

function LoadingScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: colors.panel,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color={colors.brandSoft} />
          </View>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>Loading ContriPay</Text>
          <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 20 }}>
            Loading your groups and session.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function LogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.05)",
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800" }}>Logout</Text>
    </Pressable>
  );
}

function OnboardingFlow({ onFinish }: { onFinish: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding">
        {() => <OnboardingScreen onFinish={onFinish} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function AuthFlow({
  authMode,
  setAuthMode,
}: {
  authMode: "login" | "register";
  setAuthMode: (mode: "login" | "register") => void;
}) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {authMode === "login" ? (
        <Stack.Screen name="Login">
          {() => <LoginScreen onGoRegister={() => setAuthMode("register")} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Register">
          {() => <RegisterScreen onGoLogin={() => setAuthMode("login")} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}

function AppStack({ onLogout }: { onLogout: () => void }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="Dashboard"
        options={{
          title: "ContriPay",
          headerRight: () => <LogoutButton onPress={onLogout} />,
        }}
      >
        {({ navigation }) => (
          <DashboardScreen
            onOpenGroups={() => navigation.navigate("Groups")}
            onOpenGroup={(groupId, groupName) => navigation.navigate("GroupDetail", { groupId, groupName })}
            onOpenProfile={() => navigation.navigate("Profile")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Groups" component={GroupsScreen} />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={({ route }) => ({ title: route.params.groupName ?? "Group details" })}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function Navigator() {
  const { token, loading, logout } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);

  useEffect(() => {
    let active = true;

    const loadOnboardingState = async () => {
      try {
        const saved = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!active) return;
        setOnboardingDone(saved === "true");
      } finally {
        if (active) setOnboardingReady(true);
      }
    };

    void loadOnboardingState();

    return () => {
      active = false;
    };
  }, []);

  const completeOnboarding = async () => {
    setOnboardingDone(true);
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  };

  if (loading || !onboardingReady) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      linking={linking}
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.bg,
          card: colors.panel,
          text: colors.text,
          border: colors.border,
          primary: colors.brand,
          notification: colors.accent,
        },
      }}
    >
      {token ? (
        <AppStack onLogout={() => void logout()} />
      ) : !onboardingDone ? (
        <OnboardingFlow
          onFinish={() => {
            void completeOnboarding();
          }}
        />
      ) : !token ? (
        <AuthFlow authMode={authMode} setAuthMode={setAuthMode} />
      ) : (
        <AppStack onLogout={() => void logout()} />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AuthProvider>
        <Navigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
