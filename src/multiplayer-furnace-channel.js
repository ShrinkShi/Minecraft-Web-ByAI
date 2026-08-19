export {
  hasFurnaceSender as hasMultiplayerFurnaceSender,
  currentFurnaceSnapshot as currentMultiplayerFurnaceSnapshot,
  attachFurnaceSender as attachMultiplayerFurnaceSender,
  sendFurnaceTransaction as sendMultiplayerFurnaceTransaction,
  subscribeFurnaceSnapshots as subscribeMultiplayerFurnaceSnapshots,
  subscribeFurnaceResults as subscribeMultiplayerFurnaceResults,
  subscribeFurnaceCloses as subscribeMultiplayerFurnaceCloses,
  publishFurnaceSnapshot as publishMultiplayerFurnaceSnapshot,
  publishFurnaceResult as publishMultiplayerFurnaceResult,
  publishFurnaceClose as publishMultiplayerFurnaceClose
} from './furnace-channel.js';
