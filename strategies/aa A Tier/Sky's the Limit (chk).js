/**
 * Sky's the Limit Strategy
 * * Source: https://youtu.be/JIvac3v5cjc (The Roulette Master / Todd Borgstrom)
 * * The Full Logic in details:
 * - (MODIFIED): Spins without betting for the first 10 spins to build history, which is then used to determine the initial bet placements.
 * - A dual-bet strategy placing equal amounts on one Dozen and one Outside Color.
 * - Triggers: The chosen Dozen and Color are dynamic. We identify the "coldest" (longest since they hit) Dozen and Color based on recent spin history.
 * - Both bets are placed continuously until a session profit goal or reset condition is met.
 * * The Full Bet Progression in details:
 * - Initial Bet: 1 Base Unit on the coldest Dozen, 1 Base Unit on the coldest Color.
 * - Win Color / Lose Dozen (Break Even): Since color pays 1:1 and Dozen is lost, the profit is exactly zero. The bet amounts remain identical for the next spin, and we remain on the same Dozen and Color.
 * - Lose Both (or hit Green): The strategy uses a linear progression. We add the increment value (usually 1 Base Unit) to BOTH the Dozen and Color bet amounts.
 * - Win Dozen: We secure a profit on that spin. We then check our total session bankroll:
 * - If hitting the Dozen puts us into overall session profit (or completely recovers us to the starting amount), the session resets. We drop bets back to the Base Unit and pick a new coldest Dozen and Color.
 * - If we hit the Dozen but are STILL negative for the session (deep recovery), we DO NOT increase or decrease the bet amount. We keep the amount identical, but switch to a newly calculated coldest Dozen and Color.
 * * The Goal:
 * - Safely farm session profit by using break-evens to absorb variance and the 2:1 Dozen payout to quickly recover losses and reach new bankroll high-water marks.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.minOutside;
    const increment = config.incrementMode === 'base' ? unit : (config.minIncrementalBet || 1);

    // Wait for 10 spins of history before placing any bets
    if (spinHistory.length < 10) {
        return [];
    }

    // Helper to dynamically get the coldest Dozen from history
    function getColdestDozen() {
        let dozSeen = [];
        // Look back up to 150 spins
        for (let i = spinHistory.length - 1; i >= Math.max(0, spinHistory.length - 150); i--) {
            let num = spinHistory[i].winningNumber;
            let doz = 0;
            if (num >= 1 && num <= 12) doz = 1;
            else if (num >= 13 && num <= 24) doz = 2;
            else if (num >= 25 && num <= 36) doz = 3;
            
            if (doz !== 0 && !dozSeen.includes(doz)) {
                dozSeen.push(doz);
            }
            if (dozSeen.length === 3) break;
        }
        let coldest = [1, 2, 3].find(d => !dozSeen.includes(d));
        return coldest || dozSeen[2] || 1; // Default to 1st Dozen if no history
    }

    // Helper to dynamically get the coldest Color from history
    function getColdestColor() {
        let colSeen = [];
        for (let i = spinHistory.length - 1; i >= Math.max(0, spinHistory.length - 150); i--) {
            let col = spinHistory[i].winningColor;
            if ((col === 'red' || col === 'black') && !colSeen.includes(col)) {
                colSeen.push(col);
            }
            if (colSeen.length === 2) break;
        }
        let coldest = ['red', 'black'].find(c => !colSeen.includes(c));
        return coldest || colSeen[1] || 'red'; // Default to Red if no history
    }

    // Initialize State on the first active betting spin (spin 11)
    if (state.sessionStartBankroll === undefined) {
        state.sessionStartBankroll = bankroll;
        state.amount = unit;
        state.currentDozen = getColdestDozen();
        state.currentColor = getColdestColor();
    } else {
        // Evaluate previous spin outcome to dictate progression
        let lastSpin = spinHistory[spinHistory.length - 1];
        let num = lastSpin.winningNumber;
        let col = lastSpin.winningColor;
        
        let doz = 0;
        if (num >= 1 && num <= 12) doz = 1;
        else if (num >= 13 && num <= 24) doz = 2;
        else if (num >= 25 && num <= 36) doz = 3;

        let hitDozen = (doz === state.currentDozen);
        let hitColor = (col === state.currentColor);

        // Calculate theoretical profit on the last spin
        let winAmount = 0;
        if (hitDozen) winAmount += 3 * state.amount;
        if (hitColor) winAmount += 2 * state.amount;
        let profit = winAmount - (2 * state.amount);

        // State Machine Update
        if (bankroll > state.sessionStartBankroll || (bankroll === state.sessionStartBankroll && hitDozen)) {
            // Reached session profit (or fully recovered to start via a Dozen hit)
            // Ratchet the high-water mark
            state.sessionStartBankroll = Math.max(state.sessionStartBankroll, bankroll);
            state.amount = unit;
            state.currentDozen = getColdestDozen();
            state.currentColor = getColdestColor();
        } else {
            // Still in recovery (overall negative for the session)
            if (hitDozen) {
                // Hit Dozen but still down overall
                // Leave amount exactly the same, but pick new cold spots
                state.currentDozen = getColdestDozen();
                state.currentColor = getColdestColor();
            } else if (profit === 0) {
                // Break even: hit color, miss dozen
                // Keep amount, dozen, and color exactly the same (do nothing)
            } else {
                // Lost both (profit < 0)
                // Increase bets linearly
                state.amount += increment;
            }
        }
    }

    // Clamp theoretical tracking amount strictly to table limits
    state.amount = Math.max(state.amount, config.betLimits.minOutside);
    state.amount = Math.min(state.amount, config.betLimits.max);

    // Ensure we can afford both simultaneous bets
    let finalAmount = state.amount;
    if (finalAmount * 2 > bankroll) {
        // Go all-in split equally if insufficient funds
        finalAmount = Math.floor(bankroll / 2);
    }
    
    // Safety check - if we cannot place minimum bets, do not play
    if (finalAmount < config.betLimits.minOutside) {
        return [];
    }

    // Return the dual bets
    return [
        { type: 'dozen', value: state.currentDozen, amount: finalAmount },
        { type: state.currentColor, amount: finalAmount }
    ];
}