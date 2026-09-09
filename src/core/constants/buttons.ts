/**
 * The filled primary button — VEHICLE THERE, IN TRANSIT, DELIVERED.
 *
 * Lives here rather than inside bottom-action-bar because the cancel-trip
 * dialog's "Keep trip" is meant to BE this button, not merely resemble it.
 * When the two were separate copies of the same numbers they drifted, and a
 * driver seeing a not-quite-right teal in a confirmation is exactly the moment
 * they should be most sure of what they are looking at.
 */
import { AppColors } from '@/core/constants/colors';
import { Typography } from '@/core/constants/typography';

export const PrimaryButton = {
  shape: {
    height: 50,
    borderRadius: 8,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...Typography.button2.extraBold, color: AppColors.white },
} as const;
