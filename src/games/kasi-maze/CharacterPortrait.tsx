import { useId } from 'react'
import { getKasiCharacter, type KasiCharacterId } from './characters'

/** Original, fully scalable vector portraits. No external artwork or downloaded character IP. */
export function CharacterPortrait({ id, className = '' }: { id: KasiCharacterId; className?: string }) {
  const c = getKasiCharacter(id)
  const token = useId().replace(/:/g, '')
  const bg = 'portrait-bg-' + token
  const shirt = 'portrait-shirt-' + token
  const dark = id === 'sbu' ? '#102D30' : id === 'zee' ? '#43284A' : id === 'katlego' ? '#142D4A' : '#4F3329'
  const skin = id === 'sbu' ? '#975C45' : id === 'zee' ? '#BE815E' : id === 'katlego' ? '#A76A4B' : '#693F32'
  return <svg className={className} viewBox="0 0 350 410" role="img" aria-label={`Original illustrated character portrait of ${c.name}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor={c.secondary} stopOpacity=".42"/><stop offset=".6" stopColor="#102334"/><stop offset="1" stopColor={c.color} stopOpacity=".24"/>
      </linearGradient>
      <linearGradient id={shirt} x1=".1" y1="0" x2=".8" y2="1">
        <stop stopColor={c.color}/><stop offset="1" stopColor={c.secondary}/>
      </linearGradient>
      <filter id={'glow-'+token}><feGaussianBlur stdDeviation="8"/></filter>
    </defs>
    <rect width="350" height="410" rx="18" fill={'url(#'+bg+')'}/>
    <circle cx="176" cy="171" r="132" fill={c.color} opacity=".1"/>
    <circle cx="176" cy="171" r="108" fill="none" stroke={c.color} strokeOpacity=".22" strokeWidth="2"/>
    <path d="M0 338 60 320 97 326 150 298 230 302 294 329 350 312V410H0Z" fill="#0B1625" opacity=".55"/>
    <path d="M18 73 40 73M28 63V83M300 85h20M310 75v20M42 215h35M290 236h32" stroke={c.color} strokeWidth="3" strokeLinecap="round" opacity=".45"/>
    <ellipse cx="174" cy="397" rx="114" ry="17" fill={c.color} opacity=".26" filter={'url(#glow-'+token+')'}/>
    {/* original stylized athletic torso */}
    <path d="M54 409Q54 318 87 296L135 274Q174 261 212 274L263 297Q297 318 299 409Z" fill={dark} stroke={c.color} strokeWidth="5"/>
    <path d="M93 409 97 317 133 289 174 323 217 288 251 321 259 409Z" fill={'url(#'+shirt+')'} opacity=".9"/>
    <path d="M126 292 174 329 223 291 215 279 177 264 139 279Z" fill="#152335"/>
    <path d="M160 325v85M188 325v85" stroke={dark} strokeWidth="7" opacity=".48"/>
    {id === 'zee' && <><path d="M104 318 123 359 97 409H74l-1-73Z" fill="#EDB767"/><path d="M246 318 224 358 248 409h24l4-73Z" fill="#EDB767"/></>}
    {id === 'katlego' && <><path d="M100 318 137 292 175 327 212 291 251 324 244 410H104Z" fill="#1D4768" opacity=".5"/><path d="M110 342 146 330M241 342l-36-12" stroke="#B4F7FC" strokeWidth="7" strokeLinecap="round"/></>}
    {id === 'thami' && <><path d="M118 317 173 352 224 317" stroke="#ACFF85" strokeWidth="13" strokeLinecap="round"/><circle cx="173" cy="351" r="11" fill="#FFEB9D"/></>}
    {/* character's face and hair remain fully original, differentiated by accessories */}
    <rect x="157" y="245" width="36" height="45" rx="11" fill={skin}/>
    <path d="M111 132Q110 77 173 76Q241 78 244 141L232 237Q211 275 174 276Q137 275 114 230Z" fill={skin} stroke="#5D3B33" strokeWidth="4"/>
    <path d="M114 177Q105 153 96 175Q89 197 118 206M234 177q14-20 21 0Q259 201 231 207" fill={skin} stroke="#754936" strokeWidth="5"/>
    <path d="M129 193Q144 181 160 194M187 194Q204 181 221 193" fill="none" stroke="#38292E" strokeWidth="5" strokeLinecap="round"/>
    <circle cx="147" cy="197" r="5" fill="#182435"/><circle cx="202" cy="197" r="5" fill="#182435"/>
    <path d="M171 204 168 225 179 225" fill="none" stroke="#744539" strokeWidth="4" strokeLinecap="round"/>
    <path d="M150 239Q175 251 199 239" fill="none" stroke="#492F31" strokeWidth="5" strokeLinecap="round"/>
    {id === 'sbu' && <>
      <path d="M107 149Q89 76 128 68Q163 34 216 66Q249 81 242 143L214 130 134 130Z" fill="#141C25"/>
      <path d="M99 140Q146 105 243 132l-5 22q-89-18-138 3Z" fill="#1C3A2C" stroke={c.color} strokeWidth="6"/>
      <path d="M114 164H235" stroke="#A2FFAD" strokeWidth="6" strokeLinecap="round"/>
    </>}
    {id === 'zee' && <>
      <path d="M107 178Q79 87 135 65Q174 20 230 75Q258 106 239 172L225 155 228 120 143 126 124 158Z" fill="#281B34"/>
      <path d="M130 101Q180 66 226 115" fill="none" stroke="#FFB2D4" strokeWidth="10"/>
      <path d="M124 186h45l-5 21h-37ZM181 186h45l-4 21h-36Z" fill="#241B39" stroke="#FFDA9B" strokeWidth="3"/>
      <path d="M168 195h15" stroke="#FFDA9B" strokeWidth="4"/>
      <circle cx="121" cy="226" r="6" fill="#FFD68C"/><circle cx="231" cy="226" r="6" fill="#FFD68C"/>
    </>}
    {id === 'katlego' && <>
      <path d="M109 163Q87 89 138 65Q181 42 225 78Q246 96 240 162L215 136 138 137Z" fill="#18263D"/>
      <path d="M104 131Q159 91 244 129l-6 26q-84-20-133 6Z" fill="#63F1ED" stroke="#D9FFFA" strokeWidth="4"/>
      <path d="M116 165 129 154M220 154l13 11" stroke="#80C7FF" strokeWidth="6"/>
    </>}
    {id === 'thami' && <>
      <path d="M107 142Q84 70 156 58Q206 46 237 102L244 149Q215 125 189 115L127 137Z" fill="#382A28"/>
      <path d="M99 120Q178 52 245 126l-5 25q-88-39-135 3Z" fill="#FFAD54" stroke="#FFDEAC" strokeWidth="4"/>
      <path d="M127 88Q164 65 209 86" stroke="#B5F989" strokeWidth="12" strokeLinecap="round"/>
      <path d="M238 165Q269 183 256 217" fill="none" stroke="#A1FF9D" strokeWidth="9" strokeLinecap="round"/>
    </>}
    <text x="20" y="46" fontFamily="monospace" fontWeight="900" letterSpacing="3" fontSize="13" fill={c.color}>KASI // 0{['sbu','zee','katlego','thami'].indexOf(id)+1}</text>
    <path d="M22 374h49" stroke={c.color} strokeWidth="4" strokeLinecap="round"/>
  </svg>
}
