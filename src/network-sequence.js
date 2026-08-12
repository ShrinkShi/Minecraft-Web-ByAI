export const NETWORK_SEQUENCE_MAX=0xffffffff;
export const NETWORK_SEQUENCE_HALF_RANGE=0x80000000;

export function assertNetworkSequence(value,label='network sequence'){
  if(!Number.isInteger(value)||value<0||value>NETWORK_SEQUENCE_MAX)throw new RangeError(`${label} must be uint32`);
  return value;
}

export function nextNetworkSequence(value){
  return(assertNetworkSequence(value)+1)>>>0;
}

export function networkSequenceDistance(candidate,reference){
  return(assertNetworkSequence(candidate,'candidate sequence')-assertNetworkSequence(reference,'reference sequence'))>>>0;
}

export function isNetworkSequenceNewer(candidate,reference){
  const distance=networkSequenceDistance(candidate,reference);
  return distance!==0&&distance<NETWORK_SEQUENCE_HALF_RANGE;
}

export class NetworkSequenceGate{
  constructor(){this.reset();}
  reset(){this.hasLast=false;this.last=0;}
  accept(sequence){
    const value=assertNetworkSequence(sequence);
    if(!this.hasLast){this.hasLast=true;this.last=value;return true;}
    if(!isNetworkSequenceNewer(value,this.last))return false;
    this.last=value;return true;
  }
}
