import { useState, useEffect } from 'react'
import mqtt from 'mqtt/dist/mqtt.esm'

const BROKER_URL = import.meta.env.VITE_MQTT_URL
const BASE       = import.meta.env.VITE_MQTT_BASE_TOPIC
const TOPICS = {
  water:   `${BASE}/water`,
  ammonia: `${BASE}/ammonia`,
  feeder:  `${BASE}/feeder`,
  feed:    `${BASE}/feed/command`,
}

/* ─── styles ──────────────────────────────────────────────────────────── */
const css = `
  .rp {
    font-family: system-ui, -apple-system, sans-serif;
    background: #f0f6ff;
    min-height: 100vh;
    padding: 1.5rem;
  }

  /* ── hero ── */
  .rp-hero {
    background: #042C53;
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 1.25rem;
    position: relative;
  }
  .rp-hero__bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .rp-hero__circle {
    position: absolute;
    border-radius: 50%;
  }
  .rp-hero__circle--1 {
    width: 340px; height: 340px;
    background: #0C447C;
    top: -90px; right: -70px;
    opacity: 0.6;
  }
  .rp-hero__circle--2 {
    width: 190px; height: 190px;
    background: #185FA5;
    bottom: -70px; right: 90px;
    opacity: 0.5;
  }
  .rp-hero__circle--3 {
    width: 110px; height: 110px;
    background: #378ADD;
    top: 30px; right: 170px;
    opacity: 0.3;
  }
  .rp-hero__inner {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 2rem 2rem 1.75rem;
  }
  .rp-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #85B7EB;
    font-weight: 500;
    margin-bottom: 8px;
  }
  .rp-eyebrow__dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #378ADD;
    flex-shrink: 0;
  }
  .rp-hero__title {
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.06em;
    margin: 0 0 6px;
    line-height: 1.1;
  }
  .rp-hero__sub {
    font-size: 13px;
    color: #B5D4F4;
    line-height: 1.6;
    max-width: 320px;
    margin: 0 0 16px;
  }
  .rp-hero__stats {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  .rp-stat__val {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    display: block;
  }
  .rp-stat__lbl {
    font-size: 11px;
    color: #85B7EB;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── connection card ── */
  .rp-conn {
    background: rgba(255,255,255,0.07);
    border: 0.5px solid rgba(133,183,235,0.3);
    border-radius: 12px;
    padding: 14px 18px;
    min-width: 210px;
    align-self: flex-start;
    flex-shrink: 0;
  }
  .rp-conn__header {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 8px;
  }
  .rp-conn__dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .rp-conn__dot--good    { background: #97C459; animation: rp-pulse 2s infinite; }
  .rp-conn__dot--warning { background: #EF9F27; }
  .rp-conn__dot--neutral { background: #F09595; }
  @keyframes rp-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  .rp-conn__label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #85B7EB;
    font-weight: 500;
  }
  .rp-conn__value {
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    margin-bottom: 4px;
  }
  .rp-conn__meta {
    font-size: 11px;
    color: #6b9dc8;
  }

  /* ── toolbar ── */
  .rp-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 14px 1.25rem;
    background: #fff;
    border: 0.5px solid #cfe0f5;
    border-radius: 12px;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }
  .rp-toolbar__left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .rp-toolbar__icon {
    width: 36px; height: 36px;
    border-radius: 8px;
    background: #E6F1FB;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #185FA5;
    font-size: 18px;
    flex-shrink: 0;
  }
  .rp-toolbar__name {
    font-size: 14px;
    font-weight: 600;
    color: #042C53;
    display: block;
    margin-bottom: 2px;
  }
  .rp-toolbar__sub {
    font-size: 12px;
    color: #378ADD;
  }
  .rp-feed-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 20px;
    border-radius: 8px;
    background: #185FA5;
    border: none;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: 0.01em;
    transition: background 0.15s, transform 0.1s;
  }
  .rp-feed-btn:hover:not(:disabled) { background: #378ADD; }
  .rp-feed-btn:active:not(:disabled) { transform: scale(0.98); }
  .rp-feed-btn:disabled { background: #dde9f7; color: #8fa8c4; cursor: not-allowed; }

  /* ── sensor cards ── */
  .rp-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 1.25rem;
  }
  .rp-card {
    background: #fff;
    border: 0.5px solid #cfe0f5;
    border-radius: 14px;
    padding: 1.25rem;
    position: relative;
    overflow: hidden;
  }
  .rp-card__accent {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: #378ADD;
    border-radius: 14px 14px 0 0;
  }
  .rp-card__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .rp-card__icon {
    width: 40px; height: 40px;
    border-radius: 10px;
    background: #E6F1FB;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #185FA5;
    font-size: 20px;
  }
  .rp-card__badge {
    font-size: 11px;
    padding: 3px 9px;
    border-radius: 999px;
    background: #E6F1FB;
    color: #185FA5;
    font-weight: 500;
    white-space: nowrap;
  }
  .rp-card__badge--active {
    background: #185FA5;
    color: #E6F1FB;
  }
  .rp-card__title {
    font-size: 12px;
    font-weight: 500;
    color: #6b90b0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
  }
  .rp-card__value {
    font-size: 34px;
    font-weight: 700;
    color: #042C53;
    line-height: 1;
    margin-bottom: 4px;
  }
  .rp-card__unit {
    font-size: 14px;
    font-weight: 400;
    color: #378ADD;
    margin-left: 3px;
  }
  .rp-card__detail {
    font-size: 12px;
    color: #6b90b0;
    margin-bottom: 0;
  }
  .rp-card__divider {
    border: none;
    border-top: 0.5px solid #E6F1FB;
    margin: 12px 0;
  }
  .rp-card__footer {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #378ADD;
  }

  /* ── bottom grid ── */
  .rp-bottom {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 1.25rem;
  }
  @media (max-width: 480px) { .rp-bottom { grid-template-columns: 1fr; } }

  .rp-summary {
    background: #042C53;
    border-radius: 14px;
    padding: 1.25rem;
  }
  .rp-summary__label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #85B7EB;
    font-weight: 500;
    margin-bottom: 6px;
  }
  .rp-summary__text {
    font-size: 13px;
    color: #B5D4F4;
    line-height: 1.6;
    margin: 0;
  }

  .rp-feed-card {
    background: #fff;
    border: 0.5px solid #cfe0f5;
    border-radius: 14px;
    padding: 1.25rem;
  }
  .rp-feed-card__label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #6b90b0;
    font-weight: 500;
    margin-bottom: 10px;
  }
  .rp-feed-card__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .rp-feed-card__val {
    font-size: 22px;
    font-weight: 700;
    color: #042C53;
  }
  .rp-feed-card__icon {
    width: 36px; height: 36px;
    border-radius: 8px;
    background: #E6F1FB;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #185FA5;
    font-size: 18px;
  }

  /* ── footer bar ── */
  .rp-footer {
    background: #fff;
    border: 0.5px solid #cfe0f5;
    border-radius: 12px;
    padding: 12px 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .rp-footer__brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rp-footer__dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #378ADD;
  }
  .rp-footer__name {
    font-size: 13px;
    font-weight: 600;
    color: #042C53;
    letter-spacing: 0.04em;
  }
  .rp-footer__meta {
    font-size: 12px;
    color: #6b90b0;
  }
  .rp-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .rp-tag {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 999px;
    background: #E6F1FB;
    color: #185FA5;
    font-weight: 500;
    border: 0.5px solid #B5D4F4;
  }
`

