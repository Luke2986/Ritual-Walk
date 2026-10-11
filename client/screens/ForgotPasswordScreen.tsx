import React, { useState } from "react";
import { StyleSheet, Pressable } from "react-native";
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
import { apiRequest } from "@/lib/query-client";
import { Spacing, Colors } from "@/constants/theme";
import { AuthStackParamList } from "@/navigation/AuthStackNavigator";

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "ForgotPassword">;
};

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export default function ForgotPasswordScreen({
  navigation,
}: ForgotPasswordScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuth();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fail = (message: string) => {
    setError(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const sendCode = async () => {
    if (!email.trim()) return fail("Inserisci la tua email");
    setIsLoading(true);
    setError("");
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
      setStep("code");
      setNotice(
        `Se ${email.trim()} è registrata, riceverai un codice di 6 cifre. Controlla anche lo spam.`,
      );
    } catch (err) {
      fail(errorMessage(err, "Invio non riuscito"));
    } finally {
      setIsLoading(false);
    }
  };

  const submitReset = async () => {
    if (!/^\d{6}$/.test(code.trim())) return fail("Il codice è di 6 cifre");
    if (password.length < 6) {
      return fail("La password deve avere almeno 6 caratteri");
    }
    setIsLoading(true);
    setError("");
    try {
      await resetPassword(email, code.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      fail(errorMessage(err, "Reimpostazione non riuscita"));
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
        <ThemedText type="h2" style={styles.title}>
          Password dimenticata
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          {step === "email"
            ? "Ti mandiamo via email un codice per scegliere una nuova password."
            : notice}
        </ThemedText>

        {step === "email" ? (
          <NeonInput
            label="Email"
            placeholder="La tua email"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            testID="input-reset-email"
          />
        ) : (
          <>
            <NeonInput
              label="Codice"
              placeholder="6 cifre"
              icon="hash"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              testID="input-reset-code"
            />
            <NeonInput
              label="Nuova password"
              placeholder="Almeno 6 caratteri"
              icon="lock"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              testID="input-reset-password"
            />
          </>
        )}

        {error ? (
          <ThemedText
            type="small"
            style={[styles.error, { color: Colors.light.error }]}
          >
            {error}
          </ThemedText>
        ) : null}

        <NeonButton
          onPress={step === "email" ? sendCode : submitReset}
          disabled={isLoading}
          style={styles.button}
          size="large"
        >
          {isLoading
            ? "Attendi..."
            : step === "email"
              ? "Invia codice"
              : "Salva nuova password"}
        </NeonButton>

        {step === "code" ? (
          <Pressable
            onPress={sendCode}
            disabled={isLoading}
            style={styles.link}
          >
            <ThemedText type="link" style={{ color: theme.secondary }}>
              Invia di nuovo il codice
            </ThemedText>
          </Pressable>
        ) : null}

        <Pressable onPress={() => navigation.goBack()} style={styles.link}>
          <ThemedText type="link" style={{ color: theme.secondary }}>
            Torna all&apos;accesso
          </ThemedText>
        </Pressable>
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
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing["2xl"],
  },
  error: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  button: {
    marginTop: Spacing.lg,
  },
  link: {
    alignItems: "center",
    marginTop: Spacing.xl,
  },
});
