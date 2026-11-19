export interface DistrictTheme {
  name:string
  subtitle:string
  night:number
  street:number
  walls:number
  rooftops:number
  light:number
  glow:number
  accent:number
}
export const DISTRICTS: readonly DistrictTheme[] = [
  {name:'TAXI RANK NIGHTS',subtitle:'THE CITY IS WIDE AWAKE',night:0x110d1c,street:0x241b2e,walls:0x554057,rooftops:0x7f4d55,light:0xFFDA88,glow:0xd99578,accent:0xB9FF8A},
  {name:'NEON BACKSTREETS',subtitle:'TAKE THE LONG WAY HOME',night:0x120F2B,street:0x222044,walls:0x44345B,rooftops:0x624078,light:0xFFA0CD,glow:0xBA88FF,accent:0x73E7F8},
  {name:'WEEKEND VIBES',subtitle:'THE PARTY NEVER STOPS',night:0x0D1F29,street:0x244347,walls:0x3C5963,rooftops:0x567F78,light:0xFFCC7B,glow:0xFF9F88,accent:0xBBFF85},
  {name:'FINAL BLOCK PARTY',subtitle:'THIS ONE IS FOR THE KASI',night:0x1C132B,street:0x343047,walls:0x634663,rooftops:0x865A88,light:0xFFE3A6,glow:0xFF78BC,accent:0xA9FF8A},
]
export function districtFor(level:number):DistrictTheme{return DISTRICTS[(Math.max(1,level)-1)%DISTRICTS.length]}
