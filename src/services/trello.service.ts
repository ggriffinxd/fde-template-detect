import type { TrelloCard, VerificationCardPayload } from "@/types";
import { apiClient } from "@/lib/api-client";

// Trello Integration Service.
// Calls /api/trello on the backend — credentials (API key + token) live there,
// never in client code. Add TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_LIST_ID to .env.local.

class TrelloService {
  async createVerificationCard(payload: VerificationCardPayload): Promise<TrelloCard> {
    try {
      const response = await apiClient.post<{ success: boolean; data: TrelloCard; error?: string }>(
        "/trello",
        payload,
      );

      if (!response.success || !response.data) {
        // Trello not configured → fall back to mock so UI stays functional
        if (response.error?.includes("not configured")) {
          console.warn("[TrelloService] Credentials not set — returning mock card.");
          return this.mockCard(payload);
        }
        throw new Error(response.error ?? "Trello card creation failed");
      }

      return response.data;
    } catch (err) {
      // Network error or 503 → mock fallback
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not configured") || msg.includes("503")) {
        console.warn("[TrelloService] Falling back to mock:", msg);
        return this.mockCard(payload);
      }
      throw err;
    }
  }

  private mockCard(payload: VerificationCardPayload): TrelloCard {
    return {
      id: `mock-${Date.now()}`,
      name: `[BankVerify] ${payload.bankName} — ${payload.probability}% match`,
      desc: `Mock card — configure TRELLO_API_KEY, TRELLO_TOKEN and TRELLO_LIST_ID in .env.local to enable real Trello cards.`,
      url: "https://trello.com",
      labels: payload.probability >= 85 ? ["High Confidence"] : ["Review Needed"],
      attachments: [],
    };
  }
}

export const trelloService = new TrelloService();
