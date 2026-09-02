/** Port of lib/screens/login_otp/sub_view/login_top_images.dart. */
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Images } from '@/core/constants/assets';

/**
 * The stacked logo / umbrella / truck artwork shared by login and OTP.
 *
 * Sized as a fraction of screen width rather than in fixed pixels: the Dart
 * layout used BoxFit.fill against the full width, so hard-coded points left
 * the art small and clustered at the top on a tall handset. Percentages keep
 * the same proportions the design has on every screen size.
 */
export function LoginTopImages() {
  const { width } = useWindowDimensions();

  // Ratios taken from the source assets so nothing is stretched.
  const logoWidth = width * 0.58;
  const umbrellaWidth = width * 0.55;
  const truckWidth = width * 0.52;

  return (
    <View style={styles.container}>
      <Image
        source={Images.splashLogo}
        style={[styles.logo, { width: logoWidth, height: logoWidth * 0.29 }]}
      />
      <View style={styles.rowEnd}>
        <Image
          source={Images.umbrella}
          style={[
            styles.umbrella,
            { width: umbrellaWidth, height: umbrellaWidth * 1.15 },
          ]}
        />
      </View>
      <View style={styles.rowStart}>
        <Image
          source={Images.truckImage}
          style={[styles.truck, { width: truckWidth, height: truckWidth * 0.62 }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 8, alignItems: 'center' },
  logo: { resizeMode: 'contain' },
  rowEnd: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end' },
  rowStart: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start' },
  // The umbrella overlaps the logo's baseline slightly and the truck sits
  // under it, as in the design — negative margins keep that overlap without
  // pushing the whole block down.
  umbrella: { resizeMode: 'contain', marginTop: 10 },
  truck: { resizeMode: 'contain', marginTop: -20 },
});
