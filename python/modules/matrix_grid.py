# python/modules/matrix_grid.py
import random

class SoilTile:
    def __init__(self, r, c):
        self.r = r
        self.c = c
        self.is_tilled = False
        self.is_watered = False
        self.is_wilted = False
        self.is_fertilized = False
        self.hp = 100
        self.max_hp = 100
        self.crop = None
        self.growth_stage = 0

    def till(self):
        if not self.is_tilled:
            self.is_tilled = True
            return True
        return False

    def water(self):
        if self.is_tilled and not self.is_watered:
            self.is_watered = True
            return True
        return False

    def plant(self, crop):
        if self.is_tilled and not self.crop:
            self.crop = crop
            self.growth_stage = 0
            self.is_wilted = False
            self.is_fertilized = False
            self.hp = 100
            self.max_hp = 100
            return True
        return False
    
    def to_dict(self):
        crop_data = None
        if self.crop:
            crop_data = {
                "name": self.crop.name,
                "stage": self.growth_stage,
                "max_stage": getattr(self.crop, "days_to_grow", 3),
                "stage_images": getattr(self.crop, "stage_images", []),
                "icon": getattr(self.crop, "item_icon", None)
            }

        return {
            "r": self.r,
            "c": self.c,
            "tilled": self.is_tilled,
            "watered": self.is_watered,
            "wilted": self.is_wilted,
            "fertilized": self.is_fertilized,
            "has_crop": self.crop is not None,
            "symbol": self.crop.symbol if self.crop else None,
            "name": self.crop.name if self.crop else None,
            "stage": self.growth_stage if self.crop else 0,
            "max_stage": getattr(self.crop, "days_to_grow", 3) if self.crop else 3,
            "hp": self.hp if self.crop else 0,
            "max_hp": self.max_hp if self.crop else 100,
            "crop_data": crop_data
        }


class SoilMatrixGrid:
    def __init__(self, rows=5, cols=5):
        self.rows = rows
        self.cols = cols
        self.grid = [[SoilTile(r, c) for c in range(cols)] for r in range(rows)]
        self.bucket_level = 5
        self.disaster_occurred = False
        self.last_disaster_name = None

    def get_tile(self, r, c):
        if 0 <= r < self.rows and 0 <= c < self.cols:
            return self.grid[r][c]
        return None

    def till_soil(self, r, c):
        tile = self.get_tile(r, c)
        return tile.till() if tile else False

    def water_soil(self, r, c):
        if self.bucket_level <= 0:
            return False
        tile = self.get_tile(r, c)
        if tile and tile.water():
            self.bucket_level -= 1
            return True
        return False

    def plant_seed(self, r, c, crop):
        tile = self.get_tile(r, c)
        return tile.plant(crop) if tile else False

    def apply_fertilizer(self, r, c):
        tile = self.get_tile(r, c)
        if tile and tile.crop and not tile.is_wilted and not tile.is_fertilized:
            tile.is_fertilized = True
            tile.hp = tile.max_hp
            return True
        return False

    def harvest_crop(self, r, c):
        tile = self.get_tile(r, c)
        if tile and tile.crop and not tile.is_wilted and tile.growth_stage >= tile.crop.days_to_grow:
            harvested_crop = tile.crop
            tile.crop = None
            tile.growth_stage = 0
            tile.is_watered = False
            tile.is_fertilized = False
            tile.hp = 100
            return harvested_crop
        return None

    def process_day_transition(self, current_season, current_weather="Sunny"):
        self.disaster_occurred = False
        self.last_disaster_name = None

        # Disasters with specific damage ranges
        disaster_specs = {
            "Meteorite Strike": (60, 80),
            "Alien Escape": (45, 65),
            "Green Rain Windstorm": (30, 50),
            "Earthquake": (20, 40)
        }

        # 35% chance of overnight disaster
        if random.random() < 0.35:
            self.disaster_occurred = True
            self.last_disaster_name = random.choice(list(disaster_specs.keys()))

        min_dmg, max_dmg = disaster_specs.get(self.last_disaster_name, (20, 40))

        for r in range(self.rows):
            for c in range(self.cols):
                tile = self.grid[r][c]

                # Automatic watering if weather is Rainy
                if current_weather.lower() == "rainy" and tile.is_tilled:
                    tile.is_watered = True

                if tile.crop and not tile.is_wilted:
                    # 1. Season Compatibility Check
                    if str(tile.crop.season).lower() != str(current_season).lower():
                        tile.is_wilted = True
                    # 2. Watering Requirement: MUST be watered on Sunny days
                    elif not tile.is_watered:
                        tile.is_wilted = True
                    else:
                        tile.growth_stage += 1

                    # 3. Overnight Disaster Processing
                    if self.disaster_occurred and not tile.is_wilted:
                        raw_damage = random.randint(min_dmg, max_dmg)
                        
                        if tile.is_fertilized:
                            # Fertilizer Shield reduces damage by up to 70 HP (shield breaks)
                            actual_damage = max(0, raw_damage - 70)
                            tile.is_fertilized = False
                        else:
                            actual_damage = raw_damage

                        tile.hp -= actual_damage
                        if tile.hp <= 0:
                            tile.hp = 0
                            tile.is_wilted = True  # Wilts ONLY if HP drops to 0

                # Reset watering status for next day
                tile.is_watered = False