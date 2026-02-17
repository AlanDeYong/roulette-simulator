<<<<<<< HEAD
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

    case 'street': // 3 numbers. Payout 11:1. value should be the start number of the street (1, 4, 7, etc.)
      if (isZero) return -amount;
      // Ensure value is a number
      const streetStart = Number(value);
      if (winningNumber >= streetStart && winningNumber < streetStart + 3) return amount * 11;
      return -amount;

    case 'corner': // 4 numbers. Payout 8:1. value should be the top-left number of the corner
      if (isZero) return -amount;
      const cornerStart = Number(value);
      // A corner covers: n, n+1, n+3, n+4 (on a standard layout)
      // e.g. Corner 1 covers 1, 2, 4, 5
      // Valid corners usually start on 1, 2, 4, 5, etc.
      // We will assume standard layout logic:
      const c1 = cornerStart;
      const c2 = cornerStart + 1;
      const c3 = cornerStart + 3;
      const c4 = cornerStart + 4;
      
      if ([c1, c2, c3, c4].includes(winningNumber)) return amount * 8;
      return -amount;

    case 'split': // 2 numbers. Payout 17:1. value should be an array of 2 numbers OR we can assume horizontal/vertical if passed a single "start"
      // Let's support explicit array of 2 numbers for maximum flexibility: value: [1, 2]
      if (isZero) return -amount;
      if (Array.isArray(value) && value.length === 2) {
          if (value.includes(winningNumber)) return amount * 17;
      }
      // If single value passed, assume horizontal split (n, n+1) - simple fallback
      else {
          const splitStart = Number(value);
          if (winningNumber === splitStart || winningNumber === splitStart + 1) return amount * 17;
      }
      return -amount;

    case 'line': // 6 numbers (Double Street). Payout 5:1. value is start of first street
      if (isZero) return -amount;
      const lineStart = Number(value);
      if (winningNumber >= lineStart && winningNumber < lineStart + 6) return amount * 5;
      return -amount;

    case 'basket': // 5 numbers (0, 00, 1, 2, 3) - US only typically. Payout 6:1
      // Or 4 numbers (0, 1, 2, 3) - EU (First Four). Payout 8:1
      // Let's implement the standard 5-number basket for US (0, 00, 1, 2, 3) and 4-number for EU
      // Since we don't have tableType here, we'll support the specific list if passed, or standard 0,1,2,3
      
      const basketNums = [0, 1, 2, 3];
      if (winningNumber === 37) { // 00
          if (type === 'basket') return amount * 6; // Assume US basket pays on 00
      }
      if (basketNums.includes(winningNumber)) {
           // Simple Basket/First Four
           return amount * 8; // EU payout (more common default)
      }
      return -amount;

    default:
      console.warn(`Unknown bet type: ${type}`);
      return -amount;
  }
};
=======
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

    case 'street': // 3 numbers. Payout 11:1. value should be the start number of the street (1, 4, 7, etc.)
      if (isZero) return -amount;
      // Ensure value is a number
      const streetStart = Number(value);
      if (winningNumber >= streetStart && winningNumber < streetStart + 3) return amount * 11;
      return -amount;

    case 'corner': // 4 numbers. Payout 8:1. value should be the top-left number of the corner
      if (isZero) return -amount;
      const cornerStart = Number(value);
      // A corner covers: n, n+1, n+3, n+4 (on a standard layout)
      // e.g. Corner 1 covers 1, 2, 4, 5
      // Valid corners usually start on 1, 2, 4, 5, etc.
      // We will assume standard layout logic:
      const c1 = cornerStart;
      const c2 = cornerStart + 1;
      const c3 = cornerStart + 3;
      const c4 = cornerStart + 4;
      
      if ([c1, c2, c3, c4].includes(winningNumber)) return amount * 8;
      return -amount;

    case 'split': // 2 numbers. Payout 17:1. value should be an array of 2 numbers OR we can assume horizontal/vertical if passed a single "start"
      // Let's support explicit array of 2 numbers for maximum flexibility: value: [1, 2]
      if (isZero) return -amount;
      if (Array.isArray(value) && value.length === 2) {
          if (value.includes(winningNumber)) return amount * 17;
      }
      // If single value passed, assume horizontal split (n, n+1) - simple fallback
      else {
          const splitStart = Number(value);
          if (winningNumber === splitStart || winningNumber === splitStart + 1) return amount * 17;
      }
      return -amount;

    case 'line': // 6 numbers (Double Street). Payout 5:1. value is start of first street
      if (isZero) return -amount;
      const lineStart = Number(value);
      if (winningNumber >= lineStart && winningNumber < lineStart + 6) return amount * 5;
      return -amount;

    case 'basket': // 5 numbers (0, 00, 1, 2, 3) - US only typically. Payout 6:1
      // Or 4 numbers (0, 1, 2, 3) - EU (First Four). Payout 8:1
      // Let's implement the standard 5-number basket for US (0, 00, 1, 2, 3) and 4-number for EU
      // Since we don't have tableType here, we'll support the specific list if passed, or standard 0,1,2,3
      
      const basketNums = [0, 1, 2, 3];
      if (winningNumber === 37) { // 00
          if (type === 'basket') return amount * 6; // Assume US basket pays on 00
      }
      if (basketNums.includes(winningNumber)) {
           // Simple Basket/First Four
           return amount * 8; // EU payout (more common default)
      }
      return -amount;

    default:
      console.warn(`Unknown bet type: ${type}`);
      return -amount;
  }
};
>>>>>>> origin/main
