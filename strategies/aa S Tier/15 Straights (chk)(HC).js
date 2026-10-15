/**
 * Source: Adapted from ROULETTE JACKPOT (YouTube) - Dynamic Rolling Data Selection
 * * The Logic: 
 * Phase 1 (Observation): Waits for the initial 20 spins.
 * Phase 2 (Dynamic Selection): EVERY spin after the 20th, it recalculates the frequencies of the 
 * LAST 20 SPINS (a rolling window). It selects the Top 7 (Hot), Bottom 7 (Cold), and 0 (Safety).
 * Phase 3 (Betting): Bets are placed on these continuously updating 15 numbers.
 *
 * The Progression: "Laddering" (Linear progression). 
 * - We evaluate the win/loss of the PREVIOUS numbers before picking the new ones.
 * - After a LOSS: Bet size on all 15 numbers increases by 1 base unit.
 * - After a WIN: Bet size resets to 1 base unit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. OBSERVATION PHASE
    if (spinHistory.length < 20) {
        return []; 
    }

    // 2. EVALUATE PREVIOUS SPIN (For Progression)
    // We must do this BEFORE we overwrite state.targetNumbers with new calculations
    if (state.targetNumbers && spinHistory.length > 20) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        if (state.targetNumbers.includes(lastSpin.winningNumber)) {
            // Win: Reset to base level
            state.ladderLevel = 1;
        } else {
            // Loss: Increment ladder
            state.ladderLevel = (state.ladderLevel || 1) + 1;
        }
    } else {
        // First time betting (Spin 21)
        state.ladderLevel = 1;
    }

    // 3. DYNAMIC SELECTION PHASE: Recalculate Hot/Cold every single spin
    let frequencies = {};
    for (let i = 0; i <= 36; i++) {
        frequencies[i] = 0;
    }
    
    // Grab only the last 20 spins (Rolling Window)
    const last20 = spinHistory.slice(-20);
    for (let spin of last20) {
        frequencies[spin.winningNumber]++;
    }

    // Sort by frequency descending
    let sortedNums = Object.keys(frequencies).map(n => ({
        num: parseInt(n),
        freq: frequencies[n]
    })).sort((a, b) => b.freq - a.freq);

    // Build the NEW 15-number array for this specific turn
    let targetSet = new Set([0]); 
    
    // Add Hot Numbers
    let hotIndex = 0;
    while (targetSet.size < 8 && hotIndex < sortedNums.length) {
        targetSet.add(sortedNums[hotIndex].num);
        hotIndex++;
    }
    
    // Add Cold Numbers
    let coldIndex = sortedNums.length - 1;
    while (targetSet.size < 15 && coldIndex >= 0) {
        targetSet.add(sortedNums[coldIndex].num);
        coldIndex--;
    }

    // Overwrite the old targets with the new dynamically calculated targets
    state.targetNumbers = Array.from(targetSet);

    // 4. CALCULATE BET AMOUNT AND CLAMP TO LIMITS
    const baseUnit = config.betLimits.min; 
    let currentBetAmount = baseUnit * state.ladderLevel;

    currentBetAmount = Math.max(currentBetAmount, config.betLimits.min);
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max);

    // Stop-loss / Bankroll safety check
    if ((currentBetAmount * state.targetNumbers.length) > bankroll) {
        return []; // Insufficient funds, stop betting
    }

    // 5. GENERATE BET ARRAY
    const bets = [];
    for (let i = 0; i < state.targetNumbers.length; i++) {
        bets.push({
            type: 'number',
            value: state.targetNumbers[i],
            amount: currentBetAmount
        });
    }

    return bets;
}