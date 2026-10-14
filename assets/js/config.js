// Game State & Limits
let activeTool = 'hoe';
let selectedInventoryKey = null;

let userEnergy = 100;
const maxEnergy = 100;
let userBucket = 5;
let maxBucket = 5;
let userCoins = 200;

const GRID_ROWS = 5;
const GRID_COLS = 5;
const ENERGY_PER_ACTION = 5;
const WELL_ENERGY_COST = 10;
const MIN_INVENTORY_SLOTS = 6;
const MAX_LOG_LINES = 120;
const FERTILIZER_KEY = 'Plant Defense Fertilizer';

let aoeAborted = false;
let lastFocusedTile = null;
let pythonInitDone = false;

// Asset URL Maps
const GENERIC_CROP_ICON = 'https://stardewvalleywiki.com/mediawiki/images/c/c4/Parsnip.png';
const SEED_ICON = 'https://stardewvalleywiki.com/mediawiki/images/d/d3/Parsnip_Seeds.png';
const FERTILIZER_ICON = 'https://stardewvalleywiki.com/mediawiki/images/6/64/Moss.png';
const SUN_ICON = 'https://stardewvalleywiki.com/mediawiki/images/2/26/SunAnimated.gif';
const RAIN_ICON = 'https://stardewvalleywiki.com/mediawiki/images/a/af/RainAnimated.gif';
const STORM_ICON = 'https://stardewvalleywiki.com/mediawiki/images/9/92/StormAnimated.gif';
const SNOW_ICON = 'https://stardewvalleywiki.com/mediawiki/images/c/c0/SnowAnimated.gif';

