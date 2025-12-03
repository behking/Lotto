import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useLotteryContract } from './hooks/useTaskContract';
import { parseEther } from 'viem';
import sdk from '@farcaster/frame-sdk';

const PRICES = {
  INSTANT: 0.5,
  WEEKLY: 1,
  BIWEEKLY: 5,
  MONTHLY: 20
};

const ETH_PRICE_USD = 3000; 
const TARGET_CHAIN_ID = 1946; // Soneium Minato

function App() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const { writeContract, isPending, isConfirming, isConfirmed, hash, lotteryAbi, CONTRACT_ADDRESS } = useLotteryContract();

  const [activeTab, setActiveTab] = useState<'instant' | 'weekly' | 'biweekly' | 'monthly' | 'history'>('instant');
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [ethAmount, setEthAmount] = useState<string>("");
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  
  // وضعیت‌های گردونه و نتیجه
  const [wheelRotation, setWheelRotation] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

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

  // محاسبه قیمت
  useEffect(() => {
    const priceUSD = activeTab === 'weekly' ? PRICES.WEEKLY : activeTab === 'biweekly' ? PRICES.BIWEEKLY : activeTab === 'monthly' ? PRICES.MONTHLY : 0;
    if (priceUSD > 0) {
      const costInEth = (priceUSD * ticketCount) / ETH_PRICE_USD;
      setEthAmount(costInEth.toFixed(5));
    }
  }, [ticketCount, activeTab]);

  // ------------------------------------------------------
  // لاجیک جدید: چرخش پس از تایید تراکنش
  // ------------------------------------------------------
  useEffect(() => {
    if (isConfirmed && hash && activeTab === 'instant') {
      // 1. تراکنش تایید شد، حالا بچرخ!
      setIsSpinning(true);
      const randomDeg = Math.floor(3600 + Math.random() * 360); // حداقل ۱۰ دور کامل
      setWheelRotation(randomDeg);

      // 2. نمایش نتیجه بعد از ۴ ثانیه (زمان انیمیشن)
      setTimeout(() => {
        setIsSpinning(false);
        setShowResultModal(true);
      }, 4500);
    }
  }, [isConfirmed, hash, activeTab]);

  // ------------------------------------------------------
  // هندلرها
  // ------------------------------------------------------
  const handleSwitchNetwork = () => {
    switchChain({ chainId: TARGET_CHAIN_ID });
  };

  const handleSpin = () => {
    if (!writeContract) return;
    setShowResultModal(false); // ریست کردن مودال قبلی
    
    // فقط درخواست تراکنش ارسال می‌شود (هنوز نمی‌چرخد)
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

  // بررسی وضعیت شبکه
  const isWrongNetwork = isConnected && chainId !== TARGET_CHAIN_ID;

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

        {/* دکمه اجباری تغییر شبکه */}
        {isWrongNetwork && (
          <div className="wrong-network-banner">
            <p>⚠️ Wrong Network</p>
            <button onClick={handleSwitchNetwork} className="switch-btn">
              Switch to Soneium
            </button>
          </div>
        )}

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
                  {/* فقط ایموجی و عدد کوتاه */}
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
              
              <div className="info-row">
                <span>Entry: $0.50</span>
              </div>
              
              <button 
                className="action-btn spin-btn"
                disabled={!isConnected || isPending || isConfirming || isWrongNetwork || isSpinning}
                onClick={handleSpin}
              >
                {isWrongNetwork ? 'Wrong Network' : 
                 isPending ? 'Check Wallet...' : 
                 isConfirming ? 'Waiting Block...' : 
                 isSpinning ? 'Spinning! 🎡' : 'SPIN NOW'}
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
                  {ethAmount || 0} ETH
                </div>
              </div>

              <button 
                className="action-btn buy-btn"
                disabled={!isConnected || isPending || isWrongNetwork}
                onClick={handleBuyTicket}
              >
                {isWrongNetwork ? 'Switch Network' : isPending ? 'Processing...' : `Buy Tickets`}
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
              <h3>📜 Your History</h3>
              <div className="history-list">
                {/* اینجا در آینده از گراف یا ایونت‌ها پر می‌شود */}
                <div className="history-item"><span className="h-type">Spin</span><span>-0.0001 ETH</span></div>
              </div>
            </div>
          )}
        </main>

        {/* POPUP RESULT MODAL */}
        {showResultModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>🎉 Spin Complete!</h2>
              <div className="result-emoji">🎁</div>
              <p>Transaction confirmed on blockchain.</p>
              <p className="small-text">Check the <b>History</b> tab or your wallet to see if you won!</p>
              <button onClick={() => setShowResultModal(false)} className="close-btn">
                Close & Spin Again
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;