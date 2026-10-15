# python/modules/hierarchical_tree.py

class QuestNode:
    def __init__(self, level, title, seasonal_crops, exp_reward=100, coin_reward=50, perk=""):
        self.level = level
        self.title = title
        # seasonal_crops: dict mapping season name to tuple (crop_name, required_amount)
        self.seasonal_crops = seasonal_crops
        self.exp_reward = exp_reward
        self.coin_reward = coin_reward
        self.perk = perk
        self.children = []

    def get_required_crop_info(self, current_season="Spring"):
        """Returns (crop_name, required_amount) for the active season."""
        season_key = str(current_season).split()[0].strip().capitalize()
        return self.seasonal_crops.get(season_key, self.seasonal_crops.get("Spring", ("Parsnip", 1)))


class QuestProgressionTree:
    """Hierarchical Tree for Frog Prince progression with dynamic seasonal quests."""
    def __init__(self):
        # Level 1: Common Seasonal Crops (Requires 2x items)
        node1 = QuestNode(
            level=1,
            title="Frog Prince (Fallen King)",
            seasonal_crops={
                "Spring": ("Parsnip", 2),
                "Summer": ("Tomato", 2),
                "Fall": ("Yam", 2),
                "Winter": ("Powdermelon", 1)
            },
            exp_reward=150,
            coin_reward=50,
            perk="Unlock Tier 2 AOE Tools & Expanded Bucket (+200 Bonus Coins)"
        )

        # Level 2: Uncommon Seasonal Crops (Requires 3x items)
        node2 = QuestNode(
            level=2,
            title="Frog Prince (Noble Prince)",
            seasonal_crops={
                "Spring": ("Cauliflower", 3),
                "Summer": ("Corn", 3),
                "Fall": ("Pumpkin", 3),
                "Winter": ("Powdermelon", 2)
            },
            exp_reward=250,
            coin_reward=120,
            perk="Unlock Tier 3 AOE Tools (+300 Bonus Coins)"
        )

        # Level 3: Rare High-Yield Seasonal Crops (Requires 2x items)
        node3 = QuestNode(
            level=3,
            title="Frog Monarch (Royal Ruler)",
            seasonal_crops={
                "Spring": ("Strawberry", 2),
                "Summer": ("Melon", 2),
                "Fall": ("Grape", 2),
                "Winter": ("Powdermelon", 3)
            },
            exp_reward=400,
            coin_reward=250,
            perk="Unlock Tier 4 Master AOE Tools (+500 Bonus Coins)"
        )

        # Level 4: Endgame Realm Mastery
        node4 = QuestNode(
            level=4,
            title="Frog Deity (Empowered King)",
            seasonal_crops={
                "Spring": ("Strawberry", 5),
                "Summer": ("Melon", 5),
                "Fall": ("Grape", 5),
                "Winter": ("Powdermelon", 5)
            },
            exp_reward=1000,
            coin_reward=1000,
            perk="Maxed Out Realm Power!"
        )

        # Build Tree Hierarchy (Root -> Level 2 -> Level 3 -> Level 4)
        node1.children.append(node2)
        node2.children.append(node3)
        node3.children.append(node4)

        self.root = node1
        self.current_node = self.root
        self.current_exp = 0

        self.level_thresholds = {
            1: 450,     # Requires ~3 quest hand-ins at Level 1
            2: 1000,    # Requires ~4 quest hand-ins at Level 2
            3: 2000,    # Requires ~5 quest hand-ins at Level 3
            4: 999999   # Max Level Threshold
        }

    @property
    def exp_to_next_level(self):
        return self.level_thresholds.get(self.current_node.level, 999999)

    def get_current_req(self, season="Spring"):
        """Returns tuple: (crop_name, amount) for current level and season."""
        return self.current_node.get_required_crop_info(season)

    def get_current_quest_desc(self, season="Spring"):
        crop_name, amount = self.get_current_req(season)
        if self.current_node.level == 4:
            return "Realm Power Fully Restored! Kingdom Saved!"
        return f"Bring me {amount}x {crop_name} for +{self.current_node.exp_reward} EXP & +{self.current_node.coin_reward} Coins!"

    def get_aoe_range(self):
        return self.current_node.level

    def get_max_bucket(self):
        return 5 + ((self.current_node.level - 1) * 3)

    def add_exp(self, amount):
        """Adds EXP and advances to the next child node when threshold is met."""
        self.current_exp += amount
        req = self.exp_to_next_level

        if self.current_exp >= req and len(self.current_node.children) > 0:
            self.current_exp -= req
            self.current_node = self.current_node.children[0]
            return True
        return False