export default function RosarioPage() {
  const [brokerStatus, setBrokerStatus] = useState('disconnected')
  const [esp32Status,  setEsp32Status]  = useState('offline')
  const [telemetry,    setTelemetry]    = useState({})
  const [sourceStatus, setSourceStatus] = useState(null)
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [feedState,    setFeedState]    = useState('idle')
  const [client,       setClient]       = useState(null)

  useEffect(() => {
    setBrokerStatus('connecting')
    const mqttClient = mqtt.connect(BROKER_URL)

    mqttClient.on('connect', () => {
      setBrokerStatus('connected')
      mqttClient.subscribe([TOPICS.water, TOPICS.ammonia, TOPICS.feeder])
    })

    mqttClient.on('message', (topic, message) => {
      const raw = message.toString()
      setLastUpdated(new Date())
      setEsp32Status('online')
      try {
        const payload = JSON.parse(raw)
        if (topic === TOPICS.water) {
          setSourceStatus(p => ({ ...p, waterLevel: { percentage: payload.percentage, heightMm: payload.heightMm, valveOpen: payload.valveOpen } }))
          setTelemetry(p => ({ ...p, water: payload.percentage }))
        }
        if (topic === TOPICS.ammonia) {
          setSourceStatus(p => ({ ...p, ammonia: { ppm: payload.ppm, threshold: payload.threshold, pumpActive: payload.pumpActive } }))
          setTelemetry(p => ({ ...p, ammonia: payload.ppm }))
        }
        if (topic === TOPICS.feeder) {
          setSourceStatus(p => ({ ...p, feeder: { ldrValue: payload.ldrValue, isDark: payload.isDark, lastMessage: payload.lastMessage } }))
          setTelemetry(p => ({ ...p, ldr: payload.ldrValue }))
        }
      } catch (e) {
        console.warn('Non-JSON MQTT message:', raw)
      }
    })

    mqttClient.on('error',  (err) => { console.error(err); setBrokerStatus('disconnected') })
    mqttClient.on('close',  ()    => { setBrokerStatus('disconnected'); setEsp32Status('offline') })

    setClient(mqttClient)
    return () => mqttClient.end()
  }, [])

  function handleFeedNow() {
    if (!client || brokerStatus !== 'connected') return
    setFeedState('sending')
    client.publish(TOPICS.feed, JSON.stringify({ command: 'feed', ts: Date.now() }))
    setTimeout(() => setFeedState('queued'), 500)
    setTimeout(() => setFeedState('idle'),   3000)
  }

  function fmt(value, digits = 1) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    return Number(value).toFixed(digits)
  }

  const connVariant =
    brokerStatus === 'connected'
      ? esp32Status === 'online' ? 'good' : 'warning'
      : brokerStatus === 'connecting' ? 'warning' : 'neutral'

  const connLabel =
    brokerStatus === 'connected'
      ? esp32Status === 'online'
        ? 'ESP32 online via MQTT'
        : 'Broker connected, waiting for ESP32'
      : brokerStatus === 'connecting'
        ? 'Connecting to MQTT broker…'
        : 'MQTT disconnected'

  const cards = [
    {
      key: 'water',
      icon: 'ti-droplet',
      title: 'Water level',
      value: fmt(sourceStatus?.waterLevel?.percentage ?? telemetry?.water, 1),
      unit: '%',
      detail: `${fmt(sourceStatus?.waterLevel?.heightMm, 1)} mm depth in tank`,
      badge: sourceStatus?.waterLevel?.valveOpen ? 'Valve OPEN' : 'Valve CLOSED',
      active: !!sourceStatus?.waterLevel?.valveOpen,
    },
    {
      key: 'ammonia',
      icon: 'ti-flask',
      title: 'Ammonia',
      value: fmt(sourceStatus?.ammonia?.ppm ?? telemetry?.ammonia, 2),
      unit: 'ppm',
      detail: `Threshold ${fmt(sourceStatus?.ammonia?.threshold, 2)} ppm`,
      badge: sourceStatus?.ammonia?.pumpActive ? 'Air pump ON' : 'Air pump OFF',
      active: !!sourceStatus?.ammonia?.pumpActive,
    },
    {
      key: 'feeder',
      icon: 'ti-device-gamepad',
      title: 'Feeder',
      value: sourceStatus?.feeder?.ldrValue ?? telemetry?.ldr ?? '—',
      unit: 'ADC',
      detail: sourceStatus?.feeder?.isDark ? 'Dark detected' : 'Light detected',
      badge: sourceStatus?.feeder?.lastMessage || 'Idle',
      active: false,
    },
  ]

  const feedLabel =
    feedState === 'queued'  ? 'Queued' :
    feedState === 'sending' ? 'Sending…' :
    feedState === 'error'   ? 'Failed' : 'Idle'

  const summaryText =
    brokerStatus === 'connected'
      ? esp32Status === 'online'
        ? 'ESP32 is publishing live MQTT updates to Rosario station.'
        : 'Broker connected — waiting for ESP32 to publish data.'
      : 'Waiting for MQTT broker connection.'

  return (
    <>
      <style>{css}</style>
      <div className="rp">

        {/* Hero */}
        <section className="rp-hero">
          <div className="rp-hero__bg">
            <div className="rp-hero__circle rp-hero__circle--1" />
            <div className="rp-hero__circle rp-hero__circle--2" />
            <div className="rp-hero__circle rp-hero__circle--3" />
          </div>
          <div className="rp-hero__inner">
            <div>
              <div className="rp-eyebrow"><span className="rp-eyebrow__dot" />Station monitoring</div>
              <h1 className="rp-hero__title">ROSARIO</h1>
              <p className="rp-hero__sub">
                Live sensor feed for water level, ammonia, and feeder status at the Rosario aquaculture station.
              </p>
              <div className="rp-hero__stats">
                <div><span className="rp-stat__val">3</span><span className="rp-stat__lbl">Sensors</span></div>
                <div><span className="rp-stat__val">{lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</span><span className="rp-stat__lbl">Last ping</span></div>
                <div><span className="rp-stat__val">MQTT</span><span className="rp-stat__lbl">Protocol</span></div>
              </div>
            </div>
            <div className="rp-conn">
              <div className="rp-conn__header">
                <span className={`rp-conn__dot rp-conn__dot--${connVariant}`} />
                <span className="rp-conn__label">Connection</span>
              </div>
              <div className="rp-conn__value">{connLabel}</div>
              <div className="rp-conn__meta">
                {lastUpdated ? `Last update ${lastUpdated.toLocaleTimeString()}` : 'Waiting for first reading'}
              </div>
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <div className="rp-toolbar">
          <div className="rp-toolbar__left">
            <div className="rp-toolbar__icon"><i className="ti ti-antenna" aria-hidden="true" /></div>
            <div>
              <span className="rp-toolbar__name">Rosario Station</span>
              <span className="rp-toolbar__sub">Water level · Ammonia · Feeder monitoring</span>
            </div>
          </div>
          <button
            className="rp-feed-btn"
            type="button"
            onClick={handleFeedNow}
            disabled={brokerStatus !== 'connected' || feedState === 'sending'}
          >
            <i className="ti ti-fish" aria-hidden="true" />
            {feedState === 'sending' ? 'Queuing…' : 'Feed now'}
          </button>
        </div>

        {/* Sensor Cards */}
        <div className="rp-cards">
          {cards.map(card => (
            <article className="rp-card" key={card.key}>
              <div className="rp-card__accent" />
              <div className="rp-card__top">
                <div className="rp-card__icon"><i className={`ti ${card.icon}`} aria-hidden="true" /></div>
                <span className={`rp-card__badge${card.active ? ' rp-card__badge--active' : ''}`}>{card.badge}</span>
              </div>
              <div className="rp-card__title">{card.title}</div>
              <div className="rp-card__value">
                {card.value}
                {card.unit && <span className="rp-card__unit">{card.unit}</span>}
              </div>
              <p className="rp-card__detail">{card.detail}</p>
              <hr className="rp-card__divider" />
              <div className="rp-card__footer">
                <i className="ti ti-clock" style={{ fontSize: 13 }} aria-hidden="true" />
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Awaiting data'}
              </div>
            </article>
          ))}
        </div>

        {/* Bottom grid */}
        <div className="rp-bottom">
          <div className="rp-summary">
            <div className="rp-summary__label">Live summary</div>
            <p className="rp-summary__text">{summaryText}</p>
          </div>
          <div className="rp-feed-card">
            <div className="rp-feed-card__label">Feed action</div>
            <div className="rp-feed-card__row">
              <div className="rp-feed-card__val">{feedLabel}</div>
              <div className="rp-feed-card__icon">
                <i className="ti ti-player-play" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="rp-footer">
          <div className="rp-footer__brand">
            <span className="rp-footer__dot" />
            <span className="rp-footer__name">ROSARIO</span>
            <span className="rp-footer__meta">Aquaculture Monitoring System</span>
          </div>
          <div className="rp-tags">
            {['MQTT', 'ESP32', 'Water', 'Ammonia', 'Feeder'].map(t => (
              <span className="rp-tag" key={t}>{t}</span>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}