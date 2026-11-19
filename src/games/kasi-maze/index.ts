import * as Phaser from 'phaser'
import type { GameContext, GameModule, GameRunStats } from '../../engine/games/types'
import type { PlayerAction } from '../../engine/input/InputRouter'
import { createMaze, walkable, routeTowards, keyOf, DELTA, OPPOSITE, COLUMNS, ROWS, PLAYER_SPAWN, type Maze, type Direction, type Point } from './maze'
import { getKasiCharacter, type KasiCharacter } from './characters'
import { getKasiAudio, disposeKasiAudio, type AudioDirector } from './audio'
import { districtFor, type DistrictTheme } from './themes'

/** Original townscape / maze-chase gameplay. Renderer and game rules stay inside Phaser. */
const W=1440
const H=810
const TILE=39
const LEFT=(W-COLUMNS*TILE)/2
const TOP=99
const middle=(p:Point)=>({x:LEFT+(p.x+.5)*TILE,y:TOP+(p.y+.5)*TILE})
const RIVALS=[
  {name:'VUMA',color:0xFF648D,corner:{x:27,y:1},personality:0},
  {name:'DUMA',color:0x60E5F0,corner:{x:1,y:1},personality:1},
  {name:'ZOLA',color:0xFFC077,corner:{x:27,y:15},personality:2},
  {name:'MAKHI',color:0xB993FF,corner:{x:1,y:15},personality:3},
] as const
type RivalStyle=typeof RIVALS[number]
interface Mover { col:number;row:number;direction:Direction|null;progress:number;node:Phaser.GameObjects.Container }
interface Rival extends Mover { style:RivalStyle; releaseAt:number; respawnIn:number; panic:Phaser.GameObjects.Arc }
class KasiMazeScene extends Phaser.Scene {
  private maze:Maze=createMaze()
  private theme:DistrictTheme=districtFor(1)
  private readonly hero:KasiCharacter
  private streets!:Phaser.GameObjects.Graphics
  private buildings!:Phaser.GameObjects.Graphics
  private decals!:Phaser.GameObjects.Graphics
  private dots=new Map<string,Phaser.GameObjects.Arc>()
  private runner!:Mover
  private rivals:Rival[]=[]
  private desired:Direction|null=null
  private desiredUntil=0
  private held=new Set<Direction>()
  private prepared=false
  private pending=false
  private running=false
  private sessionStarted=false
  private score=0
  private lives=3
  private district=1
  private runTime=0
  private powered=0
  private protectedFor=0
  private countdown=0
  private combo=0
  private totalBeats=0
  private rivalsTagged=0
  private pulse=0
  private trailTime=0
  private banner!:Phaser.GameObjects.Text
  private districtLabel!:Phaser.GameObjects.Text
  private counterLabel!:Phaser.GameObjects.Text
  private livesLabel!:Phaser.GameObjects.Text
  private powerLabel!:Phaser.GameObjects.Text
  private powerFill!:Phaser.GameObjects.Rectangle
  private playerGlow!:Phaser.GameObjects.Arc
  private readonly reducedMotion:boolean
  constructor(private readonly context:GameContext,private readonly audio:AudioDirector){
    super({key:'KasiMaze'})
    this.hero=getKasiCharacter(context.characterId)
    this.reducedMotion=context.reducedMotion??false
  }
  preload() {
    this.load.svg('kasi-town-background',`${import.meta.env.BASE_URL}kasi/taxi-rank.svg`)
  }
  create() {
    this.cameras.main.setBackgroundColor('#091426')
    if(this.textures.exists('kasi-town-background')){
      this.add.image(W/2,H/2,'kasi-town-background').setDisplaySize(W,H).setDepth(-12)
    }
    this.streets=this.add.graphics().setDepth(1)
    this.buildings=this.add.graphics().setDepth(2)
    this.decals=this.add.graphics().setDepth(3)
    this.makeHUD()
    this.makeMovers()
    this.prepared=true
    this.context.emit({type:'ready'})
    if(this.pending)this.startRun()
  }
  private makeHUD(){
    const heading=this.add.text(LEFT,29,'KASI  /  MAZE',{
      fontFamily:'Space Grotesk, sans-serif',fontSize:'25px',fontStyle:'bold',color:'#E8FFF1',
    }).setDepth(10)
    heading.setShadow(0,0,'#7CFFC4',8)
    this.districtLabel=this.add.text(LEFT+230,40,'DISTRICT 01  /  TAXI RANK NIGHTS',{
      fontFamily:'monospace',fontSize:'13px',color:'#C8E2DC',fontStyle:'bold',
    }).setDepth(10)
    this.livesLabel=this.add.text(LEFT+COLUMNS*TILE,29,'◆  ◆  ◆',{
      fontFamily:'monospace',fontSize:'23px',color:'#BEFF85',
    }).setOrigin(1,0).setDepth(10)
    this.counterLabel=this.add.text(LEFT+18,TOP+ROWS*TILE+8,'BEATS LEFT   000',{
      fontFamily:'monospace',fontSize:'14px',color:'#D1EEE6',
    }).setDepth(10)
    this.powerLabel=this.add.text(LEFT+COLUMNS*TILE,TOP+ROWS*TILE+8,'POWER READY',{
      fontFamily:'monospace',fontSize:'13px',color:'#FFDC98',
    }).setOrigin(1,0).setDepth(10)
    this.add.rectangle(LEFT+COLUMNS*TILE-190,TOP+ROWS*TILE+34,184,5,0x274A48).setOrigin(0,.5).setDepth(10)
    this.powerFill=this.add.rectangle(LEFT+COLUMNS*TILE-190,TOP+ROWS*TILE+34,0,5,0xC1FF91).setOrigin(0,.5).setDepth(11)
    this.banner=this.add.text(W/2,H/2-5,'',{
      fontFamily:'Space Grotesk, sans-serif',fontSize:'82px',fontStyle:'bold',color:'#EFFFDD',
      stroke:'#102738',strokeThickness:8,
    }).setOrigin(.5).setDepth(24)
    this.banner.setShadow(0,7,'#08111E',20)
  }
  private makeMovers() {
    const playerPos=middle(PLAYER_SPAWN)
    this.playerGlow=this.add.circle(playerPos.x,playerPos.y,TILE*.6,this.hero.rgb,.17).setDepth(7)
    this.runner={
      col:PLAYER_SPAWN.x,row:PLAYER_SPAWN.y,direction:null,progress:0,
      node:this.drawRunner().setPosition(playerPos.x,playerPos.y),
    }
    this.rivals=RIVALS.map((style,i)=>{
      const panic=this.add.circle(0,0,25,0x73B9FF,.32).setVisible(false)
      const artwork=this.drawRival(style)
      const position=middle(this.maze.enemies[i])
      const node=this.add.container(position.x,position.y,[panic,artwork]).setDepth(9)
      return {col:this.maze.enemies[i].x,row:this.maze.enemies[i].y,direction:null,progress:0,node,panic,style,releaseAt:3+i*2,respawnIn:0}
    })
  }
  private drawRunner() {
    const g=this.add.graphics()
    const primary=this.hero.rgb
    const id=this.hero.id
    g.fillStyle(0x07131B,.35).fillEllipse(0,15,32,13)
    g.fillStyle(primary,.21).fillCircle(0,0,22)
    g.lineStyle(2,primary,.75).strokeCircle(0,0,19)
    g.fillStyle(0x132A34).fillRoundedRect(-15,-13,30,33,10)
    g.fillStyle(primary).fillRoundedRect(-14,-18,28,25,10)
    // Visible headwear makes the four selectable runners recognizable at tile scale.
    if(id==='sbu') {
      g.fillStyle(0x132D2C).fillRoundedRect(-14,-19,28,10,4)
      g.fillStyle(0xD8FFBB).fillRoundedRect(-16,-14,31,5,2)
    } else if(id==='zee') {
      g.fillStyle(0xFFDA89).fillRoundedRect(-15,-18,30,7,3)
      g.fillStyle(0x27243F).fillRoundedRect(-12,-6,24,9,4)
    } else if(id==='katlego') {
      g.fillStyle(0x6F8DFF).fillRoundedRect(-16,-17,32,7,3)
      g.lineStyle(3,0xD7FDFB).strokeRoundedRect(-14,-12,28,21,8)
    } else {
      g.fillStyle(0xAEF88E).fillRoundedRect(-15,-17,30,9,4)
      g.fillStyle(0xFFC477).fillRoundedRect(-10,-23,20,6,3)
    }
    g.fillStyle(0x0C2931).fillRoundedRect(-12,-6,24,12,5)
    g.fillStyle(0xFFFFFF).fillCircle(-5,-1,3.1).fillCircle(5,-1,3.1)
    g.fillStyle(0xC6FFEA).fillRoundedRect(-12,13,9,7,3).fillRoundedRect(3,13,9,7,3)
    g.lineStyle(2,0xFFFFFF,.6).lineBetween(-8,10,9,10)
    return this.add.container(0,0,[g]).setDepth(12)
  }
  private drawRival(style:RivalStyle) {
    const g=this.add.graphics()
    g.fillStyle(0x101D2F).fillRoundedRect(-17,-16,34,35,11)
    g.lineStyle(3,style.color,.9).strokeRoundedRect(-17,-16,34,35,11)
    g.fillStyle(style.color).fillRoundedRect(-13,-15,26,17,8)
    g.fillStyle(0x152638).fillRoundedRect(-14,-6,28,13,4)
    g.fillStyle(0xF4FCFF).fillCircle(-6,0,3.4).fillCircle(6,0,3.4)
    g.fillStyle(style.color).fillRoundedRect(-13,13,8,8,2).fillRoundedRect(5,13,8,8,2)
    g.lineStyle(3,style.color).lineBetween(0,-15,0,-24)
    g.fillStyle(0xFFFFFF).fillCircle(0,-24,3.4)
    g.lineStyle(2,style.color,.48).strokeCircle(0,0,23)
    return g
  }
  private colorRoof(x:number,y:number){
    const shift=(x*13+y*17)%4
    return shift===0?this.theme.rooftops:shift===1?this.theme.walls:shift===2?0x254258:this.theme.walls
  }
  private drawBoard(){
    const road=this.streets,building=this.buildings,detail=this.decals
    road.clear();building.clear();detail.clear()
    for(const dot of this.dots.values()){this.tweens.killTweensOf(dot);dot.destroy()}
    this.dots.clear()
    this.theme=districtFor(this.district)
    const theme=this.theme
    const fullW=COLUMNS*TILE,fullH=ROWS*TILE
    road.fillStyle(theme.night,.92).fillRoundedRect(LEFT-10,TOP-10,fullW+20,fullH+20,16)
    road.lineStyle(2,theme.glow,.35).strokeRoundedRect(LEFT-10,TOP-10,fullW+20,fullH+20,16)
    road.fillStyle(theme.street).fillRoundedRect(LEFT,TOP,fullW,fullH,8)
    road.lineStyle(1,theme.light,.08)
    for(let y=0;y<=ROWS;y++){const yy=TOP+y*TILE;road.lineBetween(LEFT,yy,LEFT+fullW,yy)}
    for(let x=0;x<=COLUMNS;x++){const xx=LEFT+x*TILE;road.lineBetween(xx,TOP,xx,TOP+fullH)}
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLUMNS;x++){
      const sx=LEFT+x*TILE,sy=TOP+y*TILE
      if(this.maze.walls[y][x]){
        building.fillStyle(0x081521,.48).fillRoundedRect(sx+3,sy+6,TILE-3,TILE-2,5)
        building.fillStyle(theme.walls).fillRoundedRect(sx+1,sy+1,TILE-2,TILE-4,6)
        building.fillStyle(this.colorRoof(x,y),.92).fillRoundedRect(sx+4,sy+3,TILE-8,TILE-11,4)
        building.lineStyle(1,theme.light,.27).lineBetween(sx+7,sy+4,sx+TILE-7,sy+4)
        // Occasional illuminated shopfronts; never hide the walkable paths.
        if((x*11+y*7)%9===0){
          building.fillStyle(theme.light,.48).fillRoundedRect(sx+10,sy+12,7,6,2).fillRoundedRect(sx+22,sy+12,7,6,2)
          building.fillStyle(theme.light,.22).fillRoundedRect(sx+9,sy+21,23,3,1)
        }else if((x+y)%4===0){
          building.fillStyle(theme.glow,.21).fillRoundedRect(sx+10,sy+13,18,3,1)
        }
        // Exposed edges are bright and make the movement boundary unmistakable.
        const openRight=x<COLUMNS-1&&!this.maze.walls[y][x+1]
        const openLeft=x>0&&!this.maze.walls[y][x-1]
        const openUp=y>0&&!this.maze.walls[y-1][x]
        const openDown=y<ROWS-1&&!this.maze.walls[y+1][x]
        building.lineStyle(2.4,theme.glow,.78)
        if(openRight)building.lineBetween(sx+TILE-1,sy+4,sx+TILE-1,sy+TILE-5)
        if(openLeft)building.lineBetween(sx+1,sy+4,sx+1,sy+TILE-5)
        if(openUp)building.lineBetween(sx+4,sy+1,sx+TILE-5,sy+1)
        if(openDown)building.lineBetween(sx+4,sy+TILE-2,sx+TILE-5,sy+TILE-2)
      }else{
        // Tiny street markers, limited and low-contrast enough to avoid visual noise.
        if((x*3+y*5)%11===0){
          road.lineStyle(2,theme.light,.16).lineBetween(sx+12,sy+TILE-4,sx+TILE-12,sy+TILE-4)
        }
        if((x+y)%16===0){
          detail.fillStyle(theme.glow,.25).fillCircle(sx+TILE-7,sy+7,2)
        }
      }
    }
    // A distinct, readable center taxi-rank plaza.
    const plaza=middle({x:14,y:8})
    detail.lineStyle(3,theme.light,.45).strokeRoundedRect(plaza.x-88,plaza.y-55,176,111,17)
    detail.lineStyle(2,theme.accent,.24).strokeRoundedRect(plaza.x-81,plaza.y-48,162,96,13)
    for(const [key,kind] of this.maze.pellets){
      const [x,y]=key.split(',').map(Number)
      const p=middle({x,y})
      const dot=kind==='boost'
        ? this.add.circle(p.x,p.y,11,theme.light,.95).setStrokeStyle(3,0xFFFFFF,.72)
        : this.add.circle(p.x,p.y,4,0xC9FFDF,.93)
      dot.setDepth(5)
      this.dots.set(key,dot)
      if(kind==='boost'&&!this.reducedMotion) this.tweens.add({targets:dot,scale:1.18,duration:630,yoyo:true,repeat:-1})
    }
    this.updateHUD()
  }
  private place(mover:Mover){
    const p=middle({x:mover.col,y:mover.row})
    mover.node.setPosition(p.x,p.y)
    mover.node.setRotation(0)
  }
  private resetPositions(){
    this.runner.col=this.maze.start.x;this.runner.row=this.maze.start.y
    this.runner.progress=0;this.runner.direction=null;this.place(this.runner)
    this.playerGlow.setPosition(this.runner.node.x,this.runner.node.y)
    this.desired=null;this.desiredUntil=0;this.held.clear()
    this.rivals.forEach((rival,i)=>{
      const origin=this.maze.enemies[i]
      rival.col=origin.x;rival.row=origin.y;rival.progress=0;rival.direction=null
      rival.releaseAt=this.runTime+3+i*2.2
      rival.respawnIn=0;rival.node.setAlpha(1).setVisible(true)
      rival.panic.setVisible(false);this.place(rival)
    })
  }
  private startRun(){
    if(!this.prepared){this.pending=true;return}
    this.district=1;this.score=0;this.lives=3;this.runTime=0
    this.totalBeats=0;this.rivalsTagged=0;this.combo=0;this.powered=0
    this.protectedFor=2.4;this.countdown=2.8;this.running=true;this.sessionStarted=false
    this.maze=createMaze(this.district);this.drawBoard();this.resetPositions()
    this.audio.unlock();this.audio.mode('game');this.audio.effect('countdown')
    this.context.emit({type:'score',score:0})
    this.context.emit({type:'stats',stats:this.stats()})
  }
  private stats():GameRunStats{
    return {characterId:this.hero.id,district:this.district,beatsCollected:this.totalBeats,rivalsTagged:this.rivalsTagged}
  }
  private nextDistrict(){
    this.score+=500*this.district
    this.context.emit({type:'score',score:this.score})
    this.context.emit({type:'stats',stats:this.stats()})
    this.audio.effect('level')
    if(!this.reducedMotion)this.cameras.main.flash(250,195,255,158)
    this.district++;this.combo=0;this.powered=0;this.protectedFor=2
    this.countdown=2.7;this.sessionStarted=true
    this.maze=createMaze(this.district);this.drawBoard();this.resetPositions()
  }
  private updateHUD(){
    if(!this.districtLabel)return
    this.districtLabel.setText(`DISTRICT ${String(this.district).padStart(2,'0')}  /  ${this.theme.name}`)
    this.livesLabel.setText('◆  '.repeat(this.lives).trim()||'NO LIVES')
    this.counterLabel.setText(`BEATS LEFT   ${String(this.maze.pellets.size).padStart(3,'0')}`)
    this.powerLabel.setText(this.powered>0?`POWER MODE  ${this.powered.toFixed(1)}s`:'FIND A GOLDEN BEAT')
    this.powerFill.width=(this.powered/(6.5+this.hero.powerBonus))*184
  }
  private runnerChoice():Direction|null{
    const p={x:this.runner.col,y:this.runner.row}
    const desired=this.desired
    if(desired&&(this.held.has(desired)||this.runTime<this.desiredUntil)&&walkable(this.maze,{x:p.x+DELTA[desired].x,y:p.y+DELTA[desired].y})) return desired
    const current=this.runner.direction
    return current&&walkable(this.maze,{x:p.x+DELTA[current].x,y:p.y+DELTA[current].y})?current:null
  }
  private rivalChoice(rival:Rival):Direction|null{
    const p={x:rival.col,y:rival.row}
    const reverse=rival.direction?OPPOSITE[rival.direction]:undefined
    const scatter=Math.floor(this.runTime/12)%4===3
    let target:Point={x:this.runner.col,y:this.runner.row}
    if(this.powered>0)target={x:p.x+(p.x-target.x)*2,y:p.y+(p.y-target.y)*2}
    else if(scatter)target=rival.style.corner
    else if(rival.style.personality===1){
      const d=this.runner.direction?DELTA[this.runner.direction]:{x:0,y:0}
      target={x:target.x+d.x*4,y:target.y+d.y*4}
    }else if(rival.style.personality===2){
      const d=this.runner.direction?DELTA[this.runner.direction]:{x:0,y:0}
      target={x:target.x+d.x*2,y:target.y+d.y*2}
    }else if(rival.style.personality===3&&Math.abs(p.x-target.x)+Math.abs(p.y-target.y)<6)target=rival.style.corner
    return routeTowards(this.maze,p,target,reverse)
  }
  private advance(mover:Mover,dt:number,speed:number,decide:()=>Direction|null,onCell?:()=>void){
    let remaining=speed*dt
    while(remaining>0.0001){
      if(mover.progress===0){
        const next=decide()
        if(!next){mover.direction=null;break}
        mover.direction=next
      }
      const direction=mover.direction
      if(!direction)break
      const step=Math.min(remaining,1-mover.progress)
      remaining-=step;mover.progress+=step
      const from=middle({x:mover.col,y:mover.row})
      mover.node.setPosition(from.x+DELTA[direction].x*TILE*mover.progress,from.y+DELTA[direction].y*TILE*mover.progress)
      if(mover.progress>=.99999){
        mover.col+=DELTA[direction].x;mover.row+=DELTA[direction].y
        mover.progress=0;this.place(mover);onCell?.()
        if(!this.running||this.countdown>0)break
      }
    }
  }
  private burst(x:number,y:number,color:number,amount=7){
    if(this.reducedMotion)return
    for(let i=0;i<amount;i++){
      const circle=this.add.circle(x,y,3.5+(i%3),color,.8).setDepth(20)
      const angle=i/amount*Math.PI*2
      this.tweens.add({targets:circle,x:x+Math.cos(angle)*29,y:y+Math.sin(angle)*29,alpha:0,scale:.2,duration:330,onComplete:()=>circle.destroy()})
    }
  }
  private popup(x:number,y:number,label:string,color='#C5FF98'){
    const text=this.add.text(x,y,label,{fontFamily:'Space Grotesk,sans-serif',fontSize:'23px',fontStyle:'bold',color,stroke:'#061725',strokeThickness:4}).setOrigin(.5).setDepth(22)
    this.tweens.add({targets:text,y:y-32,alpha:0,duration:this.reducedMotion?150:650,onComplete:()=>text.destroy()})
  }
  private pickup(){
    const key=keyOf({x:this.runner.col,y:this.runner.row})
    const kind=this.maze.pellets.get(key)
    if(!kind)return
    this.maze.pellets.delete(key)
    const dot=this.dots.get(key)
    if(dot){this.tweens.killTweensOf(dot);dot.destroy()}
    this.dots.delete(key)
    if(kind==='boost'){
      this.score+=50;this.powered=6.5+this.hero.powerBonus;this.combo=0
      this.audio.mode('power');this.audio.effect('power')
      this.popup(this.runner.node.x,this.runner.node.y-16,'POWER UP!','#FFE3A5')
      this.burst(this.runner.node.x,this.runner.node.y,this.theme.light,10)
      if(!this.reducedMotion)this.cameras.main.flash(110,249,222,132)
    }else{
      const points=Math.round(10*this.hero.scoreMultiplier)
      this.score+=points;this.totalBeats++
      this.audio.effect('pickup',this.totalBeats)
      if(this.totalBeats%10===0)this.popup(this.runner.node.x,this.runner.node.y-10,`+${points*10} VIBES`)
      else if(this.totalBeats%3===0)this.burst(this.runner.node.x,this.runner.node.y,this.theme.accent,3)
    }
    this.context.emit({type:'score',score:this.score})
    if(this.maze.pellets.size===0)this.nextDistrict()
    else this.updateHUD()
  }
  private collisions(){
    for(const rival of this.rivals){
      if(rival.respawnIn>0||this.runTime<rival.releaseAt)continue
      const dx=this.runner.node.x-rival.node.x,dy=this.runner.node.y-rival.node.y
      if(dx*dx+dy*dy>Math.pow(TILE*.63,2))continue
      if(this.powered>0){
        this.combo++;this.rivalsTagged++
        const points=200*Math.pow(2,Math.min(3,this.combo-1))
        this.score+=points
        this.context.emit({type:'score',score:this.score})
        this.audio.effect('tag');this.burst(rival.node.x,rival.node.y,rival.style.color,9)
        this.popup(rival.node.x,rival.node.y,`+${points}`)
        rival.respawnIn=3.7;rival.node.setVisible(false)
        continue
      }
      if(this.protectedFor>0)continue
      this.lives--;this.protectedFor=1.8;this.powered=0
      this.audio.mode('danger');this.audio.effect('hit')
      this.burst(this.runner.node.x,this.runner.node.y,0xFF709C,12)
      if(!this.reducedMotion)this.cameras.main.shake(160,.0025)
      if(this.lives<=0){
        this.running=false
        this.context.emit({type:'stats',stats:this.stats()})
        this.context.emit({type:'ended',score:this.score,reason:'game-over',stats:this.stats()})
        this.audio.effect('over');this.audio.mode('menu')
      }else{
        this.countdown=1.5
        this.resetPositions()
      }
      this.updateHUD()
      return
    }
  }
  setAction(action:PlayerAction,pressed:boolean){
    const controls:Partial<Record<PlayerAction,Direction>>={
      MOVE_LEFT:'left',MOVE_RIGHT:'right',MOVE_UP:'up',MOVE_DOWN:'down',
    }
    const direction=controls[action]
    if(!direction||!this.running)return
    if(pressed){
      this.held.add(direction);this.desired=direction
      this.desiredUntil=this.runTime+this.hero.cornerBufferMs/1000
      // Reverse instantly between grid centers with no teleport.
      const old=this.runner.direction
      if(old===OPPOSITE[direction]&&this.runner.progress>0){
        this.runner.col+=DELTA[old].x;this.runner.row+=DELTA[old].y
        this.runner.progress=1-this.runner.progress
        this.runner.direction=direction
      }
    }else{
      this.held.delete(direction)
      if(this.desired===direction){
        const next=[...this.held].at(-1)
        if(next)this.desired=next
        else this.desiredUntil=this.runTime+this.hero.cornerBufferMs/1000
      }
    }
  }
  update(_time:number,delta:number){
    if(!this.prepared||!this.running)return
    const dt=Math.min(delta/1000,.042)
    this.pulse+=dt
    if(this.countdown>0){
      const previous=Math.ceil(this.countdown)
      this.countdown=Math.max(0,this.countdown-dt)
      const current=Math.ceil(this.countdown)
      this.banner.setText(current>0?String(current):'GO!')
      this.banner.setVisible(true)
      this.banner.setScale(current>0?1+Math.sin(this.countdown*Math.PI)*.04:1.1)
      if(current>0&&current!==previous)this.audio.effect('countdown')
      if(this.countdown===0){
        this.audio.effect('go')
        if(!this.sessionStarted){this.sessionStarted=true;this.context.emit({type:'playing'})}
      }
      return
    }
    this.banner.setVisible(false)
    this.runTime+=dt
    this.protectedFor=Math.max(0,this.protectedFor-dt)
    this.powered=Math.max(0,this.powered-dt)
    this.trailTime+=dt
    if(this.powered===0&&this.audioModePowered){this.audioModePowered=false;this.audio.mode('game')}
    if(this.powered>0)this.audioModePowered=true
    this.advance(this.runner,dt,6.2*this.hero.speed,()=>this.runnerChoice(),()=>this.pickup())
    this.runner.node.setRotation(this.runner.direction==='left' ? -.12 : this.runner.direction==='right' ? .12 : 0)
    this.runner.node.setAlpha(this.protectedFor>0?.75+Math.sin(this.pulse*14)*.2:1)
    this.playerGlow.setPosition(this.runner.node.x,this.runner.node.y)
    this.playerGlow.setAlpha(this.powered>0?.3+Math.sin(this.pulse*8)*.08:.1)
    if(this.trailTime>.16&&!this.reducedMotion&&(this.runner.direction!==null||this.powered>0)){
      this.trailTime=0
      const spark=this.add.circle(this.runner.node.x,this.runner.node.y,4,this.hero.rgb,.65).setDepth(6)
      this.tweens.add({targets:spark,alpha:0,scale:.2,duration:260,onComplete:()=>spark.destroy()})
    }
    for(const rival of this.rivals){
      if(rival.respawnIn>0){
        rival.respawnIn-=dt
        if(rival.respawnIn<=0){
          const index=RIVALS.indexOf(rival.style)
          const start=this.maze.enemies[index]
          rival.col=start.x;rival.row=start.y;rival.progress=0;rival.direction=null
          rival.releaseAt=this.runTime+.7;rival.node.setVisible(true).setAlpha(1);this.place(rival)
        }
        continue
      }
      if(this.runTime<rival.releaseAt)continue
      const frightened=this.powered>0
      rival.panic.setVisible(frightened)
      rival.node.setAlpha(frightened?.75+Math.sin(this.pulse*10)*.19:1)
      const speed=frightened?3.55:4.15+Math.min(.95,this.runTime*.018)+(this.district-1)*.13+rival.style.personality*.07
      this.advance(rival,dt,speed,()=>this.rivalChoice(rival))
    }
    this.collisions()
    this.powerFill.width=Math.max(0,this.powered/(6.5+this.hero.powerBonus))*184
    if(this.powered>0)this.powerLabel.setText(`POWER MODE  ${this.powered.toFixed(1)}s`)
    else if(this.powerLabel.text!=='FIND A GOLDEN BEAT')this.powerLabel.setText('FIND A GOLDEN BEAT')
  }
  private audioModePowered=false
  begin(){this.startRun()}
  stop(){this.running=false;this.held.clear();this.desired=null}
}
export const mount:GameModule['mount']=async(context)=>{
  const audio=getKasiAudio(context.sound)
  const scene=new KasiMazeScene(context,audio)
  const game=new Phaser.Game({
    type:Phaser.AUTO,parent:context.parent,width:W,height:H,
    backgroundColor:'#091426',render:{antialias:true,pixelArt:false},
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:W,height:H},
    fps:{target:60,min:30},scene:[scene],
  })
  const unsubscribe=context.input.subscribe(event=>{
    if(event.playerId!==context.playerId||event.repeated)return
    scene.setAction(event.action,event.phase==='pressed')
  })
  let destroyed=false
  return {
    start(){if(!destroyed)scene.begin()},
    pause(){if(!destroyed){scene.scene.pause();audio.pause()}},
    resume(){if(!destroyed){scene.scene.resume();audio.resume()}},
    restart(){if(!destroyed){scene.scene.resume();audio.resume();scene.begin()}},
    destroy(){
      if(destroyed)return
      destroyed=true;unsubscribe();scene.stop();game.destroy(true);disposeKasiAudio()
    },
  }
}
