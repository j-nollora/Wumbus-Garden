# python/modules/hash.py
class InventoryHashTable:
    """Hash Table with linear probing for inventory items."""
    def __init__(self, capacity=10):
        self.capacity = capacity
        self.table = [None] * capacity

    def _hash(self, key):
        return sum(ord(c) for c in str(key).lower()) % self.capacity

    def add(self, key, item_dict):
        clean_key = str(key).strip()
        idx = self._hash(clean_key)
        for i in range(self.capacity):
            slot_idx = (idx + i) % self.capacity
            if self.table[slot_idx] is None or self.table[slot_idx]['key'].lower() == clean_key.lower():
                if self.table[slot_idx] is not None and self.table[slot_idx]['key'].lower() == clean_key.lower():
                    self.table[slot_idx]['count'] = self.table[slot_idx].get('count', 0) + item_dict.get('count', 1)
                else:
                    new_item = {'key': clean_key, 'count': item_dict.get('count', 1)}
                    new_item.update(item_dict)
                    self.table[slot_idx] = new_item
                return

    def consume(self, key):
        clean_key = str(key).strip().lower()
        for item in self.table:
            if item and item.get('key', '').lower() == clean_key and item.get('count', 0) > 0:
                item['count'] -= 1
                return True
        return False

    def get(self, key):
        clean_key = str(key).strip().lower()
        for item in self.table:
            if item and str(item.get('key', '')).lower() == clean_key:
                return item
        return None

    def to_list(self):
        return [item for item in self.table if item is not None and item.get('count', 0) > 0]