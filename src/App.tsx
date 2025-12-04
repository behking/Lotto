import { useState, useEffect, useRef } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useReadContract, useWatchContractEvent } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useLotteryContract } from './hooks/useTaskContract';
import { parseEther, formatEther } from 'viem';
import sdk from '@farcaster/frame-sdk';

const PRICES = { INSTANT: 0.5, WEEKLY: 1, BIWEEKLY: 5, MONTHLY: 20 };
const ETH_PRICE_USD = 3000; 
const TARGET_CHAIN_ID = 1946; // Soneium Minato

function App() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const { writeContract, isPending, isConfirming, isConfirmed, hash, lotteryAbi, CONTRACT_ADDRESS } = useLotteryContract();

  // State
  const [activeTab, setActiveTab] = useState<'instant' | 'weekly' | 'biweekly' | 'monthly' | 'history'>('instant');
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [ethAmount, setEthAmount] = useState<string>("");
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  
  // Wheel State
  const [wheelRotation, setWheelRotation] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winDetails, setWinDetails] = useState<{amount: string, type: string} | null>(null);

  const processedHash = useRef<string | null>(null);

  // Read Claimable Amount
  // FIX 1: Add type assertion or fallback for address
  const { data: claimableAmount, refetch: refetchClaim } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: lotteryAbi,
    functionName: 'pendingWinnings',
    args: [address as `0x${string}`], // TS Fix: Cast address
    query: { enabled: !!address, refetchInterval: 5000 }
  });

  // Init SDK
  useEffect(() => {
    const load = async () => {
      try { await sdk.actions.ready(); setIsSdkLoaded(true); } 
      catch { setIsSdkLoaded(true); }
    };
    if (sdk?.actions) load(); else setIsSdkLoaded(true);
  }, []);

  // Listen for Win Events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: lotteryAbi,
    eventName: 'SpinResult',
    onLogs(logs) {
      const event = logs[0] as any;
      if (event.args.player === address) {
        setWinDetails({
          amount: formatEther(event.args.prizeAmount || 0n),
          type: event.args.prizeType
        });
      }
    },
  });

  // Spin Logic
  useEffect(() => {
    if (isConfirmed && hash && hash !== processedHash.current && activeTab === 'instant') {
      processedHash.current = hash; 
      setIsSpinning(true);
      
      const randomDeg = Math.floor(3600 + Math.random() * 360); 
      setWheelRotation(prev => prev + randomDeg);

      setTimeout(() => {
        setIsSpinning(false);
        setShowResultModal(true);
        refetchClaim();
      }, 4500);
    }
  }, [isConfirmed, hash, activeTab, refetchClaim]);

  // Price Calculation
  useEffect(() => {
    const priceUSD = activeTab === 'weekly' ? PRICES.WEEKLY : activeTab === 'biweekly' ? PRICES.BIWEEKLY : activeTab === 'monthly' ? PRICES.MONTHLY : 0;
    if (priceUSD > 0) setEthAmount(((priceUSD * ticketCount) / ETH_PRICE_USD).toFixed(5));
  }, [ticketCount, activeTab]);

  // Network Switcher
  // Network Switcher (نسخه قدرتمند)
  const ensureNetwork = async () => {
    if (!isConnected) {
      // اگر وصل نیست، اول وصل شو
      connect({ connector: injected() });
      return false;
    }

    if (chainId !== TARGET_CHAIN_ID) {
      try {
        // تلاش برای تغییر شبکه
        await switchChainAsync({ chainId: TARGET_CHAIN_ID });
        return true;
      } catch (error: any) {
        console.error("Switch Error:", error);
        // اگر ارور داد، یعنی کاربر رد کرده یا مشکلی هست
        return false; 
      }
    }
    return true;
  };

  const handleSpin = async () => {
    if (!await ensureNetwork()) return;
    if (!writeContract) return;

    setShowResultModal(false);
    setWinDetails(null);
    
    const cost = (PRICES.INSTANT / ETH_PRICE_USD).toFixed(18);
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: lotteryAbi,
      functionName: 'spinWheel',
      args: [],
      value: parseEther(cost.toString()), 
    });
  };

  const handleClaim = async () => {
    if (!await ensureNetwork()) return;
    if (!writeContract) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: lotteryAbi,
      functionName: 'claimPrize',
      args: [],
    });
    setShowResultModal(false);
  };

  const handleBuyTicket = async () => {
    if (!await ensureNetwork()) return;
    if (!writeContract) return;
    
    let typeId = 1; 
    if (activeTab === 'biweekly') typeId = 2;
    if (activeTab === 'monthly') typeId = 3;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: lotteryAbi,
      functionName: 'buyTicket',
      args: [typeId, BigInt(ticketCount)], 
      value: parseEther(ethAmount),
    });
  };

  if (!isSdkLoaded) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="app-container">
      <div className="glass-panel">
        
        <header className="header">
          <h1>🎰 Startale Lotto</h1>
          {isConnected ? (
            <button onClick={() => disconnect()} className="wallet-btn disconnect">{address?.slice(0, 6)}...</button>
          ) : (
            <button onClick={() => connect({ connector: injected() })} className="wallet-btn connect">Connect</button>
          )}
        </header>

        <nav className="nav-tabs">
          {['instant', 'weekly', 'biweekly', 'monthly', 'history'].map((tab) => (
            <button 
              key={tab}
              className={`nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab as any)}
            >
              {tab === 'instant' ? '🎡' : tab === 'history' ? '📜' : '🎟️'} 
              <span className="tab-text">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            </button>
          ))}
        </nav>

        <main className="main-content">
          {activeTab === 'instant' && (
            <div className="tab-content fade-in">
              <div className="wheel-wrapper">
                <div className="wheel-pointer">▼</div>
                <div className="wheel" style={{ transform: `rotate(${wheelRotation}deg)` }}>
                  <div className="segment" style={{ '--i': 1 } as any}><span>😢</span></div>
                  <div className="segment" style={{ '--i': 2 } as any}><span>$2</span></div>
                  <div className="segment" style={{ '--i': 3 } as any}><span>😢</span></div>
                  <div className="segment" style={{ '--i': 4 } as any}><span>🎟️</span></div>
                  <div className="segment" style={{ '--i': 5 } as any}><span>😢</span></div>
                  <div className="segment" style={{ '--i': 6 } as any}><span>🔄</span></div>
                  <div className="segment" style={{ '--i': 7 } as any}><span>😢</span></div>
                  <div className="segment" style={{ '--i': 8 } as any}><span>🎫</span></div>
                  <div className="segment" style={{ '--i': 9 } as any}><span>😢</span></div>
                  <div className="segment" style={{ '--i': 10 } as any}><span>😢</span></div>
                </div>
              </div>
              
              <div className="info-row">Entry: $0.50</div>
              
              <div className="action-group">
                <button 
                  className="action-btn spin-btn"
                  disabled={!isConnected || isPending || isConfirming || isSpinning}
                  onClick={handleSpin}
                >
                  {isSpinning ? 'Spinning...' : isPending ? 'Check Wallet...' : 'SPIN NOW'}
                </button>

                {/* FIX 2: Safe BigInt conditional rendering */}
                {claimableAmount && claimableAmount > 0n ? (
                  <button onClick={handleClaim} className="action-btn claim-btn pulse-anim">
                    💰 CLAIM {Number(formatEther(claimableAmount)).toFixed(4)} ETH
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {activeTab !== 'instant' && activeTab !== 'history' && (
            <div className="tab-content fade-in">
              <div className="countdown-box">
                <div className="timer-block"><span>03</span><small>Days</small></div>:
                <div className="timer-block"><span>12</span><small>Hrs</small></div>
              </div>
              <div className="dist-bar-container">
                <div className="dist-bar pool" style={{width: '80%'}}>80% Pool</div>
                <div className="dist-bar treasury" style={{width: '20%'}}>20% Treasury</div>
              </div>
              <div className="ticket-control-panel">
                <input type="range" min="1" max="50" value={ticketCount} onChange={(e) => setTicketCount(parseInt(e.target.value))} />
                <div className="cost-display">Total: {ethAmount || 0} ETH</div>
              </div>
              <button className="action-btn buy-btn" disabled={!isConnected || isPending} onClick={handleBuyTicket}>
                {isPending ? 'Processing...' : 'Buy Tickets'}
              </button>
            </div>
          )}

           {activeTab === 'history' && (
            <div className="tab-content fade-in">
              <h3>📜 History</h3>
              <div className="history-list">
                <div className="history-item"><span className="h-type">Spin</span><span>-0.0001 ETH</span></div>
              </div>
            </div>
          )}
        </main>

        {showResultModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Result 🎲</h2>
              {winDetails ? (
                <>
                  <div className="result-emoji">🎁</div>
                  <p className="win-text">You Won: <span className="highlight">{winDetails.type}</span></p>
                  <p className="small-text">Value: {parseFloat(winDetails.amount).toFixed(5)} ETH</p>
                  
                  <button onClick={handleClaim} className="action-btn claim-btn mt-2">
                    💰 CLAIM NOW
                  </button>
                </>
              ) : (
                <>
                  <div className="result-emoji">💨</div>
                  <p>Nothing this time!</p>
                  <p className="small-text">Try spinning again.</p>
                </>
              )}
              <button onClick={() => setShowResultModal(false)} className="close-btn mt-4">Close</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;