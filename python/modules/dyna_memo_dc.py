# python/modules/dyna_memo_dc.py
def memoized_crop_yield(day, memo={}):
    """Dynamic Programming & Memoization for calculating optimal harvest yields."""
    if day in memo:
        return memo[day]
    if day <= 1:
        return 10
    memo[day] = memoized_crop_yield(day - 1, memo) + (day * 5)
    return memo[day]