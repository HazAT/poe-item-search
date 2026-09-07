import { getCurrentTradeLocation as getBrowserTradeLocation } from "../../src/services/tradeLocation";
import type { TradeLocationStruct } from "../../src/types/tradeLocation";

export * from "../../src/services/tradeLocation";

let storyLocation: TradeLocationStruct | undefined;

export function getCurrentTradeLocation(): TradeLocationStruct {
  return storyLocation ?? getBrowserTradeLocation();
}

export function setStoryTradeLocation(location: TradeLocationStruct | undefined) {
  const previous = storyLocation;
  storyLocation = location;
  return () => { storyLocation = previous; };
}
