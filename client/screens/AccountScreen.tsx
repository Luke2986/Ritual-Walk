import React, { useState, useCallback } from "react";
import { StyleSheet, View, ScrollView, Pressable, Alert, TextInput, ActivityIndicator, Share, Platform, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { AccountStackParamList } from "@/navigation/AccountStackNavigator";

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    </View>
  );
}

function SettingsRow({ 
  icon, 
  label, 
  onPress, 
  rightElement,
  destructive = false,
}: { 
  icon: string; 
  label: string; 
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <Pressable 
      style={styles.settingsRow} 
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.settingsIcon, destructive && styles.settingsIconDestructive]}>
        <Feather 
          name={icon as any} 
          size={20} 
          color={destructive ? "#FF2FB3" : "#3B2F8A"} 
        />
      </View>
      <ThemedText style={[styles.settingsLabel, destructive && styles.settingsLabelDestructive]}>
        {label}
      </ThemedText>
      {rightElement ? (
        rightElement
      ) : onPress ? (
        <Feather name="chevron-right" size={20} color="#3B2F8A" />
      ) : null}
    </Pressable>
  );
}

type NavigationProp = NativeStackNavigationProp<AccountStackParamList>;

export default function AccountScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { user, couple, partner, logout, createCouple, joinCouple, unpairCouple, regenerateInvite, cancelInvite, refreshUser } = useAuth();
  
  const [ritualCodeInput, setRitualCodeInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isUnpairing, setIsUnpairing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleNavigateToNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Notifications");
  };

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (error) {
      const message = "Sei offline: dati non aggiornati";
      if (Platform.OS === "web") {
        console.warn(message);
      } else {
        Alert.alert("Errore", message);
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, refreshing]);

  const handleCopyCode = async () => {
    if (couple?.ritualCode) {
      await Clipboard.setStringAsync(couple.ritualCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copiato!", "Il Ritual Code e stato copiato negli appunti");
    }
  };

  const handleShareCode = async () => {
    if (couple?.ritualCode) {
      try {
        await Share.share({
          message: `Unisciti a me su Step Ritual! Il mio codice invito e: ${couple.ritualCode}`,
        });
      } catch (error) {
        handleCopyCode();
      }
    }
  };

  const handleCreateCouple = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);
    try {
      await createCouple();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Errore", error.message || "Impossibile creare il codice invito");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleJoinCouple = async () => {
    if (!ritualCodeInput.trim()) {
      Alert.alert("Errore", "Inserisci un codice invito");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsJoining(true);
    try {
      await joinCouple(ritualCodeInput.trim().toUpperCase());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRitualCodeInput("");
      Alert.alert("Collegato!", "Ora sei collegato con il tuo partner");
    } catch (error: any) {
      let errorMessage = "Errore nel collegamento";
      if (error.message.includes("scaduto")) {
        errorMessage = "Il codice e scaduto";
      } else if (error.message.includes("non valido") || error.message.includes("INVALID")) {
        errorMessage = "Codice non valido";
      } else if (error.message.includes("usato") || error.message.includes("USED")) {
        errorMessage = "Questo codice e gia stato usato";
      } else if (error.message.includes("te stesso") || error.message.includes("SELF")) {
        errorMessage = "Non puoi collegarti con te stesso";
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert("Errore", errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Use window.confirm on web for better compatibility
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Sei sicuro di voler uscire?");
      if (confirmed) {
        await logout();
      }
    } else {
      Alert.alert(
        "Esci",
        "Sei sicuro di voler uscire?",
        [
          { text: "Annulla", style: "cancel" },
          { 
            text: "Esci", 
            style: "destructive",
            onPress: () => logout()
          },
        ]
      );
    }
  };

  const handleUnpair = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const performUnpair = async () => {
      setIsUnpairing(true);
      try {
        await unpairCouple();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Rituale interrotto", "Sei tornato single.");
      } catch (error: any) {
        Alert.alert("Errore", error.message || "Impossibile scollegare il partner");
      } finally {
        setIsUnpairing(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Interrompere il Rituale?\n\nTornerete entrambi single. Non vedrete piu statistiche condivise ne confronto. Le tue camminate resteranno salvate.");
      if (confirmed) {
        await performUnpair();
      }
    } else {
      Alert.alert(
        "Interrompere il Rituale?",
        "Tornerete entrambi single. Non vedrete piu statistiche condivise ne confronto. Le tue camminate resteranno salvate.",
        [
          { text: "Annulla", style: "cancel" },
          { 
            text: "Si, scollega", 
            style: "destructive",
            onPress: performUnpair
          },
        ]
      );
    }
  };

  const handleRegenerateInvite = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRegenerating(true);
    try {
      await regenerateInvite();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Fatto!", "Nuovo codice invito generato");
    } catch (error: any) {
      Alert.alert("Errore", error.message || "Impossibile rigenerare il codice");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCancelInvite = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const performCancel = async () => {
      setIsCanceling(true);
      try {
        await cancelInvite();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error: any) {
        Alert.alert("Errore", error.message || "Impossibile annullare l'invito");
      } finally {
        setIsCanceling(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Annullare l'invito?\n\nIl codice non sara piu valido.");
      if (confirmed) {
        await performCancel();
      }
    } else {
      Alert.alert(
        "Annullare l'invito?",
        "Il codice non sara piu valido.",
        [
          { text: "No", style: "cancel" },
          { 
            text: "Si, annulla", 
            style: "destructive",
            onPress: performCancel
          },
        ]
      );
    }
  };

  const userInitials = user?.nickname ? user.nickname.substring(0, 2).toUpperCase() : "??";

  return (
    <LinearGradient
      colors={[theme.backgroundRoot, theme.backgroundDefault]}
      style={styles.gradient}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["2xl"],
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* SEZIONE 1: PROFILO */}
        <SectionHeader title="PROFILO" />
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={["#B88BFF", "#9D6EDD"]}
              style={styles.avatar}
            >
              <ThemedText style={styles.avatarText}>{userInitials}</ThemedText>
            </LinearGradient>
            <View style={styles.avatarBorder} />
          </View>
          <View style={styles.profileInfo}>
            <ThemedText style={styles.profileName}>{user?.nickname}</ThemedText>
            <ThemedText style={styles.profileEmail}>{user?.email}</ThemedText>
          </View>
          <Pressable style={styles.editButton}>
            <Feather name="edit-2" size={18} color="#B88BFF" />
          </Pressable>
        </View>

        {/* SEZIONE 2: RITUALE DI COPPIA */}
        <SectionHeader title="RITUALE DI COPPIA" />
        <View style={styles.ritualCard}>
          {(() => {
            const isUnpaired = !couple;
            const isPendingInviter = couple?.status === "pending" && couple?.createdByUserId === user?.id;
            const isActive = couple?.status === "active";

            if (isActive && partner) {
              return (
                <>
                  <View style={styles.ritualHeader}>
                    <View style={styles.ritualStatus}>
                      <View style={[styles.statusDot, styles.statusDotConnected]} />
                      <ThemedText style={styles.ritualStatusText}>Connesso</ThemedText>
                    </View>
                  </View>
                  <View style={styles.partnerInfo}>
                    <View style={styles.partnerAvatar}>
                      <ThemedText style={styles.partnerInitials}>
                        {partner.nickname.substring(0, 2).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.partnerDetails}>
                      <ThemedText style={styles.partnerLabel}>IL TUO PARTNER</ThemedText>
                      <ThemedText style={styles.partnerName}>{partner.nickname}</ThemedText>
                    </View>
                    <Feather name="heart" size={20} color="#FF4D6D" />
                  </View>
                </>
              );
            }

            if (isPendingInviter) {
              const isExpired = couple?.expiresAt && new Date() > new Date(couple.expiresAt);
              const hasValidCode = couple?.ritualCode && !isExpired;
              
              if (hasValidCode) {
                return (
                  <>
                    <View style={styles.ritualHeader}>
                      <View style={styles.ritualStatus}>
                        <View style={[styles.statusDot, styles.statusDotWaiting]} />
                        <ThemedText style={styles.ritualStatusText}>In attesa del partner</ThemedText>
                      </View>
                    </View>
                    <View style={styles.ritualCodeContainer}>
                      <ThemedText style={styles.ritualCodeLabel}>CODICE INVITO</ThemedText>
                      <View style={styles.ritualCodeBox}>
                        <ThemedText style={styles.ritualCode}>{couple.ritualCode}</ThemedText>
                      </View>
                      <View style={styles.codeActions}>
                        <Pressable style={styles.codeActionButton} onPress={handleCopyCode}>
                          <Feather name="copy" size={16} color="#B88BFF" />
                          <ThemedText style={styles.codeActionText}>Copia</ThemedText>
                        </Pressable>
                        <Pressable style={styles.codeActionButton} onPress={handleShareCode}>
                          <Feather name="share-2" size={16} color="#B88BFF" />
                          <ThemedText style={styles.codeActionText}>Condividi</ThemedText>
                        </Pressable>
                      </View>
                      {couple.expiresAt ? (
                        <ThemedText style={styles.ritualCodeHint}>
                          Scade il {new Date(couple.expiresAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </ThemedText>
                      ) : null}
                    </View>
                    <View style={styles.pendingInviteActions}>
                      <Pressable 
                        style={[styles.regenerateButton, isRegenerating && styles.regenerateButtonDisabled]} 
                        onPress={handleRegenerateInvite}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <ActivityIndicator size="small" color="#B88BFF" />
                        ) : (
                          <>
                            <Feather name="refresh-cw" size={14} color="#B88BFF" />
                            <ThemedText style={styles.regenerateButtonText}>Rigenera codice</ThemedText>
                          </>
                        )}
                      </Pressable>
                      <Pressable 
                        style={[styles.cancelInviteButton, isCanceling && styles.cancelInviteButtonDisabled]} 
                        onPress={handleCancelInvite}
                        disabled={isCanceling}
                      >
                        {isCanceling ? (
                          <ActivityIndicator size="small" color="#FF2FB3" />
                        ) : (
                          <>
                            <Feather name="x" size={14} color="#FF2FB3" />
                            <ThemedText style={styles.cancelInviteButtonText}>Annulla invito</ThemedText>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </>
                );
              } else {
                return (
                  <View style={styles.noCoupleContainer}>
                    <Feather name="alert-circle" size={32} color="#FF2FB3" />
                    <ThemedText style={styles.noCoupleTitle}>
                      {isExpired ? "Codice scaduto" : "Invito non valido"}
                    </ThemedText>
                    <ThemedText style={styles.noCoupleText}>
                      {isExpired 
                        ? "Il codice invito e scaduto. Genera un nuovo codice per invitare il tuo partner."
                        : "C'e stato un problema con l'invito. Genera un nuovo codice."}
                    </ThemedText>
                    <View style={styles.expiredActions}>
                      <Pressable 
                        style={[styles.createCoupleButton, isRegenerating && styles.createCoupleButtonDisabled]} 
                        onPress={handleRegenerateInvite}
                        disabled={isRegenerating}
                      >
                        <LinearGradient
                          colors={["#FF4D6D", "#FF2FB3"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.createCoupleGradient}
                        >
                          {isRegenerating ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Feather name="refresh-cw" size={18} color="#FFFFFF" />
                              <ThemedText style={styles.createCoupleText}>Genera Nuovo Codice</ThemedText>
                            </>
                          )}
                        </LinearGradient>
                      </Pressable>
                      <Pressable 
                        style={[styles.cancelExpiredButton, isCanceling && styles.cancelInviteButtonDisabled]} 
                        onPress={handleCancelInvite}
                        disabled={isCanceling}
                      >
                        {isCanceling ? (
                          <ActivityIndicator size="small" color="#3B2F8A" />
                        ) : (
                          <ThemedText style={styles.cancelExpiredButtonText}>Annulla e ricomincia</ThemedText>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              }
            }

            return (
              <View style={styles.noCoupleContainer}>
                <Feather name="users" size={32} color="#B88BFF" />
                <ThemedText style={styles.noCoupleTitle}>
                  Collega il tuo Partner
                </ThemedText>
                <ThemedText style={styles.noCoupleText}>
                  Genera un codice invito da condividere o inserisci il codice del partner
                </ThemedText>

                <View style={styles.joinSection}>
                  <ThemedText style={styles.joinLabel}>HAI UN CODICE INVITO?</ThemedText>
                  <View style={styles.joinInputRow}>
                    <TextInput
                      style={styles.joinInput}
                      value={ritualCodeInput}
                      onChangeText={(text) => setRitualCodeInput(text.toUpperCase())}
                      placeholder="INSERISCI CODICE"
                      placeholderTextColor="#9D6EDD"
                      autoCapitalize="characters"
                      maxLength={8}
                    />
                    <Pressable 
                      style={[styles.joinButton, (!ritualCodeInput.trim() || isJoining) && styles.joinButtonDisabled]} 
                      onPress={handleJoinCouple}
                      disabled={!ritualCodeInput.trim() || isJoining}
                    >
                      {isJoining ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Feather name="arrow-right" size={20} color="#FFFFFF" />
                      )}
                    </Pressable>
                  </View>
                </View>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <ThemedText style={styles.dividerText}>oppure</ThemedText>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable 
                  style={[styles.createCoupleButton, isGenerating && styles.createCoupleButtonDisabled]} 
                  onPress={handleCreateCouple}
                  disabled={isGenerating}
                >
                  <LinearGradient
                    colors={["#FF4D6D", "#FF2FB3"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.createCoupleGradient}
                  >
                    {isGenerating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="plus" size={18} color="#FFFFFF" />
                        <ThemedText style={styles.createCoupleText}>Genera Codice Invito</ThemedText>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            );
          })()}
        </View>

        {/* SEZIONE 3: IMPOSTAZIONI APP */}
        <SectionHeader title="IMPOSTAZIONI APP" />
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="bell"
            label="Notifiche"
            onPress={handleNavigateToNotifications}
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon="log-out"
            label="Esci"
            onPress={handleLogout}
            destructive
          />
        </View>

        {/* SEZIONE 4: AREA PERICOLOSA - Only show when actively paired */}
        {couple?.status === "active" && partner ? (
          <>
            <SectionHeader title="AREA PERICOLOSA" />
            <View style={styles.dangerCard}>
              <View style={styles.dangerInfo}>
                <Feather name="alert-triangle" size={20} color="#FF2FB3" />
                <View style={styles.dangerTextContainer}>
                  <ThemedText style={styles.dangerTitle}>Gestione legame</ThemedText>
                  <ThemedText style={styles.dangerDescription}>
                    Scollega il tuo account da {partner.nickname}
                  </ThemedText>
                </View>
              </View>
              <Pressable 
                style={[styles.unpairButton, isUnpairing && styles.unpairButtonDisabled]}
                onPress={handleUnpair}
                disabled={isUnpairing}
              >
                {isUnpairing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="user-x" size={16} color="#FFFFFF" />
                    <ThemedText style={styles.unpairButtonText}>Scollega partner</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </>
        ) : null}

        <ThemedText style={styles.versionText}>Step Ritual v1.0.0</ThemedText>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    flexGrow: 1,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#3B2F8A",
  },
  profileCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(184, 139, 255, 0.2)",
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBorder: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#B88BFF",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1458",
  },
  profileEmail: {
    fontSize: 14,
    color: "#3B2F8A",
    marginTop: 2,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(184, 139, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  ritualCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(184, 139, 255, 0.2)",
  },
  ritualHeader: {
    marginBottom: Spacing.lg,
  },
  ritualStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  statusDotConnected: {
    backgroundColor: "#00C853",
  },
  statusDotWaiting: {
    backgroundColor: "#FFB300",
  },
  ritualStatusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1458",
  },
  ritualCodeContainer: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  ritualCodeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#3B2F8A",
    marginBottom: Spacing.sm,
  },
  ritualCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(184, 139, 255, 0.1)",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  ritualCode: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 3,
    color: "#1A1458",
  },
  ritualCodeHint: {
    fontSize: 12,
    color: "#3B2F8A",
    marginTop: Spacing.sm,
  },
  partnerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(184, 139, 255, 0.15)",
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FF4D6D",
    alignItems: "center",
    justifyContent: "center",
  },
  partnerInitials: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  partnerDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  partnerLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: "#3B2F8A",
  },
  partnerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1458",
  },
  noCoupleContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  noCoupleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1458",
    marginTop: Spacing.md,
  },
  noCoupleText: {
    fontSize: 13,
    color: "#3B2F8A",
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
  },
  joinSection: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  joinLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#3B2F8A",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  joinInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  joinInput: {
    flex: 1,
    backgroundColor: "rgba(184, 139, 255, 0.1)",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 2,
    color: "#1A1458",
    textAlign: "center",
  },
  joinButton: {
    backgroundColor: "#B88BFF",
    borderRadius: BorderRadius.md,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.md,
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(184, 139, 255, 0.2)",
  },
  dividerText: {
    fontSize: 12,
    color: "#3B2F8A",
    paddingHorizontal: Spacing.md,
  },
  createCoupleButton: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  createCoupleButtonDisabled: {
    opacity: 0.7,
  },
  createCoupleGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    minWidth: 180,
    justifyContent: "center",
  },
  createCoupleText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  codeActions: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  codeActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(184, 139, 255, 0.1)",
    borderRadius: BorderRadius.md,
  },
  codeActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B88BFF",
  },
  settingsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(184, 139, 255, 0.2)",
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(59, 47, 138, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  settingsIconDestructive: {
    backgroundColor: "rgba(255, 47, 179, 0.1)",
  },
  settingsLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#1A1458",
  },
  settingsLabelDestructive: {
    color: "#FF2FB3",
  },
  settingsDivider: {
    height: 1,
    backgroundColor: "rgba(184, 139, 255, 0.1)",
    marginLeft: 64,
  },
  dangerCard: {
    backgroundColor: "rgba(255, 47, 179, 0.05)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 47, 179, 0.2)",
  },
  dangerInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  dangerTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF2FB3",
    marginBottom: Spacing.xs,
  },
  dangerDescription: {
    fontSize: 13,
    color: "#666",
  },
  unpairButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF2FB3",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  unpairButtonDisabled: {
    opacity: 0.6,
  },
  unpairButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#3B2F8A",
    marginTop: Spacing["2xl"],
    opacity: 0.6,
  },
  pendingInviteActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(184, 139, 255, 0.15)",
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(184, 139, 255, 0.1)",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(184, 139, 255, 0.3)",
  },
  regenerateButtonDisabled: {
    opacity: 0.5,
  },
  regenerateButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B88BFF",
  },
  cancelInviteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(255, 47, 179, 0.1)",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 47, 179, 0.3)",
  },
  cancelInviteButtonDisabled: {
    opacity: 0.5,
  },
  cancelInviteButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF2FB3",
  },
  expiredActions: {
    width: "100%",
    alignItems: "center",
    gap: Spacing.md,
  },
  cancelExpiredButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  cancelExpiredButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#3B2F8A",
    textDecorationLine: "underline",
  },
});
