## 1. Architecture design

```mermaid
graph TD
    A[User Browser] --> B[React Frontend Application]
    B --> C[Strategy Engine]
    B --> D[Simulation Controller]
    B --> E[Chart Components]
    
    subgraph "Frontend Layer"
        B
        C
        D
        E
    end
    
    subgraph "External Libraries"
        F[Tailwind CSS]
        G[Recharts]
        H[Monaco Editor]
    end
    
    C --> F
    D --> G
    E --> G
    B --> H
```

## 2. Technology Description
- Frontend: React@18 + TailwindCSS@3 + Vite
- Charting: Recharts@2
- Code Editor: Monaco Editor (VS Code editor)
- State Management: React Context API + useReducer
- Build Tool: Vite@4

## 3. Route definitions
| Route | Purpose |
|-------|---------|
| / | Main simulator interface with all components |
| /strategy/:id | Shareable strategy link (optional feature) |

## 4. API definitions
This is a client-side only application with no backend API requirements.

## 5. Server architecture diagram
No server architecture required - this is a pure frontend application.

## 6. Data model

### 6.1 Data model definition
```mermaid
erDiagram
    SIMULATION ||--o{ SPIN_RESULT : contains
    SIMULATION ||--o{ STRATEGY : uses
    SPIN_RESULT ||--o{ BET : has
    
    SIMULATION {
        string id PK
        number startingBankroll
        number currentBankroll
        number totalSpins
        number completedSpins
        string strategyId FK
        string status
        date createdAt
    }
    
    SPIN_RESULT {
        string id PK
        string simulationId FK
        number spinNumber
        number winningNumber
        string winningColor
        number bankrollBefore
        number bankrollAfter
        number totalProfit
        date timestamp
    }
    
    STRATEGY {
        string id PK
        string name
        string code
        string description
        boolean isPreset
        date createdAt
    }
    
    BET {
        string id PK
        string spinResultId FK
        string type
        number amount
        number payout
        boolean isWin
        number profit
    }
```

### 6.2 Data Definition Language
Since this is a client-side application, data is stored in browser localStorage and JavaScript objects:

```javascript
// Simulation State Structure
interface SimulationState {
  id: string;
  config: {
    startingBankroll: number;
    maxSpins: number;
    tableType: 'european' | 'american';
    betLimits: {
      min: number;
      max: number;
    };
  };
  strategy: {
    id: string;
    name: string;
    code: string;
  };
  results: {
    spins: SpinResult[];
    metrics: {
      totalProfit: number;
      winRate: number;
      maxDrawdown: number;
      averageBet: number;
      finalBankroll: number;
    };
  };
  status: 'idle' | 'running' | 'paused' | 'completed';
}

// Strategy Preset Data
const strategyPresets = [
  {
    id: 'the-one',
    name: 'The One',
    description: 'A proven roulette strategy with progressive betting',
    code: `function bet(spinHistory, bankroll) {
  // Progressive betting strategy
  if (spinHistory.length === 0) return { bet: 1, type: 'red' };
  
  const lastSpin = spinHistory[spinHistory.length - 1];
  if (lastSpin.color === 'red') {
    return { bet: 1, type: 'black' };
  } else {
    return { bet: Math.min(bankroll * 0.05, 100), type: 'red' };
  }
}`
  }
];
```
