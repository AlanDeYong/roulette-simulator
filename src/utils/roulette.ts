import { RouletteTableType, StrategyBet } from '../types';

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export const getNumberColor = (number: number): 'red' | 'black' | 'green' => {
  if (number === 0 || number === 37) return 'green'; // 37 represents 00
  if (RED_NUMBERS.includes(number)) return 'red';
  return 'black';
};

export const spinRoulette = (tableType: RouletteTableType): { number: number; color: 'red' | 'black' | 'green' } => {
  // 0-36 for European (37 numbers)
  // 0-37 for American (38 numbers, where 37 represents 00)
  const max = tableType === 'american' ? 37 : 36;
  const number = Math.floor(Math.random() * (max + 1));
  return { number, color: getNumberColor(number) };
};

export const calculatePayout = (bet: StrategyBet, winningNumber: number): number => {
  const { type, value, amount } = bet;
  
  // 0 and 00 lose on most outside bets
  const isZero = winningNumber === 0 || winningNumber === 37;

  switch (type) {
    case 'number':
      // Straight up: 35 to 1
      if (value === winningNumber) return amount * 35;
      // Handle 00 check if user bet on 37 or '00'
      if (value === '00' && winningNumber === 37) return amount * 35;
      return -amount;

    case 'red':
      if (isZero) return -amount;
      return RED_NUMBERS.includes(winningNumber) ? amount : -amount;

    case 'black':
      if (isZero) return -amount;
      return BLACK_NUMBERS.includes(winningNumber) ? amount : -amount;

    case 'even':
      if (isZero) return -amount;
      return winningNumber % 2 === 0 ? amount : -amount;

    case 'odd':
      if (isZero) return -amount;
      return winningNumber % 2 !== 0 ? amount : -amount;

    case 'low': // 1-18
      if (isZero) return -amount;
      return (winningNumber >= 1 && winningNumber <= 18) ? amount : -amount;

    case 'high': // 19-36
      if (isZero) return -amount;
      return (winningNumber >= 19 && winningNumber <= 36) ? amount : -amount;

    case 'dozen': // 1st12, 2nd12, 3rd12. Payout 2:1
      if (isZero) return -amount;
      if (value === 1 || value === '1st12') return (winningNumber >= 1 && winningNumber <= 12) ? amount * 2 : -amount;
      if (value === 2 || value === '2nd12') return (winningNumber >= 13 && winningNumber <= 24) ? amount * 2 : -amount;
      if (value === 3 || value === '3rd12') return (winningNumber >= 25 && winningNumber <= 36) ? amount * 2 : -amount;
      return -amount;

    case 'column': // 1, 2, 3. Payout 2:1
      if (isZero) return -amount;
      // Column 1: 1, 4, 7... (n%3 === 1)
      // Column 2: 2, 5, 8... (n%3 === 2)
      // Column 3: 3, 6, 9... (n%3 === 0)
      if (value === 1) return (winningNumber % 3 === 1) ? amount * 2 : -amount;
      if (value === 2) return (winningNumber % 3 === 2) ? amount * 2 : -amount;
      if (value === 3) return (winningNumber % 3 === 0) ? amount * 2 : -amount;
      return -amount;

    default:
      console.warn(`Unknown bet type: ${type}`);
      return -amount;
  }
};
