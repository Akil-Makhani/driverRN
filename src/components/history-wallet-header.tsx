/** Port of lib/common/view/common_history_wallet_header.dart. */
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors, GreenGradient, Primary } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';

interface Props {
  title: string;
  subTitle: string;
  /** Wallet mode prefixes ₹, colours by sign, and shows the wallet artwork. */
  isForWallet?: boolean;
}

export function HistoryWalletHeader({ title, subTitle, isForWallet }: Props) {
  // Dart used int.parse here, which throws on an empty or non-numeric title.
  // Number() with a fallback keeps a malformed balance from crashing the screen.
  const amount = isForWallet ? Number(title) || 0 : 0;

  return (
    <LinearGradient
      colors={GreenGradient.colors}
      locations={GreenGradient.locations}
      start={GreenGradient.start}
      end={GreenGradient.end}
      style={styles.container}
    >
      <View style={styles.textColumn}>
        <Text
          style={[
            styles.title,
            {
              color: isForWallet
                ? amount > 0
                  ? AppColors.success500
                  : AppColors.error500
                : AppColors.primary,
            },
          ]}
        >
          {isForWallet ? `${Strings.rupeesSign}${title}` : title}
        </Text>
        <Text style={styles.subTitle}>{subTitle}</Text>
      </View>

      {isForWallet && <Image source={Images.wallet} style={styles.walletImage} />}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 105,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textColumn: { justifyContent: 'center' },
  title: Typography.h1.extraBold,
  subTitle: { ...Typography.h4.regular, color: AppColors.text },
  walletImage: { width: 70, height: 70, resizeMode: 'cover' },
});
