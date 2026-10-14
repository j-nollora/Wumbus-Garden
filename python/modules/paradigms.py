import random

def buy_seasonal_mystery_bag(tier, season):
    # Import inside function to prevent circular/missing module scope during WASM load
    try:
        from oop_concepts import CROP_DATABASE
    except ImportError:
        import sys
        if 'oop_concepts' in sys.modules:
            CROP_DATABASE = sys.modules['oop_concepts'].CROP_DATABASE
        else:
            CROP_DATABASE = globals().get('CROP_DATABASE', {})

    # Extract clean season string (e.g. "Spring 01" -> "spring")
    season_str = str(season).split()[0].strip().lower() if season else "spring"
    
    roll = random.randint(1, 100)
    if tier == 1:
        rarity = "rare" if roll <= 5 else ("uncommon" if roll <= 30 else "common")
    elif tier == 2:
        rarity = "rare" if roll <= 15 else ("uncommon" if roll <= 60 else "common")
    else:
        rarity = "rare" if roll <= 30 else ("uncommon" if roll <= 80 else "common")

    all_crops = list(CROP_DATABASE.values()) if isinstance(CROP_DATABASE, dict) else []

    if not all_crops:
        # Emergency dummy object if database isn't populated yet
        class DummyCrop:
            name = "Parsnip"
        return DummyCrop()

    # 1. Match season and rarity
    matching = [c for c in all_crops if str(getattr(c, 'season', '')).lower() == season_str and str(getattr(c, 'rarity', '')).lower() == rarity]
    if matching:
        return random.choice(matching)

    # 2. Fallback: match season only
    seasonal = [c for c in all_crops if str(getattr(c, 'season', '')).lower() == season_str]
    if seasonal:
        return random.choice(seasonal)

    # 3. Fallback: pick any crop
    return random.choice(all_crops)