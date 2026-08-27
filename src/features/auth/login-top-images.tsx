/** Port of lib/screens/login_otp/sub_view/login_top_images.dart. */
import { Image, StyleSheet, View } from 'react-native';

import { Images } from '@/core/constants/assets';

/** The stacked logo / umbrella / truck artwork shared by login and OTP. */
export function LoginTopImages() {
  return (
    <View style={styles.container}>
      <Image source={Images.splashLogo} style={styles.logo} />
      <View style={styles.rowEnd}>
        <Image source={Images.umbrella} style={styles.umbrella} />
      </View>
      <View style={styles.rowStart}>
        <Image source={Images.truckImage} style={styles.truck} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 50, alignItems: 'center' },
  // Flutter's BoxFit.fill with only a width set scales proportionally here via
  // aspectRatio-free resizeMode 'contain' plus an explicit height per asset.
  logo: { width: 210, height: 115, resizeMode: 'contain' },
  rowEnd: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end' },
  rowStart: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start' },
  umbrella: { width: 190, height: 120, resizeMode: 'contain' },
  truck: { width: 180, height: 110, resizeMode: 'contain' },
});
