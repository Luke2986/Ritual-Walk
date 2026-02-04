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

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Register">;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !nickname) {
      setError("Compila tutti i campi");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password.length < 6) {
      setError("La password deve avere almeno 6 caratteri");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await register(email, password, nickname);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || "Errore durante la registrazione");
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
          <ThemedText type="h2" style={styles.title}>
            Crea il tuo account
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Inizia il tuo rituale di coppia
          </ThemedText>
        </View>

        <View style={styles.form}>
          <NeonInput
            label="Nickname"
            placeholder="Come ti chiami?"
            icon="user"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
          />

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
            placeholder="Minimo 6 caratteri"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? (
            <ThemedText type="small" style={[styles.error, { color: Colors.dark.error }]}>
              {error}
            </ThemedText>
          ) : null}

          <NeonButton
            onPress={handleRegister}
            disabled={isLoading}
            style={styles.button}
            size="large"
          >
            {isLoading ? "Registrazione..." : "Registrati"}
          </NeonButton>
        </View>

        <View style={styles.footer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Hai gia un account?
          </ThemedText>
          <Pressable onPress={() => navigation.goBack()}>
            <ThemedText type="link" style={{ color: theme.secondary }}>
              {" "}Accedi
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
    marginBottom: Spacing["3xl"],
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
    textAlign: "center",
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
