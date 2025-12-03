import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useLotteryContract } from './hooks/useTaskContract';
import { formatEther, parseEther } from 'viem';
import sdk from '@farcaster/frame-sdk';

// ثابت‌های قیمت (به دلار)
const PRICES = {
  INSTANT: 0.5,
  WEEKLY: 1,
  BIWEEKLY: 5,
  MONTHLY: 20
};

// نرخ تبدیل فرضی (در نسخه اصلی از اوراکل خوانده می‌شود)
const ETH_PRICE_USD = 3000; 

function App() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract, isPending, isConfirming, hash, lotteryAbi, CONTRACT_ADDRESS } = useLotteryContract();

  const [activeTab, setActiveTab] = useState<'instant' | 'weekly' | 'biweekly' | 'monthly' | 'history'>('instant');
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [ethAmount, setEthAmount] = useState<string>("");
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  
  // برای گردونه
  const [wheelRotation, setWheelRotation] = useState(0);

  // ------------------------------------------------------
  // 1. Farcaster SDK & Initial Load
  // ------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        await sdk.actions.ready();
        setIsSdkLoaded(true);
      } catch (e) {
        console.error("SDK Error:", e);
        setIsSdkLoaded(true); // Fallback for browser
      }
    };
    if (sdk?.actions) load();
    else setIsSdkLoaded(true);
  }, []);

  // محاسبه قیمت ETH بر اساس تب فعال
  const getCurrentPriceUSD = () => {
    switch(activeTab) {
      case 'weekly': return PRICES.WEEKLY;
      case 'biweekly': return PRICES.BIWEEKLY;
      case 'monthly': return PRICES.MONTHLY;
      default: return 0;
    }
  };

  // آپدیت قیمت وقتی تعداد تغییر می‌کند
  useEffect(() => {
    const priceUSD = getCurrentPriceUSD();
    if (priceUSD > 0) {
      const costInEth = (priceUSD * ticketCount) / ETH_PRICE_USD;
      setEthAmount(costInEth.toFixed(5));
    }
  }, [ticketCount, activeTab]);

  // هندلر تغییر دستی مقدار اتریوم
  const handleEthInputChange = (val: string) => {
    setEthAmount(val);
    const priceUSD = getCurrentPriceUSD();
    if (priceUSD > 0 && parseFloat(val) > 0) {
      const calcTickets = Math.floor((parseFloat(val) * ETH_PRICE_USD) / priceUSD);
      setTicketCount(calcTickets > 0 ? calcTickets : 1);
    }
  };

  // ------------------------------------------------------
  // 2. Actions (Spin & Buy)
  // ------------------------------------------------------
  const handleSpin = () => {
    if (!writeContract) return;
    // انیمیشن چرخش تصادفی
    const randomDeg = Math.floor(5000 + Math.random() * 5000); 
    setWheelRotation(randomDeg);

    // محاسبه قیمت 50 سنت
    const cost = (PRICES.INSTANT / ETH_PRICE_USD).toFixed(18);

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: lotteryAbi,
      functionName: 'spinWheel',
      args: [],
      value: parseEther(cost.toString()), 
    });
  };

  const handleBuyTicket = () => {
    if (!writeContract) return;
    let typeId = 1; // Default Weekly
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

  // ------------------------------------------------------
  // 3. Components Helper
  // ------------------------------------------------------
  const renderCountdown = (days: number) => (
    <div className="countdown-box">
      <div className="timer-block"><span>0{days}</span><small>Days</small></div>:
      <div className="timer-block"><span>12</span><small>Hrs</small></div>:
      <div className="timer-block"><span>45</span><small>Min</small></div>
    </div>
  );

  const renderDistributionBar = () => (
    <div className="dist-bar-container">
      <div className="dist-bar pool" style={{width: '80%'}}>80% Pool</div>
      <div className="dist-bar treasury" style={{width: '20%'}}>20% Treasury</div>
    </div>
  );

  if (!isSdkLoaded) return <div className="loading-screen">Loading Startale Lottery...</div>;

  return (
    <div className="app-container">
      <div className="glass-panel">
        
        {/* Header */}
        <header className="header">
          <div className="logo-area">
            <h1>🎰 Startale Lotto</h1>
            <span className="network-badge">Soneium Testnet</span>
          </div>
          {isConnected ? (
            <button onClick={() => disconnect()} className="wallet-btn disconnect">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </button>
          ) : (
            <button onClick={() => connect({ connector: injected() })} className="wallet-btn connect">
              Connect Wallet
            </button>
          )}
        </header>

        {/* Navigation Tabs */}
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

        {/* Main Content */}
        <main className="main-content">
          
          {/* --- INSTANT LOTTERY --- */}
          {activeTab === 'instant' && (
            <div className="tab-content fade-in">
              <div className="wheel-container">
                <div className="wheel-pointer">▼</div>
                <div 
                  className="wheel" 
                  style={{ transform: `rotate(${wheelRotation}deg)` }}
                >
                  <div className="wheel-segment seg-1">$10</div>
                  <div className="wheel-segment seg-2">Ticket</div>
                  <div className="wheel-segment seg-3">$2</div>
                  <div className="wheel-segment seg-4">$5</div>
                </div>
              </div>
              
              <div className="info-row">
                <span>Entry Cost:</span>
                <span className="highlight">$0.50 ({(0.5/ETH_PRICE_USD).toFixed(5)} ETH)</span>
              </div>
              
              <div className="info-text">100% goes to Prize Pool! Win instantly.</div>

              <button 
                className="action-btn spin-btn"
                disabled={!isConnected || isPending}
                onClick={handleSpin}
              >
                {isPending ? 'Confirming...' : isConfirming ? 'Spinning...' : 'SPIN WHEEL!'}
              </button>
            </div>
          )}

          {/* --- SCHEDULED LOTTERIES (Weekly/Bi/Monthly) --- */}
          {(activeTab === 'weekly' || activeTab === 'biweekly' || activeTab === 'monthly') && (
            <div className="tab-content fade-in">
              {renderCountdown(activeTab === 'weekly' ? 3 : activeTab === 'biweekly' ? 10 : 25)}
              
              <div className="stats-grid">
                <div className="stat-box">
                  <small>Pool Size</small>
                  <strong>2.5 ETH</strong>
                  <small className="usd-val">~$7,500</small>
                </div>
                <div className="stat-box">
                  <small>My Tickets</small>
                  <strong>0</strong>
                </div>
                <div className="stat-box">
                  <small>Winners</small>
                  <strong>{activeTab === 'weekly' ? '6' : activeTab === 'biweekly' ? '3' : '1'}</strong>
                </div>
              </div>

              {renderDistributionBar()}

              <div className="ticket-control-panel">
                <label>Buy Tickets (Price: ${getCurrentPriceUSD()})</label>
                
                <div className="slider-container">
                  <input 
                    type="range" min="1" max="100" 
                    value={ticketCount}
                    onChange={(e) => setTicketCount(parseInt(e.target.value))}
                  />
                  <span className="ticket-badge">{ticketCount} Tix</span>
                </div>

                <div className="manual-input">
                  <span>Pay (ETH):</span>
                  <input 
                    type="number" 
                    value={ethAmount} 
                    onChange={(e) => handleEthInputChange(e.target.value)}
                  />
                </div>
              </div>

              <button 
                className="action-btn buy-btn"
                disabled={!isConnected || isPending}
                onClick={handleBuyTicket}
              >
                {isPending ? 'Processing...' : `Buy for ${ethAmount} ETH`}
              </button>

              {/* Winners List Mockup */}
              <div className="winners-section">
                <h3>🏆 Last Round Winners</h3>
                <div className="winner-row">
                  <span>0x12...4A5B</span>
                  <span className="win-amount">0.5 ETH</span>
                </div>
                {/* اگر کاربر برنده باشد */}
                <div className="winner-row highlight-winner">
                  <span>You (0xAB...89)</span>
                  <button className="claim-btn-small">CLAIM</button>
                </div>
              </div>
            </div>
          )}

          {/* --- HISTORY --- */}
          {activeTab === 'history' && (
            <div className="tab-content fade-in">
              <h3>📜 Transaction History</h3>
              <div className="history-list">
                <div className="history-item">
                  <div className="h-left">
                    <span className="h-type">Weekly Ticket</span>
                    <span className="h-date">2024-02-20</span>
                  </div>
                  <div className="h-right">
                    -0.005 ETH
                  </div>
                </div>
                <div className="history-item win">
                  <div className="h-left">
                    <span className="h-type">Instant Win</span>
                    <span className="h-date">2024-02-18</span>
                  </div>
                  <div className="h-right">
                    +0.001 ETH
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tx Status */}
          {hash && (
            <div className="tx-status">
              <a href={`https://soneium-minato.blockscout.com/tx/${hash}`} target="_blank">
                View Transaction {isConfirming && "(Pending...)"}
              </a>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;