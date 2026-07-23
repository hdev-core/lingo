import './Keyboard.css'

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
]

function Keyboard({ onKeyPress, letterStatuses = {} }) {
  return (
    <div className="keyboard" role="group" aria-label="On-screen keyboard">
      {ROWS.map((row, rowIndex) => (
        <div className="keyboard-row" key={rowIndex}>
          {row.map((key) => {
            const isSpecial = key === 'ENTER' || key === 'BACKSPACE'
            const status = letterStatuses[key]

            return (
              <button
                key={key}
                type="button"
                className={`keyboard-key ${isSpecial ? 'keyboard-key--wide' : ''} ${
                  status ? `keyboard-key--${status}` : ''
                }`}
                onClick={() => onKeyPress(key)}
              >
                {key === 'BACKSPACE' ? '⌫' : key}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default Keyboard