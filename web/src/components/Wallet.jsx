import './Wallet.css'

// Placeholder data — real data comes from the payout engine once built
const MOCK_WALLET = {
  puzzlesSolvedThisWeek: 3,
  qualificationThreshold: 5,
  hbdEarnedThisWeek: 0,
  lingoBalance: 84,
}

function Wallet() {
  const { puzzlesSolvedThisWeek, qualificationThreshold, hbdEarnedThisWeek, lingoBalance } =
    MOCK_WALLET
  const remaining = qualificationThreshold - puzzlesSolvedThisWeek

  return (
    <div className="wallet-screen">
      <h1>Wallet & Rewards</h1>

      <div className="wallet-qualification">
        {remaining > 0
          ? `${puzzlesSolvedThisWeek}/${qualificationThreshold} solved — ${remaining} more to qualify`
          : `Qualified for this week's HBD pool! 🎉`}
      </div>

      <div className="wallet-balances">
        <div className="wallet-balance">
          <span className="wallet-balance-value">{hbdEarnedThisWeek} HBD</span>
          <span className="wallet-balance-label">This week</span>
        </div>
        <div className="wallet-balance">
          <span className="wallet-balance-value">{lingoBalance} LINGO</span>
          <span className="wallet-balance-label">Balance</span>
        </div>
      </div>
    </div>
  )
}

export default Wallet