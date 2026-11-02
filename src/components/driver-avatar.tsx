/**
 * The signed-in driver's photo, round. Shows the photo from the profile (the
 * admin's upload for an own driver) and falls back to the stock avatar when
 * there is none or it fails to load.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors, Primary } from '@/core/constants/colors';
import { useSession } from '@/core/session';

export function DriverAvatar({ size }: { size: number }) {
  const url = useSession((s) => s.user?.profilePhotoUrl);
  // Remembers which link failed, so a new link (photo changed) gets a try.
  const [failedUrl, setFailedUrl] = useState<string>();

  const source = url && url !== failedUrl ? { uri: url } : Images.avatar;
  const round = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.frame, round]}>
      <Image
        source={source}
        style={round}
        contentFit="cover"
        transition={150}
        onError={() => setFailedUrl(url)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: AppColors.white,
  },
});
