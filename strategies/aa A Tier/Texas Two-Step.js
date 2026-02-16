/**
 * Strategy: Texas Two-Step
 * * Source: 
 * YouTube: The Roulette Master
 * Video: "SMARTEST ROULETTE SYSTEM OF ALL TIME?" (https://www.youtube.com/watch?v=2eBDyy4AaA8)
 * * The Logic:
 * This is a two-phase strategy that aims to leverage short-term trends and compound winnings.
 * * 1. Phase 1 (Trend Surfing):
 * - Identify a trend based on the last 2 spins (e.g., both were Red, or both High).
 * - Place an Even Money bet (Red/Black, Odd/Even, High/Low) following that trend.
 * - If no clear trend exists (last 2 differ), stick to the previous trend or default to Red.
 * * 2. Phase 2 (The Two-Step / Column Attack):
 * - Triggered ONLY after a Win in Phase 1.
 * - The goal is to parlay the initial stake + winnings into higher payout Inside/Column bets.
 * - Bet 1: Fixed on Column 1.
 * - Bet 2: Column 2 or Column 3. 
 * - Selection Logic: Count the occurrences of the Phase 1 "Trend" attribute (e.g., Red numbers) 
 * in the last 10 spins for Col 2 vs Col 3. Bet on the one with higher density.
 * * The Progression (Negative Progression Ladder):
 * - Base Unit: Starts at 1.
 * - On Loss (Phase 1 or Phase 2): Increase Base Unit by 1. Return to Phase 1.
 * - On Win (Phase 1): Move to Phase 2. (Bet size effectively stays the same per spot, but covers 2 columns).
 * - On Win (Phase 2): 
 * - If Bankroll > Session Start Bankroll: Reset Base Unit to 1.
 * - If Bankroll <= Session Start Bankroll: Decrease Base Unit by 2 (Min 1).
 * - Return to Phase 1.
 * * The Goal:
 * - Secure a win on the Columns (2:1 payout) to clear previous losses.
 * - Stop when a profit target is hit or bankroll is depleted.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & HELPER CONSTANTS ---
    const MIN_OUTSIDE = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;

    // Helper to clamp bets
    const clamp = (amount) => Math.max(MIN_OUTSIDE, Math.min(amount, MAX_BET));

    // Helper: Column Definitions
    const cols = {
        1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
        2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
    };

    // Helper: number properties
    const getNumberProps = (num) => {
        if (num === 0 || num === '00') return { color: 'green', parity: 'none', range: 'none', col: 0 };
        const n = parseInt(num);
        const col = cols[1].includes(n) ? 1 : cols[2].includes(n) ? 2 : 3;
        const color = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n) ? 'red' : 'black';
        return {
            val: n,
            color: color,
            parity: n % 2 === 0 ? 'even' : 'odd',
            range: n <= 18 ? 'low' : 'high',
            col: col
        };
    };

    // --- 2. INITIALIZE STATE ---
    if (!state.initialized) {
        state.unit = 1;              // Current progression level (multiplier of min bet)
        state.phase = 1;             // 1 = Outside Bet, 2 = Column Attack
        state.startBankroll = bankroll; // Remember starting balance for reset logic
        state.lastBetInfo = null;    // Store what we bet on to check win/loss
        state.trend = { type: 'red', value: null }; // Default trend
        state.initialized = true;
    }

    // --- 3. PROCESS LAST SPIN (Update Progression) ---
    if (spinHistory.length > 0 && state.lastBetInfo) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = getNumberProps(lastSpin.winningNumber);
        
        let won = false;
        
        // Determine if we won based on Phase logic
        if (state.phase === 2) {
            // In Phase 2, we placed bets on 2 columns. Check if number is in either.
            // Note: state.lastBetInfo stores the specific columns we bet on.
            const coveredCols = state.lastBetInfo.columns || [];
            if (coveredCols.includes(lastNum.col)) {
                won = true;
            }
        } else {
            // Phase 1: Simple Outside Check
            if (state.lastBetInfo.type === 'color' && lastNum.color === state.lastBetInfo.val) won = true;
            else if (state.lastBetInfo.type === 'parity' && lastNum.parity === state.lastBetInfo.val) won = true;
            else if (state.lastBetInfo.type === 'range' && lastNum.range === state.lastBetInfo.val) won = true;
        }

        // Apply Texas Two-Step Progression Logic
        if (won) {
            if (state.phase === 1) {
                // Win in Phase 1 -> Move to Phase 2 (The Two-Step)
                state.phase = 2;
                // Unit stays the same (we are parlaying the win)
            } else {
                // Win in Phase 2 -> Check Profit
                state.phase = 1; // Always return to Phase 1 after Phase 2 resolution
                if (bankroll > state.startBankroll) {
                    // In Session Profit -> Reset
                    state.unit = 1;
                } else {
                    // Win, but not in profit -> Step back 2 units
                    state.unit = Math.max(1, state.unit - 2);
                }
            }
        } else {
            // Loss (in either Phase)
            state.phase = 1; // Always reset to Phase 1 setup
            state.unit += 1; // Increase unit by 1
        }
    }

    // --- 4. IDENTIFY TREND (For Phase 1 & Phase 2 Logic) ---
    // Look at last 2 spins to determine "Trend"
    if (spinHistory.length >= 2) {
        const s1 = getNumberProps(spinHistory[spinHistory.length - 1].winningNumber);
        const s2 = getNumberProps(spinHistory[spinHistory.length - 2].winningNumber);

        // Priority 1: Color
        if (s1.color !== 'green' && s1.color === s2.color) {
            state.trend = { type: 'color', val: s1.color };
        }
        // Priority 2: High/Low
        else if (s1.range !== 'none' && s1.range === s2.range) {
            state.trend = { type: 'range', val: s1.range }; // 'high' or 'low'
        }
        // Priority 3: Odd/Even
        else if (s1.parity !== 'none' && s1.parity === s2.parity) {
            state.trend = { type: 'parity', val: s1.parity };
        }
        // If no match, keep previous trend or default (handled by initialization)
    }

    // --- 5. CALCULATE BETS ---
    const bets = [];
    const baseAmount = clamp(state.unit * MIN_OUTSIDE);

    if (state.phase === 1) {
        // --- PHASE 1: Outside Bet based on Trend ---
        
        // Map internal trend types to API bet types
        let betType = state.trend.val; // e.g., 'red', 'even', 'high'
        
        bets.push({
            type: betType,
            amount: baseAmount
        });

        // Store info for next spin validation
        state.lastBetInfo = { type: state.trend.type, val: state.trend.val };

    } else {
        // --- PHASE 2: Column Bets ---
        // Logic: Bet Col 1 AND (Col 2 or Col 3 based on density of Trend)
        
        // 1. Analyze last 10 spins for density
        let col2Count = 0;
        let col3Count = 0;
        
        const lookback = Math.min(spinHistory.length, 10);
        for (let i = 0; i < lookback; i++) {
            const spin = spinHistory[spinHistory.length - 1 - i];
            const p = getNumberProps(spin.winningNumber);
            
            // Check if this number matches our current trend
            let matchesTrend = false;
            if (state.trend.type === 'color' && p.color === state.trend.val) matchesTrend = true;
            if (state.trend.type === 'range' && p.range === state.trend.val) matchesTrend = true;
            if (state.trend.type === 'parity' && p.parity === state.trend.val) matchesTrend = true;

            if (matchesTrend) {
                if (p.col === 2) col2Count++;
                if (p.col === 3) col3Count++;
            }
        }

        // Select the second column (Default to Col 2 if tied)
        const secondCol = (col3Count > col2Count) ? 3 : 2;

        // Place bets
        bets.push({ type: 'column', value: 1, amount: baseAmount });
        bets.push({ type: 'column', value: secondCol, amount: baseAmount });

        // Store info for next spin validation
        state.lastBetInfo = { columns: [1, secondCol] };
    }

    return bets;
}