# python/modules/queue.py
import random

class ClimateQueue:
    """FIFO Queue for seasonal climate transitions and weather cycling."""
    def __init__(self):
        self.seasons = ["Spring", "Summer", "Fall", "Winter"]
        self.weather_patterns = ["Sunny", "Rainy"]
        self.current_season_idx = 0
        self.current_day = 1

    def get_current_season(self):
        return self.seasons[self.current_season_idx]

    def get_current_weather(self):
        # 50/50 split between Sunny and Rainy
        return "Rainy" if (self.current_day % 2 == 0) else "Sunny"

    def advance_day(self, grid_matrix):
        current_weather = self.get_current_weather()
        
        self.current_day += 1
        
        # Advance season after 30 days and reset current_day to 1
        if self.current_day > 30:
            self.current_day = 1
            self.current_season_idx = (self.current_season_idx + 1) % len(self.seasons)
        
        # Advance crops in matrix grid with weather awareness
        grid_matrix.process_day_transition(self.get_current_season(), current_weather)