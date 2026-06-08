import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { checkServer } from "../api";
import { colors } from "../theme";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import TrajetScreen from "../screens/TrajetScreen";
import CarteScreen from "../screens/CarteScreen";
import TraficScreen from "../screens/TraficScreen";
import PerformancesScreen from "../screens/PerformancesScreen";
import GrapheScreen from "../screens/GrapheScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AdminScreen from "../screens/AdminScreen";

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: "Accueil" }}
      />
      <HomeStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Parametres" }}
      />
    </HomeStack.Navigator>
  );
}

function AuthNavigator({ initialRouteName }) {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="Settings" component={SettingsScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const email = (user?.email || "").toLowerCase();
  const isAdmin = role === "admin" || email === "admin@admin.com";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.blanc },
        headerTintColor: colors.bleu,
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: colors.bleu,
        tabBarInactiveTintColor: colors.texteMuted,
        tabBarStyle: {
          borderTopColor: colors.bordure,
          paddingBottom: Math.max(insets.bottom, 6),
          height: 56 + Math.max(insets.bottom, 6),
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: "home",
            Trajet: "navigate",
            Carte: "map",
            Graphe: "git-network",
            Trafic: "car",
            Performances: "stats-chart",
            Admin: "shield-checkmark",
          };
          return (
            <Ionicons
              name={icons[route.name] || "ellipse"}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ title: "Accueil", headerShown: false }}
      />
      <Tab.Screen name="Trajet" component={TrajetScreen} options={{ title: "Trajet" }} />
      <Tab.Screen
        name="Carte"
        component={CarteScreen}
        options={{ title: "Carte", headerShown: false }}
      />
      <Tab.Screen
        name="Graphe"
        component={GrapheScreen}
        options={{ title: "Graphe", headerShown: false }}
      />
      <Tab.Screen name="Trafic" component={TraficScreen} options={{ title: "Trafic" }} />
      <Tab.Screen
        name="Performances"
        component={PerformancesScreen}
        options={{ title: "Perf.", tabBarLabel: "Perf." }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{ title: "Admin" }}
        />
      )}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const [checkingServer, setCheckingServer] = useState(false);
  const [serverOk, setServerOk] = useState(true);

  useEffect(() => {
    if (loading || isAuthenticated) return;

    let cancelled = false;
    setCheckingServer(true);

    // Si le backend n'est pas joignable, on envoie directement vers Parametres.
    checkServer(3000)
      .then((res) => {
        if (!cancelled) setServerOk(!!res.ok);
      })
      .catch(() => {
        if (!cancelled) setServerOk(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingServer(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated]);

  if (loading || checkingServer) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.bleu} />
      </View>
    );
  }

  const initialAuthRoute = !serverOk ? "Settings" : "Login";

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthNavigator initialRouteName={initialAuthRoute} />}
    </NavigationContainer>
  );
}
