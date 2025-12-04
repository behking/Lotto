# Startale Lotto Mini App

## Overview
This is a Farcaster Mini App for a lottery system called "Startale Lotto" built as part of the Startale Superstars Incubation program. The application allows users to participate in various lottery games including instant spin-the-wheel, weekly, biweekly, and monthly lotteries on the Soneium Minato testnet.

## Tech Stack
- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Web3 Integration**: Wagmi (latest) + Viem
- **Blockchain Network**: Soneium Minato (Chain ID: 1946)
- **Farcaster SDK**: @farcaster/frame-sdk v0.1.12
- **State Management**: @tanstack/react-query
- **Code Quality**: Biome for linting

## Project Structure
```
├── public/               # Static assets (icons, manifest, splash screens)
├── src/
│   ├── hooks/           # Custom React hooks
│   │   └── useTaskContract.ts  # Lottery contract interaction hook
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   ├── wagmi.ts         # Wagmi configuration for Soneium Minato
│   └── index.css        # Global styles
├── vite.config.ts       # Vite configuration (port 5000, 0.0.0.0)
└── package.json         # Project dependencies
```

## Key Features
1. **Instant Lottery**: Spin-the-wheel game with immediate results
2. **Scheduled Lotteries**: Weekly, biweekly, and monthly lottery ticket purchases
3. **Smart Contract Integration**: Direct interaction with lottery contract at `0x5799fe0F34BAeab3D1c756023E46D3019FDFE6D8`
4. **Prize Claims**: Automatic tracking of pending winnings with claim functionality
5. **Network Switching**: Automatic prompts to switch to Soneium Minato testnet

## Development Setup
### Prerequisites
- Node.js (v20+ recommended, though v22.11+ required by Farcaster SDK)
- npm or yarn

### Installation
Dependencies are managed via npm. Run:
```bash
npm install
```

### Running the App
The development server runs on port 5000:
```bash
npm run dev
```

Access the app at `http://localhost:5000` or through the Replit webview.

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Configuration
### Vite Configuration
The app is configured to run on:
- **Host**: 0.0.0.0 (accessible from Replit proxy)
- **Port**: 5000 (Replit's default exposed port)
- **Allowed Hosts**: true (enables proxy access)

### Blockchain Configuration
- **Network**: Soneium Minato (testnet)
- **Chain ID**: 1946
- **RPC URL**: https://rpc.minato.soneium.org
- **Block Explorer**: https://soneium-minato.blockscout.com
- **Contract Address**: 0x5799fe0F34BAeab3D1c756023E46D3019FDFE6D8

## Smart Contract ABI
The contract supports:
- `spinWheel()` - Instant lottery spin (0.5 USD in ETH)
- `buyTicket(uint8 _type, uint256 _quantity)` - Purchase lottery tickets
- `claimPrize()` - Claim pending winnings
- `pendingWinnings(address user)` - Check claimable amount
- Events: `SpinResult`, `TicketPurchased`

## Recent Changes
- **2024-12-04**: Initial import and Replit environment setup
  - Configured Vite to use port 5000 with 0.0.0.0 host
  - Fixed TypeScript compilation errors
  - Installed all npm dependencies
  - Set up workflow for frontend server

## User Preferences
None specified yet.

## Known Issues
- Farcaster SDK requires Node.js v22.11+, but runs on v20.19.3 with warnings
- 2 moderate severity vulnerabilities in dependencies (non-critical for development)

## Notes
- The app uses injected wallet connectors (MetaMask, etc.)
- Prices are calculated based on a fixed ETH price of $3000 USD
- The wheel animation runs for 4.5 seconds on instant lottery spins
