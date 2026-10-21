/**
 * Blocks the app while a newer version is on the store (see
 * core/services/app-update).
 *
 * Mounted at the root, after everything else, so it covers every screen and
 * the job-offer overlay too. Checks on launch and each time the app returns to
 * the foreground: a driver who keeps the app open for days still meets the
 * update, and one who backed out of Play's update screen meets this one again.
 * It cannot be dismissed — the back button does nothing — and once shown it
 * stays until the app restarts on the new version.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AppState, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { PrimaryButton } from '@/core/constants/buttons';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { isUpdateRequired, startRequiredUpdate } from '@/core/services/app-update';

export function UpdateGate() {
  const [required, setRequired] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (await isUpdateRequired()) {
        if (!cancelled) setRequired(true);
      }
    };

    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const onUpdate = async () => {
    setStarting(true);
    try {
      await startRequiredUpdate();
    } finally {
      setStarting(false);
    }
  };

  return (
    <Modal
      visible={required}
      animationType="fade"
      statusBarTranslucent
      // Not dismissible: the old version may not be used.
      onRequestClose={() => {}}
    >
      <View style={styles.screen}>
        <Image source={Images.splashLogo} style={styles.logo} />

        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="update" size={44} color={AppColors.primary} />
        </View>
        <Text style={styles.title}>{Strings.updateRequiredTitle}</Text>
        <Text style={styles.message}>{Strings.updateRequiredMessage}</Text>

        <Pressable
          onPress={() => void onUpdate()}
          disabled={starting}
          style={[PrimaryButton.shape, styles.button, starting && styles.buttonBusy]}
        >
          <Text style={PrimaryButton.label}>{Strings.updateNow}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: { width: 220, height: 64, resizeMode: 'contain', marginBottom: 40 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Primary.c100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.h4.bold, color: AppColors.text, marginTop: 20, textAlign: 'center' },
  message: {
    ...Typography.body1.regular,
    color: TextShade.c700,
    marginTop: 10,
    textAlign: 'center',
  },
  button: { alignSelf: 'stretch', marginTop: 32 },
  buttonBusy: { opacity: 0.6 },
});
