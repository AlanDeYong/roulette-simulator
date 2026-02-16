/**
 * Strategy: The "69" Strategy (15-Split Coverage)
 * * Source: 
 * YouTube Channel: ROULETTE JACKPOT
 * Video: "CRAZY ROULETTE STRATEGY!..." (https://www.youtube.com/watch?v=Ac78AxMVB5w)
 * * The Logic:
 * - The name "69" comes from placing 9 chips in one section and 6 in another (Total 15 chips).
 * - Math: We place 15 Split bets (Total 15 units).
 * - A Split bet pays 17:1. 
 * - Total Return on Win: 17 (profit) + 1 (bet returned) = 18 units.
 * - Net Profit per Hit: 18 (return) - 15 (total cost) = 3 units.
 * - This aligns with the video's claim of "$3 profit on a hit" using $1 chips.
 * - The 15 splits are chosen randomly each time to mimic the "switching flavor" described in the video.
 * * The Progression (The Ladder):
 * - The video describes "laddering" when a loss occurs.
 * - Logic: If the session goes negative (loss), we increase the bet unit (Level 1 -> 2 -> 3).
 * - Recovery: We stay at the higher level until the specific "loss session" is fully recovered (Net balance >= 0), then reset to Level 1.
 * - Example: Lose at Level 1 (-15 units). Ladder to Level 2 (Bet 30). Win pays +6 net. Repeat Level 2 spins until the -15 hole is filled.
 * * The Goal:
 * - Small consistent profits ($3 per hit).
 * - Target: Accumulate profit until a personal stop-loss or take-profit is hit (Video goal was $50-$75).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const baseUnit = config.betLimits.min; // Use minimum inside bet limit
    const totalSplitsToPlace = 15;
    
    // 2. Initialize State
    if (state.level === undefined) state.level = 1;
    if (state.sessionBalance === undefined) state.sessionBalance = 0;
    
    // 3. Process Last Spin Result (to handle progression)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Calculate the result of our previous bets purely based on unit math
        // (We can't rely solely on bankroll change because of potential manual interference, 
        // but simulation assumes isolation. We calculate theoretical win/loss here).
        // A win on 15 splits (1 hit) = +3 units * level.
        // A loss on 15 splits = -15 units * level.
        
        // We need to know if we actually won the last spin. 
        // Since we don't store exact previous bets in 'state' by default, 
        // we assume standard behavior:
        // If bankroll went up, we won. If down, we lost.
        // Note: Ideally, simulator passes 'lastBet' or similar, but we infer from history.
        
        // Simplification for logic:
        // If we won last time, we added (3 * level) to sessionBalance.
        // If we lost last time, we subtracted (15 * level) from sessionBalance.
        
        // However, we don't know *if* we won just by looking at spinHistory (we need to check numbers).
        // Since we randomize splits, we can't look back easily without storing them.
        // STRATEGY: We will assume the simulator handles the bankroll, 
        // but for the PROGRESSION logic, we need to know if we won.
        // We will store the `lastBets` in state to verify against `winningNumber`.
        
        let lastNet = 0;
        let won = false;
        
        if (state.lastBets) {
            // Check if winning number is in any of our split pairs
            const winNum = lastSpin.winningNumber;
            // state.lastBets is array of [n1, n2] arrays
            const hit = state.lastBets.some(pair => pair.includes(winNum));
            
            if (hit) {
                lastNet = 3 * state.lastLevel; // +3 units profit
                won = true;
            } else {
                lastNet = -15 * state.lastLevel; // -15 units loss
                won = false;
            }
            
            state.sessionBalance += lastNet;
        }

        // Ladder Logic
        if (state.sessionBalance >= 0) {
            // We are in profit or fully recovered -> Reset
            state.level = 1;
            state.sessionBalance = 0;
        } else {
            // We are down.
            if (!won) {
                // If we just lost, increase ladder level to try and recover faster
                // Cap level to prevent blowing bankroll too fast (e.g., max level 5)
                state.level = state.level + 1;
            }
            // If we won but are still negative (sessionBalance < 0), 
            // we MAINTAIN the current high level (do not increase, do not reset)
            // to grind back up, exactly as shown in the video.
        }
    }

    // 4. Generate Bets for this Spin
    
    // Helper to generate all valid split pairs on the board
    const getValidSplits = () => {
        let splits = [];
        // Horizontal splits (e.g., 1-2, 2-3)
        // Numbers 1-36. 
        // Row logic: 1,2,3... 
        // Valid horizontal: n and n+1, provided n is not a multiple of 3
        for (let i = 1; i <= 36; i++) {
            if (i % 3 !== 0) {
                splits.push([i, i + 1]);
            }
        }
        // Vertical splits (e.g., 1-4, 4-7)
        // Valid vertical: n and n+3, provided n <= 33
        for (let i = 1; i <= 33; i++) {
            splits.push([i, i + 3]);
        }
        return splits;
    };

    const allSplits = getValidSplits();
    
    // Shuffle splits to pick 15 random ones ("Switching up the flavor")
    // Fisher-Yates Shuffle
    for (let i = allSplits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allSplits[i], allSplits[j]] = [allSplits[j], allSplits[i]];
    }

    // Select the first 15 splits
    const selectedSplits = allSplits.slice(0, totalSplitsToPlace);

    // 5. Calculate Bet Amount per Split
    let amountPerSplit = baseUnit * state.level;

    // Clamp to limits
    amountPerSplit = Math.max(amountPerSplit, config.betLimits.min);
    amountPerSplit = Math.min(amountPerSplit, config.betLimits.max);

    // Safety: Check if we have enough bankroll
    if (amountPerSplit * totalSplitsToPlace > bankroll) {
        // Not enough money for full strategy, stop betting or reduce
        return []; 
    }

    // 6. Construct Bet Objects
    const bets = selectedSplits.map(splitPair => {
        return {
            type: 'split',
            value: splitPair,
            amount: amountPerSplit
        };
    });

    // 7. Store state for next spin verification
    state.lastBets = selectedSplits;
    state.lastLevel = state.level;

    return bets;
}