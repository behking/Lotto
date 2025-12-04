import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

// تنظیمات شبکه
export const soneiumMinato = {
  id: 1946,
  name: 'Soneium Minato',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.minato.soneium.org'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://soneium-minato.blockscout.com' },
  },
  testnet: true,
} as const;

export const config = createConfig({
  chains: [soneiumMinato],
  connectors: [
    injected({ shimDisconnect: true }), // این گزینه برای جلوگیری از باگ‌های اتصال مجدد خوب است
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

// ---- تابع قدرتمند سوییچ شبکه (Direct Window Request) ----
export const switchToSoneium = async (): Promise<boolean> => {
   const ethereum = (window as any).ethereum;
   
   if (!ethereum) {
     alert("Wallet not found!");
     return false;
   }

   const MINATO_HEX = "0x79a"; // کد صحیح هگز برای 1946

   try {
     // تلاش برای سوییچ
     await ethereum.request({
       method: "wallet_switchEthereumChain",
       params: [{ chainId: MINATO_HEX }],
     });
     return true;
   } catch (switchError: any) {
     // ارور 4902 یعنی شبکه در ولت موجود نیست و باید ادد شود
     if (switchError.code === 4902) {
       try {
         await ethereum.request({
           method: "wallet_addEthereumChain",
           params: [{
             chainId: MINATO_HEX,
             chainName: soneiumMinato.name,
             rpcUrls: soneiumMinato.rpcUrls.default.http,
             nativeCurrency: soneiumMinato.nativeCurrency,
             blockExplorerUrls: [soneiumMinato.blockExplorers.default.url],
           }],
         });
         return true;
       } catch (addError) {
         console.error("Add Network Error:", addError);
         return false;
       }
     } else {
       console.error("Switch Network Error:", switchError);
       return false;
     }
   }
};