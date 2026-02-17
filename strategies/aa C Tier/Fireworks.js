<<<<<<< HEAD
/**
 * STRATEGY: The Fireworks Strategy
 * * SOURCE: 
 * Channel: The Lucky Felt
 * Video: "Light the Fuse! The Fireworks Strategy revealed"
 * URL: https://www.youtube.com/watch?v=uiyK-9nEXYU
 * * THE LOGIC:
 * This is a Positive Progression system with a "Free Shot" mechanism.
 * It operates in three distinct phases:
 * * 1. PHASE 1: "Light the Fuse" (Capital Generation)
 * - Place a base unit bet on Even Money (e.g., Red/Black).
 * - Goal: Win a small profit to fund Phase 2 without risking the principal bankroll.
 * - If Win: Pocket the stake, take the PROFIT to Phase 2.
 * - If Loss: Move to Phase 3 (Recovery).
 * * 2. PHASE 2: "The Explosion" (Asymmetric Upside)
 * - Triggered by a win in Phase 1 or Phase 3.
 * - Action: Take the NET PROFIT from the previous win and spread it across random Single Numbers.
 * - Ideally, covers 5-15 numbers depending on the size of the previous win.
 * - Goal: Hit a 35:1 payout using "House Money."
 * - Outcome: Regardless of Win/Loss, reset to Phase 1 immediately after the explosion.
 * * 3. PHASE 3: "Heavy Artillery" (Loss Recovery)
 * - Triggered by a loss in Phase 1 or Phase 3.
 * - Action: Bet on Dozens (paying 2:1) to recover faster.
 * - Progression: Increase bet size linearly (1 unit, 2 units, 3 units...) until a win occurs.
 * - Goal: Win back previous losses + profit to fund an Explosion.
 * * TARGET:
 * - Generate massive ROI spikes during Phase 2 while protecting bankroll in Phase 1.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & SETUP ---
    const MIN_OUTSIDE = config.betLimits.minOutside;
    const MIN_INSIDE = config.betLimits.min;
    
    // Define Phases
    const PHASE_FUSE = 'FUSE';
    const PHASE_EXPLOSION = 'EXPLOSION';
    const PHASE_RECOVERY = 'RECOVERY';

    // Initialize State
    if (!state.phase) {
        state.phase = PHASE_FUSE;
        state.recoveryLevel = 1; // Multiplier for recovery bets
        state.explosionBudget = 0; // Amount available for the 'Fireworks' bet
    }

    // Helper: Select random unique numbers for the explosion
    const getRandomNumbers = (count) => {
        const nums = new Set();
        while (nums.size < count) {
            nums.add(Math.floor(Math.random() * 37));
        }
        return Array.from(nums);
    };

    // --- 2. PROCESS PREVIOUS RESULT (If any) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        // We need to know if we won the last bet to trigger transitions.
        // Since the simulator doesn't pass 'lastBetWasWin' explicitly in this signature,
        // we assume the logic held based on the phase we were in. 
        
        // However, accurate state transition requires knowing if we actually won.
        // We can infer this by checking if bankroll increased, OR
        // strictly follow the strategy flow assuming the previous bets were placed as intended.
        // A robust way in this stateless function is to re-calculate the result of the LAST bet placed.
        // *Note: For this implementation, we will assume standard payouts.*

        // Simple State Machine Transition
        // We need to check if the *previous* bet won. 
        // We will store the 'lastBetType' and 'lastBetValue' in state to verify against 'lastSpin'.
        
        let wonLastBet = false;
        
        if (state.lastBetPlaced) {
            const lb = state.lastBetPlaced; // { type: 'red', value: null, etc }
            const num = lastSpin.winningNumber;
            const color = lastSpin.winningColor;
            
            // Basic Win Check Logic
            if (lb.type === 'red' && color === 'red') wonLastBet = true;
            else if (lb.type === 'black' && color === 'black') wonLastBet = true;
            else if (lb.type === 'even' && num !== 0 && num % 2 === 0) wonLastBet = true;
            else if (lb.type === 'odd' && num !== 0 && num % 2 !== 0) wonLastBet = true;
            else if (lb.type === 'dozen') {
                if (lb.value === 1 && num >= 1 && num <= 12) wonLastBet = true;
                if (lb.value === 2 && num >= 13 && num <= 24) wonLastBet = true;
                if (lb.value === 3 && num >= 25 && num <= 36) wonLastBet = true;
            }
            // Note: Single number wins (Phase 2) are handled separately below
        }

        if (state.phase === PHASE_FUSE) {
            if (wonLastBet) {
                // FUSE LIT -> Go to Explosion
                // Profit on Even Money is 1:1. We use the PROFIT for the explosion.
                state.explosionBudget = state.lastBetAmount; 
                state.phase = PHASE_EXPLOSION;
            } else {
                // DUD -> Go to Recovery
                state.phase = PHASE_RECOVERY;
                state.recoveryLevel = 1; // Start recovery ladder
            }
        } 
        else if (state.phase === PHASE_RECOVERY) {
            if (wonLastBet) {
                // RECOVERED -> Go to Explosion
                // Profit on Dozen is 2:1. We use the PROFIT for the explosion.
                state.explosionBudget = state.lastBetAmount * 2;
                state.phase = PHASE_EXPLOSION;
                state.recoveryLevel = 1; // Reset ladder
            } else {
                // STILL LOSING -> Increase Recovery Level
                state.recoveryLevel++;
            }
        } 
        else if (state.phase === PHASE_EXPLOSION) {
            // After explosion (Win or Loss), we always reset to calm Phase 1
            state.phase = PHASE_FUSE;
            state.explosionBudget = 0;
        }
    }

    // --- 3. DETERMINE BET FOR CURRENT SPIN ---
    let bets = [];

    // --- PHASE 1: FUSE (Even Money) ---
    if (state.phase === PHASE_FUSE) {
        const betAmount = MIN_OUTSIDE;
        
        // Alternating Even/Odd for variety, or stick to Red. Let's do Red for simplicity.
        const type = 'red'; 
        
        bets.push({ type: type, amount: betAmount });
        
        // Store state for next spin verification
        state.lastBetPlaced = { type: type, value: null };
        state.lastBetAmount = betAmount;
    }

    // --- PHASE 2: EXPLOSION (Single Numbers) ---
    else if (state.phase === PHASE_EXPLOSION) {
        // Calculate how many chips we can buy with our budget
        // We use MIN_INSIDE (usually smaller than outside) to maximize coverage
        let chipValue = MIN_INSIDE;
        let numberOfBets = Math.floor(state.explosionBudget / chipValue);

        // Fail-safe: If budget is somehow too small for even 1 number, fallback to Fuse
        if (numberOfBets < 1) {
            state.phase = PHASE_FUSE;
            return bet(spinHistory, bankroll, config, state, utils); // Recursive retry
        }

        // Cap max numbers to 35 to avoid betting on everything (strategy usually does 5-15)
        if (numberOfBets > 20) {
            // If we have huge budget, increase chip value instead of covering whole board
            chipValue = Math.floor(state.explosionBudget / 20);
            numberOfBets = 20;
        }

        const targets = getRandomNumbers(numberOfBets);
        
        targets.forEach(num => {
            bets.push({ type: 'number', value: num, amount: chipValue });
        });

        // We don't need to track specific numbers for win/loss transition logic
        // because Phase 2 ALWAYS goes back to Phase 1 regardless of outcome.
        state.lastBetPlaced = { type: 'explosion', value: null }; 
        state.lastBetAmount = state.explosionBudget;
    }

    // --- PHASE 3: RECOVERY (Dozens) ---
    else if (state.phase === PHASE_RECOVERY) {
        // Bet size increases linearly: 1 unit, 2 units, 3 units...
        let betAmount = MIN_OUTSIDE * state.recoveryLevel;

        // CLAMP to Max Limit
        if (betAmount > config.betLimits.max) {
            betAmount = config.betLimits.max;
            // Optional: If hit max, maybe reset? For now we just cap.
        }

        // Pick a dozen. Strategy usually sticks to one or chases. Let's pick Dozen 2 (Middle).
        const type = 'dozen';
        const value = 2;

        bets.push({ type: type, value: value, amount: betAmount });

        // Store state
        state.lastBetPlaced = { type: type, value: value };
        state.lastBetAmount = betAmount;
    }

    return bets;
=======
/**
 * STRATEGY: The Fireworks Strategy
 * * SOURCE: 
 * Channel: The Lucky Felt
 * Video: "Light the Fuse! The Fireworks Strategy revealed"
 * URL: https://www.youtube.com/watch?v=uiyK-9nEXYU
 * * THE LOGIC:
 * This is a Positive Progression system with a "Free Shot" mechanism.
 * It operates in three distinct phases:
 * * 1. PHASE 1: "Light the Fuse" (Capital Generation)
 * - Place a base unit bet on Even Money (e.g., Red/Black).
 * - Goal: Win a small profit to fund Phase 2 without risking the principal bankroll.
 * - If Win: Pocket the stake, take the PROFIT to Phase 2.
 * - If Loss: Move to Phase 3 (Recovery).
 * * 2. PHASE 2: "The Explosion" (Asymmetric Upside)
 * - Triggered by a win in Phase 1 or Phase 3.
 * - Action: Take the NET PROFIT from the previous win and spread it across random Single Numbers.
 * - Ideally, covers 5-15 numbers depending on the size of the previous win.
 * - Goal: Hit a 35:1 payout using "House Money."
 * - Outcome: Regardless of Win/Loss, reset to Phase 1 immediately after the explosion.
 * * 3. PHASE 3: "Heavy Artillery" (Loss Recovery)
 * - Triggered by a loss in Phase 1 or Phase 3.
 * - Action: Bet on Dozens (paying 2:1) to recover faster.
 * - Progression: Increase bet size linearly (1 unit, 2 units, 3 units...) until a win occurs.
 * - Goal: Win back previous losses + profit to fund an Explosion.
 * * TARGET:
 * - Generate massive ROI spikes during Phase 2 while protecting bankroll in Phase 1.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & SETUP ---
    const MIN_OUTSIDE = config.betLimits.minOutside;
    const MIN_INSIDE = config.betLimits.min;
    
    // Define Phases
    const PHASE_FUSE = 'FUSE';
    const PHASE_EXPLOSION = 'EXPLOSION';
    const PHASE_RECOVERY = 'RECOVERY';

    // Initialize State
    if (!state.phase) {
        state.phase = PHASE_FUSE;
        state.recoveryLevel = 1; // Multiplier for recovery bets
        state.explosionBudget = 0; // Amount available for the 'Fireworks' bet
    }

    // Helper: Select random unique numbers for the explosion
    const getRandomNumbers = (count) => {
        const nums = new Set();
        while (nums.size < count) {
            nums.add(Math.floor(Math.random() * 37));
        }
        return Array.from(nums);
    };

    // --- 2. PROCESS PREVIOUS RESULT (If any) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        // We need to know if we won the last bet to trigger transitions.
        // Since the simulator doesn't pass 'lastBetWasWin' explicitly in this signature,
        // we assume the logic held based on the phase we were in. 
        
        // However, accurate state transition requires knowing if we actually won.
        // We can infer this by checking if bankroll increased, OR
        // strictly follow the strategy flow assuming the previous bets were placed as intended.
        // A robust way in this stateless function is to re-calculate the result of the LAST bet placed.
        // *Note: For this implementation, we will assume standard payouts.*

        // Simple State Machine Transition
        // We need to check if the *previous* bet won. 
        // We will store the 'lastBetType' and 'lastBetValue' in state to verify against 'lastSpin'.
        
        let wonLastBet = false;
        
        if (state.lastBetPlaced) {
            const lb = state.lastBetPlaced; // { type: 'red', value: null, etc }
            const num = lastSpin.winningNumber;
            const color = lastSpin.winningColor;
            
            // Basic Win Check Logic
            if (lb.type === 'red' && color === 'red') wonLastBet = true;
            else if (lb.type === 'black' && color === 'black') wonLastBet = true;
            else if (lb.type === 'even' && num !== 0 && num % 2 === 0) wonLastBet = true;
            else if (lb.type === 'odd' && num !== 0 && num % 2 !== 0) wonLastBet = true;
            else if (lb.type === 'dozen') {
                if (lb.value === 1 && num >= 1 && num <= 12) wonLastBet = true;
                if (lb.value === 2 && num >= 13 && num <= 24) wonLastBet = true;
                if (lb.value === 3 && num >= 25 && num <= 36) wonLastBet = true;
            }
            // Note: Single number wins (Phase 2) are handled separately below
        }

        if (state.phase === PHASE_FUSE) {
            if (wonLastBet) {
                // FUSE LIT -> Go to Explosion
                // Profit on Even Money is 1:1. We use the PROFIT for the explosion.
                state.explosionBudget = state.lastBetAmount; 
                state.phase = PHASE_EXPLOSION;
            } else {
                // DUD -> Go to Recovery
                state.phase = PHASE_RECOVERY;
                state.recoveryLevel = 1; // Start recovery ladder
            }
        } 
        else if (state.phase === PHASE_RECOVERY) {
            if (wonLastBet) {
                // RECOVERED -> Go to Explosion
                // Profit on Dozen is 2:1. We use the PROFIT for the explosion.
                state.explosionBudget = state.lastBetAmount * 2;
                state.phase = PHASE_EXPLOSION;
                state.recoveryLevel = 1; // Reset ladder
            } else {
                // STILL LOSING -> Increase Recovery Level
                state.recoveryLevel++;
            }
        } 
        else if (state.phase === PHASE_EXPLOSION) {
            // After explosion (Win or Loss), we always reset to calm Phase 1
            state.phase = PHASE_FUSE;
            state.explosionBudget = 0;
        }
    }

    // --- 3. DETERMINE BET FOR CURRENT SPIN ---
    let bets = [];

    // --- PHASE 1: FUSE (Even Money) ---
    if (state.phase === PHASE_FUSE) {
        const betAmount = MIN_OUTSIDE;
        
        // Alternating Even/Odd for variety, or stick to Red. Let's do Red for simplicity.
        const type = 'red'; 
        
        bets.push({ type: type, amount: betAmount });
        
        // Store state for next spin verification
        state.lastBetPlaced = { type: type, value: null };
        state.lastBetAmount = betAmount;
    }

    // --- PHASE 2: EXPLOSION (Single Numbers) ---
    else if (state.phase === PHASE_EXPLOSION) {
        // Calculate how many chips we can buy with our budget
        // We use MIN_INSIDE (usually smaller than outside) to maximize coverage
        let chipValue = MIN_INSIDE;
        let numberOfBets = Math.floor(state.explosionBudget / chipValue);

        // Fail-safe: If budget is somehow too small for even 1 number, fallback to Fuse
        if (numberOfBets < 1) {
            state.phase = PHASE_FUSE;
            return bet(spinHistory, bankroll, config, state, utils); // Recursive retry
        }

        // Cap max numbers to 35 to avoid betting on everything (strategy usually does 5-15)
        if (numberOfBets > 20) {
            // If we have huge budget, increase chip value instead of covering whole board
            chipValue = Math.floor(state.explosionBudget / 20);
            numberOfBets = 20;
        }

        const targets = getRandomNumbers(numberOfBets);
        
        targets.forEach(num => {
            bets.push({ type: 'number', value: num, amount: chipValue });
        });

        // We don't need to track specific numbers for win/loss transition logic
        // because Phase 2 ALWAYS goes back to Phase 1 regardless of outcome.
        state.lastBetPlaced = { type: 'explosion', value: null }; 
        state.lastBetAmount = state.explosionBudget;
    }

    // --- PHASE 3: RECOVERY (Dozens) ---
    else if (state.phase === PHASE_RECOVERY) {
        // Bet size increases linearly: 1 unit, 2 units, 3 units...
        let betAmount = MIN_OUTSIDE * state.recoveryLevel;

        // CLAMP to Max Limit
        if (betAmount > config.betLimits.max) {
            betAmount = config.betLimits.max;
            // Optional: If hit max, maybe reset? For now we just cap.
        }

        // Pick a dozen. Strategy usually sticks to one or chases. Let's pick Dozen 2 (Middle).
        const type = 'dozen';
        const value = 2;

        bets.push({ type: type, value: value, amount: betAmount });

        // Store state
        state.lastBetPlaced = { type: type, value: value };
        state.lastBetAmount = betAmount;
    }

    return bets;
>>>>>>> origin/main
}