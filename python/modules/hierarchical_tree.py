# python/modules/hierarchical_tree.py

class QuestNode:
    def __init__(self, level, title, required_crop, exp_reward=100, coin_reward=50, perk=""):
        self.level = level
        self.title = title
        self.required_crop = required_crop
        self.exp_reward = exp_reward
        self.coin_reward = coin_reward
        self.perk = perk
        self.children = []

class QuestProgressionTree:
    """Hierarchical Tree for Frog Prince progression and unlockable perks."""
    def __init__(self):
        self.root = QuestNode(1, "Frog Prince (Fallen King)", "Parsnip", exp_reward=100, coin_reward=50, perk="Unlock Tier 2 AOE Tools (+200 Bonus Coins)")
        node2 = QuestNode(2, "Frog Prince (Noble Prince)", "Carrot", exp_reward=150, coin_reward=100, perk="Unlock Tier 3 AOE Tools (+300 Bonus Coins)")
        node3 = QuestNode(3, "Frog Monarch (Royal Ruler)", "Pumpkin", exp_reward=250, coin_reward=200, perk="Unlock Tier 4 AOE Tools (+500 Bonus Coins)")
        node4 = QuestNode(4, "Frog Deity (Empowered King)", "Wintermelon", exp_reward=500, coin_reward=500, perk="Maxed Out Realm Power!")
        
        self.root.children.append(node2)
        node2.children.append(node3)
        node3.children.append(node4)

        self.current_node = self.root
        self.current_exp = 0
        self.level_thresholds = {
            1: 500,
            2: 1200,
            3: 2500,
            4: 999999
        }

    @property
    def exp_to_next_level(self):
        return self.level_thresholds.get(self.current_node.level, 999999)

    def get_current_quest_desc(self):
        return f"Bring me 1x {self.current_node.required_crop} for +{self.current_node.exp_reward} EXP & +{self.current_node.coin_reward} Coins!"

    def get_aoe_range(self):
        return self.current_node.level

    def get_max_bucket(self):
        return 5 + ((self.current_node.level - 1) * 3)

    def add_exp(self, amount):
        self.current_exp += amount
        req = self.exp_to_next_level
        
        if self.current_exp >= req and len(self.children if hasattr(self, 'children') else self.current_node.children) > 0:
            self.current_exp -= req
            self.current_node = self.current_node.children[0]
            return True
        return False