# python/modules/searching.py
def binary_search_crop(crop_list, target_name):
    """O(log N) Binary Search over sorted crops."""
    low, high = 0, len(crop_list) - 1
    while low <= high:
        mid = (low + high) // 2
        if crop_list[mid].name == target_name:
            return crop_list[mid]
        elif crop_list[mid].name < target_name:
            low = mid + 1
        else:
            high = mid - 1
    return None