// API configuration for mobile app
// In production, this should be your deployed Next.js API URL
// For development, use your local server or ngrok URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const createPaymentIntent = async (amount, categoryName) => {
  const response = await fetch(`${API_BASE_URL}/api/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: parseFloat(amount),
      categoryName: categoryName,
      description: `Donation to ${categoryName}`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server error: ${response.status}`);
  }

  return response.json();
};

export const confirmPayment = async (paymentIntentId, userId, amount, customerName, customerEmail, phoneNumber, categoryName) => {
  const response = await fetch(`${API_BASE_URL}/api/confirm-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentIntentId,
      userId,
      amount: parseFloat(amount),
      customerName,
      customerEmail,
      phoneNumber: phoneNumber || '',
      categoryName,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server error: ${response.status}`);
  }

  return response.json();
};

