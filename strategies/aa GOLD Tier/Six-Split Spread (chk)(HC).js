/**
 * ============================================================================
 * Six-Split Spread Strategy (Locked Layout with Single-Split Replacement)
 * ============================================================================
 * Source:
 *   - Video URL: https://youtu.be/OfScZToHBEE
 *   - Channel: Roulette Strategy Hub / Casino Systems
 * 
 * The Full Logic in Detail:
 *   - Observation Phase:
 *       No bets are placed for the first 37 spins (`return []`).
 *   - Initial Bet Placement (Spin 37):
 *       Evaluates the 37-spin window to establish the top 6 hottest and 6 coldest
 *       numbers, forming 6 non-overlapping splits covering 12 numbers using layout
 *       adjacencies.
 *   - Locked Spin-to-Spin Behavior:
 *       Once placed, the split bet locations DO NOT change from spin to spin on a loss.
 *       They remain locked in place while the progression ladder advances.
 *   - Win Replacement Trigger:
 *       If a split wins, the progression resets. ONLY the winning split bet is
 *       removed from the board. The strategy analyzes the latest rolling 37-spin
 *       window and forms exactly ONE new split bet (targeting the hottest available
 *       number paired with its coldest available neighbor) to replace the winning
 *       split. The other 5 splits remain locked in their original placements.
 * 
 * The Full Bet Progression:
 *   - Initial Bet: Base unit per split, derived from `config.betLimits.min`.
 *   - Ladder: [1, 2, 4, 6, 8, 12] multiplier ladder (or step increases via
 *     `config.minIncrementalBet` when `config.incrementMode === 'fixed'`).
 *   - On Win: Pays 17:1 on the winning split chip. Resets progression to base (Level 0).
 *   - On Loss: Advances progression by 1 level up to max ladder length.
 * 
 * The Goal:
 *   - Target Profit: +20 units profit relative to starting bankroll.
 *   - Stop-Loss: Cease wagering if bankroll drops below 50% of starting bankroll.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.initialBankroll = bankroll;
    state.progressionIndex = 0;
    state.targetProfitUnits = 20000;
    state.currentSplits = [];
  }

  // 2. Observation Phase: Wait for 37 spins before placing bets
  if (!spinHistory || spinHistory.length < 37) {
    return [];
  }

  const baseUnit = Math.max(config.betLimits.min || 1, 1);
  const progressionLadder = [1, 2, 4, 6, 8, 12];

  // 3. Process Result of Previous Spin and Determine Replacement Needs
  let requiresFullInitialization = false;
  let requiresSingleReplacement = false;

  if (state.currentSplits && state.currentSplits.length === 6) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNumber = lastResult.winningNumber;
    
    // Find if any of our active splits won
    const winningSplitIndex = state.currentSplits.findIndex(split => split.includes(winningNumber));

    if (winningSplitIndex !== -1) {
      // WIN: Reset progression ladder to base
      state.progressionIndex = 0;
      
      // Remove ONLY the winning split to make room for a new one
      state.currentSplits.splice(winningSplitIndex, 1);
      requiresSingleReplacement = true;
    } else {
      // LOSS: Step up the progression ladder. Splts REMAIN LOCKED.
      if (state.progressionIndex < progressionLadder.length - 1) {
        state.progressionIndex += 1;
      }
    }
  } else if (!state.currentSplits || state.currentSplits.length === 0) {
    // Initial trigger after 37 spins
    requiresFullInitialization = true;
  }

  // 4. Check Target Profit and Stop-Loss Rules
  const currentProfit = bankroll - state.initialBankroll;
  const targetProfitAmount = state.targetProfitUnits * baseUnit;
  const stopLossAmount = -(state.initialBankroll * 0.5);

  if (currentProfit >= targetProfitAmount || currentProfit <= stopLossAmount) {
    return []; // Stop betting
  }

  // 5. Cloth Layout Neighbors (Horizontal, Vertical, and 0 Adjacencies)
  const layout = {
    0: [1, 2, 3],
    1: [0, 2, 4],       2: [0, 1, 3, 5],    3: [0, 2, 6],
    4: [1, 5, 7],       5: [2, 4, 6, 8],    6: [3, 5, 9],
    7: [4, 8, 10],      8: [5, 7, 9, 11],   9: [6, 8, 12],
    10: [7, 11, 13],   11: [8, 10, 12, 14], 12: [9, 11, 15],
    13: [10, 14, 16],  14: [11, 13, 15, 17],15: [12, 14, 18],
    16: [13, 17, 19],  17: [14, 16, 18, 20],18: [15, 17, 21],
    19: [16, 20, 22],  20: [17, 19, 21, 23],21: [18, 20, 24],
    22: [19, 23, 25],  23: [20, 22, 24, 26],24: [21, 23, 27],
    25: [22, 26, 28],  26: [23, 25, 27, 29],27: [24, 26, 30],
    28: [25, 29, 31],  29: [26, 28, 30, 32],30: [27, 29, 33],
    31: [28, 32, 34],  32: [29, 31, 33, 35],33: [30, 32, 36],
    34: [31, 35],      35: [32, 34, 36],    36: [33, 35]
  };

  // 6. Recalculate 37-Spin Frequency & Recency ONLY if changes are needed
  if (requiresFullInitialization || requiresSingleReplacement) {
    const windowSpins = spinHistory.slice(-37);
    const stats = {};
    for (let i = 0; i <= 36; i++) {
      stats[i] = { num: i, hits: 0, lastSeen: -1, salt: Math.random() };
    }

    windowSpins.forEach((spin, idx) => {
      const num = spin.winningNumber;
      if (num !== undefined && stats[num]) {
        stats[num].hits += 1;
        stats[num].lastSeen = idx; // Greater index = more recent
      }
    });

    const entries = Object.values(stats);

    // Hot Ranking
    const hotList = [...entries].sort((a, b) => {
      if (b.hits !== a.hits) return b.hits - a.hits;
      if (b.lastSeen !== a.lastSeen) return b.lastSeen - a.lastSeen;
      return a.salt - b.salt;
    }).map(e => e.num);

    // Cold Ranking
    const coldRankMap = {};
    [...entries].sort((a, b) => {
      if (a.hits !== b.hits) return a.hits - b.hits;
      if (a.lastSeen !== b.lastSeen) return a.lastSeen - b.lastSeen;
      return a.salt - b.salt;
    }).forEach((e, idx) => {
      coldRankMap[e.num] = idx; // Lower rank index = colder
    });

    const bottom6Coldest = new Set(
      [...entries].sort((a, b) => coldRankMap[a.num] - coldRankMap[b.num])
        .slice(0, 6)
        .map(e => e.num)
    );

    const isColder = (a, b) => coldRankMap[a] - coldRankMap[b];

    // ========================================================================
    // LOGIC A: Generate all 6 initial splits
    // ========================================================================
    if (requiresFullInitialization) {
      const selectedSplits = [];
      const covered = new Set();
      const hotPriority = hotList.slice(0, 6);
      const hotSet = new Set(hotPriority);

      for (const h of hotPriority) {
        if (selectedSplits.length === 6) break;
        if (covered.has(h)) continue;

        let candidates = layout[h]
          .filter(n => !covered.has(n) && !bottom6Coldest.has(n) && !hotSet.has(n))
          .sort((a, b) => isColder(a, b));

        if (candidates.length === 0) {
          candidates = layout[h].filter(n => !covered.has(n) && !hotSet.has(n)).sort(isColder);
        }
        if (candidates.length === 0) {
          candidates = layout[h].filter(n => !covered.has(n) && hotSet.has(n)).sort(isColder);
        }

        if (candidates.length > 0) {
          const partner = candidates[0];
          selectedSplits.push([h, partner]);
          covered.add(h);
          covered.add(partner);
          continue;
        }

        // Backtracking Displacement / Re-pairing for initial setup
        let rewired = false;
        for (const adj of layout[h]) {
          const splitIdx = selectedSplits.findIndex(s => s[0] === adj || s[1] === adj);
          if (splitIdx === -1) continue;

          const currentSplit = selectedSplits[splitIdx];
          const otherNumber = currentSplit[0] === adj ? currentSplit[1] : currentSplit[0];
          const altNeighbors = layout[otherNumber]
            .filter(n => !covered.has(n) && n !== h && n !== adj)
            .sort((a, b) => isColder(a, b));

          if (altNeighbors.length > 0) {
            const newPartner = altNeighbors[0];
            covered.delete(adj);
            covered.delete(otherNumber);
            selectedSplits.splice(splitIdx, 1);

            selectedSplits.push([otherNumber, newPartner]);
            covered.add(otherNumber);
            covered.add(newPartner);

            selectedSplits.push([h, adj]);
            covered.add(h);
            covered.add(adj);
            rewired = true;
            break;
          }
        }
        if (rewired) continue;
      }

      // Fill remaining spots if < 6
      if (selectedSplits.length < 6) {
        for (const num of hotList) {
          if (selectedSplits.length === 6) break;
          if (covered.has(num)) continue;

          const availableNeighbors = layout[num].filter(n => !covered.has(n)).sort(isColder);
          if (availableNeighbors.length > 0) {
            selectedSplits.push([num, availableNeighbors[0]]);
            covered.add(num);
            covered.add(availableNeighbors[0]);
          }
        }
      }
      state.currentSplits = selectedSplits;
    }

    // ========================================================================
    // LOGIC B: Generate exactly 1 replacement split (5 others are locked)
    // ========================================================================
    if (requiresSingleReplacement) {
      const covered = new Set(state.currentSplits.flat());
      let newSplit = null;

      // Find the hottest unassigned number that has at least one free layout neighbor
      for (const h of hotList) {
        if (covered.has(h)) continue;

        // Try to avoid the 6 coldest first
        let candidates = layout[h]
          .filter(n => !covered.has(n) && !bottom6Coldest.has(n))
          .sort((a, b) => isColder(a, b));
        
        // Fallback: accept 6 coldest if necessary
        if (candidates.length === 0) {
          candidates = layout[h]
            .filter(n => !covered.has(n))
            .sort((a, b) => isColder(a, b));
        }

        if (candidates.length > 0) {
          newSplit = [h, candidates[0]];
          break;
        }
      }

      // Append the single new split to our locked array
      if (newSplit) {
        state.currentSplits.push(newSplit);
      }
    }
  }

  // Fallback safety check
  if (!state.currentSplits || state.currentSplits.length === 0) {
    return [];
  }

  // 7. Calculate Bet Amount per Split
  let unitMultiplier;
  if (config.incrementMode === 'fixed' && config.minIncrementalBet) {
    unitMultiplier = 1 + (state.progressionIndex * (config.minIncrementalBet / baseUnit));
  } else {
    unitMultiplier = progressionLadder[state.progressionIndex];
  }

  let betAmountPerSplit = Math.round(baseUnit * unitMultiplier);
  betAmountPerSplit = Math.max(betAmountPerSplit, config.betLimits.min);
  betAmountPerSplit = Math.min(betAmountPerSplit, config.betLimits.max);

  // 8. Bankroll Verification
  const totalRequired = betAmountPerSplit * state.currentSplits.length;
  if (bankroll < totalRequired) {
    return []; // Insufficient funds to maintain active splits
  }

  // 9. Generate and Return Bet Objects
  return state.currentSplits.map(splitPair => ({
    type: 'split',
    value: splitPair,
    amount: betAmountPerSplit
  }));
}