#!/usr/bin/env python3
"""
Lorenz Attractor + Constellation Graph - Generative Art using Manim
====================================================================
Librería: https://github.com/3b1b/manim

Mathematical Foundation:
- Lorenz: dx/dt = σ(y-x), dy/dt = x(ρ-z)-y, dz/dt = xy-βz
- RK4 integration for smooth trajectories
- Euclidean distance threshold for graph connectivity
"""

import numpy as np
from manim import *
from scipy.integrate import solve_ivp
import warnings
warnings.filterwarnings('ignore')

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE PARÁMETROS
# ═══════════════════════════════════════════════════════════════════════════

# Parámetros del Atractor de Lorenz (valores estándar del caos)
SIGMA = 10.0
RHO = 28.0
BETA = 8.0 / 3.0

# Configuración de renderizado
NUM_POINTS = 20000  # Número de puntos para trayectoria densa
NUM_NODES = 80  # Nodos para el grafo de constelación
DISTANCE_THRESHOLD = 2.5  # Umbral de conectividad para el grafo
DT = 0.005  # Paso de integración

# Paleta de colores - Dorada premium
GOLD_BRIGHT = "#FFD700"
GOLD_MEDIUM = "#DAA520"
GOLD_DARK = "#B8860B"
BRONZE = "#CD7F32"
BG_COLOR = "#020b14"

# ═══════════════════════════════════════════════════════════════════════════
# SISTEMA 1: ATRACTOR DE LORENZ
# ═══════════════════════════════════════════════════════════════════════════

def lorenz_derivatives(t, state):
    """Ecuaciones diferenciales del sistema de Lorenz."""
    x, y, z = state
    dx = SIGMA * (y - x)
    dy = x * (RHO - z) - y
    dz = x * y - BETA * z
    return [dx, dy, dz]

def integrate_lorenz(num_points, dt, initial_state=None):
    """
    Integra el sistema de Lorenz usando RK4.
    """
    if initial_state is None:
        initial_state = [0.1, 0.0, 0.0]

    t_span = (0, num_points * dt)
    t_eval = np.linspace(0, num_points * dt, num_points)

    solution = solve_ivp(
        lorenz_derivatives,
        t_span,
        initial_state,
        method='RK45',
        t_eval=t_eval,
        max_step=dt * 2,
        dense_output=True
    )

    return solution.y[0], solution.y[1], solution.y[2]

def apply_projection_3d(x, y, z, angles=None):
    """Proyección 3D con rotación para obtener silueta de mariposa."""
    if angles is None:
        alpha = np.radians(45)
        beta = np.radians(25)
        gamma = np.radians(15)
    else:
        alpha, beta, gamma = angles

    cos_a, sin_a = np.cos(alpha), np.sin(alpha)
    cos_b, sin_b = np.cos(beta), np.sin(beta)
    cos_g, sin_g = np.cos(gamma), np.sin(gamma)

    Rx = np.array([[1, 0, 0], [0, cos_b, -sin_b], [0, sin_b, cos_b]])
    Ry = np.array([[cos_a, 0, sin_a], [0, 1, 0], [-sin_a, 0, cos_a]])
    Rz = np.array([[cos_g, -sin_g, 0], [sin_g, cos_g, 0], [0, 0, 1]])

    R = Rz @ Ry @ Rx
    points = np.vstack([x, y, z])
    rotated = R @ points

    return rotated[0], rotated[1], rotated[2]

# ═══════════════════════════════════════════════════════════════════════════
# SISTEMA 2: GRAFO DE CONSTELACIÓN
# ═══════════════════════════════════════════════════════════════════════════

def generate_constellation_nodes(num_nodes, center_offset=(0, 0, 25)):
    """Genera nodos con distribución gaussiana clustered."""
    np.random.seed(42)
    centers = np.random.randn(4, 3) * 2
    nodes = []

    for _ in range(num_nodes):
        center = centers[np.random.randint(len(centers))]
        point = center + np.random.randn(3) * 1.2
        nodes.append(point + np.array(center_offset))

    return np.array(nodes)

def compute_connectivity(nodes, threshold):
    """Calcula conexiones entre nodos basados en distancia."""
    n = len(nodes)
    connections = []

    for i in range(n):
        for j in range(i + 1, n):
            dist = np.linalg.norm(nodes[i] - nodes[j])
            if dist < threshold:
                connections.append((i, j))

    return connections

def node_sizes(num_nodes):
    """Genera tamaños heterogéneos para los nodos."""
    np.random.seed(123)
    sizes = np.random.exponential(scale=1.2, size=num_nodes)
    sizes = np.clip(sizes, 0.3, 4.0)
    return sizes

# ═══════════════════════════════════════════════════════════════════════════
# CLASE PRINCIPAL DE MANIM
# ═══════════════════════════════════════════════════════════════════════════

