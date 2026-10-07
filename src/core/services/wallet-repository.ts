import { ApiService } from '../api/api-service';
import { ApiUrls } from '../api/endpoints';
import { parseWalletResponse, type WalletResponse } from '@/types/wallet';

export const WalletRepository = {
  async getWallet(): Promise<WalletResponse> {
    return parseWalletResponse(await ApiService.get(ApiUrls.wallet));
  },
};
