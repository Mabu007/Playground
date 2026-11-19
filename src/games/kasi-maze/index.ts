import * as Phaser from 'phaser'
import type { GameContext, GameModule, GameRunStats } from '../../engine/games/types'
import type { PlayerAction } from '../../engine/input/InputRouter'
import { createMaze, walkable, routeTowards, lookAhead, chasePhase, keyOf, DELTA, OPPOSITE, COLUMNS, ROWS, PLAYER_SPAWN, type Maze, type Direction, type Point } from './maze'
import { getKasiCharacter, type KasiCharacter } from './characters'
import { getKasiAudio, disposeKasiAudio, type AudioDirector } from './audio'
import { advanceTrack, pathsMeet, reverseTrack, STEP_SECONDS, trackPoint, TurnBuffer, type TrackPosition } from './movement'
import { paintStreets } from './streets'
import { DISTRICTS, districtFor, type DistrictTheme } from './themes'

/** Original townscape / maze-chase gameplay. Renderer and game rules stay inside Phaser. */
const W=1195
const H=755
const TILE=39
const LEFT=(W-COLUMNS*TILE)/2
const TOP=44
const middle=(p:Point)=>({x:LEFT+(p.x+.5)*TILE,y:TOP+(p.y+.5)*TILE})
const RIVALS=[
  {name:'VUMA',color:0xFF648D,corner:{x:27,y:1},personality:0},
  {name:'DUMA',color:0x60E5F0,corner:{x:1,y:1},personality:1},
  {name:'ZOLA',color:0xFFC077,corner:{x:27,y:15},personality:2},
  {name:'MAKHI',color:0xB993FF,corner:{x:1,y:15},personality:3},
] as const
type RivalStyle=typeof RIVALS[number]
interface Mover extends TrackPosition { node:Phaser.GameObjects.Container; portrait:Phaser.GameObjects.Image }
interface Rival extends Mover { style:RivalStyle; releaseAt:number; respawnIn:number; panic:Phaser.GameObjects.Arc }
class KasiMazeScene extends Phaser.Scene {
  private maze:Maze=createMaze()
  private theme:DistrictTheme=districtFor(1)
  private readonly hero:KasiCharacter
  private streets!:Phaser.GameObjects.Graphics
  private board!:Phaser.GameObjects.Image
  private dots=new Map<string,Phaser.GameObjects.Shape>()
  private runner!:Mover
  private rivals:Rival[]=[]
  private readonly turns:TurnBuffer
  private accumulator=0
  private districtTime=0
  private suspended=false
  private firstFrame=true
  private readyLabel='GET SET'
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
  private reportedPower=-1
  private powerFill!:Phaser.GameObjects.Rectangle
  private playerGlow!:Phaser.GameObjects.Arc
  private readonly reducedMotion:boolean
  constructor(private readonly context:GameContext,private readonly audio:AudioDirector){
    super({key:'KasiMaze'})
    this.hero=getKasiCharacter(context.characterId)
    this.reducedMotion=context.reducedMotion??false
    this.turns=new TurnBuffer(this.hero.cornerBufferMs/1000)
  }
  preload() {
    this.load.svg('street-crew',`${import.meta.env.BASE_URL}kasi/street-crew.svg`)
  }
  create() {
    const atlas=this.textures.get('street-crew')
    for(let index=0;index<8;index++) atlas.add(index,0,index*64,0,64,64)
    this.streets=this.add.graphics().setVisible(false)
    this.board=this.add.image(0,0,'__WHITE').setOrigin(0).setDepth(1)
    this.makeHUD()
    this.makeMovers()
    this.prepared=true
    this.context.emit({type:'ready'})
    if(this.pending)this.startRun()
  }
  private makeHUD(){
    this.districtLabel=this.add.text(LEFT+4,13,'DISTRICT 01  /  TAXI RANK NIGHTS',{
      fontFamily:'monospace',fontSize:'17px',color:'#FFE5B1',fontStyle:'bold',
    }).setDepth(10)
    this.livesLabel=this.add.text(LEFT+COLUMNS*TILE,10,'◆  ◆  ◆',{
      fontFamily:'monospace',fontSize:'18px',color:'#BEFF85',
    }).setOrigin(1,0).setDepth(10)
    this.counterLabel=this.add.text(LEFT+18,TOP+ROWS*TILE+13,'BEATS LEFT   000',{
      fontFamily:'monospace',fontSize:'16px',color:'#F7DFC3',
    }).setDepth(10)
    this.powerLabel=this.add.text(LEFT+COLUMNS*TILE,TOP+ROWS*TILE+13,'POWER READY',{
      fontFamily:'monospace',fontSize:'16px',color:'#FFDC98',
    }).setOrigin(1,0).setDepth(10)
    this.add.rectangle(LEFT+COLUMNS*TILE-190,TOP+ROWS*TILE+36,184,5,0x274A48).setOrigin(0,.5).setDepth(10)
    this.powerFill=this.add.rectangle(LEFT+COLUMNS*TILE-190,TOP+ROWS*TILE+36,0,5,0xC1FF91).setOrigin(0,.5).setDepth(11)
    this.banner=this.add.text(W/2,H/2-5,'',{
      fontFamily:'Space Grotesk, sans-serif',fontSize:'49px',fontStyle:'bold',color:'#FFF4D4',
      stroke:'#201421',strokeThickness:12,
    }).setOrigin(.5).setDepth(24)
    this.banner.setShadow(0,5,'#100813',12)
  }
  private makeMovers() {
    const playerPos=middle(PLAYER_SPAWN)
    this.playerGlow=this.add.circle(playerPos.x,playerPos.y,TILE*.6,this.hero.rgb,.17).setDepth(7)
    const heroFrame=['sbu','zee','katlego','thami'].indexOf(this.hero.id)
    const portrait=this.add.image(0,-5,'street-crew',heroFrame).setScale(.83)
    this.runner={
      col:PLAYER_SPAWN.x,row:PLAYER_SPAWN.y,direction:null,progress:0,portrait,
      node:this.add.container(playerPos.x,playerPos.y,[portrait]).setDepth(12),
    }
    this.rivals=RIVALS.map((style,i)=>{
      const panic=this.add.circle(0,0,18,0x77DFFF,.34).setStrokeStyle(2,0xA7EEFF).setVisible(false)
      const portrait=this.add.image(0,-4,'street-crew',i+4).setScale(.74)
      const position=middle(this.maze.enemies[i])
      const node=this.add.container(position.x,position.y,[panic,portrait]).setDepth(9)
      return {col:this.maze.enemies[i].x,row:this.maze.enemies[i].y,direction:null,progress:0,node,portrait,panic,style,releaseAt:0,respawnIn:0}
    })
  }
  private drawBoard(){
    for(const dot of this.dots.values()){this.tweens.killTweensOf(dot);dot.destroy()}
    this.dots.clear()
    this.theme=districtFor(this.district)
    this.streets.clear()
    paintStreets(this.streets,this.maze,this.theme,LEFT,TOP,TILE)
    this.board.setTexture('__WHITE')
    if(this.textures.exists('kasi-board'))this.textures.remove('kasi-board')
    this.streets.generateTexture('kasi-board',W,H)
    this.board.setTexture('kasi-board').setOrigin(0)
    this.context.parent.querySelector('canvas')?.setAttribute('aria-label','Kasi Maze playfield')
    this.streets.clear()
    for(const [key,kind] of this.maze.pellets){
      const [x,y]=key.split(',').map(Number)
      const p=middle({x,y})
      const dot=kind==='boost'
        ? this.add.star(p.x,p.y,4,7,12,0xffc76b).setStrokeStyle(2,0xffeed0)
        : this.add.circle(p.x,p.y,3.2,0xf3d2ae,.92)
      dot.setDepth(5)
      this.dots.set(key,dot)
      if(kind==='boost'&&!this.reducedMotion) this.tweens.add({targets:dot,scale:1.18,duration:630,yoyo:true,repeat:-1})
    }
    this.updateHUD()
  }
  private place(mover:Mover){
    const p=middle(trackPoint(mover))
    mover.node.setPosition(p.x,p.y)
  }
  private resetPositions(){
    this.runner.col=this.maze.start.x;this.runner.row=this.maze.start.y
    this.runner.progress=0;this.runner.direction=null;this.place(this.runner)
    this.playerGlow.setPosition(this.runner.node.x,this.runner.node.y)
    this.clearInput()
    this.rivals.forEach((rival,i)=>{
      const origin=this.maze.enemies[i]
      rival.col=origin.x;rival.row=origin.y;rival.progress=0;rival.direction=null
      rival.releaseAt=this.runTime+(this.district===1?1.8:1.3)+i*1.55
      rival.respawnIn=0;rival.node.setAlpha(.58).setVisible(true)
      rival.panic.setVisible(false);this.place(rival)
    })
  }
  private startRun(){
    if(!this.prepared){this.pending=true;return}
    this.district=1;this.score=0;this.lives=3;this.runTime=0
    this.districtTime=0;this.accumulator=0;this.firstFrame=true
    this.readyLabel='GET SET'
    this.totalBeats=0;this.rivalsTagged=0;this.combo=0;this.powered=0
    this.pulse=0;this.trailTime=0
    this.protectedFor=1.25;this.countdown=.85;this.running=true;this.sessionStarted=false
    this.maze=createMaze(this.district);this.drawBoard();this.resetPositions()
    this.audioModePowered=false
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
    this.audio.effect('level')
    if(this.district===DISTRICTS.length){
      this.running=false
      this.audio.mode('menu')
      this.context.emit({type:'ended',score:this.score,reason:'completed',stats:this.stats()})
      return
    }
    this.audioModePowered=false
    if(!this.reducedMotion)this.cameras.main.flash(250,195,255,158)
    this.district++;this.districtTime=0;this.combo=0;this.powered=0;this.protectedFor=1.25
    this.readyLabel='DISTRICT CLEAR';this.countdown=1.45;this.sessionStarted=true
    this.maze=createMaze(this.district);this.drawBoard();this.resetPositions()
    this.context.emit({type:'stats',stats:this.stats()})
  }
  private updateHUD(){
    if(!this.districtLabel)return
    this.districtLabel.setText(`DISTRICT ${String(this.district).padStart(2,'0')}  /  ${this.theme.name}`)
    this.livesLabel.setText('◆  '.repeat(this.lives).trim()||'NO LIVES')
    this.counterLabel.setText(`BEATS LEFT   ${String(this.maze.pellets.size).padStart(3,'0')}`)
    this.powerLabel.setText(this.powered>0?`POWER MODE  ${this.powered.toFixed(1)}s`:'FIND A GOLDEN BEAT')
    this.powerFill.width=(this.powered/(6.5+this.hero.powerBonus))*184
    this.emitBoardStatus()
  }
  private emitBoardStatus(){
    this.reportedPower=Math.ceil(this.powered)
    this.context.emit({type:'board-status',district:this.district,name:this.theme.name,
      lives:this.lives,remaining:this.maze.pellets.size,powerSeconds:this.reportedPower})
  }
  private runnerChoice():Direction|null{
    const p={x:this.runner.col,y:this.runner.row}
    const available=(direction:Direction)=>walkable(this.maze,{x:p.x+DELTA[direction].x,y:p.y+DELTA[direction].y})
    const buffered=this.turns.choose(this.runTime,available)
    if(buffered)return buffered
    const current=this.runner.direction
    return current&&available(current)?current:null
  }
  private rivalChoice(rival:Rival):Direction|null{
    const p={x:rival.col,y:rival.row}
    const reverse=rival.direction?OPPOSITE[rival.direction]:undefined
    const runner=trackPoint(this.runner)
    const player={x:Math.round(runner.x),y:Math.round(runner.y)}
    if(this.powered>0)return routeTowards(this.maze,p,player,reverse,true)

    let target:Point=rival.style.corner
    if(chasePhase(this.districtTime,this.district)==='chase'){
      switch(rival.style.personality){
        case 0: target=player;break
        case 1: target=lookAhead(this.maze,player,this.runner.direction,4);break
        case 2: {
          // Zola takes the far end of the current avenue when Vuma is behind the runner.
          const lead=lookAhead(this.maze,player,this.runner.direction,2)
          const vuma=this.rivals[0]
          target={x:2*lead.x-vuma.col,y:2*lead.y-vuma.row}
          break
        }
        case 3:
          if(Math.abs(p.x-player.x)+Math.abs(p.y-player.y)>7)target=player
          break
      }
    }
    return routeTowards(this.maze,p,target,reverse)
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
    const {x,y}=middle(trackPoint(this.runner))
    if(kind==='boost'){
      this.score+=75;this.powered=6.5+this.hero.powerBonus;this.combo=0
      this.audio.mode('power');this.audio.effect('power')
      this.popup(x,y-16,'GOLD RUSH  +75','#FFE3A5')
      for(const rival of this.rivals)if(rival.direction&&rival.respawnIn<=0)reverseTrack(rival,OPPOSITE[rival.direction])
      this.burst(x,y,this.theme.light,12)
      if(!this.reducedMotion){
        const ring=this.add.circle(x,y,14).setStrokeStyle(3,0xffce77).setDepth(14)
        this.tweens.add({targets:ring,scale:5,alpha:0,duration:480,onComplete:()=>ring.destroy()})
      }
      if(!this.reducedMotion)this.cameras.main.flash(110,249,222,132)
    }else{
      const points=Math.round(10*this.hero.scoreMultiplier)
      this.score+=points;this.totalBeats++
      this.audio.effect(this.totalBeats%25===0?'milestone':'pickup',this.totalBeats)
      if(this.totalBeats%10===0)this.popup(x,y-10,`+${points*10}`)
      else if(this.totalBeats%3===0)this.burst(x,y,this.theme.accent,2)
    }
    this.context.emit({type:'score',score:this.score})
    this.context.emit({type:'stats',stats:this.stats()})
    if(this.maze.pellets.size===0)this.nextDistrict()
    else this.updateHUD()
  }
  private collisions(previousRunner:Point,previousRivals:Point[]){
    const runner=trackPoint(this.runner)
    for(const [index,rival] of this.rivals.entries()){
      if(rival.respawnIn>0||this.runTime<rival.releaseAt)continue
      if(!pathsMeet(previousRunner,runner,previousRivals[index],trackPoint(rival)))continue
      if(this.powered>0){
        this.combo++;this.rivalsTagged++
        const points=200*Math.pow(2,Math.min(3,this.combo-1))
        this.score+=points
        this.context.emit({type:'score',score:this.score})
        this.context.emit({type:'stats',stats:this.stats()})
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
        this.readyLabel='LIFE LOST';this.countdown=1.05
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
    if(!direction||!this.running||this.suspended)return
    if(pressed){
      this.turns.press(direction,this.runTime)
      reverseTrack(this.runner,direction)
    }else this.turns.release(direction,this.runTime)
  }

  update(){
    if(!this.prepared||!this.running||this.suspended)return
    // Phaser's smoothed delta dilates time on slow renderers. Drive gameplay from
    // wall time in small steps and drop extreme stalls instead of skipping collisions.
    const frame=this.firstFrame?STEP_SECONDS:this.game.loop.rawDelta/1000
    this.firstFrame=false
    this.accumulator+=Math.min(frame,.15)
    while(this.accumulator>=STEP_SECONDS&&this.running){
      this.accumulator-=STEP_SECONDS
      this.tick(STEP_SECONDS)
    }
    this.renderMovers()
  }

  private tick(dt:number){
    this.pulse+=dt
    if(this.countdown>0){
      this.countdown=Math.max(0,this.countdown-dt)
      this.banner.setText(this.readyLabel).setVisible(true)
      if(this.countdown===0){
        this.audio.mode('game')
        this.audio.effect('go')
        if(!this.sessionStarted){this.sessionStarted=true;this.context.emit({type:'playing'})}
      }
      return
    }
    this.banner.setVisible(false)
    this.runTime+=dt
    this.districtTime+=dt
    this.protectedFor=Math.max(0,this.protectedFor-dt)
    this.powered=Math.max(0,this.powered-dt)
    if(this.powered===0&&this.audioModePowered){this.audioModePowered=false;this.audio.mode('game')}
    if(this.powered>0)this.audioModePowered=true

    const previousRunner=trackPoint(this.runner)
    const previousRivals=this.rivals.map(trackPoint)
    const speed=6.8*this.hero.speed*(this.powered>0?1.09:1)
    advanceTrack(this.maze,this.runner,speed*dt,()=>this.runnerChoice(),()=>{
      this.pickup()
      return this.countdown>0||!this.running
    })
    if(this.countdown>0||!this.running)return

    for(const rival of this.rivals){
      if(rival.respawnIn>0){
        rival.respawnIn-=dt
        if(rival.respawnIn<=0){
          const index=RIVALS.indexOf(rival.style)
          const start=this.maze.enemies[index]
          rival.col=start.x;rival.row=start.y;rival.progress=0;rival.direction=null
          rival.releaseAt=this.runTime+.9
          rival.node.setVisible(true);this.place(rival)
        }
        continue
      }
      if(this.runTime<rival.releaseAt)continue
      const pressure=Math.min(.55,this.districtTime*.014)+Math.min(1.04,(this.district-1)*.22)
      const rivalSpeed=this.powered>0?3.45:4.65+pressure+rival.style.personality*.055
      advanceTrack(this.maze,rival,rivalSpeed*dt,()=>this.rivalChoice(rival))
    }
    this.collisions(previousRunner,previousRivals)
  }

  private renderMovers(){
    this.place(this.runner)
    const {x,y}=this.runner.node
    const direction=this.runner.direction
    this.runner.portrait.setFlipX(direction==='left')
    this.runner.portrait.y=-5-(!this.reducedMotion&&direction?Math.abs(Math.sin(this.pulse*24))*3:0)
    this.runner.node.setAlpha(this.protectedFor>0?.82+Math.sin(this.pulse*16)*.16:1)
    this.playerGlow.setPosition(x,y)
    this.playerGlow.setAlpha(this.powered>0?.45+Math.sin(this.pulse*9)*.09:.26)
    this.playerGlow.setScale(this.powered>0?1.26:1)
    if(this.pulse-this.trailTime>.13&&!this.reducedMotion&&direction){
      this.trailTime=this.pulse
      const spark=this.add.circle(x,y+8,this.powered>0?5:3,this.powered>0?0xffd47d:this.hero.rgb,.68).setDepth(6)
      this.tweens.add({targets:spark,alpha:0,scale:.2,duration:220,onComplete:()=>spark.destroy()})
    }
    for(const rival of this.rivals){
      this.place(rival)
      const live=this.runTime>=rival.releaseAt&&rival.respawnIn<=0
      const frightened=live&&this.powered>0
      rival.portrait.setFlipX(rival.direction==='left')
      rival.portrait.y=-4-(!this.reducedMotion&&live?Math.abs(Math.sin(this.pulse*20+rival.style.personality))*2.4:0)
      if(frightened)rival.portrait.setTint(0x9de4ff)
      else rival.portrait.clearTint()
      rival.panic.setVisible(frightened)
      rival.node.setAlpha(!live?.56:frightened&&this.powered<1.25?.68+Math.sin(this.pulse*22)*.26:1)
    }
    this.powerFill.width=Math.max(0,this.powered/(6.5+this.hero.powerBonus))*184
    const label=this.powered>0?`GOLD RUSH   ${this.powered.toFixed(1)}s`:'★  GOLD BEAT'
    if(this.powerLabel.text!==label)this.powerLabel.setText(label)
    if(this.reportedPower!==Math.ceil(this.powered))this.emitBoardStatus()
  }
  private audioModePowered=false
  begin(){this.startRun()}
  pause(){this.suspended=true;this.clearInput()}
  resume(){this.suspended=false;this.firstFrame=true;this.accumulator=0}
  clearInput(){this.turns.clear()}
  stop(){this.running=false;this.clearInput()}
}
export const mount:GameModule['mount']=async(context)=>{
  const audio=getKasiAudio(context.sound)
  const scene=new KasiMazeScene(context,audio)
  const game=new Phaser.Game({
    type:Phaser.CANVAS,parent:context.parent,width:W,height:H,
    transparent:true,audio:{noAudio:true},render:{antialias:true,pixelArt:false},
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.NO_CENTER,width:W,height:H},
    fps:{target:60,min:30},scene:[scene],
  })
  const unsubscribe=context.input.subscribe(event=>{
    if(event.playerId!==context.playerId||event.repeated)return
    scene.setAction(event.action,event.phase==='pressed')
  })
  let destroyed=false
  return {
    start(){if(!destroyed)scene.begin()},
    pause(){if(!destroyed){scene.pause();scene.scene.pause();audio.pause()}},
    resume(){if(!destroyed){scene.resume();scene.scene.resume();audio.resume()}},
    restart(){if(!destroyed){scene.resume();scene.scene.resume();audio.resume();scene.begin()}},
    destroy(){
      if(destroyed)return
      destroyed=true;unsubscribe();scene.stop();game.destroy(true);disposeKasiAudio()
    },
  }
}
