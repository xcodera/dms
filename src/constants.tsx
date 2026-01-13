
import { Transaction } from './types';

export const COLORS = {
  primary: '#004691', // BCA Navy Blue
  secondary: '#00AEEF', // BCA Light Blue
  accent: '#FDB813', // Gold accent
  success: '#10B981',
  danger: '#EF4444',
  background: '#F8FAFC',
};

// MOCK_ACCOUNT is now obsolete as user data is fetched from Supabase.
// MOCK_TRANSACTIONS remains for the AI Chat Assistant demo.
export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', title: 'Indomaret Point', amount: 45000, date: '2023-10-25', type: 'debit', category: 'Shopping' },
  { id: '2', title: 'Transfer Masuk - ADI', amount: 2500000, date: '2023-10-24', type: 'credit', category: 'Income' },
  { id: '3', title: 'Gojek Payment', amount: 15000, date: '2023-10-24', type: 'debit', category: 'Transport' },
  { id: '4', title: 'Coffee Shop Jakarta', amount: 35000, date: '2023-10-23', type: 'debit', category: 'Food' },
  { id: '5', title: 'Monthly Salary', amount: 10000000, date: '2023-10-20', type: 'credit', category: 'Income' },
];
