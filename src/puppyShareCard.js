import {puppyAssetId} from "./puppyLinks.js";

// Bump when the visual template changes to make a fresh URL for social crawlers.
export const SHARE_CARD_VERSION="v3";
export const SHARE_CARD_WIDTH=1200;
export const SHARE_CARD_HEIGHT=630;
export const shareCardPath=puppy=>"/assets/share/"+puppyAssetId(puppy)+"-"+SHARE_CARD_VERSION+".png";
