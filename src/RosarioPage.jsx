import { useEffect, useRef, useState } from 'react'
import mqtt from 'mqtt'

const MQTT_URL = import.meta.env.VITE_MQTT_URL?.trim() || 'wss://broker.emqx.io:8084/mqtt'
const MQTT_BASE_TOPIC = import.meta.env.VITE_MQTT_BASE_TOPIC?.trim().replace(/\/+$/, '') || 'group1/mp'

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return Number(value).toFixed(digits)
}

function topic(suffix) {
  return `${MQTT_BASE_TOPIC}/${suffix}`
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.75); }
  }
  @keyframes ripple {
    0%   { transform: scale(1);   opacity: 0.6; }
    100% { transform: scale(2.4); opacity: 0;   }
  }
  @keyframes wave {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes float-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes scan {
    0%   { top: 0%; }
    100% { top: 100%; }
  }

  .aq-root {
    background: #040F1A;
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
    color: #C9E4FF;
    position: relative;
    overflow-x: hidden;
  }

  /* subtle grid texture */
  .aq-root::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(30,90,160,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30,90,160,0.06) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .aq-topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(4,15,26,0.85);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(37,100,180,0.25);
    padding: 0 28px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .aq-logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .aq-logo-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: linear-gradient(135deg, #1558A8, #0E3D72);
    border: 1px solid #2A6FC4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
  }
  .aq-logo-text {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.3px;
    color: #E0F0FF;
  }
  .aq-logo-sub {
    font-size: 10px;
    font-weight: 400;
    color: #4A8AC8;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .aq-status-pill {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11.5px;
    font-weight: 500;
    padding: 5px 12px;
    border-radius: 99px;
    border: 1px solid rgba(37,100,180,0.3);
    background: rgba(12,42,80,0.6);
    color: #7AB4E4;
    transition: border-color 0.3s, color 0.3s;
  }
  .aq-status-pill.online {
    border-color: rgba(80,200,150,0.35);
    color: #72DDB0;
  }

  .aq-dot {
    position: relative;
    width: 8px;
    height: 8px;
    flex-shrink: 0;
  }
  .aq-dot-core {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: #EF9F27;
    animation: pulse-dot 1.8s ease-in-out infinite;
  }
  .aq-dot.online .aq-dot-core { background: #50C896; }
  .aq-dot-ring {
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1px solid #EF9F27;
    animation: ripple 1.8s ease-out infinite;
  }
  .aq-dot.online .aq-dot-ring { border-color: #50C896; }

  .aq-content {
    position: relative;
    z-index: 1;
    max-width: 800px;
    margin: 0 auto;
    padding: 32px 24px 48px;
    animation: float-in 0.4s ease both;
  }

  /* ── Hero header ── */
  .aq-hero {
    margin-bottom: 28px;
  }
  .aq-eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #2E74C0;
    margin-bottom: 8px;
  }
  .aq-eyebrow::before {
    content: '';
    width: 20px;
    height: 1px;
    background: #2E74C0;
  }
  .aq-title {
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.5px;
    color: #E8F4FF;
    margin: 0 0 6px;
    line-height: 1.2;
  }
  .aq-subtitle {
    font-size: 13px;
    color: #4A7EAA;
    margin: 0;
    font-weight: 400;
  }

  /* ── Connection banner ── */
  .aq-conn-bar {
    background: rgba(6,22,42,0.7);
    border: 1px solid rgba(37,100,180,0.2);
    border-radius: 10px;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11.5px;
    margin-bottom: 24px;
    backdrop-filter: blur(8px);
  }
  .aq-conn-label {
    color: #3A6A9A;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }
  .aq-conn-value {
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #EF9F27;
    transition: color 0.3s;
  }
  .aq-conn-value.online { color: #50C896; }

  /* ── Error ── */
  .aq-error {
    background: rgba(40,8,8,0.7);
    border: 1px solid rgba(127,29,29,0.6);
    border-radius: 10px;
    padding: 10px 16px;
    margin-bottom: 18px;
    font-size: 12px;
    color: #FCA5A5;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Sensor grid ── */
  .aq-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 22px;
  }
  @media (max-width: 560px) {
    .aq-grid { grid-template-columns: 1fr; }
  }

  /* ── Sensor card ── */
  .aq-card {
    position: relative;
    background: rgba(6,22,42,0.75);
    border: 1px solid rgba(37,100,180,0.22);
    border-radius: 14px;
    padding: 18px;
    overflow: hidden;
    transition: border-color 0.3s, transform 0.2s;
  }
  .aq-card:hover {
    border-color: rgba(55,138,221,0.45);
    transform: translateY(-2px);
  }

  /* animated scan line on hover */
  .aq-card::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    height: 40px;
    background: linear-gradient(180deg, transparent, rgba(37,130,220,0.06), transparent);
    top: -40px;
    pointer-events: none;
    transition: opacity 0.2s;
    opacity: 0;
  }
  .aq-card:hover::after {
    opacity: 1;
    animation: scan 1.6s linear infinite;
  }

  /* corner accent */
  .aq-card::before {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 60px; height: 60px;
    background: radial-gradient(circle at top right, rgba(30,90,180,0.12), transparent 70%);
    border-radius: 0 14px 0 0;
    pointer-events: none;
  }

  .aq-card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .aq-card-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(20,60,120,0.9), rgba(10,35,70,0.9));
    border: 1px solid rgba(37,100,180,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
  }

  .aq-badge {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 99px;
    border: 1px solid rgba(37,100,180,0.3);
    background: rgba(10,30,60,0.7);
    color: #3A6A9A;
    transition: all 0.3s;
    white-space: nowrap;
  }
  .aq-badge.active {
    background: rgba(8,80,65,0.6);
    border-color: rgba(29,158,117,0.5);
    color: #72DDB0;
  }

  .aq-card-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: #2E6090;
    margin-bottom: 4px;
  }

  .aq-card-value {
    font-size: 36px;
    font-weight: 300;
    letter-spacing: -1.5px;
    color: #D0EAFF;
    line-height: 1;
    margin-bottom: 2px;
    font-family: 'JetBrains Mono', monospace;
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .aq-card-unit {
    font-size: 13px;
    font-weight: 400;
    color: #2E6090;
    letter-spacing: 0px;
    font-family: 'Inter', sans-serif;
  }

  .aq-card-detail {
    font-size: 10.5px;
    color: #1E5080;
    font-family: 'JetBrains Mono', monospace;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(30,80,140,0.2);
  }

  /* value bar accent */
  .aq-value-bar {
    height: 2px;
    border-radius: 2px;
    background: rgba(30,80,140,0.2);
    margin: 8px 0 0;
    overflow: hidden;
  }
  .aq-value-bar-fill {
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(90deg, #1558A8, #37B8AF);
    width: 60%; /* decorative; could be made dynamic */
    transition: width 0.6s ease;
  }

  /* ── Toolbar ── */
  .aq-toolbar {
    background: rgba(6,22,42,0.7);
    border: 1px solid rgba(37,100,180,0.2);
    border-radius: 10px;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    backdrop-filter: blur(8px);
  }

  .aq-last-update {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #2A5A88;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .aq-last-update::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #1558A8;
    display: inline-block;
  }

  .aq-btn-row {
    display: flex;
    gap: 8px;
  }

  .aq-btn {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 500;
    padding: 7px 14px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.2px;
  }
  .aq-btn:active { transform: scale(0.97); }

  .aq-btn-ghost {
    background: transparent;
    border: 1px solid rgba(37,100,180,0.35);
    color: #3A6A9A;
  }
  .aq-btn-ghost:hover {
    border-color: rgba(55,138,221,0.6);
    color: #7AB4E4;
    background: rgba(20,60,120,0.15);
  }

  .aq-btn-feed {
    background: rgba(8,80,65,0.45);
    border: 1px solid rgba(29,158,117,0.45);
    color: #72DDB0;
  }
  .aq-btn-feed:hover:not(:disabled) {
    background: rgba(8,80,65,0.65);
    border-color: rgba(29,158,117,0.75);
  }
  .aq-btn-feed:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

function StatusBadge({ active, label }) {
  return <span className={`aq-badge${active ? ' active' : ''}`}>{label}</span>
}

function SensorCard({ icon, title, value, unit, detail, stateLabel, active }) {
  return (
    <div className="aq-card">
      <div className="aq-card-head">
        <div className="aq-card-icon">{icon}</div>
        <StatusBadge active={active} label={stateLabel} />
      </div>
      <div className="aq-card-label">{title}</div>
      <div className="aq-card-value">
        {value}
        {unit && <span className="aq-card-unit">{unit}</span>}
      </div>
      <div className="aq-value-bar"><div className="aq-value-bar-fill" /></div>
      <div className="aq-card-detail">{detail}</div>
    </div>
  )
}

function RosarioPage() {
  const clientRef = useRef(null)
  const [brokerStatus, setBrokerStatus] = useState('connecting')
  const [esp32Status, setEsp32Status]   = useState('unknown')
  const [status, setStatus]             = useState(null)
  const [telemetry, setTelemetry]       = useState(null)
  const [error, setError]               = useState('')
  const [feedState, setFeedState]       = useState('idle')
  const [lastUpdated, setLastUpdated]   = useState(null)

  useEffect(() => {
    const client = mqtt.connect(MQTT_URL, {
      clean: true,
      connectTimeout: 5000,
      clientId: `group1-mp-web-${Math.random().toString(16).slice(2, 10)}`,
      reconnectPeriod: 3000,
    })
    clientRef.current = client

    const subs = [topic('status'), topic('telemetry'), topic('status/availability')]

    client.on('connect', () => { setBrokerStatus('connected'); setError(''); client.subscribe(subs) })
    client.on('reconnect', () => setBrokerStatus('connecting'))
    client.on('close',     () => setBrokerStatus('disconnected'))
    client.on('error',     (e) => { setBrokerStatus('error'); setError(e?.message || 'MQTT error') })

    client.on('message', (incomingTopic, payload) => {
      const msg = payload.toString()
      if (incomingTopic === topic('status')) {
        try {
          const data = JSON.parse(msg)
          setStatus(data)
          setEsp32Status(data.wifiConnected ? 'online' : 'offline')
          setLastUpdated(new Date())
          setError('')
        } catch { setError('Malformed status payload.') }
        return
      }
      if (incomingTopic === topic('telemetry')) {
        try { setTelemetry(JSON.parse(msg)); setLastUpdated(new Date()) }
        catch { setError('Malformed telemetry payload.') }
        return
      }
      if (incomingTopic === topic('status/availability')) {
        setEsp32Status(msg === 'online' ? 'online' : 'offline')
        setLastUpdated(new Date())
      }
    })

    return () => { client.end(true); clientRef.current = null }
  }, [])

  const handleFeedNow = () => {
    const client = clientRef.current
    if (!client || brokerStatus !== 'connected') { setError('MQTT broker is not connected yet.'); return }
    setFeedState('sending')
    client.publish(topic('feed'), '1', { qos: 1, retain: false }, (err) => {
      if (err) { setFeedState('error'); setError(err.message || 'Publish failed.') }
      else      { setFeedState('queued'); setError('') }
      setTimeout(() => setFeedState('idle'), 1500)
    })
  }

  const src = status || telemetry || {}
  const isOnline = brokerStatus === 'connected' && esp32Status === 'online'

  const connectionLabel = brokerStatus === 'connected'
    ? esp32Status === 'online'
      ? `ESP32 online via MQTT${status?.ip ? ` · ${status.ip}` : ''}`
      : 'Broker connected — awaiting ESP32…'
    : brokerStatus === 'connecting'
      ? 'Connecting to MQTT broker…'
      : 'MQTT disconnected'

  const feedLabel =
    feedState === 'sending' ? 'Queuing…' :
    feedState === 'queued'  ? 'Queued ✓' : 'Feed now'

  return (
    <>
      <style>{css}</style>
      <div className="aq-root">

        {/* ── Top bar ── */}
        <div className="aq-topbar">
          <div className="aq-logo">
            <div className="aq-logo-icon">🐟</div>
            <div>
              <div className="aq-logo-text">AquaControl</div>
              <div className="aq-logo-sub">Rosario</div>
            </div>
          </div>

          <div className={`aq-status-pill${isOnline ? ' online' : ''}`}>
            <div className={`aq-dot${isOnline ? ' online' : ''}`}>
              <div className="aq-dot-core" />
              <div className="aq-dot-ring" />
            </div>
            {isOnline ? 'ESP32 online' : 'Waiting for ESP32'}
          </div>
        </div>

        {/* ── Main ── */}
        <div className="aq-content">

          {/* Hero */}
          <div className="aq-hero">
            <div className="aq-eyebrow">Live Monitoring</div>
            <h1 className="aq-title">Water Quality Monitor</h1>
            <p className="aq-subtitle">Ammonia · pH · Water level — real-time MQTT readings</p>
          </div>

          {/* Connection bar */}
          <div className="aq-conn-bar">
            <span className="aq-conn-label">
              <span>MQTT</span>
              <span style={{ color: 'rgba(30,80,140,0.5)' }}>›</span>
              <span>ESP32</span>
            </span>
            <span className={`aq-conn-value${isOnline ? ' online' : ''}`}>
              {connectionLabel}
            </span>
          </div>

          {/* Error */}
          {error && <div className="aq-error">⚠ {error}</div>}

          {/* Sensor cards */}
          <div className="aq-grid">
            <SensorCard
              icon="⚗"
              title="Ammonia"
              value={formatNumber(src?.ammonia?.ppm ?? telemetry?.ammonia, 2)}
              unit="ppm"
              detail={`Threshold · ${formatNumber(src?.ammonia?.threshold, 2)} ppm`}
              stateLabel={src?.ammonia?.pumpActive ? 'Air pump ON' : 'Air pump OFF'}
              active={!!src?.ammonia?.pumpActive}
            />
            <SensorCard
              icon="〜"
              title="pH Level"
              value={formatNumber(src?.ph?.value ?? telemetry?.ph, 2)}
              unit=""
              detail={`Threshold · ${formatNumber(src?.ph?.threshold, 2)}`}
              stateLabel={src?.ph?.pumpActive ? 'Acid pump ON' : 'Pump OFF'}
              active={!!src?.ph?.pumpActive}
            />
            <SensorCard
              icon="≋"
              title="Water Level"
              value={formatNumber(src?.waterLevel?.percentage ?? telemetry?.water, 1)}
              unit="%"
              detail={`${formatNumber(src?.waterLevel?.heightMm, 1)} mm in tank`}
              stateLabel={src?.waterLevel?.valveOpen ? 'Valve OPEN' : 'Valve CLOSED'}
              active={!!src?.waterLevel?.valveOpen}
            />
          </div>

          {/* Toolbar */}
          <div className="aq-toolbar">
            <span className="aq-last-update">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for first reading…'}
            </span>
            <div className="aq-btn-row">
              <button
                className="aq-btn aq-btn-ghost"
                onClick={() => clientRef.current?.reconnect()}
              >
                Reconnect
              </button>
              <button
                className="aq-btn aq-btn-feed"
                onClick={handleFeedNow}
                disabled={brokerStatus !== 'connected' || feedState === 'sending'}
              >
                {feedLabel}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

export default RosarioPage