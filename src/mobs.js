export const PASSIVE_MOBS=Object.freeze({
  cow:Object.freeze({name:'牛',hp:10,speed:1.35,width:.9,height:1.4,color:0x6f4a2f,accent:0xd8c4a8}),
  sheep:Object.freeze({name:'羊',hp:8,speed:1.3,width:.9,height:1.3,color:0xe9e6df,accent:0x8c8178}),
  pig:Object.freeze({name:'猪',hp:10,speed:1.3,width:.9,height:.9,color:0xe7a1a8,accent:0xc87882}),
  chicken:Object.freeze({name:'鸡',hp:4,speed:1.45,width:.45,height:.75,color:0xf2f0e7,accent:0xe7b53f})
});

export const PASSIVE_MOB_IDS=Object.freeze(Object.keys(PASSIVE_MOBS));

export function choosePassiveMob(rng=Math.random){
  const value=Math.max(0,Math.min(.999999999,Number(rng())||0));
  return PASSIVE_MOB_IDS[Math.floor(value*PASSIVE_MOB_IDS.length)];
}
