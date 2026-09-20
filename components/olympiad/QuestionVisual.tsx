'use client';

// components/olympiad/QuestionVisual.tsx
// Self-contained SVG visual layer for SMC Grade 1 questions.
// No external images — every diagram is drawn in code so it works fully offline.
// Lookup the right visual by question ID. Returns null when no visual is needed.

import React from 'react';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Convert clock time to SVG hand coordinates (cx,cy=100, r=hand length). */
function clockHand(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

// ─── INDIVIDUAL VISUAL COMPONENTS ─────────────────────────────────────────────

/** Analog clock face. hours24: 0-23, minutes: 0-59 */
function ClockFace({ hours, minutes, size = 200 }: { hours: number; minutes: number; size?: number }) {
  const cx = 100; const cy = 100; const R = 88;
  const hAngle = (hours % 12) * 30 + minutes * 0.5;
  const mAngle = minutes * 6;
  const hTip = clockHand(cx, cy, 52, hAngle);
  const mTip = clockHand(cx, cy, 72, mAngle);
  const nums = [12,1,2,3,4,5,6,7,8,9,10,11];
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-label={`Clock showing ${hours}:${String(minutes).padStart(2,'0')}`}>
      <circle cx={cx} cy={cy} r={R} fill="#fefce8" stroke="#1e293b" strokeWidth="4"/>
      <circle cx={cx} cy={cy} r={R-6} fill="none" stroke="#cbd5e1" strokeWidth="1"/>
      {nums.map((n,i) => {
        const a = i*30; const p = clockHand(cx,cy,74,a);
        return <text key={n} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
          fontSize="14" fontWeight="bold" fill="#1e293b">{n}</text>;
      })}
      {/* tick marks */}
      {Array.from({length:60},(_,i)=>{
        const a=i*6; const outer=clockHand(cx,cy,82,a); const inner=clockHand(cx,cy,i%5===0?74:78,a);
        return <line key={i} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
          stroke="#64748b" strokeWidth={i%5===0?2:1}/>;
      })}
      {/* hour hand */}
      <line x1={cx} y1={cy} x2={hTip.x} y2={hTip.y} stroke="#1e293b" strokeWidth="6" strokeLinecap="round"/>
      {/* minute hand */}
      <line x1={cx} y1={cy} x2={mTip.x} y2={mTip.y} stroke="#1e293b" strokeWidth="4" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={5} fill="#ef4444"/>
    </svg>
  );
}

/** Number bond: total → part1 | part2 */
function NumberBond({ total, part1, part2 }: { total: number; part1: number; part2: string }) {
  return (
    <svg viewBox="0 0 280 120" width="280" height="120" aria-label={`Number bond: ${total} splits into ${part1} and ${part2}`}>
      {/* total box */}
      <rect x="10" y="40" width="70" height="40" rx="8" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2"/>
      <text x="45" y="65" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1e3a8a">{total}</text>
      {/* lines */}
      <line x1="80" y1="60" x2="130" y2="30" stroke="#64748b" strokeWidth="2"/>
      <line x1="80" y1="60" x2="130" y2="90" stroke="#64748b" strokeWidth="2"/>
      {/* part1 */}
      <rect x="130" y="10" width="70" height="40" rx="8" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
      <text x="165" y="35" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#14532d">{part1}</text>
      {/* part2 */}
      <rect x="130" y="70" width="70" height="40" rx="8" fill="#fef9c3" stroke="#eab308" strokeWidth="2"/>
      <text x="165" y="95" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#713f12">{part2}</text>
    </svg>
  );
}

/** Apple grid — draws outline apple shapes in rows */
function AppleGrid({ leftRows, rightRows }: { leftRows: number[]; rightRows: number[] }) {
  const appleAt = (x: number, y: number, key: string) => (
    <g key={key} transform={`translate(${x},${y})`}>
      <ellipse cx="10" cy="14" rx="9" ry="10" fill="#fca5a5" stroke="#dc2626" strokeWidth="1.2"/>
      <path d="M10 5 Q13 0 16 3" fill="none" stroke="#16a34a" strokeWidth="1.5"/>
      <path d="M6 7 Q10 4 14 7" fill="none" stroke="#dc2626" strokeWidth="0.8"/>
    </g>
  );
  const W = 22; const H = 26;
  const leftW = Math.max(...leftRows) * W + 10;
  const totalW = leftW + 20 + Math.max(...rightRows) * W + 10;
  const totalH = (leftRows.length + 1) * H + 10;
  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} width={Math.min(totalW, 320)} height={Math.min(totalH, 200)}
      style={{maxWidth:'100%'}} aria-label="Count all the apples">
      {leftRows.map((count, row) =>
        Array.from({length: count}, (_, col) =>
          appleAt(5 + col * W, 5 + row * H, `l-${row}-${col}`)
        )
      )}
      {rightRows.map((count, row) =>
        Array.from({length: count}, (_, col) =>
          appleAt(leftW + 20 + col * W, 5 + row * H, `r-${row}-${col}`)
        )
      )}
    </svg>
  );
}

