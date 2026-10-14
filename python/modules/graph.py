# python/modules/graph.py
class GardenPathGraph:
    """Adjacency matrix graph modeling tile connectivity for pests/water flow."""
    def __init__(self, num_tiles=25):
        self.adj_matrix = [[0] * num_tiles for _ in range(num_tiles)]

    def add_edge(self, u, v):
        self.adj_matrix[u][v] = 1
        self.adj_matrix[v][u] = 1