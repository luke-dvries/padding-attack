/**
 * Header.tsx
 * App title bar with a brief description.
 */

export default function Header() {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-title">
          <span className="header-icon">🔐</span>
          <div>
            <h1>CBC Padding Oracle</h1>
            <p className="header-subtitle">
              Interactive visualizer — watch a padding oracle attack recover plaintext byte-by-byte without knowing the key
            </p>
          </div>
        </div>
        <div className="header-badge">
          <span className="badge badge-edu">Educational Simulator</span>
          <span className="badge badge-safe">No Network Requests</span>
        </div>
      </div>
    </header>
  );
}
