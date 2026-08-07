export interface QuestionOption {
  label: string;
  key: string;
}

export interface QualificationQuestion {
  num: number;
  question: string;
  field: string;
  options: QuestionOption[];
}

export interface CampaignConfig {
  id: string;
  title: string;
  subtitle: string;
  questions: QualificationQuestion[];
}

export const CAMPAIGNS: Record<string, CampaignConfig> = {
  talbina: {
    id: "talbina",
    title: "Talbina Distributor Partnership Program 2026",
    subtitle: "Earn Up To 50% Margin | Direct Company Supply",
    questions: [
      {
        num: 1,
        question: "What is your current business type? *",
        field: "businessType",
        options: [
          { label: "Existing FMCG Distributor", key: "A" },
          { label: "Wholesaler / Retailer / Trader", key: "B" },
          { label: "Medical / Ayurveda Store Owner", key: "C" },
          { label: "New Business / Entrepreneur", key: "D" },
        ],
      },
      {
        num: 2,
        question: "What is your investment capacity for Talbina distribution? *",
        field: "investmentCapacity",
        options: [
          { label: "₹25,000 – ₹50,000 (Micro Distributor)", key: "A" },
          { label: "₹50,000 – ₹1 Lakh (District Distributor)", key: "B" },
          { label: "₹1 Lakh+ (Super Stockist / Master)", key: "C" },
        ],
      },
    ],
  },
  firstoptionagency: {
    id: "firstoptionagency",
    title: "Talbina Distributor Partnership Program 2026",
    subtitle: "Earn Up To 50% Margin | Direct Company Supply",
    questions: [
      {
        num: 1,
        question: "What is your current business type? *",
        field: "businessType",
        options: [
          { label: "Existing FMCG Distributor", key: "A" },
          { label: "Wholesaler / Retailer / Trader", key: "B" },
          { label: "Medical / Ayurveda Store Owner", key: "C" },
          { label: "New Business / Entrepreneur", key: "D" },
        ],
      },
      {
        num: 2,
        question: "What is your investment capacity for Talbina distribution? *",
        field: "investmentCapacity",
        options: [
          { label: "₹25,000 – ₹50,000 (Micro Distributor)", key: "A" },
          { label: "₹50,000 – ₹1 Lakh (District Distributor)", key: "B" },
          { label: "₹1 Lakh+ (Super Stockist / Master)", key: "C" },
        ],
      },
    ],
  },
};

export const DEFAULT_CAMPAIGN_ID = "talbina";

export function getCampaignConfig(campaignId?: string | null): CampaignConfig {
  if (campaignId && CAMPAIGNS[campaignId]) {
    return CAMPAIGNS[campaignId];
  }
  return CAMPAIGNS[DEFAULT_CAMPAIGN_ID];
}