/** Coin layout for Set A and Set B */
function CoinLayout({ setA, setB }: { setA: number[]; setB: number[] }) {
  const COLORS: Record<number,string> = { 50:'#fcd34d', 20:'#93c5fd', 10:'#86efac', 5:'#f9a8d4' };
  const Coin = ({ val, x, y }: { val: number; x: number; y: number }) => (
    <g key={`${val}-${x}`}>
      <circle cx={x+18} cy={y+18} r={16} fill={COLORS[val]??'#e2e8f0'} stroke="#64748b" strokeWidth="1.5"/>
      <text x={x+18} y={y+23} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e293b">{val}¢</text>
    </g>
  );
  return (
    <svg viewBox="0 0 340 120" width="340" height="120" style={{maxWidth:'100%'}} aria-label="Compare Set A and Set B coins">
      <rect x="0" y="0" width="160" height="110" rx="10" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1"/>
      <text x="80" y="18" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">Set A</text>
      {setA.slice(0,3).map((v,i) => <Coin key={`a${i}`} val={v} x={8+i*50} y={22}/>)}
      {setA.slice(3).map((v,i) => <Coin key={`a3${i}`} val={v} x={8+i*50} y={62}/>)}
      <rect x="175" y="0" width="160" height="110" rx="10" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1"/>
      <text x="255" y="18" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">Set B</text>
      {setB.slice(0,3).map((v,i) => <Coin key={`b${i}`} val={v} x={183+i*50} y={22}/>)}
      {setB.slice(3).map((v,i) => <Coin key={`b3${i}`} val={v} x={183+i*50} y={62}/>)}
    </svg>
  );
}

