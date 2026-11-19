import { useId } from 'react'

type ArtworkProps = { id: string; className?: string }
export function Artwork({ id, className = '' }: ArtworkProps) {
  const gradient = `art-${useId().replace(/:/g, '')}`
  if (id === 'kasi-maze') return (
    <svg className={className} viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Kasi Maze original artwork — a glowing futuristic township maze, a mint-green runner and four jewel-colored rival drones">
      <defs>
        <linearGradient id={gradient} x1="0" x2="1" y1="1" y2="0">
          <stop stopColor="#0b1628"/><stop offset=".48" stopColor="#0b2b36"/><stop offset="1" stopColor="#171426"/>
        </linearGradient>
        <radialGradient id={`${gradient}-a`}><stop stopColor="#57f5c9" stopOpacity=".48"/><stop offset="1" stopColor="#57f5c9" stopOpacity="0"/></radialGradient>
        <radialGradient id={`${gradient}-b`}><stop stopColor="#ff9f77" stopOpacity=".29"/><stop offset="1" stopColor="#ff9f77" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${gradient}-wall`} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#b2ffce"/><stop offset=".33" stopColor="#42dcbe"/><stop offset="1" stopColor="#174c68"/>
        </linearGradient>
        <filter id={`${gradient}-glow`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="11"/></filter>
        <filter id={`${gradient}-soft`} x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="29"/></filter>
        <pattern id={`${gradient}-grid`} width="43" height="43" patternUnits="userSpaceOnUse">
          <path d="M43 0H0V43" fill="none" stroke="#baffdb" strokeOpacity=".10" strokeWidth="1"/>
          <circle cx="21.5" cy="21.5" r="1.4" fill="#78f7da" fillOpacity=".27"/>
        </pattern>
      </defs>
      <rect width="1200" height="660" fill={`url(#${gradient})`}/>
      <circle cx="800" cy="330" r="410" fill={`url(#${gradient}-a)`}/>
      <circle cx="1100" cy="95" r="400" fill={`url(#${gradient}-b)`}/>
      <g opacity=".18" stroke="#5ff5c9" strokeWidth="1.2">
        {Array.from({length:17},(_,i)=><path key={i} d={`M0 ${i*48}H1200`}/>)}
      </g>
      <path d="M0 574 173 510 261 532 386 472 532 496 699 449 855 478 1007 433 1200 472V660H0Z" fill="#051222" opacity=".76"/>
      <g transform="translate(520 69) rotate(-8 322 252)">
        <rect x="20" y="22" width="673" height="545" rx="34" fill="#060f20" stroke="#6affd3" strokeWidth="4" strokeOpacity=".24"/>
        <rect x="38" y="39" width="638" height="510" rx="25" fill="url(#x)" fillOpacity="0" stroke="#7ef5d7" strokeWidth="1.5" strokeOpacity=".35"/>
        <rect x="42" y="44" width="630" height="500" rx="19" fill="#0b1b31"/>
        <rect x="42" y="44" width="630" height="500" fill={`url(#${gradient}-grid)`}/>
        <g fill="none" stroke="#3affbd" opacity=".29" filter={`url(#${gradient}-glow)`} strokeWidth="27" strokeLinejoin="round" strokeLinecap="round">
          <path d="M96 102V238H250V165H394V87H552V211H621"/>
          <path d="M96 327H260V457H406V333H524V463H627"/>
          <path d="M189 89V166M320 250H509V326H620"/>
          <path d="M184 327V257H105M397 163V257H318"/>
          <path d="M95 467H163M259 95H322M407 466V527"/>
        </g>
        <g fill="none" stroke="#112f43" strokeWidth="25" strokeLinejoin="round" strokeLinecap="round">
          <path d="M96 102V238H250V165H394V87H552V211H621"/>
          <path d="M96 327H260V457H406V333H524V463H627"/>
          <path d="M189 89V166M320 250H509V326H620"/>
          <path d="M184 327V257H105M397 163V257H318"/>
          <path d="M95 467H163M259 95H322M407 466V527"/>
        </g>
        <g fill="none" stroke={`url(#${gradient}-wall)`} strokeWidth="15" strokeLinejoin="round" strokeLinecap="round">
          <path d="M96 102V238H250V165H394V87H552V211H621"/>
          <path d="M96 327H260V457H406V333H524V463H627"/>
          <path d="M189 89V166M320 250H509V326H620"/>
          <path d="M184 327V257H105M397 163V257H318"/>
          <path d="M95 467H163M259 95H322M407 466V527"/>
        </g>
        <g fill="none" stroke="#d7ffe8" strokeWidth="3" strokeOpacity=".57" strokeLinejoin="round" strokeLinecap="round">
          <path d="M96 102V238H250V165H394V87H552V211H621"/>
          <path d="M96 327H260V457H406V333H524V463H627"/>
          <path d="M189 89V166M320 250H509V326H620"/>
          <path d="M184 327V257H105M397 163V257H318"/>
          <path d="M95 467H163M259 95H322M407 466V527"/>
        </g>
        <g fill="#c7ffe7">
          {[[150,293],[204,293],[260,292],[318,293],[376,292],[436,293],[555,373],[555,410],[476,503],[345,500],[296,400],[334,404],[137,390],[224,198],[286,200],[465,127],[495,127],[571,264],[570,295]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4.3" opacity=".9"/>)}
        </g>
        <g>
          <circle cx="150" cy="393" r="28" fill="#adffa1" opacity=".38" filter={`url(#${gradient}-soft)`}/>
          <circle cx="150" cy="393" r="19" fill="#c5ff8a" stroke="#e6ffca" strokeWidth="3"/>
          <rect x="139" y="385" width="22" height="14" rx="5" fill="#163939"/>
          <circle cx="145" cy="391" r="3" fill="#f8fff6"/><circle cx="155" cy="391" r="3" fill="#f8fff6"/>
          <path d="M135 376h29" stroke="#e8ffcb" strokeWidth="5" strokeLinecap="round"/>
          <path d="M118 393H95" stroke="#d1ff93" strokeWidth="5" strokeLinecap="round" opacity=".6"/>
          <path d="M115 400H99" stroke="#d1ff93" strokeWidth="3" strokeLinecap="round" opacity=".4"/>
        </g>
        {[
          {x:460,y:382,c:"#ff688c"},
          {x:510,y:295,c:"#66dcf8"},
          {x:585,y:420,c:"#ffbf75"},
          {x:328,y:116,c:"#ad89ff"},
        ].map((r,i)=><g key={i} transform={`translate(${r.x} ${r.y})`}>
          <circle r="21" fill={r.c} opacity=".4" filter={`url(#${gradient}-glow)`}/>
          <rect x="-18" y="-15" width="36" height="30" rx="10" fill="#13263c" stroke={r.c} strokeWidth="4"/>
          <rect x="-14" y="-10" width="28" height="15" rx="5" fill={r.c}/>
          <rect x="-12" y="-3" width="24" height="9" rx="4" fill="#121e35"/>
          <circle cx="-6" cy="1" r="3.4" fill="white"/><circle cx="6" cy="1" r="3.4" fill="white"/>
          <path d="M0 -15V-22" stroke={r.c} strokeWidth="3"/><circle cy="-23" r="3" fill="#fff"/>
        </g>)}
        <circle cx="611" cy="142" r="14" fill="#ffdd88" opacity=".3" filter={`url(#${gradient}-glow)`}/>
        <circle cx="611" cy="142" r="11" fill="#ffdc80" stroke="#fff0b6" strokeWidth="2"/>
        <g fill="#8cffda" opacity=".9">
          <path d="M53 75h24v4H53zM53 85h38v3H53zM610 500h25v3h-25z"/>
        </g>
      </g>
      <g opacity=".65">
        <path d="M1090 0v115M1111 0v94M1134 0v65" stroke="#9dffcd" strokeWidth="2"/>
        <path d="M0 530h360M0 545h275M0 561h190" stroke="#a2ffcf" strokeWidth="2" strokeOpacity=".3"/>
      </g>
    </svg>
  )
  if (id === 'taxi-rush') return (
    <svg className={className} viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Original illustration of an orange city sunset and a stylized minibus taxi">
      <defs>
        <linearGradient id={gradient} x1="0" x2="0.8" y1="0" y2="1"><stop stopColor="#623348"/><stop offset=".48" stopColor="#e66e4e"/><stop offset="1" stopColor="#291b32"/></linearGradient>
        <linearGradient id={`${gradient}-road`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#503049"/><stop offset="1" stopColor="#110e23"/></linearGradient>
      </defs>
      <rect width="1200" height="660" fill={`url(#${gradient})`}/>
      <circle cx="790" cy="230" r="165" fill="#ffcc80" opacity=".79"/>
      <circle cx="790" cy="230" r="193" fill="none" stroke="#ffb46b" strokeOpacity=".23" strokeWidth="3"/>
      <g fill="#392439" opacity=".65"><path d="M0 338h75v-70h45v70h43V225h68v113h45v-99h85v99h75v-146h69v146h67v-66h95v66h74v-114h85v114h55v-80h60v80h110v-118h65v118h64v-79h60v79h70v322H0Z"/></g>
      <path d="M0 430 1200 399v261H0Z" fill={`url(#${gradient}-road)`}/>
      <g stroke="#ffbd71" opacity=".35" strokeWidth="5"><path d="M600 430 180 660M670 430 1040 660"/></g>
      <path d="M621 448 626 478M630 500 650 570M662 615 674 660" stroke="#fff0c2" strokeWidth="10" strokeLinecap="round" opacity=".68"/>
      <g transform="translate(428 283) rotate(-7 240 125)">
        <ellipse cx="250" cy="298" rx="290" ry="35" fill="#100f21" opacity=".5"/>
        <path d="M15 99 67 25Q82 5 115 5h293q42 0 61 29l55 68 5 126H0Z" fill="#fff1cc" stroke="#2b2734" strokeWidth="12" strokeLinejoin="round"/>
        <path d="M100 32h301q22 0 36 18l34 53H65Z" fill="#1f3a48"/>
        <path d="M108 40v60M232 40v60M353 40v60" stroke="#a1d7cd" strokeWidth="6" opacity=".7"/>
        <rect x="26" y="134" width="472" height="56" rx="10" fill="#f2a03e"/>
        <path d="M0 190h531v38H0Z" fill="#1a2631"/>
        <rect x="12" y="105" width="61" height="35" rx="8" fill="#fff9c4"/><rect x="464" y="105" width="56" height="35" rx="8" fill="#fff9c4"/>
        <circle cx="108" cy="237" r="42" fill="#151827" stroke="#697282" strokeWidth="12"/>
        <circle cx="430" cy="237" r="42" fill="#151827" stroke="#697282" strokeWidth="12"/>
        <path d="M186 165h166" stroke="#ffe2a3" strokeWidth="12" strokeLinecap="round"/>
      </g>
      <g stroke="#ffd48e" strokeWidth="4" opacity=".5"><path d="M80 530h250M40 552h340M880 515h210M850 546h290"/></g>
    </svg>
  )
  if (id === 'kasi-fighters') return (
    <svg className={className} viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Original illustration of two fictional fighters facing off in a neon arcade arena">
      <defs><linearGradient id={gradient} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#40306a"/><stop offset=".5" stopColor="#de5d74"/><stop offset="1" stopColor="#432b69"/></linearGradient></defs>
      <rect width="1200" height="660" fill={`url(#${gradient})`}/>
      <circle cx="601" cy="320" r="235" fill="#fb9c77" opacity=".8"/>
      {[280,350,420,490].map(r => <circle key={r} cx="601" cy="320" r={r} fill="none" stroke="#eab6ec" opacity=".16" strokeWidth="3"/>)}
      <path d="M0 510Q600 440 1200 510v150H0Z" fill="#251c42"/>
      <path d="M0 530 1200 530M0 577 1200 577M0 624 1200 624" stroke="#f8a9c8" strokeWidth="5" strokeOpacity=".6"/>
      <g transform="translate(275 160) rotate(-7)">
        <path d="M120 130Q80 91 96 48Q104 8 155 16Q197 28 201 73L174 119 204 169 232 352 178 352 151 247 126 351 73 351 82 188 45 237 1 217 65 139Z" fill="#1c1937" stroke="#8eecdd" strokeWidth="10" strokeLinejoin="round"/>
        <path d="M90 48Q113 -10 174 18l40 50-67-23Z" fill="#a8ffe2"/>
        <path d="M34 208Q-3 164 19 148Q36 128 67 154l11 41Z" fill="#80dfd2"/>
        <path d="M183 167q56-31 87 0l-20 45-58-10Z" fill="#80dfd2"/>
      </g>
      <g transform="translate(689 155) rotate(8)">
        <path d="M92 127Q55 70 71 38Q104 -5 158 24Q184 59 155 120L215 169 235 350 178 350 143 246 112 350H53L69 175 0 199-18 146Z" fill="#272039" stroke="#ffc68a" strokeWidth="10" strokeLinejoin="round"/>
        <path d="M60 55q37-79 116 5l-29-9-28-28-15 35Z" fill="#ffcb80"/>
        <path d="M-10 149q-39-7-43 34l30 46 35-27Z" fill="#ffab84"/>
        <path d="M188 162q49-24 75 20l-20 45-49-19Z" fill="#ffab84"/>
      </g>
      <path d="M520 190 565 295 523 295 593 435 575 340 621 340 578 190Z" fill="#fff3ce" opacity=".95"/>
      <text x="601" y="580" textAnchor="middle" fill="#ffeec7" fontFamily="sans-serif" fontSize="40" fontWeight="900" letterSpacing="16" opacity=".82">VERSUS</text>
    </svg>
  )
  return (
    <svg className={className} viewBox="0 0 1200 660" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Original science-fiction game artwork with a lime spaceship dodging falling crimson blocks">
      <defs>
        <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#111b38"/><stop offset=".44" stopColor="#182a4b"/><stop offset="1" stopColor="#090d20"/></linearGradient>
        <radialGradient id={`${gradient}-glow`}><stop stopColor="#7cffba" stopOpacity=".52"/><stop offset="1" stopColor="#7cffba" stopOpacity="0"/></radialGradient>
        <filter id={`${gradient}-blur`}><feGaussianBlur stdDeviation="24"/></filter>
      </defs>
      <rect width="1200" height="660" fill={`url(#${gradient})`}/>
      <circle cx="770" cy="390" r="320" fill={`url(#${gradient}-glow)`}/>
      <g stroke="#8ab5e5" strokeWidth="2" strokeOpacity=".16">
        {Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${i * 125 - 100} 0V660`}/>)}
        {Array.from({ length: 11 }, (_, i) => <path key={i} d={`M0 ${i * 70}H1200`}/>)}
      </g>
      <g fill="#f56783" stroke="#ffc18b" strokeWidth="5">
        <rect x="650" y="67" width="77" height="77" rx="9" transform="rotate(-19 688 105)"/>
        <rect x="951" y="195" width="115" height="115" rx="12" transform="rotate(22 1008 252)"/>
        <rect x="531" y="276" width="59" height="59" rx="6" transform="rotate(15 560 306)"/>
        <rect x="1130" y="16" width="82" height="82" rx="9" transform="rotate(11 1171 57)"/>
      </g>
      <g fill="#bfff8c" stroke="#77f9a0" strokeWidth="5">
        <circle cx="824" cy="192" r="28" opacity=".97"/><circle cx="824" cy="192" r="42" fill="none" opacity=".45"/>
        <circle cx="1090" cy="427" r="17"/><circle cx="1090" cy="427" r="31" fill="none" opacity=".35"/>
      </g>
      <path d="M200 600 725 355 1200 600" fill="none" stroke="#8bf7b9" strokeOpacity=".17" strokeWidth="3"/>
      <path d="M100 660 725 355 1350 660" fill="none" stroke="#9decdd" strokeOpacity=".16" strokeWidth="3"/>
      <ellipse cx="792" cy="570" rx="210" ry="58" fill="#69ffb0" opacity=".36" filter={`url(#${gradient}-blur)`}/>
      <g transform="translate(780 466)">
        <path d="M0 -155 133 124 13 85 0 44-13 85-133 124Z" fill="#aaff90" stroke="#e9ffc0" strokeWidth="11" strokeLinejoin="round"/>
        <path d="M0 -92 53 74 0 39-53 74Z" fill="#123c3d"/>
        <path d="M-65 128 -40 199 0 125 40 199 65 128" fill="#6ef5ff" opacity=".85"/>
        <path d="M-77 133 -46 214M77 133 46 214" stroke="#78ebfb" strokeWidth="12" strokeLinecap="round" opacity=".3"/>
      </g>
      <g stroke="#c9ffff" strokeWidth="3" strokeLinecap="round" opacity=".6"><path d="M747 188v85M815 59v63M1037 358v90M608 87v58"/></g>
    </svg>
  )
}
