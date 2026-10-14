# python/modules/bst.py
class Crop:
    def __init__(self, name, season, days_to_grow, sell_price, rarity="Common", symbol="🌱"):
        self.name = name
        self.season = season
        self.days_to_grow = max(5, days_to_grow)  # Enforce minimum 5 growth days
        self.sell_price = sell_price
        self.rarity = rarity
        self.symbol = symbol

class BSTNode:
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.left = None
        self.right = None

class CropPriceBST:
    """Binary Search Tree for O(log N) price indexing."""
    def __init__(self):
        self.root = None

    def insert(self, key, value):
        self.root = self._insert_rec(self.root, key, value)

    def _insert_rec(self, node, key, value):
        if not node:
            return BSTNode(key, value)
        if key < node.key:
            node.left = self._insert_rec(node.left, key, value)
        else:
            node.right = self._insert_rec(node.right, key, value)
        return node
   