const CROP_ASSETS = {
  "Parsnip": {
    item_icon: "https://stardewvalleywiki.com/mediawiki/images/d/db/Parsnip.png",
    seed_icon: "https://stardewvalleywiki.com/mediawiki/images/d/d3/Parsnip_Seeds.png",
    stage_images: [
      "https://stardewvalleywiki.com/mediawiki/images/6/66/Parsnip_Stage_1.png",
      "https://stardewvalleywiki.com/mediawiki/images/6/69/Parsnip_Stage_3.png",
      "https://stardewvalleywiki.com/mediawiki/images/1/19/Parsnip_Stage_4.png",
      "https://stardewvalleywiki.com/mediawiki/images/2/21/Parsnip_Stage_5.png"
    ]
  },
  "Cauliflower": {
    item_icon: "https://stardewvalleywiki.com/mediawiki/images/a/aa/Cauliflower.png",
    seed_icon: "https://stardewvalleywiki.com/mediawiki/images/b/bb/Cauliflower_Seeds.png",
    stage_images: [
      "https://stardewvalleywiki.com/mediawiki/images/4/45/Cauliflower_Stage_1.png",
      "https://stardewvalleywiki.com/mediawiki/images/e/e5/Cauliflower_Stage_3.png",
      "https://stardewvalleywiki.com/mediawiki/images/1/16/Cauliflower_Stage_4.png",
      "https://stardewvalleywiki.com/mediawiki/images/d/d7/Cauliflower_Stage_6.png"
    ]
  },
  "Strawberry": {
    item_icon: "https://stardewvalleywiki.com/mediawiki/images/6/6d/Strawberry.png",
    seed_icon: "https://stardewvalleywiki.com/mediawiki/images/f/f2/Strawberry_Seeds.png",
    stage_images: [
      "https://stardewvalleywiki.com/mediawiki/images/2/2c/Strawberry_Stage_1.png",
      "https://stardewvalleywiki.com/mediawiki/images/d/d6/Strawberry_Stage_3.png",
      "https://stardewvalleywiki.com/mediawiki/images/6/65/Strawberry_Stage_5.png",
      "https://stardewvalleywiki.com/mediawiki/images/4/48/Strawberry_Stage_6.png"
    ]
  },
  "Tomato": {
    item_icon: "https://stardewvalleywiki.com/mediawiki/images/9/9d/Tomato.png",
    seed_icon: "https://stardewvalleywiki.com/mediawiki/images/e/e3/Tomato_Seeds.png",
    stage_images: [
      "https://stardewvalleywiki.com/mediawiki/images/1/1f/Tomato_Stage_1.png",
      "https://stardewvalleywiki.com/mediawiki/images/e/e7/Tomato_Stage_3.png",
      "https://stardewvalleywiki.com/mediawiki/images/c/c2/Tomato_Stage_5.png",
      "https://stardewvalleywiki.com/mediawiki/images/b/bb/Tomato_Stage_6.png"
    ]
  },
  "Corn": {
    item_icon: "https://stardewvalleywiki.com/mediawiki/images/f/f8/Corn.png",
    seed_icon: "https://stardewvalleywiki.com/mediawiki/images/d/d1/Corn_Seeds.png",
    stage_images: [
      "https://stardewvalleywiki.com/mediawiki/images/5/57/Corn_Stage_1.png",
      "https://stardewvalleywiki.com/mediawiki/images/d/db/Corn_Stage_3.png",
      "https://stardewvalleywiki.com/mediawiki/images/2/29/Corn_Stage_7.png",
      "https://stardewvalleywiki.com/mediawiki/images/9/9d/Corn_Stage_6.png"
    ]
  },
  "Melon": {
    item_icon: "https://stardewvalleywiki.com/mediawiki/images/1/19/Melon.png",
    seed_icon: "https://stardewvalleywiki.com/mediawiki/images/5/5e/Melon_Seeds.png",
    stage_images: [
      "https://stardewvalleywiki.com/mediawiki/images/8/80/Melon_Stage_1.png",
      "https://stardewvalleywiki.com/mediawiki/images/a/aa/Melon_Stage_3.png",
      "https://stardewvalleywiki.com/mediawiki/images/c/cf/Melon_Stage_4.png",
      "https://stardewvalleywiki.com/mediawiki/images/6/6d/Melon_Stage_5.png"
    ]
  },
  "Yam": {
    item_icon: "https://stardewvalleywiki.com/mediawiki/images/5/52/Yam.png",
    seed_icon: "https://stardewvalleywiki.com/mediawiki/images/e/e9/Yam_Seeds.png",
    stage_images: [
      "https://stardewvalleywiki.com/mediawiki/images/d/d4/Yam_Stage_1.png",
      "https://stardewvalleywiki.com/mediawiki/images/5/5c/Yam_Stage_2.png",
      "https://stardewvalleywiki.com/mediawiki/images/9/9d/Yam_Stage_4.png",
      "https://stardewvalleywiki.com/mediawiki/images/6/64/Yam_Stage_5.png"
    ]
  },
  "Pumpkin": {
    item_icon: "https://stardewvalleywiki.com/mediawiki/images/6/64/Pumpkin.png",
    seed_icon: "https://stardewvalleywiki.com/Special:FilePath/Pumpkin_Seeds.png",
    stage_images: [
      "https://stardewvalleywiki.com/mediawiki/images/0/09/Pumpkin_Stage_1.png",
      "https://stardewvalleywiki.com/mediawiki/images/c/cf/Pumpkin_Stage_3.png",
      "https://stardewvalleywiki.com/mediawiki/images/d/dd/Pumpkin_Stage_5.png",
      "https://stardewvalleywiki.com/mediawiki/images/9/9d/Pumpkin_Stage_6.png"
    ]
  },
  "Grape": {
    item_icon: "https://stardewvalleywiki.com/mediawiki/images/c/c2/Grape.png",
    seed_icon: "https://stardewvalleywiki.com/mediawiki/images/d/de/Grape_Starter.png",
    stage_images: [
      "https://stardewvalleywiki.com/mediawiki/images/b/be/Grape_Stage_1.png",
      "https://stardewvalleywiki.com/mediawiki/images/9/9f/Grape_Stage_2.png",
      "https://stardewvalleywiki.com/mediawiki/images/e/ea/Grape_Stage_5.png",
      "https://stardewvalleywiki.com/mediawiki/images/1/12/Grape_Stage_6.png"
    ]
  },
  "Powdermelon": {
    item_icon: "https://stardewvalleywiki.com/mediawiki/images/a/aa/Powdermelon.png",
    seed_icon: "https://stardewvalleywiki.com/Special:FilePath/Powdermelon_Seeds.png",
    stage_images: [
      "https://stardewvalleywiki.com/mediawiki/images/6/6f/Powdermelon_Stage_1.png",
      "https://stardewvalleywiki.com/mediawiki/images/c/c7/Powdermelon_Stage_2.png",
      "https://stardewvalleywiki.com/mediawiki/images/0/0d/Powdermelon_Stage_4.png",
      "https://stardewvalleywiki.com/mediawiki/images/d/db/Powdermelon_Stage_5.png"
    ]
  }
};