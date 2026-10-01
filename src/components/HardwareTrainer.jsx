import React, { useEffect, useRef } from 'react';
import { Cpu, CircleDot, SlidersHorizontal, Activity } from 'lucide-react';

const LAMPS = [
  { addr: 'O:0/0', name: 'Amber', color: '#f59e0b' },
  { addr: 'O:0/1', name: 'Blue', color: '#06b6d4' },
  { addr: 'O:0/2', name: 'Green', color: '#10b981' },
  { addr: 'O:0/3', name: 'Red', color: '#ef4444' },
];

export function HardwareTrainer({ plcData, onToggleInput, isRunning, symbols }) {
  const isBitOn = addr => !!plcData?.bits?.[addr];

  // Multitouch tracking: maps pointerId -> address, and address -> Set of active pointerIds
  const pointerToAddr = useRef(new Map());
  const addrToPointers = useRef(new Map());

  const toggleRef = useRef(onToggleInput);
  toggleRef.current = onToggleInput;

  const press = (pointerId, addr) => {
    pointerToAddr.current.set(pointerId, addr);
    if (!addrToPointers.current.has(addr)) {
      addrToPointers.current.set(addr, new Set());
    }
    const set = addrToPointers.current.get(addr);
    set.add(pointerId);
    if (set.size === 1) {
      toggleRef.current(addr, true);
    }
  };

  const release = (pointerId, specificAddr) => {
    const addr = specificAddr || pointerToAddr.current.get(pointerId);
    if (pointerId !== undefined) {
      pointerToAddr.current.delete(pointerId);
    }
    if (!addr) return;

    const set = addrToPointers.current.get(addr);
    if (set) {
      if (pointerId !== undefined) {
        set.delete(pointerId);
      } else {
        set.clear();
      }
      if (set.size === 0) {
        addrToPointers.current.delete(addr);
        toggleRef.current(addr, false);
      }
    }
  };

  const releaseAll = () => {
    pointerToAddr.current.clear();
    for (const [addr, set] of addrToPointers.current.entries()) {
      if (set.size > 0) {
        toggleRef.current(addr, false);
      }
    }
    addrToPointers.current.clear();
  };

  useEffect(() => {
    const onWindowPointerUp = (e) => {
      // ONLY release the specific pointer that was lifted, preserving other active touches!
      if (pointerToAddr.current.has(e.pointerId)) {
        release(e.pointerId);
      }
    };
    const onWindowBlur = () => releaseAll();
    const onVisibility = () => { if (document.hidden) releaseAll(); };

    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      releaseAll();
    };
  }, []);

  return (
    <div id="tour-trainer" className="hardware-trainer">
      <div className="controller-heading">
        <span className="controller-icon"><Cpu size={21} strokeWidth={1.4} /></span>
        <div><h3>MicroLogix 1000</h3><p>Digital I/O controller</p></div>
        <span className={`controller-state ${isRunning ? 'on' : ''}`}><i />{isRunning ? 'Running' : 'Idle'}</span>
      </div>
      <section className="hardware-section">
        <div className="hardware-section-heading"><h4><CircleDot size={15} />Pilot lamps</h4><span>OUTPUTS</span></div>
        <div className="io-grid">
          {LAMPS.map(lamp => {
            const active = isBitOn(lamp.addr);
            return <div key={lamp.addr} className={`io-cell ${active ? 'active-cell' : ''}`} role="img" aria-label={`${lamp.name} lamp ${lamp.addr}: ${active ? 'on' : 'off'}`} style={{'--signal':lamp.color}}>
              <span className="io-address">{lamp.addr}</span>
              <div className={`pilot-lamp ${active ? 'lit' : ''}`}><span /></div>
              <span className="io-name" title={symbols?.[lamp.addr]}>{lamp.name}</span>
              <span className={`io-value ${active ? 'on' : ''}`}><i />{active ? 'On' : 'Off'}<b>{active ? '1' : '0'}</b></span>
            </div>;
          })}
        </div>
      </section>
      <section className="hardware-section">
        <div className="hardware-section-heading"><h4><SlidersHorizontal size={15} />Switches & buttons</h4><span>INPUTS</span></div>
        <div className="io-grid">
          {[0,1].map(index => {
            const addr = `I:0/${index}`;
            const active = isBitOn(addr);
            return <div className={`io-cell ${active ? 'active-cell' : ''}`} key={addr} style={{ '--signal': active ? '#10b981' : '#64748b' }}>
              <span className="io-address">{addr}</span>
              <button
                className="switch-control"
                aria-label={`Switch ${index + 1}`}
                aria-pressed={active}
                onClick={() => onToggleInput(addr, !active)}
                onPointerDown={(e) => {
                  if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                    e.preventDefault();
                    onToggleInput(addr, !active);
                  }
                }}
                title={`Toggle Switch ${index + 1} (${addr})`}
              >
                <span className="switch-track"><span /></span>
              </button>
              <span className="io-name">Switch {index + 1}</span>
              <span className={`io-value ${active ? 'on' : ''}`}><i />{active ? 'On' : 'Off'}<b>{active ? '1' : '0'}</b></span>
            </div>;
          })}
          {[{addr:'I:0/2', label:'Start', name:'Green start pushbutton', color:'#10b981'}, {addr:'I:0/3', label:'Stop', name:'Red stop pushbutton', color:'#ef4444'}].map(pb => <div className={`io-cell ${isBitOn(pb.addr) ? 'active-cell' : ''}`} key={pb.addr} style={{'--signal':pb.color}}>
            <span className="io-address">{pb.addr}</span>
            <button
              className={`momentary-control ${isBitOn(pb.addr) ? 'pressed' : ''}`}
              aria-label={pb.name}
              aria-pressed={isBitOn(pb.addr)}
              title={`${pb.label} (${pb.addr}) — press and hold`}
              onPointerDown={e => {
                if (e.button !== undefined && e.button !== 0) return;
                e.preventDefault();
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                press(e.pointerId, pb.addr);
              }}
              onPointerUp={e => release(e.pointerId, pb.addr)}
              onPointerCancel={e => release(e.pointerId, pb.addr)}
              onLostPointerCapture={e => release(e.pointerId, pb.addr)}
              onKeyDown={e => {
                if ([' ', 'Enter'].includes(e.key)) {
                  e.preventDefault();
                  if (!e.repeat) press(`key_${e.key}_${pb.addr}`, pb.addr);
                }
              }}
              onKeyUp={e => {
                if ([' ', 'Enter'].includes(e.key)) {
                  e.preventDefault();
                  release(`key_${e.key}_${pb.addr}`, pb.addr);
                }
              }}
              onBlur={() => release(undefined, pb.addr)}
            >
              <span>{pb.label}</span>
            </button>
            <span className="io-name">{pb.label}</span>
            <span className={`io-value ${isBitOn(pb.addr) ? 'on' : ''}`}>{isBitOn(pb.addr) ? 'Pressed' : 'Hold'}<b>{isBitOn(pb.addr) ? '1' : '0'}</b></span>
          </div>)}
        </div>
      </section>
      <div className="hardware-data"><span><Activity size={14} />Live image</span><code>I:0 <b>{[0,1,2,3].map(i => isBitOn(`I:0/${i}`) ? 1 : 0).join('')}</b></code><code>O:0 <b>{[0,1,2,3].map(i => isBitOn(`O:0/${i}`) ? 1 : 0).join('')}</b></code></div>
    </div>
  );
}
export default HardwareTrainer;
