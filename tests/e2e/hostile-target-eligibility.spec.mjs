import {test,expect} from '@playwright/test';

const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

test('hostile mobs target survival/adventure but drop creative/spectator targets',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async threeUrl=>{
    const [{HostileMobSystem},{BLOCK},THREE]=await Promise.all([import('/src/hostile-mobs.js'),import('/src/blocks.js'),import(threeUrl)]);
    const world={highestSolid:()=>1,getBlock:()=>BLOCK.STONE};
    const player={mode:'survival',position:new THREE.Vector3(.5,2,.5),eye:1.62};
    const simulate=({type='zombie',mode='survival',x=1.5,pushX=0,pushZ=0,fuse=0,fuseWasActive=false,attackTimer=0}={})=>{
      const scene=new THREE.Scene(),events={hits:0,projectiles:0,explosions:0,primes:0};
      const system=new HostileMobSystem(scene,world,{maxEntities:2,onPlayerHit:()=>events.hits++,onProjectile:()=>events.projectiles++,onExplosion:()=>events.explosions++,onFuseStart:()=>events.primes++});
      player.mode=mode;const record=system.spawn(type,{x,y:2,z:.5});record.components.pushX=pushX;record.components.pushZ=pushZ;record.components.fuse=fuse;record.components.fuseWasActive=fuseWasActive;record.components.attackTimer=attackTimer;
      const before=system.store.getPosition(record.id)?.x??null;system.moveAndAttack(record,.1,player);const state=system.store.has(record.id)?record.components:null,position=system.store.getPosition(record.id),snapshot={...events,beforeX:before,afterX:position?.x??null,exists:system.store.has(record.id),fuse:state?.fuse??null,fuseWasActive:state?.fuseWasActive??null,pushX:state?.pushX??null};system.dispose();return snapshot;
    };
    return{
      survivalMelee:simulate({mode:'survival'}),
      adventureMelee:simulate({mode:'adventure'}),
      creativeMelee:simulate({mode:'creative'}),
      spectatorMelee:simulate({mode:'spectator'}),
      survivalChase:simulate({mode:'survival',x:4.5}),
      creativeNoChase:simulate({mode:'creative',x:4.5}),
      spectatorNoChase:simulate({mode:'spectator',x:4.5}),
      survivalSkeleton:simulate({type:'skeleton',mode:'survival',x:8.5}),
      creativeSkeleton:simulate({type:'skeleton',mode:'creative',x:8.5}),
      creativeCreeper:simulate({type:'creeper',mode:'creative',x:2.5,fuse:1.45,fuseWasActive:true}),
      creativeKnockback:simulate({mode:'creative',x:4.5,pushX:2})
    };
  },THREE_URL);

  expect(result.survivalMelee.hits).toBe(1);expect(result.adventureMelee.hits).toBe(1);
  expect(result.creativeMelee.hits).toBe(0);expect(result.spectatorMelee.hits).toBe(0);
  expect(result.survivalChase.afterX).toBeLessThan(result.survivalChase.beforeX);
  expect(result.creativeNoChase.afterX).toBeCloseTo(result.creativeNoChase.beforeX,8);
  expect(result.spectatorNoChase.afterX).toBeCloseTo(result.spectatorNoChase.beforeX,8);
  expect(result.survivalSkeleton.projectiles).toBe(1);expect(result.creativeSkeleton.projectiles).toBe(0);
  expect(result.creativeCreeper).toMatchObject({explosions:0,primes:0,exists:true,fuse:0,fuseWasActive:false});
  expect(result.creativeKnockback.hits).toBe(0);expect(result.creativeKnockback.afterX).toBeGreaterThan(result.creativeKnockback.beforeX);expect(result.creativeKnockback.pushX).toBeGreaterThan(0);expect(result.creativeKnockback.pushX).toBeLessThan(2);
});
