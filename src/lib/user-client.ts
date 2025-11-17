// Client-side utility functions for credit operations

export async function getCreditBalanceClient() {
  try {
    const response = await fetch('/api/user/credits');
    if (!response.ok) {
      throw new Error('Failed to fetch credit balance');
    }
    const data = await response.json();
    return data.credits as number;
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    return 0;
  }
}