# python/modules/sorting.py
def quick_sort_items(item_list):
    """O(N log N) Quick Sort for organizing inventory items by count."""
    if len(item_list) <= 1:
        return item_list
    pivot = item_list[len(item_list) // 2]
    left = [x for x in item_list if x['count'] > pivot['count']]
    middle = [x for x in item_list if x['count'] == pivot['count']]
    right = [x for x in item_list if x['count'] < pivot['count']]
    return quick_sort_items(left) + middle + quick_sort_items(right)