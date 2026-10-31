/**
 * The TD mark, cropped from the store logo, whose full lockup is unreadable at
 * app bar size.
 */
import { Image, StyleSheet } from 'react-native';

import { Images } from '@/core/constants/assets';

export function BrandMark() {
  return (
    <Image
      source={Images.appMark}
      style={styles.mark}
      accessibilityRole="image"
      accessibilityLabel="Tiles Drop Saathi"
    />
  );
}

const styles = StyleSheet.create({
  mark: { width: 34, height: 34, borderRadius: 8 },
});
