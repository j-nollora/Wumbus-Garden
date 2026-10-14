class Crop:
    def __init__(self, name, symbol, days_to_grow, sell_price, season, rarity):
        self.name = name
        self.symbol = symbol
        self.days_to_grow = days_to_grow
        self.sell_price = sell_price
        self.season = season
        self.rarity = rarity

CROP_DATABASE = {
    "Parsnip": Crop("Parsnip", "P", 4, 35, "Spring", "Common"),
    "Cauliflower": Crop("Cauliflower", "C", 6, 70, "Spring", "Uncommon"),
    "Strawberry": Crop("Strawberry", "S", 4, 100, "Spring", "Rare"),
    "Tomato": Crop("Tomato", "T", 4, 40, "Summer", "Common"),
    "Corn": Crop("Corn", "C", 6, 80, "Summer", "Uncommon"),
    "Melon": Crop("Melon", "M", 7, 120, "Summer", "Rare"),
    "Yam": Crop("Yam", "Y", 4, 45, "Fall", "Common"),
    "Pumpkin": Crop("Pumpkin", "P", 7, 80, "Fall", "Uncommon"),
    "Grape": Crop("Grape", "G", 5, 125, "Fall", "Rare"),
    "Powdermelon": Crop("Powdermelon", "W", 6, 200, "Winter", "Rare")
}