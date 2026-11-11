#!/usr/bin/env python3
"""Patch the bundled air-hockey HTML without touching its large embedded assets."""
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "index.html"
s = path.read_text(encoding="utf-8")

def patch(old, new):
    global s
    found = s.count(old)
    if found != 1:
        raise RuntimeError(f"Expected one anchor, found {found}: {old[:90]!r}")
    s = s.replace(old, new, 1)

patch(
    "  const possession={side:-1,time:0,warned:false};let lastPossSide=-1;",
    """  const possession={side:-1,time:0,warned:false};let lastPossSide=-1;
  // Small center-only penalty box (the decorative goal arc is intentionally ignored).
  const GOAL_CAMP_SECONDS=3,GOAL_PENALTY_SCALE=1.5;
  const GOAL_CAMP_DEPTH=MALLET_R*3,GOAL_CAMP_HALF=GOAL_HALF*.7;
  const goalCamp=[{time:0,penalty:false},{time:0,penalty:false}];
  const goalHalfFor=side=>GOAL_HALF*(goalCamp[side].penalty?GOAL_PENALTY_SCALE:1);
  function resetGoalCamp(){goalCamp.forEach(c=>{c.time=0;c.penalty=false;});}
  function updateGoalCamp(dt){
    for(let i=0;i<2;i++){
      const m=mallets[i],c=goalCamp[i];
      const inBox=(i===0?m.x<=GOAL_CAMP_DEPTH:m.x>=W-GOAL_CAMP_DEPTH)
        &&Math.abs(m.y-H/2)<=GOAL_CAMP_HALF;
      if(!inBox){c.time=0;c.penalty=false;continue;}
      c.time+=dt;
      if(!c.penalty&&c.time>GOAL_CAMP_SECONDS){
        c.penalty=true;
        floatText(i===0?190:W-190,H/2-GOAL_HALF-55,'골대 지키기 경고!','#ef5848',30,1.2);
        sfx('item',.8,.8);
      }
    }
  }""",
)
patch("    resetPositions();phase='ready';updateClock();",
      "    resetPositions();resetGoalCamp();phase='ready';updateClock();")
patch("    resetShots();boosted=false;zoneContact=false;\n    rallyHits=0;lastHitBy=-1;trail=[];updateRally();",
      "    resetShots();boosted=false;zoneContact=false;resetGoalCamp();\n    rallyHits=0;lastHitBy=-1;trail=[];updateRally();")
patch("    resetShots();closeCut();hideGoalBanner();floats=[];phase='finished';releaseTouches();",
      "    resetShots();closeCut();hideGoalBanner();floats=[];resetGoalCamp();phase='finished';releaseTouches();")
patch("    resetShots();serve=null;\n    scores[scorer]++;",
      "    resetShots();serve=null;resetGoalCamp();\n    scores[scorer]++;")
patch(
    """    const inMouth=Math.abs(puck.y-H/2)<GOAL_HALF;
    if(puck.x<R&&(!inMouth||shields[0]>0)){
      if(inMouth)bounceShield(0);else{cancelZoneBoost();puck.x=R;puck.vx=Math.abs(puck.vx)*.96;puck.vy*=.985;wallFx(puck.x,puck.y,speed);}
    }
    if(puck.x>W-R&&(!inMouth||shields[1]>0)){
      if(inMouth)bounceShield(1);else{cancelZoneBoost();puck.x=W-R;puck.vx=-Math.abs(puck.vx)*.96;puck.vy*=.985;wallFx(puck.x,puck.y,speed);}
    }""",
    """    const inLeftMouth=Math.abs(puck.y-H/2)<goalHalfFor(0);
    const inRightMouth=Math.abs(puck.y-H/2)<goalHalfFor(1);
    if(puck.x<R&&(!inLeftMouth||shields[0]>0)){
      if(inLeftMouth)bounceShield(0);else{cancelZoneBoost();puck.x=R;puck.vx=Math.abs(puck.vx)*.96;puck.vy*=.985;wallFx(puck.x,puck.y,speed);}
    }
    if(puck.x>W-R&&(!inRightMouth||shields[1]>0)){
      if(inRightMouth)bounceShield(1);else{cancelZoneBoost();puck.x=W-R;puck.vx=-Math.abs(puck.vx)*.96;puck.vy*=.985;wallFx(puck.x,puck.y,speed);}
    }""",
)
patch("    if(phase==='playing')stepPlaying(dt);",
      "    if(phase==='playing'){\n      if(!serve)updateGoalCamp(dt);else resetGoalCamp();\n      stepPlaying(dt);\n    }")
patch("  function drawStage(){",
      """  function drawGoalCamp(){
    for(let i=0;i<2;i++){
      if(!goalCamp[i].penalty)continue;
      const half=goalHalfFor(i),x=i===0?0:W;
      ctx.save();
      ctx.fillStyle='#14211f';
      ctx.fillRect(i===0?-RM:x-5,H/2-half,RM+5,half*2);
      ctx.fillStyle='#ef5848';
      ctx.fillRect(i===0?-5:W-1,H/2-half,6,half*2);
      ctx.fillStyle='#ffe1a3';
      for(const yy of [H/2-half,H/2+half]){
        ctx.beginPath();ctx.arc(x,yy,9,0,Math.PI*2);ctx.fill();
      }
      ctx.strokeStyle='#ef5848';ctx.lineWidth=4;ctx.setLineDash([12,9]);ctx.globalAlpha=.85;
      ctx.beginPath();ctx.moveTo(x,H/2-half);ctx.lineTo(i===0?GOAL_CAMP_DEPTH:W-GOAL_CAMP_DEPTH,H/2-half);
      ctx.moveTo(x,H/2+half);ctx.lineTo(i===0?GOAL_CAMP_DEPTH:W-GOAL_CAMP_DEPTH,H/2+half);ctx.stroke();
      ctx.restore();
    }
  }
  function drawStage(){""")
patch("      ctx.strokeStyle='#ffd25a';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(gx,H/2-GOAL_HALF);ctx.lineTo(gx,H/2+GOAL_HALF);ctx.stroke();",
      "      ctx.strokeStyle='#ffd25a';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(gx,H/2-goalHalfFor(i));ctx.lineTo(gx,H/2+goalHalfFor(i));ctx.stroke();")
patch("    if(TABLET)drawTabletHud();\n    drawStage();",
      "    if(TABLET)drawTabletHud();\n    drawGoalCamp();\n    drawStage();")

assert s.rstrip().endswith("</html>")
assert "const inMouth=Math.abs(puck.y-H/2)<GOAL_HALF" not in s
assert s.count("resetGoalCamp()") >= 5
assert "drawGoalCamp();" in s and "goalHalfFor(0)" in s and "goalHalfFor(1)" in s
path.write_text(s, encoding="utf-8")
print("PASS: patched both goals, warnings, reset and visual mouth")
