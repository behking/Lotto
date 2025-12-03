import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'; // هوک‌های جدید اضافه شدند
import { injected } from 'wagmi/connectors';
import { useLotteryContract } from './hooks/useTaskContract';
import { parseEther } from 'viem';
import sdk from '@farcaster/frame-sdk';

// ثابت‌های قیمت (به دلار)
const PRICES = {
  INSTANT: 0.5,
  WEEKLY: 1,
  BIWEEKLY: 5,
  MONTHLY: 20
};

const ETH_PRICE_USD = 3000; 
const TARGET_CHAIN_ID = 1946; // شناسه شبکه Soneium Minato

function App() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId(); // دریافت شبکه فعلی کاربر
  const { switchChainAsync } = useSwitchChain(); // متد تغییر شبکه

  const { writeContract, isPending, isConfirming, hash, lotteryAbi, CONTRACT_ADDRESS } = useLotteryContract();

  const [activeTab, setActiveTab] = useState<'instant' | 'weekly' | 'biweekly' | 'monthly' | 'history'>('instant');
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [ethAmount, setEthAmount] = useState<string>("");
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        await sdk.actions.ready();
        setIsSdkLoaded(true);
      } catch (e) {
        setIsSdkLoaded(true);
      }
    };
    if (sdk?.actions) load();
    else setIsSdkLoaded(true);
  }, []);

  const getCurrentPriceUSD = () => {
    switch(activeTab) {
      case 'weekly': return PRICES.WEEKLY;
      case 'biweekly': return PRICES.BIWEEKLY;
      case 'monthly': return PRICES.MONTHLY;
      default: return 0;
    }
  };

  useEffect(() => {
    const priceUSD = getCurrentPriceUSD();
    if (priceUSD > 0) {
      const costInEth = (priceUSD * ticketCount) / ETH_PRICE_USD;
      setEthAmount(costInEth.toFixed(5));
    }
  }, [ticketCount, activeTab]);

  // ------------------------------------------------------
  // تابع کمکی برای چک کردن و تغییر شبکه
  // ------------------------------------------------------
  const ensureNetwork = async () => {
    if (!isConnected) return false;
    
    if (chainId !== TARGET_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: TARGET_CHAIN_ID });
        return true;
      } catch (error) {
        console.error("Failed to switch network:", error);
        return false; // کاربر درخواست تغییر شبکه را رد کرد
      }
    }
    return true; // شبکه درست است
  };

  // ------------------------------------------------------
  // اکشن‌ها (همراه با لاجیک تغییر شبکه)
  // ------------------------------------------------------
  const handleSpin = async () => {
    // 1. اول شبکه را چک میکنیم
    const isNetworkCorrect = await ensureNetwork();
    if (!isNetworkCorrect) return; 

    // 2. اگر شبکه درست بود، ادامه میدهیم
    if (!writeContract) return;

    const randomDeg = Math.floor(3600 + Math.random() * 3600); 
    setWheelRotation(randomDeg);

    const cost = (PRICES.INSTANT / ETH_PRICE_USD).toFixed(18);

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: lotteryAbi,
      functionName: 'spinWheel',
      args: [],
      value: parseEther(cost.toString()), 
    });
  };

  const handleBuyTicket = async () => {
    // 1. اول شبکه را چک میکنیم
    const isNetworkCorrect = await ensureNetwork();
    if (!isNetworkCorrect) return;

    // 2. اگر شبکه درست بود، ادامه میدهیم
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

  const renderCountdown = (days: number) => (
    <div className="countdown-box">
      <div className="timer-block"><span>0{days}</span><small>Days</small></div>:
      <div className="timer-block"><span>12</span><small>Hrs</small></div>:
      <div className="timer-block"><span>45</span><small>Min</small></div>
    </div>
  );

  if (!isSdkLoaded) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="app-container">
      <div className="glass-panel">
        
        <header className="header">
          <div className="logo-area">
            <h1>🎰 Startale Lotto</h1>
          </div>
          {isConnected ? (
            <button onClick={() => disconnect()} className="wallet-btn disconnect">
              {address?.slice(0, 6)}...
            </button>
          ) : (
            <button onClick={() => connect({ connector: injected() })} className="wallet-btn connect">
              Connect
            </button>
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
                <div 
                  className="wheel" 
                  style={{ transform: `rotate(${wheelRotation}deg)` }}
                >
                  <div className="segment" style={{ '--i': 1 } as any}><span>😢<br/>Pouch</span></div>
                  <div className="segment" style={{ '--i': 2 } as any}><span>💵<br/>$ Prize</span></div>
                  <div className="segment" style={{ '--i': 3 } as any}><span>😢<br/>Pouch</span></div>
                  <div className="segment" style={{ '--i': 4 } as any}><span>📅<br/>Weekly</span></div>
                  <div className="segment" style={{ '--i': 5 } as any}><span>😢<br/>Pouch</span></div>
                  <div className="segment" style={{ '--i': 6 } as any}><span>🔄<br/>Re-Spin</span></div>
                  <div className="segment" style={{ '--i': 7 } as any}><span>😢<br/>Pouch</span></div>
                  <div className="segment" style={{ '--i': 8 } as any}><span>🎫<br/>Big Tix</span></div>
                  <div className="segment" style={{ '--i': 9 } as any}><span>😢<br/>Pouch</span></div>
                  <div className="segment" style={{ '--i': 10 } as any}><span>😢<br/>Pouch</span></div>
                </div>
              </div>
              
              <div className="info-row">
                <span>Cost: $0.50</span>
                <span className="highlight">Win Prizes or Re-Spin!</span>
              </div>
              
              <button 
                className="action-btn spin-btn"
                disabled={!isConnected || isPending}
                onClick={handleSpin}
              >
                {isPending ? 'Confirming...' : isConfirming ? 'Spinning...' : 'SPIN (0.0001 ETH)'}
              </button>
            </div>
          )}

          {(activeTab === 'weekly' || activeTab === 'biweekly' || activeTab === 'monthly') && (
            <div className="tab-content fade-in">
              {renderCountdown(activeTab === 'weekly' ? 3 : activeTab === 'biweekly' ? 10 : 25)}
              
              <div className="dist-bar-container">
                <div className="dist-bar pool" style={{width: '80%'}}>80% Pool</div>
                <div className="dist-bar treasury" style={{width: '20%'}}>20% Treasury</div>
              </div>

              <div className="ticket-control-panel">
                <div className="slider-container">
                  <input 
                    type="range" min="1" max="50" 
                    value={ticketCount}
                    onChange={(e) => setTicketCount(parseInt(e.target.value))}
                  />
                  <span className="ticket-badge">{ticketCount}</span>
                </div>
                <div className="cost-display">
                  Total: {ethAmount || 0} ETH
                </div>
              </div>

              <button 
                className="action-btn buy-btn"
                disabled={!isConnected || isPending}
                onClick={handleBuyTicket}
              >
                {isPending ? 'Processing...' : `Buy Tickets`}
              </button>

              <div className="winners-section">
                <h3>🏆 Last Winners</h3>
                <div className="winner-row">
                  <span>0x12...4A5B</span>
                  <span className="win-amount">0.5 ETH</span>
                </div>
              </div>
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

          {hash && (
            <div className="tx-status">
              <a href={`https://soneium-minato.blockscout.com/tx/${hash}`} target="_blank">View Tx</a>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;