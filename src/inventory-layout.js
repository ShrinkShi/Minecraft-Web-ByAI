export const INVENTORY_SLOT_COUNT=36;
export const INVENTORY_MAIN_SLOT_COUNT=27;
export const HOTBAR_START=INVENTORY_MAIN_SLOT_COUNT;
export const HOTBAR_SIZE=9;

export function assertHotbarSlot(value,label='hotbar slot'){
  if(!Number.isInteger(value)||value<0||value>=HOTBAR_SIZE)throw new RangeError(`${label} must be an integer from 0 to ${HOTBAR_SIZE-1}`);
  return value;
}

export function creativeSeedSlot(index){
  if(!Number.isInteger(index)||index<0||index>=INVENTORY_SLOT_COUNT)throw new RangeError(`creative seed index must be an integer from 0 to ${INVENTORY_SLOT_COUNT-1}`);
  return index<HOTBAR_SIZE?HOTBAR_START+index:index-HOTBAR_SIZE;
}
