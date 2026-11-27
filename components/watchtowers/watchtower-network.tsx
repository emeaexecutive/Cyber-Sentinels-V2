import { watchtowerCopy, type WatchtowerLocale } from "@/lib/watchtowers/content";

export function WatchtowerNetwork({ locale, active = 0, onSelect }: { locale: WatchtowerLocale; active?: number; onSelect?: (index: number) => void }) {
  const copy = watchtowerCopy[locale];
  return <figure className="watchtower-network" aria-label={copy.network}>
    <svg viewBox="0 0 840 260" role="img" aria-label={copy.network}>
      <path d="M0 218 Q100 102 210 179 T420 156 T630 181 T840 114 L840 260 L0 260Z" fill="#222e2b" />
      <path d="M0 245 Q150 160 290 213 T580 196 T840 174" fill="none" stroke="#71837b" strokeWidth="1" />
      <path d="M148 103 Q278 25 420 103 T692 103" fill="none" stroke="#d4ac72" strokeWidth="2" strokeDasharray="5 8" />
      <g className="watchtower-signal" style={{transform:`translate(${[148,420,692][active]}px,103px)`}}><circle r="7" fill="#ffdc96" stroke="#fff5d9"/></g>
      {[148,420,692].map((x,index)=><g key={x}>
        <path d={`M${x-33} 192 L${x-27} 102 L${x-30} 102 L${x-30} 86 L${x-17} 86 L${x-17} 96 L${x-5} 96 L${x-5} 86 L${x+6} 86 L${x+6} 96 L${x+18} 96 L${x+18} 86 L${x+30} 86 L${x+30} 102 L${x+27} 102 L${x+33} 192 Z`} fill={active===index?"#c3a477":"#827763"} stroke="#e1c8a3" />
        {[118,137,156,175].map(y=><path key={y} d={`M${x-26} ${y} h52 m-35 0 v-18 m18 18 v18`} stroke="#3c3b33" strokeWidth="1" fill="none" />)}
        <path d={`M${x-6} 192 v-22 q6-11 12 0 v22`} fill="#151c1c" />
        <circle cx={x} cy="65" r={active===index?10:4} fill={active===index?"#ffc96e":"#59675e"} className="watchtower-beacon" />
        <text x={x} y="225" textAnchor="middle" fill="#f4e7d2" fontSize="15" fontWeight="600">{["ALSAMORA","VIACAMP","CHIRIVETA"][index]}</text>
      </g>)}
    </svg>
    {onSelect?<div className="watchtower-node-controls">{copy.roles.map(([name],index)=><button type="button" key={name} aria-pressed={active===index} onClick={()=>onSelect(index)}>{copy.node}: {name}</button>)}</div>:null}
    <figcaption>{locale==="es"?"Enlaces ilustrativos · diagrama original, sin atribución a un mapa histórico.":"Illustrative links · original diagram, not an authenticated historical map."}</figcaption>
  </figure>;
}
