function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function positive(value,label){value=finite(value,label);if(value<=0)throw new RangeError(`${label} must be > 0`);return value;}

// Minecraft ModelPart cuboid texture layout. The side strip is
// depth -> width -> depth -> width; top/bottom are width x depth.
// Keeping this in one shared pure module prevents bed/entity renderers from
// silently diverging on non-cubic boxes such as a cow body.
export function minecraftEntityCuboidUvRects(u,v,width,height,depth){
  const baseU=finite(u,'u'),baseV=finite(v,'v'),w=positive(width,'width'),h=positive(height,'height'),d=positive(depth,'depth');
  const x0=baseU,x1=x0+d,x2=x1+w,x3=x2+d,x4=x3+w,bottomEnd=x2+w;
  const y0=baseV,y1=y0+d,y2=y1+h;
  return Object.freeze({
    left:Object.freeze([x0,y1,x1,y2]),
    front:Object.freeze([x1,y1,x2,y2]),
    right:Object.freeze([x2,y1,x3,y2]),
    back:Object.freeze([x3,y1,x4,y2]),
    top:Object.freeze([x1,y0,x2,y1]),
    bottom:Object.freeze([x2,y0,bottomEnd,y1])
  });
}
