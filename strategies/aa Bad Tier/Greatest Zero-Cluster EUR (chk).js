/**
 * STRATEGY: Neighbors of Zero (Adapted for European Wheel)
 * * Source: https://www.youtube.com/watch?v=k6avXkbeo60 (WillVegas)
 * * The Logic:
 * This strategy bets on a cluster of numbers centered around the Zero (0) on a 
 * European roulette wheel. The goal is to cover a continuous segment of the wheel.
 * * The Progression:
 * - Level 1: Bet 1 unit each on 0 and its 5 neighbors on both sides (11 numbers total).
 * - Level 2: Rebet the same amounts and numbers as Level 1.
 * - Level 3: Add 2 more neighbors to each side (15 numbers total) and double the bet on ALL numbers.
 * - Level 4: Rebet the same amounts and numbers as Level 3.
 * - Level 5: Add 2 more neighbors to each side (19 numbers total) and double the bet on ALL numbers.
 * - Level 6: Rebet the same amounts and numbers as Level 5.
 * - Level 7: Add 2 more neighbors to each side (23 numbers total) and double the bet on ALL numbers.
 * - Win: Reset progression to Level 1.
 * * The Goal:
 * To secure small, consistent profits by hitting the covered cluster, using a staged 
 * progression to recover from short losing streaks. The strategy relies on the user 
 * having a sufficient bankroll to endure up to Level 7.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.progression === undefined) state.progression = 1;

    // Define the European Wheel sequence (0 and its neighbors)
    const europeanWheel = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    
    // Create an ordered cluster centered on 0
    // To do this easily, we can find 0 and pull outward.
    // However, hardcoding the ordered cluster from the zero outwards is safer:
    const zeroCluster = [
        0, 
        // Right of Zero (Clockwise)
        32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 
        // Left of Zero (Counter-Clockwise)
        26, 3, 35, 12, 28, 7, 29, 18, 22, 9, 31
    ];
    
    // We need a function to get N neighbors on EACH side of zero
    function getCluster(n) {
      let cluster = [0];
      // The sequence array has 0 at index 0. 
      // Right neighbors are indices 1, 2, 3...
      // Left neighbors are the end of the array backwards...
      // It's easier to use the pre-defined wheel order and slice around 0.
      const zeroIndex = europeanWheel.indexOf(0);
      
      for(let i = 1; i <= n; i++) {
          // Right neighbor
          let rightIndex = (zeroIndex + i) % europeanWheel.length;
          cluster.push(europeanWheel[rightIndex]);
          
          // Left neighbor
          let leftIndex = (zeroIndex - i + europeanWheel.length) % europeanWheel.length;
          cluster.push(europeanWheel[leftIndex]);
      }
      return cluster;
    }

    // 2. Determine Win/Loss from last spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastBetNumbers = state.currentBetNumbers || [];
        const isWin = lastBetNumbers.includes(lastSpin.winningNumber);

        if (isWin) {
            state.progression = 1; // Reset on win
        } else {
            state.progression++; // Increase on loss
        }
    }

    // 3. Determine Coverage and Bet Multiplier based on Progression
    let neighborsToEachSide = 5; // Level 1 & 2
    let betMultiplier = 1;       // Level 1 & 2

    switch(state.progression) {
        case 1:
        case 2:
            neighborsToEachSide = 5;
            betMultiplier = 1;
            break;
        case 3:
        case 4:
            neighborsToEachSide = 7; // 5 + 2
            betMultiplier = 2;       // Double up
            break;
        case 5:
        case 6:
            neighborsToEachSide = 9; // 7 + 2
            betMultiplier = 4;       // Double up again
            break;
        case 7:
            neighborsToEachSide = 11; // 9 + 2
            betMultiplier = 8;        // Double up again
            break;
        default:
            // Stop betting if progression exceeds level 7 (stop loss)
            return [];
    }

    const activeNumbers = getCluster(neighborsToEachSide);
    state.currentBetNumbers = activeNumbers;

    // 4. Calculate Bet Amount per number
    let amountPerNumber = config.betLimits.min * betMultiplier;

    // 5. Clamp to Limits
    amountPerNumber = Math.max(amountPerNumber, config.betLimits.min);
    amountPerNumber = Math.min(amountPerNumber, config.betLimits.max);

    // 6. Construct Bet Objects
    const bets = activeNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: amountPerNumber
    }));

    // 7. Safety check: Bankroll limits
    const totalBetValue = bets.reduce((acc, b) => acc + b.amount, 0);
    if (totalBetValue > bankroll) {
        return []; // Stop betting if we can't afford the progression
    }

    return bets;
}