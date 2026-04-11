/**
 * Strategy: Revised 3 Kingdoms Corner (with Loss Recovery & Coverage Reset)
 * Source: Junko Bodie (https://www.youtube.com/watch?v=4CxaLEoLwlY)
 * * The Logic: 
 * The roulette board is divided into "Three Kingdoms" representing the three dozens 
 * (1-12, 13-24, 25-36). We place 2 corner bets in each kingdom to cover 8 numbers per dozen.
 * A kingdom is "conquered" when the roulette ball lands on any of the 8 covered numbers 
 * within that specific dozen.
 * * The Progression:
 * 1. Start by covering all 3 kingdoms (2 corners each, 6 corners total) at the base unit.
 * 2. WIN (Kingdom Conquered): We stop betting on it. 
 * - If the remaining coverage is 4 or more corners (2+ kingdoms), DOUBLE the bet size 
 * on the remaining unconquered kingdoms.
 * - If the remaining coverage is less than 4 corners (1 kingdom), RESET the bet size 
 * to the base unit.
 * 3. LOSS: We check if a win on the next spin would bring the bankroll back to the 
 * session's highest profit level. If it cannot, we iteratively increase the bet 
 * size by the minimum increment until it can. If it already can, we simply rebet 
 * the current amounts.
 * 4. Once all 3 kingdoms are conquered, the cycle resets to base units.
 * * The Goal:
 * To systematically conquer sections of the board while using dynamic, mathematically 
 * driven loss recovery, but limiting risk when coverage gets too narrow by resetting 
 * the bet scale.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and increment size
    const unit = config.betLimits.min;
    const increment = config.minIncrementalBet || 1;

    // Track the session's high water mark to define "session profit"
    state.sessionHigh = Math.max(state.sessionHigh || bankroll, bankroll);

    // 2. Initialize State
    if (!state.activeKingdoms || state.activeKingdoms.length === 0) {
        state.activeKingdoms = [1, 2, 3]; // 1: 1st Dozen, 2: 2nd Dozen, 3: 3rd Dozen
        state.bets = { 1: unit, 2: unit, 3: unit };
    }

    // 3. Process Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Define the exact numbers covered by our chosen corners for each kingdom
        const k1_nums = [1, 2, 4, 5, 8, 9, 11, 12];
        const k2_nums = [13, 14, 16, 17, 20, 21, 23, 24];
        const k3_nums = [25, 26, 28, 29, 32, 33, 35, 36];

        let conqueredKingdom = null;

        if (state.activeKingdoms.includes(1) && k1_nums.includes(lastNum)) {
            conqueredKingdom = 1;
        } else if (state.activeKingdoms.includes(2) && k2_nums.includes(lastNum)) {
            conqueredKingdom = 2;
        } else if (state.activeKingdoms.includes(3) && k3_nums.includes(lastNum)) {
            conqueredKingdom = 3;
        }

        if (conqueredKingdom !== null) {
            // WIN Logic: Remove conquered kingdom
            state.activeKingdoms = state.activeKingdoms.filter(k => k !== conqueredKingdom);
            
            // Calculate remaining coverage (2 corners per active kingdom)
            const cornersCovered = state.activeKingdoms.length * 2;

            if (state.activeKingdoms.length === 0) {
                // Reset cycle if all kingdoms are conquered
                state.activeKingdoms = [1, 2, 3];
                state.bets = { 1: unit, 2: unit, 3: unit };
            } else if (cornersCovered < 4) {
                // If coverage is less than 4 corners, reset bet size to base unit
                state.activeKingdoms.forEach(k => {
                    state.bets[k] = unit;
                });
            } else {
                // Otherwise, double the bets for the remaining ones
                state.activeKingdoms.forEach(k => {
                    state.bets[k] *= 2;
                });
            }
        } else {
            // LOSS Logic: Calculate if the next win recovers us to session profit
            const getProjectedMinBankroll = () => {
                // Calculate the cost of the upcoming spin
                let cost = state.activeKingdoms.reduce((sum, k) => sum + 2 * state.bets[k], 0);
                
                // Map the projected bankrolls if each remaining active kingdom were to win
                // Corner pays 8:1 (so return is 9 * bet amount on that specific corner)
                return Math.min(...state.activeKingdoms.map(k => bankroll + (state.bets[k] * 9) - cost));
            };

            // Increase bet until next win recovers to > sessionHigh (otherwise rebet)
            while (getProjectedMinBankroll() <= state.sessionHigh) {
                // Prevent increasing beyond the table maximum limits
                let wouldExceed = false;
                for (let k of state.activeKingdoms) {
                    if (state.bets[k] + increment > config.betLimits.max) {
                        wouldExceed = true;
                        break;
                    }
                }
                
                if (wouldExceed) {
                    break; 
                }

                // Apply increment
                state.activeKingdoms.forEach(k => {
                    state.bets[k] += increment;
                });
            }
        }
    }

    // 4. Generate Bets based on current state
    let currentBets = [];

    const placeCornerBet = (cornerValue, rawAmount) => {
        // CLAMP TO LIMITS: Ensure we don't bet below minimum or above maximum
        let amount = Math.max(rawAmount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        
        currentBets.push({ type: 'corner', value: cornerValue, amount: amount });
    };

    // Place 2 corner bets for each active kingdom
    if (state.activeKingdoms.includes(1)) {
        placeCornerBet(1, state.bets[1]); 
        placeCornerBet(8, state.bets[1]); 
    }
    
    if (state.activeKingdoms.includes(2)) {
        placeCornerBet(13, state.bets[2]); 
        placeCornerBet(20, state.bets[2]); 
    }
    
    if (state.activeKingdoms.includes(3)) {
        placeCornerBet(25, state.bets[3]); 
        placeCornerBet(32, state.bets[3]); 
    }

    return currentBets;
}