class LorenzGraph(Scene):
    """Escena principal que renderiza el atractor de Lorenz + constelación."""

    def construct(self):
        # Configurar fondo
        self.camera.background_color = BG_COLOR

        # Obtener datos del atractor
        x, y, z = integrate_lorenz(NUM_POINTS, DT, initial_state=[0.1, 0.1, 20])

        # Aplicar proyección 3D
        x_proj, y_proj, z_proj = apply_projection_3d(x, y, z)

        # Normalizar
        x_range = x_proj.max() - x_proj.min()
        y_range = y_proj.max() - y_proj.min()
        z_range = z_proj.max() - z_proj.min()

        x_norm = (x_proj - x_proj.min()) / x_range
        y_norm = (y_proj - y_proj.min()) / y_range
        z_norm = (z_proj - z_proj.min()) / z_range

        # Escalar a coordenadas de Manim (aprox -4 a 4)
        scale = 6
        x_final = (x_norm - 0.5) * scale
        y_final = (y_norm - 0.5) * scale
        z_final = (z_norm - 0.5) * scale * 0.3  # Achicar Z para perspectiva

        # ═══════════════════════════════════════════════════════════════════
        # RENDERIZAR ATRACTOR DE LORENZ
        # ═══════════════════════════════════════════════════════════════════

        # Crear puntos para el atractor
        points = []
        colors = []

        # Paleta de dorado
        gold_gradient = [GOLD_DARK, GOLD_MEDIUM, GOLD_BRIGHT, "#FFFACD"]

        for i in range(0, len(x_final), 3):
            point = np.array([x_final[i], y_final[i], z_final[i]])
            points.append(point)

            # Color basado en posición/velocidad
            t = i / len(x_final)
            color_idx = min(int(t * len(gold_gradient)), len(gold_gradient) - 1)
            colors.append(gold_gradient[color_idx])

        # Crear VMobject con todos los puntos
        lorenz_points = VGroup()

        # Crear grupos de puntos con diferente opacidad (efecto estela)
        segment_size = 200
        for i in range(0, len(points) - segment_size, segment_size // 2):
            segment_points = points[i:i + segment_size]
            segment_colors = colors[i:i + segment_size]

            # Crear línea suave a través de los puntos
            if len(segment_points) > 2:
                line = VMobject()
                line.set_points_smoothly(segment_points)
                line.set_color(GOLD_MEDIUM if i % 1000 == 0 else GOLD_DARK)
                line.set_stroke(width=0.8, opacity=0.4 + 0.4 * (i / len(points)))
                lorenz_points.add(line)

        # Alternativa: puntos brillantes
        for i in range(0, len(points), 50):
            dot = Dot3D(
                point=points[i],
                radius=0.015,
                color=GOLD_BRIGHT,
                emissive=GOLD_BRIGHT
            )
            dot.set_fill(opacity=0.7 + 0.3 * np.random.random())
            lorenz_points.add(dot)

        # Agregar atractor a la escena
        self.add(lorenz_points)

        # ═══════════════════════════════════════════════════════════════════
        # RENDERIZAR GRAFO DE CONSTELACIÓN
        # ═══════════════════════════════════════════════════════════════════

        # Generar nodos
        nodes = generate_constellation_nodes(NUM_NODES)
        nodes[:, 0] = nodes[:, 0] * x_range / 10 + x_final.mean()
        nodes[:, 1] = nodes[:, 1] * y_range / 10 + y_final.mean()
        nodes[:, 2] = nodes[:, 2] * 0.1 + 1  # Elevar sobre el atractor

        # Calcular conectividad
        connections = compute_connectivity(nodes, DISTANCE_THRESHOLD)

        # Obtener tamaños
        sizes = node_sizes(NUM_NODES)

        # Dibujar conexiones
        constellation = VGroup()

        for i, j in connections:
            line = Line3D(
                start=nodes[i],
                end=nodes[j],
                color=GOLD_DARK,
                stroke_width=0.3,
                opacity=0.3
            )
            constellation.add(line)

        # Dibujar nodos pequeños
        for idx in range(NUM_NODES):
            dot = Dot3D(
                point=nodes[idx],
                radius=sizes[idx] * 0.02,
                color=GOLD_MEDIUM,
                emissive=GOLD_MEDIUM
            )
            dot.set_fill(opacity=0.6)
            constellation.add(dot)

        # Nodos más grandes (estrellas brillantes)
        large_indices = np.argsort(sizes)[-8:]
        for idx in large_indices:
            star = Dot3D(
                point=nodes[idx],
                radius=sizes[idx] * 0.04,
                color=GOLD_BRIGHT,
                emissive=GOLD_BRIGHT
            )
            star.set_fill(opacity=0.9)
            constellation.add(star)

        self.add(constellation)

        # ═══════════════════════════════════════════════════════════════════
        # ANIMACIÓN (opcional - removible para imagen estática)
        # ═══════════════════════════════════════════════════════════════════

        # Rotación suave de la cámara para efecto 3D
        self.begin_ambient_camera_rotation(rate=0.1)

        # Render final
        self.wait(2)

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE RENDERIZADO
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Renderizar en alta calidad
    import sys
    sys.argv = ["manim", "-ql", "-v", "ERROR", "lorenz_manim.py", "LorenzGraph"]

    # Para generar imagen estática en alta resolución:
    # python - manim -p -ql lorenz_manim.py LorenzGraph
    #
    # Para video:
    # python - manim -p  lorenz_manim.py LorenzGraph
    #
    # Para exportar imagen:
    # python - manim -ql -s lorenz_manim.py LorenzGraph
    #
    # Configuración de calidad:
    # -ql = low (rápido para preview)
    # -qm = medium
    # -qh = high
    # -qk = 4K

    print("=" * 60)
    print("COMANDOS PARA RENDERIZAR:")
    print("=" * 60)
    print("Previsualización (baja calidad):")
    print("  python -m manim -ql lorenz_manim.py LorenzGraph")
    print()
    print("Alta calidad (imagen):")
    print("  python -m manim -qh -s lorenz_manim.py LorenzGraph")
    print()
    print("Video animation:")
    print("  python -m manim -qm lorenz_manim.py LorenzGraph")
    print("=" * 60)