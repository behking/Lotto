import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { type Chain } from "viem";

// تعریف دقیق شبکه Soneium Minato طبق داکیومنت
const soneiumMinato: Chain = {
  id: 1946,
  name: 'Soneium Minato',
  nativeCurrency: { 
    name: 'Sepolia Ether', 
    symbol: 'ETH', 
    decimals: 18 
  },
  rpcUrls: {
    default: { http: ['https://rpc.minato.soneium.org'] },
    public: { http: ['https://rpc.minato.soneium.org'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://soneium-minato.blockscout.com' },
  },
  testnet: true,
};

export const config = createConfig({
  chains: [soneiumMinato], // فقط این شبکه را مجاز می‌دانیم
  connectors: [
    injected({ 
        target: 'metaMask', // این خط برای کارکرد صحیح در موبایل/فارکستر مهم است
        shimDisconnect: true 
    }),
  ],
  transports: {
    [soneiumMinato.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}