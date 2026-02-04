import React, { useState } from "react";
import { StyleSheet, View, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { NeonButton } from "@/components/NeonButton";
import { NeonInput } from "@/components/NeonInput";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Colors } from "@/constants/theme";
import { AuthStackParamList } from "@/navigation/AuthStackNavigator";

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Login">;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Inserisci email e password");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || "Errore durante il login");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[theme.backgroundRoot, theme.backgroundDefault]}
      style={styles.gradient}
    >
      <KeyboardAwareScrollViewCompat
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["4xl"],
            paddingBottom: insets.bottom + Spacing["3xl"],
          },
        ]}
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="h1" style={styles.title}>
            Step Ritual
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Cammina insieme, cresci insieme
          </ThemedText>
        </View>

        <View style={styles.form}>
          <NeonInput
            label="Email"
            placeholder="La tua email"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <NeonInput
            label="Password"
            placeholder="La tua password"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? (
            <ThemedText type="small" style={[styles.error, { color: Colors.light.error }]}>
              {error}
            </ThemedText>
          ) : null}

          <NeonButton
            onPress={handleLogin}
            disabled={isLoading}
            style={styles.button}
            size="large"
          >
            {isLoading ? "Accesso in corso..." : "Accedi"}
          </NeonButton>
        </View>

        <View style={styles.footer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Non hai un account?
          </ThemedText>
          <Pressable onPress={() => navigation.navigate("Register")}>
            <ThemedText type="link" style={{ color: theme.secondary }}>
              {" "}Registrati
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
  },
  form: {
    flex: 1,
  },
  error: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  button: {
    marginTop: Spacing.lg,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing["2xl"],
  },
});