/** Watermelon slices in rows */
function WatermelonGrid({ rows }: { rows: number[] }) {
  const Slice = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x},${y})`}>
      <path d="M4 20 Q20 0 36 20 Z" fill="#16a34a" stroke="#15803d" strokeWidth="1"/>
      <path d="M6 20 Q20 2 34 20 Z" fill="#f87171"/>
      <circle cx="12" cy="16" r="2" fill="#1e293b"/>
      <circle cx="20" cy="14" r="2" fill="#1e293b"/>
      <circle cx="28" cy="16" r="2" fill="#1e293b"/>
    </g>
  );
  const cols = Math.max(...rows);
  return (
    <svg viewBox={`0 0 ${cols*45+10} ${rows.length*30+10}`}
      width={Math.min(cols*45+10, 320)} height={rows.length*30+10}
      style={{maxWidth:'100%'}} aria-label="Count the watermelon slices">
      {rows.map((count,row) =>
        Array.from({length:count},(_,col) =>
          <Slice key={`${row}-${col}`} x={5+col*44} y={5+row*28}/>
        )
      )}
    </svg>
  );
}

/** Pictograph with star symbols */
function PictographStars({ data, symbolValue = 2 }: { data: {label:string; count:number}[]; symbolValue?: number }) {
  const ROW_H = 44; const COL_W = 38; const LABEL_W = 90;
  const maxStars = Math.max(...data.map(d=>d.count));
  const W = LABEL_W + maxStars * COL_W + 20;
  const H = data.length * ROW_H + 50;
  const Star = ({ x, y }: { x: number; y: number }) => {
    const pts = Array.from({length:5},(_,i)=>{
      const a = (i*72-90)*Math.PI/180;
      const ai = ((i*72+36)-90)*Math.PI/180;
      return `${x+14*Math.cos(a)},${y+14*Math.sin(a)} ${x+6*Math.cos(ai)},${y+6*Math.sin(ai)}`;
    }).join(' ');
    return <polygon points={pts} fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={Math.min(W,340)} height={H} style={{maxWidth:'100%'}}
      aria-label="Read the pictograph">
      <rect x="0" y="0" width={W} height={H} rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
      {data.map((d,row) => (
        <g key={d.label}>
          <rect x="0" y={row*ROW_H+4} width={LABEL_W-4} height={ROW_H-2} fill={row%2?'#f1f5f9':'#fff'} rx="4"/>
          <text x={LABEL_W-8} y={row*ROW_H+26} textAnchor="end" fontSize="12" fill="#334155">{d.label}</text>
          {Array.from({length:d.count},(_,col)=>
            <Star key={col} x={LABEL_W+col*COL_W+18} y={row*ROW_H+22}/>
          )}
        </g>
      ))}
      <text x={LABEL_W/2} y={H-10} textAnchor="middle" fontSize="11" fill="#64748b">
        Each ★ = {symbolValue} pupils
      </text>
    </svg>
  );
}

/** Ruler with items placed on it */
function RulerDiagram({ items }: { items: {name:string; start:number; end:number; color:string}[] }) {
  const SCALE = 18; // pixels per cm
  const MAX_CM = 15;
  const W = MAX_CM * SCALE + 40;
  const RULER_Y = 100;
  return (
    <svg viewBox={`0 0 ${W} 160`} width={Math.min(W,340)} height="160" style={{maxWidth:'100%'}}
      aria-label="Measure the items on the ruler">
      {/* items */}
      {items.map((item, i) => (
        <g key={item.name}>
          <rect x={20+item.start*SCALE} y={i*28+4} width={(item.end-item.start)*SCALE} height="22"
            rx="6" fill={item.color} stroke="#64748b" strokeWidth="1.5" opacity="0.85"/>
          <text x={20+(item.start+item.end)/2*SCALE} y={i*28+19}
            textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e293b">{item.name}</text>
        </g>
      ))}
      {/* ruler */}
      <rect x="18" y={RULER_Y} width={MAX_CM*SCALE+4} height="28" rx="4" fill="#fef9c3" stroke="#92400e" strokeWidth="2"/>
      {Array.from({length:MAX_CM+1},(_,i)=>(
        <g key={i}>
          <line x1={20+i*SCALE} y1={RULER_Y} x2={20+i*SCALE} y2={i%5===0?RULER_Y+20:RULER_Y+12}
            stroke="#92400e" strokeWidth={i%5===0?2:1}/>
          {i%5===0 && <text x={20+i*SCALE} y={RULER_Y+26} textAnchor="middle" fontSize="10" fill="#92400e">{i}</text>}
        </g>
      ))}
      <text x="20" y={RULER_Y+24} fontSize="8" fill="#92400e">cm</text>
    </svg>
  );
}

/** Bar model: N equal rectangles with total label */
function BarModel({ parts, total, highlight }: { parts: number; total: number; highlight: number }) {
  const W = 280; const PART_W = W / parts; const H = 50;
  return (
    <svg viewBox="0 0 320 120" width="320" height="120" style={{maxWidth:'100%'}}
      aria-label={`Bar model: ${parts} equal parts totalling ${total}`}>
      {/* bracket for highlighted parts */}
      <line x1="20" y1="18" x2={20+highlight*PART_W} y2="18" stroke="#3b82f6" strokeWidth="2"/>
      <line x1="20" y1="14" x2="20" y2="22" stroke="#3b82f6" strokeWidth="2"/>
      <line x1={20+highlight*PART_W} y1="14" x2={20+highlight*PART_W} y2="22" stroke="#3b82f6" strokeWidth="2"/>
      <text x={20+highlight*PART_W/2} y="12" textAnchor="middle" fontSize="14" fill="#1d4ed8" fontWeight="bold">(?)</text>
      {/* parts */}
      {Array.from({length:parts},(_,i)=>(
        <rect key={i} x={20+i*PART_W} y="25" width={PART_W-2} height={H}
          rx="4" fill={i<highlight?'#bfdbfe':'#e0f2fe'} stroke="#3b82f6" strokeWidth="1.5"/>
      ))}
      {/* total bracket */}
      <line x1="20" y1="82" x2={20+W} y2="82" stroke="#1e293b" strokeWidth="2"/>
      <line x1="20" y1="82" x2="20" y2="76" stroke="#1e293b" strokeWidth="2"/>
      <line x1={20+W} y1="82" x2={20+W} y2="76" stroke="#1e293b" strokeWidth="2"/>
      <text x={20+W/2} y="96" textAnchor="middle" fontSize="16" fill="#1e293b" fontWeight="bold">{total}</text>
    </svg>
  );
}

/** 3 rectangles in a row with 2 circles below */
function Shapes3Rect2Circle() {
  return (
    <svg viewBox="0 0 280 130" width="280" height="130" style={{maxWidth:'100%'}}
      aria-label="Figure with rectangles and circles">
      <rect x="20" y="10" width="240" height="70" rx="4" fill="#f1f5f9" stroke="#1e293b" strokeWidth="2.5"/>
      <line x1="100" y1="10" x2="100" y2="80" stroke="#1e293b" strokeWidth="1.5"/>
      <line x1="180" y1="10" x2="180" y2="80" stroke="#1e293b" strokeWidth="1.5"/>
      <circle cx="80" cy="108" r="20" fill="none" stroke="#1e293b" strokeWidth="2.5"/>
      <circle cx="200" cy="108" r="20" fill="none" stroke="#1e293b" strokeWidth="2.5"/>
    </svg>
  );
}

/** Shape pattern: circle, diamond, triangle, rectangle repeating */
function ShapePattern({ highlight }: { highlight?: number }) {
  const shapes = ['circle','diamond','triangle','rectangle'];
  const items = [...shapes, ...shapes, 'rectangle'];
  return (
    <svg viewBox="0 0 360 60" width="360" height="60" style={{maxWidth:'100%'}}
      aria-label="Shape pattern: circle, diamond, triangle, rectangle repeating">
      {items.map((s, i) => {
        const x = 18 + i * 36; const y = 30; const isLast = i === items.length - 1;
        const fill = isLast ? '#fef9c3' : '#dbeafe';
        const stroke = isLast ? '#eab308' : '#3b82f6';
        return (
          <g key={i}>
            {s === 'circle' && <circle cx={x} cy={y} r={14} fill={fill} stroke={stroke} strokeWidth="2"/>}
            {s === 'diamond' && <polygon points={`${x},${y-14} ${x+12},${y} ${x},${y+14} ${x-12},${y}`} fill={fill} stroke={stroke} strokeWidth="2"/>}
            {s === 'triangle' && <polygon points={`${x},${y-14} ${x+12},${y+12} ${x-12},${y+12}`} fill={fill} stroke={stroke} strokeWidth="2"/>}
            {s === 'rectangle' && <rect x={x-13} y={y-9} width="26" height="18" rx="2" fill={fill} stroke={stroke} strokeWidth="2"/>}
            {isLast && <text x={x} y={y+4} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#92400e">?</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Grid of soccer balls */
function BallGrid({ rows }: { rows: number[] }) {
  const Ball = ({ x, y }: { x: number; y: number }) => (
    <g key={`${x}-${y}`}>
      <circle cx={x+14} cy={y+14} r={12} fill="#f8fafc" stroke="#1e293b" strokeWidth="1.5"/>
      <circle cx={x+14} cy={y+14} r={4} fill="#1e293b"/>
      <path d={`M${x+14} ${y+2} Q${x+22} ${y+10} ${x+14} ${y+14}`} fill="none" stroke="#1e293b" strokeWidth="1.2"/>
      <path d={`M${x+14} ${y+14} Q${x+22} ${y+18} ${x+26} ${y+14}`} fill="none" stroke="#1e293b" strokeWidth="1.2"/>
      <path d={`M${x+14} ${y+14} Q${x+6} ${y+18} ${x+2} ${y+14}`} fill="none" stroke="#1e293b" strokeWidth="1.2"/>
    </g>
  );
  const cols = Math.max(...rows);
  return (
    <svg viewBox={`0 0 ${cols*30+10} ${rows.length*30+10}`}
      width={Math.min(cols*30+10, 320)} height={rows.length*30+10}
      style={{maxWidth:'100%'}} aria-label="Count all the balls">
      {rows.map((count,row) =>
        Array.from({length:count},(_,col)=>
          <Ball key={`${row}-${col}`} x={5+col*29} y={5+row*29}/>
        )
      )}
    </svg>
  );
}

/** 4 numbered circles side by side */
function NumberCircles({ numbers }: { numbers: number[] }) {
  return (
    <svg viewBox="0 0 280 80" width="280" height="80" style={{maxWidth:'100%'}}
      aria-label={`Four numbers: ${numbers.join(', ')}`}>
      {numbers.map((n,i) => (
        <g key={i}>
          <circle cx={30+i*65} cy={40} r={28} fill="#dbeafe" stroke="#3b82f6" strokeWidth="2.5"/>
          <text x={30+i*65} y={47} textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1e3a8a">{n}</text>
        </g>
      ))}
    </svg>
  );
}

/** Three 2×2 pattern boxes */
function PatternBoxes() {
  const boxes = [
    [[1,4],[10,5]],
    [[17,9],[46,20]],
    [[28,16],['?',30]],
  ];
  return (
    <svg viewBox="0 0 320 110" width="320" height="110" style={{maxWidth:'100%'}}
      aria-label="Find the pattern in the three boxes">
      {boxes.map((box,bi) => (
        <g key={bi} transform={`translate(${10+bi*105},5)`}>
          <rect x="0" y="0" width="90" height="90" rx="8" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2"/>
          <line x1="45" y1="0" x2="45" y2="90" stroke="#94a3b8" strokeWidth="1.5"/>
          <line x1="0" y1="45" x2="90" y2="45" stroke="#94a3b8" strokeWidth="1.5"/>
          {box.map((row,ri) =>
            row.map((val,ci) => {
              const isQ = val === '?';
              return (
                <g key={`${ri}-${ci}`}>
                  {isQ && <rect x={ci*45+2} y={ri*45+2} width="41" height="41" rx="4" fill="#fef9c3"/>}
                  <text key={`${ri}-${ci}`}
                    x={ci*45+22} y={ri*45+29} textAnchor="middle"
                    fontSize={isQ?22:18} fontWeight="bold"
                    fill={isQ?'#92400e':'#1e293b'}>{val}</text>
                </g>
              );
            })
          )}
        </g>
      ))}
    </svg>
  );
}

/** Marble row with position labels */
function MarbleRow() {
  const N = 5;
  return (
    <svg viewBox="0 0 320 100" width="320" height="100" style={{maxWidth:'100%'}}
      aria-label="Marbles arranged in a row — find the total">
      {/* dots left */}
      <text x="20" y="42" fontSize="22" fill="#64748b">…</text>
      {Array.from({length:N},(_,i) => (
        <g key={i}>
          <circle cx={65+i*45} cy={38} r={18} fill="#bfdbfe" stroke="#3b82f6" strokeWidth="2.5"/>
          <circle cx={65+i*45} cy={38} r={7} fill="#93c5fd" opacity="0.6"/>
        </g>
      ))}
      <text x="300" y="42" fontSize="22" fill="#64748b">…</text>
      {/* 3rd from left arrow */}
      <line x1="65" y1="60" x2="65" y2="80" stroke="#16a34a" strokeWidth="2" markerEnd="url(#arrowUp)"/>
      <text x="65" y="96" textAnchor="middle" fontSize="11" fill="#15803d">3rd from left</text>
      {/* 5th from right arrow */}
      <line x1="245" y1="14" x2="245" y2="18" stroke="#dc2626" strokeWidth="2"/>
      <path d="M241 18 L245 24 L249 18 Z" fill="#dc2626"/>
      <text x="245" y="12" textAnchor="middle" fontSize="11" fill="#dc2626">5th from right</text>
    </svg>
  );
}

/** Toy pictograph for Q29 */
function ToyPictograph() {
  const data = [
    { name:'Alex', symbols:1 },
    { name:'Bernadette', symbols:7 },
    { name:'Carlos', symbols:4 },
    { name:'Daveen', symbols:0, isQ:true },
  ];
  const Bear = ({ x, y }: {x:number;y:number}) => (
    <g transform={`translate(${x},${y})`}>
      <circle cx="10" cy="12" r="9" fill="#d97706" stroke="#92400e" strokeWidth="1"/>
      <circle cx="10" cy="6" r="6" fill="#d97706" stroke="#92400e" strokeWidth="1"/>
      <circle cx="6" cy="3" r="3" fill="#b45309"/>
      <circle cx="14" cy="3" r="3" fill="#b45309"/>
      <circle cx="8" cy="6" r="1.5" fill="#1e293b"/>
      <circle cx="12" cy="6" r="1.5" fill="#1e293b"/>
      <ellipse cx="10" cy="9" rx="3" ry="2" fill="#b45309"/>
    </g>
  );
  const ROW = 44; const LW = 100;
  return (
    <svg viewBox={`0 0 380 ${data.length*ROW+50}`} width="380" height={data.length*ROW+50}
      style={{maxWidth:'100%'}} aria-label="Toys owned by 4 pupils">
      <rect x="0" y="0" width="380" height={data.length*ROW+48} rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
      <text x="190" y="22" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">Toys Owned By Pupils</text>
      {data.map((d,i) => (
        <g key={d.name}>
          <rect x="0" y={i*ROW+28} width={LW} height={ROW} fill={i%2?'#f1f5f9':'#fff'}/>
          <text x={LW-6} y={i*ROW+54} textAnchor="end" fontSize="12" fill="#334155">{d.name}</text>
          {d.isQ
            ? <text x={LW+20} y={i*ROW+56} fontSize="24" fontWeight="bold" fill="#eab308">?</text>
            : Array.from({length:d.symbols},(_,j)=><Bear key={j} x={LW+4+j*26} y={i*ROW+30}/>)
          }
        </g>
      ))}
      <text x="190" y={data.length*ROW+42} textAnchor="middle" fontSize="11" fill="#64748b">Each 🧸 = 2 toys</text>
    </svg>
  );
}

/** Number column grid for Q30 */
function NumberColumnGrid() {
  const cols = ['A','B','C','D','E'];
  const grid = [
    [1,3,6,10,15],
    [2,5,9,14,null],
    [4,8,13,null,null],
    [7,12,null,null,null],
    [11,null,null,null,null],
    ['⋮',null,null,null,null],
    ['?',null,null,null,null],
  ];
  const CW = 48; const RH = 36;
  return (
    <svg viewBox={`0 0 ${cols.length*CW+60} ${grid.length*RH+40}`}
      width={cols.length*CW+60} height={grid.length*RH+40}
      style={{maxWidth:'100%'}} aria-label="Number pattern grid">
      {/* header */}
      <rect x="55" y="0" width={cols.length*CW} height="30" rx="4" fill="#dbeafe"/>
      {cols.map((c,i) => (
        <text key={c} x={55+i*CW+CW/2} y="21" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e3a8a">{c}</text>
      ))}
      {/* row labels + cells */}
      {grid.map((row,ri) => (
        <g key={ri}>
          <text x="48" y={30+ri*RH+22} textAnchor="end" fontSize="12" fill="#64748b">
            {ri < 5 ? `${ri+1}${ri===0?'st':ri===1?'nd':ri===2?'rd':'th'}` : ri===5?'':'10th'}
          </text>
          {row.map((val,ci) => {
            if (val === null) return null;
            const isQ = val === '?';
            return (
              <g key={ci}>
                <rect x={55+ci*CW} y={30+ri*RH} width={CW} height={RH}
                  rx="3" fill={isQ?'#fef9c3':ri%2?'#f8fafc':'#fff'}
                  stroke="#e2e8f0" strokeWidth="1"/>
                <text x={55+ci*CW+CW/2} y={30+ri*RH+22} textAnchor="middle"
                  fontSize={isQ?16:13} fontWeight={isQ?'bold':'normal'}
                  fill={isQ?'#92400e':'#1e293b'}>{val}</text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

/** Lines diagram Q20 2025 */
function LinesDiagram() {
  return (
    <svg viewBox="0 0 320 180" width="320" height="180" style={{maxWidth:'100%'}}
      aria-label="Which line is the longest?">
      {/* Line 1 — straight */}
      <line x1="20" y1="25" x2="280" y2="25" stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
      <text x="290" y="30" fontSize="12" fill="#64748b">Line 1</text>
      {/* Line 2 — stepped up and down */}
      <polyline points="20,55 80,55 80,40 140,40 140,55 200,55 200,40 260,40 260,55" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="268" y="50" fontSize="12" fill="#64748b">Line 2</text>
      {/* Line 3 — similar stepped */}
      <polyline points="20,90 100,90 100,75 160,75 160,90 220,90 220,75 270,75" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="278" y="85" fontSize="12" fill="#64748b">Line 3</text>
      {/* Line 4 — shorter stepped */}
      <polyline points="20,130 100,130 100,120 180,120 180,130" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="188" y="128" fontSize="12" fill="#64748b">Line 4</text>
    </svg>
  );
}

/** Semicircle/quarter circle figure for Q13 2023 */
function SemicircleFigure() {
  return (
    <svg viewBox="0 0 280 200" width="280" height="200" style={{maxWidth:'100%'}}
      aria-label="Figure made of semicircles and quarter-circles">
      {/* central rectangle */}
      <rect x="90" y="60" width="100" height="80" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5"/>
      {/* left 2 quarter circles pointing outward */}
      <path d="M90 60 Q50 60 50 100 Q50 140 90 140 Z" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="2"/>
      {/* right semicircle */}
      <path d="M190 60 Q230 60 230 100 Q230 140 190 140 Z" fill="#bbf7d0" stroke="#16a34a" strokeWidth="2"/>
      {/* top 2 quarter circles */}
      <path d="M90 60 Q90 20 140 20 Q190 20 190 60 Z" fill="#fde68a" stroke="#d97706" strokeWidth="2"/>
      {/* bottom 2 quarter circles */}
      <path d="M90 140 Q90 180 140 180 Q190 180 190 140 Z" fill="#fca5a5" stroke="#dc2626" strokeWidth="2"/>
    </svg>
  );
}

/** Train figure for Q14 2023 */
function TrainFigure() {
  return (
    <svg viewBox="0 0 280 160" width="280" height="160" style={{maxWidth:'100%'}}
      aria-label="Toy train made of circles and triangles">
      {/* body */}
      <rect x="50" y="50" width="160" height="70" rx="8" fill="#bfdbfe" stroke="#1e293b" strokeWidth="2.5"/>
      {/* cabin */}
      <rect x="170" y="30" width="60" height="52" rx="4" fill="#dbeafe" stroke="#1e293b" strokeWidth="2"/>
      {/* cabin window */}
      <rect x="180" y="38" width="28" height="22" rx="4" fill="#fff" stroke="#1e293b" strokeWidth="1.5"/>
      {/* chimney */}
      <rect x="80" y="30" width="20" height="22" rx="3" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.5"/>
      {/* roof triangle on cabin */}
      <polygon points="165,30 200,10 235,30" fill="#60a5fa" stroke="#1e293b" strokeWidth="2"/>
      {/* front triangle */}
      <polygon points="50,70 20,120 50,120" fill="#93c5fd" stroke="#1e293b" strokeWidth="2"/>
      {/* wheels — 3 circles */}
      <circle cx="90" cy="130" r="22" fill="#f1f5f9" stroke="#1e293b" strokeWidth="3"/>
      <circle cx="90" cy="130" r="8" fill="#94a3b8"/>
      <circle cx="160" cy="130" r="22" fill="#f1f5f9" stroke="#1e293b" strokeWidth="3"/>
      <circle cx="160" cy="130" r="8" fill="#94a3b8"/>
      <circle cx="220" cy="130" r="18" fill="#f1f5f9" stroke="#1e293b" strokeWidth="3"/>
      <circle cx="220" cy="130" r="6" fill="#94a3b8"/>
    </svg>
  );
}

/** Sweets pictograph Q13 2025 */
function SweetsPictograph({ krishna, jamie }: { krishna: number; jamie: number }) {
  const Sweet = ({ x, y }: {x:number;y:number}) => (
    <g transform={`translate(${x},${y})`}>
      <circle cx="10" cy="10" r="9" fill="#f9a8d4" stroke="#ec4899" strokeWidth="1.5"/>
      <line x1="2" y1="2" x2="18" y2="18" stroke="#fff" strokeWidth="1.5" opacity="0.6"/>
    </g>
  );
  const maxW = Math.max(krishna, jamie) * 22 + 20;
  return (
    <svg viewBox={`0 0 ${maxW+120} 90`} width={Math.min(maxW+120,340)} height="90"
      style={{maxWidth:'100%'}} aria-label={`Krishna has ${krishna} sweets, Jamie has ${jamie} sweets`}>
      <rect x="0" y="0" width="110" height="90" rx="8" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="1"/>
      <text x="55" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#831843">Krishna</text>
      {Array.from({length:krishna},(_,i) => <Sweet key={i} x={10+i*22} y={24}/>)}
      <rect x="120" y="0" width={maxW} height="90" rx="8" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="1"/>
      <text x={120+maxW/2} y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#831843">Jamie</text>
      {Array.from({length:jamie},(_,i) => <Sweet key={i} x={130+i*22} y={24}/>)}
    </svg>
  );
}

/** Apple price visual Q22 2025 */
function ApplePrice() {
  return (
    <svg viewBox="0 0 200 130" width="200" height="130" style={{maxWidth:'100%'}}
      aria-label="Apples: $5 for 4 apples">
      <rect x="20" y="10" width="160" height="100" rx="12" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
      <text x="100" y="32" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#14532d">Apples</text>
      {[[50,55],[110,55],[50,90],[110,90]].map(([x,y],i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="18" ry="20" fill="#86efac" stroke="#16a34a" strokeWidth="1.5"/>
          <path d={`M${x} ${y-18} Q${x+6} ${y-24} ${x+10} ${y-20}`} fill="none" stroke="#15803d" strokeWidth="1.5"/>
        </g>
      ))}
      <text x="100" y="118" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#14532d">$5 for 4 apples</text>
    </svg>
  );
}

// ─── QUESTION ID → VISUAL LOOKUP ──────────────────────────────────────────────

const VISUALS: Record<string, React.ReactNode> = {
  // 2023 Paper
  '2023-A-1':  <NumberBond total={9} part1={2} part2="?"/>,
  '2023-A-2':  <AppleGrid leftRows={[5,5,5,4,3,2]} rightRows={[5,5,5,2,1]}/>,
  '2023-A-3':  null, // described in text (6 + bags)
  '2023-A-4':  <CoinLayout setA={[50,20,10,5,5]} setB={[50,50,20,10,5]}/>,
  '2023-A-6':  <WatermelonGrid rows={[5,5,4]}/>,
  '2023-A-10': <PictographStars data={[{label:'Zoo',count:8},{label:'Bird Park',count:4},{label:'Museum',count:2},{label:'Aquarium',count:3}]}/>,
  '2023-A-11': <ClockFace hours={8} minutes={0}/>,
  '2023-A-13': <SemicircleFigure/>,
  '2023-A-14': <TrainFigure/>,
  '2023-B-33': null, // equations described in text

  // 2025 Paper
  '2025-A-6':  <RulerDiagram items={[{name:'straw',start:0,end:14,color:'#bae6fd'},{name:'knife',start:5,end:14,color:'#d1fae5'},{name:'fork',start:1,end:8,color:'#fde68a'},{name:'spoon',start:9,end:14,color:'#fca5a5'}]}/>,
  '2025-A-7':  <ClockFace hours={7} minutes={10}/>,
  '2025-A-11': <BarModel parts={4} total={36} highlight={2}/>,
  '2025-A-12': <Shapes3Rect2Circle/>,
  '2025-A-13': <SweetsPictograph krishna={2} jamie={8}/>,
  '2025-A-14': <ShapePattern/>,
  '2025-B-16': <BallGrid rows={[8,8,8,4]}/>,
  '2025-B-18': <RulerDiagram items={[{name:'crayon',start:6,end:12,color:'#fbbf24'},{name:'pen',start:0,end:6,color:'#93c5fd'},{name:'eraser',start:12,end:15,color:'#f9a8d4'}]}/>,
  '2025-B-19': <NumberCircles numbers={[53,68,36,58]}/>,
  '2025-B-20': <LinesDiagram/>,
  '2025-B-22': <ApplePrice/>,
  '2025-B-25': <PatternBoxes/>,
  '2025-C-28': <MarbleRow/>,
  '2025-C-29': <ToyPictograph/>,
  '2025-C-30': <NumberColumnGrid/>,
  '2025-C-31': <ClockFace hours={9} minutes={15}/>,
};

// ─── PUBLIC COMPONENT ──────────────────────────────────────────────────────────

// ─── PUBLIC EXPORTS ───────────────────────────────────────────────────────────

/** Set of question IDs that have a visual diagram.
 *  Used by the practice page to build the "Picture Questions" pool. */
export const VISUAL_QUESTION_IDS: Set<string> = new Set(
  Object.entries(VISUALS)
    .filter(([, v]) => v !== null)
    .map(([id]) => id)
);

export default function QuestionVisual({ questionId }: { questionId: string }) {
  const visual = VISUALS[questionId];
  if (!visual) return null;
  return (
    <div className="flex justify-center items-center my-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 overflow-x-auto">
      {visual}
    </div>
  );
}
