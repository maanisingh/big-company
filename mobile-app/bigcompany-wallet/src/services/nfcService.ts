import api, { handleApiError } from './api';
import { NFCCard, NFCCardList } from '../types';

export const nfcService = {
  // Get all linked NFC cards for current user
  async getCards(): Promise<NFCCardList> {
    try {
      const response = await api.get<NFCCardList>('/store/nfc/cards');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Link a new NFC card to account
  async linkCard(cardUid: string, pin: string, nickname?: string): Promise<NFCCard> {
    try {
      const response = await api.post<{ card: NFCCard }>('/store/nfc/link', {
        card_uid: cardUid,
        pin,
        nickname,
      });
      return response.data.card;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Unlink an NFC card
  async unlinkCard(cardId: string): Promise<void> {
    try {
      await api.delete(`/store/nfc/cards/${cardId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Set a card as primary
  async setPrimaryCard(cardId: string): Promise<NFCCard> {
    try {
      const response = await api.put<{ card: NFCCard }>(`/store/nfc/cards/${cardId}/primary`);
      return response.data.card;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Block a card (if lost/stolen)
  async blockCard(cardId: string): Promise<NFCCard> {
    try {
      const response = await api.put<{ card: NFCCard }>(`/store/nfc/cards/${cardId}/block`);
      return response.data.card;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Unblock a card
  async unblockCard(cardId: string, pin: string): Promise<NFCCard> {
    try {
      const response = await api.put<{ card: NFCCard }>(`/store/nfc/cards/${cardId}/unblock`, { pin });
      return response.data.card;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Change card PIN
  async changePin(cardId: string, currentPin: string, newPin: string): Promise<void> {
    try {
      await api.put(`/store/nfc/cards/${cardId}/pin`, {
        current_pin: currentPin,
        new_pin: newPin,
      });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Update card nickname
  async updateNickname(cardId: string, nickname: string): Promise<NFCCard> {
    try {
      const response = await api.put<{ card: NFCCard }>(`/store/nfc/cards/${cardId}`, { nickname });
      return response.data.card;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get card details
  async getCardDetails(cardId: string): Promise<NFCCard> {
    try {
      const response = await api.get<{ card: NFCCard }>(`/store/nfc/cards/${cardId}`);
      return response.data.card;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Check if a card UID is available (not yet linked)
  async checkCardAvailability(cardUid: string): Promise<{ available: boolean; message: string }> {
    try {
      const response = await api.get(`/store/nfc/check/${cardUid}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};

export default nfcService;
