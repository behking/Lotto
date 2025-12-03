import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'; // useReadContract حذف شد
import { parseAbi } from 'viem';

// آدرس قرارداد شما
const CONTRACT_ADDRESS = '0x5799fe0F34BAeab3D1c756023E46D3019FDFE6D8' as `0x${string}`;

// تعریف توابع قرارداد شما
const lotteryAbi = parseAbi([
  'function spinWheel() external payable',
  'function buyTicket(uint8 _type, uint256 _quantity) external payable',
  'function claimPrize() external',
  'function getRoundDetails(uint8 _type) external view returns (uint256 endTime, uint256 pool, uint256 participantsCount, uint256 ticketPriceWei)',
  'function pendingWinnings(address user) external view returns (uint256)',
  'event SpinResult(address indexed player, bool isWin, uint256 prizeAmount, string prizeType)',
  'event TicketPurchased(address indexed buyer, uint8 indexed lotteryType, uint256 quantity, uint256 costETH, uint256 timestamp)'
]);

export function useLotteryContract() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  return {
    lotteryAbi,
    CONTRACT_ADDRESS,
    writeContract,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error
  };
}