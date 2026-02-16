/**
 * strategy_wait_and_attack.js
 * * STRATEGY: Wait and Attack (Specific $32/$256 Variant)
 * * SOURCE: 
 * - Logic derived from user specific requirements (Hybrid of "Wait for Trigger" and "Attack Trends" systems).
 * - Concept similar to "CEG Dealer School" recovery systems.
 * * LOGIC:
 * 1. BASE: Flat bet minimum on RED (or configured even chance) until a loss occurs.
 * 2. REACTION (Trigger): On loss, bet $32 on the two dozens that did NOT hit.
 * - If WIN: Enter "Short Attack" (3 spins).
 * - If LOSS: Enter "Waiting Room".
 * 3. WAITING ROOM: Bet $0 (virtual) and count spins until one of the target dozens hits.
 * - If wait was 2-3 spins: Enter "Medium Attack" (9 spins).
 * - If wait was 4-5 spins: Enter "Long Attack" (15 spins).
 * - If wait was 1 spin or >5 spins: Reset to BASE.
 * 4. ATTACK MODES: Bet $256 total ($128 per dozen) on the target dozens.
 * * PROGRESSION:
 * - Base: Min Table Limit (e.g., $5).
 * - Reaction: Fixed $32 per dozen ($64 total).
 * - Attack: Fixed $128 per dozen ($256 total).
 * - No Martingale doubling. Uses heavy flat betting during "hot" phases.
 * * GOAL:
 * - Capitalize on dozen repeats after specific intervals.
 * - Stop Loss: Recommend 20% of bankroll.
 * - Target: +20% or Hit-and-Run.
 */

function bet(spinHistory, bankroll, config, state) {
    // --- Helper Functions ---
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    };

    // --- Configuration & Constants ---
    const BASE_BET_TYPE = 'red'; // Can be changed to 'black', 'even', 'odd'
    const REACTION_BET_AMT = 32; // Per Dozen
    const ATTACK_BET_AMT = 128;  // Per Dozen (Total $256)
    
    // Limits
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // --- State Initialization ---
    if (!state.stage) {
        state.stage = 'BASE';       // Stages: BASE, REACTION, WAITING, ATTACK
        state.targetDozens = [];    // The two dozens we are chasing
        state.waitCount = 0;        // How many spins we've waited
        state.attackSpinsLeft = 0;  // How many attack spins remain
    }

    // --- Process History (Update State) ---
    // We only update state if there is a history to analyze
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDoz = getDozen(lastNum);

        // State Machine Transition Logic
        switch (state.stage) {
            case 'BASE':
                // Did our base bet win?
                // Assuming base bet is RED.
                const baseWon = lastSpin.winningColor === BASE_BET_TYPE;
                
                if (!baseWon) {
                    state.stage = 'REACTION';
                    // Determine targets: The two dozens that did NOT hit.
                    // If 0 hits, we default to [1, 2] arbitrarily or random
                    if (lastDoz === 0) {
                        state.targetDozens = [1, 2];
                    } else {
                        state.targetDozens = [1, 2, 3].filter(d => d !== lastDoz);
                    }
                }
                break;

            case 'REACTION':
                // Did our reaction bet win?
                const reactionWon = state.targetDozens.includes(lastDoz);
                
                if (reactionWon) {
                    // "If the bet wins, reset, then bet $256... for 3 spins"
                    state.stage = 'ATTACK';
                    state.attackSpinsLeft = 3;
                } else {
                    // "If the bet loss, wait..."
                    state.stage = 'WAITING';
                    state.waitCount = 0;
                }
                break;

            case 'WAITING':
                state.waitCount++;
                const hitTarget = state.targetDozens.includes(lastDoz);
                
                if (hitTarget) {
                    // Check wait duration
                    if (state.waitCount >= 2 && state.waitCount <= 3) {
                        state.stage = 'ATTACK';
                        state.attackSpinsLeft = 9;
                    } else if (state.waitCount >= 4 && state.waitCount <= 5) {
                        state.stage = 'ATTACK';
                        state.attackSpinsLeft = 15;
                    } else {
                        // "If it takes 2 to 3... if 4 to 5...". 
                        // Implicitly, if 1 spin or >5 spins, we reset.
                        state.stage = 'BASE';
                        state.targetDozens = [];
                    }
                }
                break;

            case 'ATTACK':
                state.attackSpinsLeft--;
                if (state.attackSpinsLeft <= 0) {
                    state.stage = 'BASE';
                    state.targetDozens = [];
                }
                break;
        }
    }

    // --- Place Bets (Based on Current State) ---
    
    // 1. BASE PHASE
    if (state.stage === 'BASE') {
        return [{
            type: BASE_BET_TYPE,
            amount: minOutside
        }];
    }

    // 2. REACTION PHASE ($32 per Dozen)
    if (state.stage === 'REACTION') {
        // Clamp bet to table limits
        const safeAmount = Math.min(Math.max(REACTION_BET_AMT, minOutside), maxBet);
        
        return state.targetDozens.map(dozen => ({
            type: 'dozen',
            value: dozen,
            amount: safeAmount
        }));
    }

    // 3. ATTACK PHASE ($128 per Dozen)
    if (state.stage === 'ATTACK') {
        // Clamp bet to table limits
        const safeAmount = Math.min(Math.max(ATTACK_BET_AMT, minOutside), maxBet);
        
        return state.targetDozens.map(dozen => ({
            type: 'dozen',
            value: dozen,
            amount: safeAmount
        }));
    }

    // 4. WAITING PHASE (Virtual Betting)
    if (state.stage === 'WAITING') {
        return []; // No bets
    }

    return [];
}