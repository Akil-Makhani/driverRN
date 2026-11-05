/**
 * "Complete your details" for a signed-in Tiles Drop driver: the name,
 * licence number, date of birth and document photos they may have left out
 * at registration. See types/driver-details.ts for why they matter.
 */
import { ApiService } from '../api/api-service';
import { ApiUrls } from '../api/endpoints';
import { type DriverDetails, parseDriverDetails } from '@/types/driver-details';
import type { RegistrationDocumentKey } from '@/types/registration';

/** What the screen sends; blank fields are left out so they never clear a value. */
export interface DriverDetailsUpdate {
  driverName?: string;
  driverLicenceNumber?: string;
  dob?: string;
  documents?: Partial<Record<RegistrationDocumentKey, string>>;
}

export const DriverDetailsRepository = {
  async get(): Promise<DriverDetails | null> {
    return parseDriverDetails(await ApiService.get(ApiUrls.driverDetails));
  },

  /** Uploads one document photo straight to S3 and resolves its key. */
  async uploadDocument(
    documentType: RegistrationDocumentKey,
    uri: string,
    contentType: string,
  ): Promise<string> {
    const raw = await ApiService.post(ApiUrls.driverDetailsUploadUrl, { documentType, contentType });
    const uploadUrl: string | undefined = raw?.data?.uploadUrl;
    const fileKey: string | undefined = raw?.data?.fileKey;
    if (!uploadUrl || !fileKey) throw new Error('No upload URL returned');

    const blob = await (await fetch(uri)).blob();
    const s3 = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });
    if (!s3.ok) throw new Error(`Upload failed: ${s3.status}`);
    return fileKey;
  },

  async save(update: DriverDetailsUpdate): Promise<DriverDetails | null> {
    return parseDriverDetails(await ApiService.patch(ApiUrls.driverDetails, update));
  },
} as const;
