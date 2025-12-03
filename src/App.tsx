import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useLotteryContract } from './hooks/useTaskContract';
import { formatEther, parseEther } from 'viem';
import sdk from '@farcaster/frame-sdk'; // ایمپورت SDK

function App() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  
  const { writeContract, isPending, isConfirming, isConfirmed, hash, lotteryAbi, CONTRACT_ADDRESS } = useLotteryContract();

  const [ticketCount, setTicketCount] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'instant' | 'weekly'>('instant');
  const [isSDKLoaded, setIsSDKLoaded] = useState(false); // وضعیت لود SDK

  // --------------------------------------------------------
  // اصلاحیه اصلی برای رفع خطای Ready
  // --------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      console.log("🔵 Starting Frame SDK initialization...");
      
      try {
        // چک می‌کنیم آیا SDK وجود دارد
        if (!sdk || !sdk.actions) {
          console.error("🔴 SDK or actions not found!");
          return;
        }

        // فراخوانی Context (اختیاری ولی برای اطمینان خوب است)
        const context = await sdk.context; 
        console.log("🟢 Frame Context Loaded:", context);

        // اعلام آمادگی به فارکستر
        sdk.actions.ready();
        
        console.log("✅ sdk.actions.ready() called successfully!");
        setIsSDKLoaded(true);
      } catch (error) {
        console.error("🔴 Error calling ready():", error);
      }
    };

    // اجرای تابع لود
    if (sdk && !isSDKLoaded) {
      load();
    }
  }, [isSDKLoaded]);
  // --------------------------------------------------------

  const handleSpin = () => {
    if (!writeContract) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: lotteryAbi,
      functionName: 'spinWheel',
      args: [],
      value: parseEther('0.0001'), 
    });
  };

  const handleBuyTicket = () => {
    if (!writeContract) return;
    const pricePerTicket = parseEther('0.0005'); 
    const totalCost = pricePerTicket * BigInt(ticketCount);

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: lotteryAbi,
      functionName: 'buyTicket',
      args: [1, BigInt(ticketCount)], 
      value: totalCost,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full max-w-md flex justify-between items-center mb-8 p-4 bg-gray-800 rounded-xl shadow-lg">
        <h1 className="text-xl font-bold text-yellow-400">Startale Lottery 🎰</h1>
        <div>
          {isConnected ? (
            <button 
              onClick={() => disconnect()}
              className="bg-red-500 hover:bg-red-600 text-xs px-3 py-2 rounded-lg transition"
            >
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </button>
          ) : (
            <button 
              onClick={() => connect({ connector: injected() })}
              className="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-2 rounded-lg transition font-bold"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Main Card */}
      <main className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button 
            onClick={() => setActiveTab('instant')}
            className={`flex-1 py-4 text-center font-bold ${activeTab === 'instant' ? 'bg-gray-700 text-yellow-400' : 'text-gray-400 hover:bg-gray-750'}`}
          >
            🎡 Instant Spin
          </button>
          <button 
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-4 text-center font-bold ${activeTab === 'weekly' ? 'bg-gray-700 text-green-400' : 'text-gray-400 hover:bg-gray-750'}`}
          >
            📅 Weekly Draw
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 flex flex-col items-center text-center space-y-6">
          
          {activeTab === 'instant' ? (
            <>
              <div className="text-6xl animate-bounce my-4">🎡</div>
              <p className="text-gray-300">Win prizes or free tickets instantly!</p>
              <div className="bg-gray-900 p-3 rounded-lg w-full">
                <span className="text-sm text-gray-500">Cost per spin:</span>
                <div className="text-xl font-mono text-yellow-400">0.0001 ETH</div>
              </div>
              <button
                disabled={!isConnected || isPending || isConfirming}
                onClick={handleSpin}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition active:scale-95"
              >
                {isPending ? 'Confirming...' : isConfirming ? 'Spinning...' : 'SPIN NOW!'}
              </button>
            </>
          ) : (
            <>
              <div className="text-6xl my-4">🎟️</div>
              <p className="text-gray-300">Join the weekly pool. 6 Winners!</p>
              
              <div className="w-full space-y-4">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Tickets: {ticketCount}</span>
                  <span>Total: {formatEther(parseEther('0.0005') * BigInt(ticketCount))} ETH</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  value={ticketCount} 
                  onChange={(e) => setTicketCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <button
                disabled={!isConnected || isPending || isConfirming}
                onClick={handleBuyTicket}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg disabled:opacity-50 transform transition active:scale-95"
              >
                {isPending ? 'Confirming...' : 'Buy Tickets'}
              </button>
            </>
          )}

          {/* Transaction Status */}
          {hash && (
            <div className="mt-4 text-xs text-gray-400 break-all bg-black bg-opacity-30 p-2 rounded">
              Tx: <a href={`https://soneium-minato.blockscout.com/tx/${hash}`} target="_blank" rel="noreferrer" className="text-blue-400 underline">View on Explorer</a>
              {isConfirmed && <div className="text-green-500 font-bold mt-1">✅ Transaction Confirmed!</div>}
            </div>
          )}
          
        </div>
      </main>
      
      <footer className="mt-8 text-xs text-gray-500">
        Startale Superstars MVP • Soneium Testnet
      </footer>
    </div>
  );
}

export default App;