# python/modules/stack.py
class ActionStack:
    """LIFO Stack for reversing gardening actions."""
    def __init__(self):
        self._stack = []

    def push(self, action_dict):
        self._stack.append(action_dict)

    def pop(self):
        return self._stack.pop() if self._stack else None