/**
 * STRATEGY: 8 FOR 8 ROULETTE SYSTEM
 * * Source: THEROULETTEMASTERTV (https://www.youtube.com/watch?v=fHK_bjEiSyE)
 * * Logic:
 * This is a defensive, multi-bet strategy designed to cover 24-28 numbers per spin.
 * It uses a "Jackpot" trigger to switch betting zones and a specific progression 
 * trigger based on "Total Losses."
 * * The Bets:
 * 1. Always bet on First 12 (Dozen 1) and Third 12 (Dozen 3).
 * 2. Toggle between two "Jackpot Zones":
 * - Zone A: Red + Column 3 (Red hits 8 numbers in Column 3).
 * - Zone B: Black + Column 2 (Black hits 8 numbers in Column 2).
 * * The Progression:
 * - Base Unit: The minimum outside bet limit.
 * - Total Loss Trigger: Only increase the bet size (+1 unit per spot) if ALL bets on 
 * the table lose (e.g., hitting 0 or numbers not covered by any of the 4 bets).
 * - Partial Wins/Losses: If some bets win and others lose, the bet size remains the same.
 * - Reset: Return to base unit once the session profit is back to positive (or the starting point).
 * * The Goal:
 * Stable bankroll protection and consistent small wins. The "Jackpot" occurs when 
 * the winning number satisfies the Dozen, the Color, and the Column simultaneously.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minBet = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // 1. Initialize State
    if (state.unitMultiplier === undefined) {
        state.unitMultiplier = 1;
        state.currentZone = 'A'; // 'A' for Red/Col3, 'B' for Black/Col2
        state.highestBankroll = bankroll;
        state.startingBankroll = bankroll;
    }

    // 2. Analyze Last Spin for Progression and Zone Switching
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastBets = state.lastBets || [];
        
        // Calculate the total amount wagered and total won in the last spin
        let totalWagered = 0;
        let totalWon = 0;
        let wonAny = false;

        lastBets.forEach(b => {
            totalWagered += b.amount;
            // The simulator doesn't provide "win per bet" in history, 
            // so we calculate based on roulette rules:
            if (b.type === 'dozen' || b.type === 'column') {
                const isDozenWin = (b.type === 'dozen' && Math.ceil(lastSpin.winningNumber / 12) === b.value);
                const isColWin = (b.type === 'column' && (lastSpin.winningNumber % 3 === (b.value === 3 ? 0 : b.value)));
                if (isDozenWin || isColWin) {
                    totalWon += b.amount * 3;
                    wonAny = true;
                }
            } else if (b.type === lastSpin.winningColor) {
                totalWon += b.amount * 2;
                wonAny = true;
            }
        });

        // PROGRESSION LOGIC: Only increase if "Total Loss" (won 0)
        if (totalWon === 0) {
            state.unitMultiplier++;
        } 
        // RESET LOGIC: If we are back in profit relative to the start of this progression
        else if (bankroll >= state.startingBankroll) {
            state.unitMultiplier = 1;
        }

        // JACKPOT LOGIC: Switch zones if we hit a "Jackpot"
        // A Jackpot is defined as winning the Color, the Column, and one of the Dozens.
        const hitColor = (state.currentZone === 'A' && lastSpin.winningColor === 'red') || 
                         (state.currentZone === 'B' && lastSpin.winningColor === 'black');
        const hitColumn = (state.currentZone === 'A' && lastSpin.winningNumber % 3 === 0 && lastSpin.winningNumber !== 0) || 
                          (state.currentZone === 'B' && lastSpin.winningNumber % 3 === 2);
        const hitDozen = (Math.ceil(lastSpin.winningNumber / 12) === 1 || Math.ceil(lastSpin.winningNumber / 12) === 3);

        if (hitColor && hitColumn && hitDozen) {
            state.currentZone = (state.currentZone === 'A') ? 'B' : 'A';
        }
    }

    // 3. Construct Bets
    const currentAmount = Math.min(minBet * state.unitMultiplier, maxBet);
    
    let bets = [
        { type: 'dozen', value: 1, amount: currentAmount },
        { type: 'dozen', value: 3, amount: currentAmount }
    ];

    if (state.currentZone === 'A') {
        bets.push({ type: 'red', amount: currentAmount });
        bets.push({ type: 'column', value: 3, amount: currentAmount });
    } else {
        bets.push({ type: 'black', amount: currentAmount });
        bets.push({ type: 'column', value: 2, amount: currentAmount });
    }

    // 4. Save state for next spin analysis and return
    state.lastBets = bets;
    
    return bets;
}