import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    credits: 100,
    features: [
      "100 credits/month",
      "3 projects",
      "Basic platforms (Twitter, LinkedIn)",
      "No brand voice training",
    ],
  },
  starter: {
    name: "Starter",
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    credits: 1000,
    features: [
      "1,000 credits/month",
      "Unlimited projects",
      "All platforms",
      "1 brand voice profile",
      "Basic scheduling",
    ],
  },
  pro: {
    name: "Pro",
    price: 79,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    credits: 5000,
    features: [
      "5,000 credits/month",
      "Unlimited everything",
      "All platforms + custom templates",
      "5 brand voice profiles",
      "Advanced scheduling + Buffer integration",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 199,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    credits: 25000,
    features: [
      "25,000 credits/month",
      "Unlimited everything",
      "Custom AI model fine-tuning",
      "Unlimited brand voices",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
  },
} as const;
