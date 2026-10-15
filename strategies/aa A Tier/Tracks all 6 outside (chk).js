/**
 * Source: https://youtu.be/u0kB9ED9C4Y
 * Channel: Mastering The Wheel
 *
 * Full Logic in Detail:
 * - Tracks all 6 outside even-money betting channels: Red, Black, Even, Odd, Low (1-18), and High (19-36).
 * - Monitors the number of consecutive misses for each channel. (Note: Green 0 counts as a miss for all 6 channels).
 * - Trigger: When any channel reaches 4 consecutive misses (e.g. Red has hit 4 times, so Black has missed 4 times),
 *   an active betting progression begins on that missing channel on the next spin.
 * - Multiple channels can trigger and progress simultaneously as independent betting tracks.
 *
 * Full Bet Progression in Detail (Martingale+):
 * - 6-tier progression: [1, 3, 7, 15, 31, 63] units (each tier is 2^n - 1; sum of 6 tiers = 120 units).
 *   - Level 1: 1 unit
 *   - Level 2: 3 units (payout 6, net profit +2 units)
 *   - Level 3: 7 units (payout 14, net profit +3 units)
 *   - Level 4: 15 units (payout 30, net profit +4 units)
 *   - Level 5: 31 units (payout 62, net profit +5 units)
 *   - Level 6: 63 units (payout 126, net profit +6 units)
 * - On Win: The channel's progression resets to idle and its miss counter resets to 0.
 * - On Loss: The channel advances to the next progression tier. If tier 6 loses (10 total consecutive misses including the 4 wait spins),
 *   that channel progression terminates.
 *
 * The Goal:
 * - Target: 5% profit based on starting bankroll (e.g., +$6 on a $120 base bankroll).
 * - Session ends immediately upon reaching the 5% target profit or exceeding the recommended 50-spin safety window.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const PROGRESSION = [1, 3, 7, 15, 31, 63];
  const TRIGGER_MISSES = 4;
  const MAX_SPINS = 500000;

  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.startBankroll = config.startingBankroll || bankroll;
    state.targetProfit = state.startBankroll * 0.05;
    state.processedSpins = 0;
    state.sessionOver = false;

    // Track channels: red, black, even, odd, low, high
    state.channels = {
      red: { misses: 0, active: false, level: 0 },
      black: { misses: 0, active: false, level: 0 },
      even: { misses: 0, active: false, level: 0 },
      odd: { misses: 0, active: false, level: 0 },
      low: { misses: 0, active: false, level: 0 },
      high: { misses: 0, active: false, level: 0 }
    };
  }

  // 2. Check session profit and spin window stop-conditions
  const currentProfit = bankroll - state.startBankroll;
  if (currentProfit >= state.targetProfit || spinHistory.length >= MAX_SPINS || state.sessionOver) {
    state.sessionOver = true;
    return [];
  }

  // Helper to determine which categories hit for a given number
  function getHits(spin) {
    const num = spin.winningNumber;
    const hits = new Set();
    if (num === 0 || num === '0' || num === '00' || spin.winningColor === 'green') {
      return hits; // 0/00 misses all even-money bets
    }
    if (spin.winningColor === 'red') hits.add('red');
    if (spin.winningColor === 'black') hits.add('black');
    if (num % 2 === 0) hits.add('even');
    else hits.add('odd');
    if (num >= 1 && num <= 18) hits.add('low');
    if (num >= 19 && num <= 36) hits.add('high');
    return hits;
  }

  // 3. Process new spins to update channel miss counts and progression levels
  while (state.processedSpins < spinHistory.length) {
    const lastSpin = spinHistory[state.processedSpins];
    const hitSet = getHits(lastSpin);

    for (const key of Object.keys(state.channels)) {
      const ch = state.channels[key];
      const didHit = hitSet.has(key);

      if (ch.active) {
        if (didHit) {
          // Win on active bet: reset channel
          ch.active = false;
          ch.level = 0;
          ch.misses = 0;
        } else {
          // Loss on active bet: step up progression
          ch.level += 1;
          if (ch.level >= PROGRESSION.length) {
            // Bust on this channel (10 consecutive misses reached)
            ch.active = false;
            ch.level = 0;
            ch.misses = 0;
          }
        }
      } else {
        if (didHit) {
          ch.misses = 0;
        } else {
          ch.misses += 1;
          if (ch.misses >= TRIGGER_MISSES) {
            ch.active = true;
            ch.level = 0;
          }
        }
      }
    }
    state.processedSpins++;
  }

  // Check profit target again after processing past results
  if (bankroll - state.startBankroll >= state.targetProfit) {
    state.sessionOver = true;
    return [];
  }

  // 4. Construct bets for all active channels
  const bets = [];
  const unitSize = config.betLimits.minOutside;

  for (const [type, ch] of Object.entries(state.channels)) {
    if (ch.active && ch.level < PROGRESSION.length) {
      const multiplier = PROGRESSION[ch.level];
      let betAmount = unitSize * multiplier;

      // Clamp bet to table limits
      betAmount = Math.max(betAmount, config.betLimits.minOutside);
      betAmount = Math.min(betAmount, config.betLimits.max);

      bets.push({ type, amount: betAmount });
    }
  }

  // 5. Verify bankroll sufficiency
  const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalBet > bankroll || totalBet === 0) {
    return [];
  }

  return bets;
}