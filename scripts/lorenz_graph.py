#!/usr/bin/env python3
"""
Lorenz Attractor + Constellation Graph - Generative Art
=========================================================
Sistema híbrido que combina:
1. Atractor de Lorenz (trayectorias suaves con EDO)
2. Grafo de Constelación (nodos + líneas de proximidad)

Mathematical Foundation:
- Lorenz: dx/dt = σ(y-x), dy/dt = x(ρ-z)-y, dz/dt = xy-βz
- RK4 integration for smooth trajectories
- Euclidean distance threshold for graph connectivity
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
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
RESOLUTION = 2000  # Alta resolución
NUM_POINTS = 80000  # Número de puntos para trayectoria densa
NUM_NODES = 120  # Nodos para el grafo de constelación
DISTANCE_THRESHOLD = 0.35  # Umbral de conectividad para el grafo
DT = 0.002  # Paso de integración

# Colores - Paleta dorada premium
GOLD_PALETTE = {
    'bg_dark': '#020b14',
    'bg_light': '#051329',
    'gold_bright': '#FFD700',
    'gold_medium': '#DAA520',
    'gold_dark': '#B8860B',
    'bronze': '#CD7F32',
}

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
    Integra el sistema de Lorenz usando RK4 vía solve_ivp.
    Retorna arrays de coordenadas x, y, z.
    """
    if initial_state is None:
        # Estado inicial aleatorio cerca del atractor
        initial_state = [1.0, 1.0, 1.0]

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

def apply_projection(x, y, z, angles=None):
    """
    Proyección 3D → 2D con rotación para obtener la silueta de mariposa.
    Rotación compuesta: α (yaw) + β (pitch) + γ (roll)
    """
    if angles is None:
        # Ángulos optimizados para la silueta de mariposa estilizada
        alpha = np.radians(45)   # Rotación Y (yaw)
        beta = np.radians(25)    # Rotación X (pitch)
        gamma = np.radians(15)  # Rotación Z (roll)
    else:
        alpha, beta, gamma = angles

    # Matriz de rotación 3D
    cos_a, sin_a = np.cos(alpha), np.sin(alpha)
    cos_b, sin_b = np.cos(beta), np.sin(beta)
    cos_g, sin_g = np.cos(gamma), np.sin(gamma)

    # Matriz de rotación combinada
    Rx = np.array([[1, 0, 0], [0, cos_b, -sin_b], [0, sin_b, cos_b]])
    Ry = np.array([[cos_a, 0, sin_a], [0, 1, 0], [-sin_a, 0, cos_a]])
    Rz = np.array([[cos_g, -sin_g, 0], [sin_g, cos_g, 0], [0, 0, 1]])

    R = Rz @ Ry @ Rx

    # Aplicar rotación
    points = np.vstack([x, y, z])
    rotated = R @ points

    return rotated[0], rotated[1], rotated[2]

# ═══════════════════════════════════════════════════════════════════════════
# SISTEMA 2: GRAFO DE CONSTELACIÓN
# ═══════════════════════════════════════════════════════════════════════════

def generate_constellation_nodes(num_nodes, bounds=(-2, 2)):
    """
    Genera nodos con distribución gaussiana clustered para efecto visual.
    """
    np.random.seed(42)

    # Centros de cluster para distribución más natural
    centers = np.random.randn(5, 3) * 0.8
    nodes = []

    for _ in range(num_nodes):
        # Elegir un centro aleatorio
        center = centers[np.random.randint(len(centers))]
        # Añadir dispersión gaussiana
        point = center + np.random.randn(3) * 0.4
        nodes.append(point)

    nodes = np.array(nodes)

    # Escalar para rodear el atractor
    nodes[:, 0] = nodes[:, 0] * 2 + np.random.randn() * 0.3
    nodes[:, 1] = nodes[:, 1] * 2 + np.random.randn() * 0.3
    nodes[:, 2] = nodes[:, 2] * 0.8 + 20  # Z-offset para que flote sobre el atractor

    return nodes

def compute_connectivity(nodes, threshold):
    """
    Calcula conexiones entre nodos basados en distancia euclidiana.
    Retorna lista de pares conectados.
    """
    n = len(nodes)
    connections = []

    for i in range(n):
        for j in range(i + 1, n):
            dist = np.linalg.norm(nodes[i] - nodes[j])
            if dist < threshold:
                connections.append((i, j))

    return connections

def node_sizes(num_nodes):
    """
    Genera tamaños heterogéneos para los nodos:
    - Algunos grandes (estrellas brillantes)
    - La mayoría pequeños (polvo estelar)
    """
    np.random.seed(123)
    sizes = np.random.exponential(scale=0.8, size=num_nodes)
    sizes = np.clip(sizes, 0.3, 3.5)  # Rango de tamaños
    return sizes

# ═══════════════════════════════════════════════════════════════════════════
# RENDERIZADO
# ═══════════════════════════════════════════════════════════════════════════

def create_gold_cmap():
    """
    Crea mapa de color personalizado: negro → bronce → oro → blanco dorado
    """
    colors = [
        (0.0, '#020b14'),   # Negro puro
        (0.2, '#1a1a2e'),  # Azul muy oscuro
        (0.4, '#8B4513'),  # Bronce oscuro
        (0.6, '#DAA520'),  # Oro medio (GoldenRod)
        (0.8, '#FFD700'),  # Oro brillante
        (1.0, '#FFF8DC'),  # Blanco dorado
    ]
    return LinearSegmentedColormap.from_list('gold_premium', colors)

def create_lorenz_graph(output_path='lorenz_graph.png'):
    """
    Función principal que orquesta todo el proceso de generación.
    """

    # 1. CONFIGURAR FIGURA
    fig = plt.figure(figsize=(RESOLUTION/100, RESOLUTION/100), dpi=100)
    ax = fig.add_subplot(111, projection='3d')
    ax.set_facecolor(GOLD_PALETTE['bg_dark'])
    fig.patch.set_facecolor(GOLD_PALETTE['bg_dark'])

    # 2. GENERAR TRAYECTORIAS DE LORENZ
    print("-> Integrando Atractor de Lorenz...")
    x, y, z = integrate_lorenz(NUM_POINTS, DT, initial_state=[0.1, 0.1, 0])

    # 3. APLICAR PROYECCIÓN 3D -> 2D
    print("-> Aplicando proyección de rotación...")
    x_proj, y_proj, z_proj = apply_projection(x, y, z)

    # Normalizar y centrar
    x_proj = (x_proj - x_proj.min()) / (x_proj.max() - x_proj.min())
    y_proj = (y_proj - y_proj.min()) / (y_proj.max() - y_proj.min())

    # Calcular "velocidad" basada en cambio de posición (para color)
    velocity = np.sqrt(np.diff(x_proj)**2 + np.diff(y_proj)**2 + np.diff(z_proj)**2)
    velocity = np.concatenate([[0], velocity])
    velocity = (velocity - velocity.min()) / (velocity.max() - velocity.min())

    # 4. RENDERIZAR ATRACTOR (Lineas con gradiente de transparencia)
    print("-> Renderizando trayectorias de Lorenz...")

    # Crear mapa de color dorado
    gold_cmap = create_gold_cmap()

    # Scatter con efecto de estela (usando alpha variable)
    # Dividir en segmentos para aplicar gradiente de alpha
    segment_size = 500
    for i in range(0, len(x_proj) - segment_size, segment_size):
        segment_x = x_proj[i:i+segment_size]
        segment_y = y_proj[i:i+segment_size]
        segment_z = z_proj[i:i+segment_size]
        segment_v = velocity[i:i+segment_size]

        avg_alpha = 0.15 + 0.35 * (i / len(x_proj))  # Estela con alpha creciente

        ax.plot(segment_x, segment_y, segment_z,
                color=gold_cmap(segment_v.mean()),
                alpha=avg_alpha,
                linewidth=0.15,
                solid_joinstyle='round')

    # 5. GENERAR GRAFO DE CONSTELACIÓN
    print("-> Generando grafo de constelacion...")

    # Generar nodos
    nodes = generate_constellation_nodes(NUM_NODES)

    # Proyectar nodos (misma transformación que atractor)
    # Ajustar para que estén alrededor del atractor
    nodes[:, 0] = nodes[:, 0] * (x_proj.max() - x_proj.min()) * 0.6 + (x_proj.max() + x_proj.min()) / 2
    nodes[:, 1] = nodes[:, 1] * (y_proj.max() - y_proj.min()) * 0.6 + (y_proj.max() + y_proj.min()) / 2
    nodes[:, 2] = nodes[:, 2] * 0.1  # Achatar en Z para efecto 2.5D

    # Calcular conectividad
    connections = compute_connectivity(nodes, DISTANCE_THRESHOLD)

    # Obtener tamaños de nodos
    sizes = node_sizes(NUM_NODES)

    # 6. RENDERIZAR NODOS Y CONEXIONES
    print("-> Renderizando constelacion...")

    # Dibujar conexiones (lineas con alpha reducido)
    for i, j in connections:
        ax.plot([nodes[i, 0], nodes[j, 0]],
                [nodes[i, 1], nodes[j, 1]],
                [nodes[i, 2], nodes[j, 2]],
                color=GOLD_PALETTE['gold_medium'],
                alpha=0.25,
                linewidth=0.3,
                zorder=1)

    # Dibujar nodos
    node_colors = [gold_cmap(np.random.uniform(0.4, 0.9)) for _ in range(NUM_NODES)]
    ax.scatter(nodes[:, 0], nodes[:, 1], nodes[:, 2],
               s=sizes * 15,
               c=node_colors,
               alpha=0.8,
               edgecolors='none',
               zorder=2)

    # Nodos más grandes (estrellas brillantes) - top 5%
    large_nodes = np.argsort(sizes)[-6:]
    ax.scatter(nodes[large_nodes, 0], nodes[large_nodes, 1], nodes[large_nodes, 2],
               s=sizes[large_nodes] * 40,
               c=GOLD_PALETTE['gold_bright'],
               alpha=0.95,
               edgecolors='white',
               linewidths=0.3,
               zorder=3)

    # 7. AJUSTES FINALES
    print("-> Aplicando ajustes finales...")

    ax.axis('off')
    ax.set_box_aspect([1, 1, 0.4])

    # Eliminar márgenes whitespaces
    plt.subplots_adjust(left=0, right=1, bottom=0, top=1)

    # 8. GUARDAR
    print("-> Guardando en: " + output_path)
    plt.savefig(output_path,
                dpi=RESOLUTION/10,
                format='png',
                bbox_inches='tight',
                pad_inches=0,
                facecolor=GOLD_PALETTE['bg_dark'],
                edgecolor='none')

    plt.close()
    print("OK! Generative art guardado exitosamente.")

    return output_path

# ═══════════════════════════════════════════════════════════════════════════
# PUNTO DE EJECUCIÓN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    output = create_lorenz_graph("lorenz_graph.png")
    print("\nImagen generada: " + output)

# ═══════════════════════════════════════════════════════════════════════════
# EXPLICACIÓN MATEMÁTICA
# ═══════════════════════════════════════════════════════════════════════════
"""
PROYECCIÓN UTILIZADA:
- Rotación compuesta sobre los 3 ejes del espacio 3D
- Ángulos: α=45°, β=25°, γ=15° (configuración "mariposa diagonal")
- Justificación: La transformación preserva la topología del atractor
  mientras orienta la estructura hacia la diagonal derecha-superior,
  creando el balance asimétrico deseado.

INTEGRACIÓN:
- Método: Runge-Kutta 4to orden (RK45 en scipy)
- Paso: dt=0.002 para alta resolución de trayectoria
- Puntos: 80,000 para efecto de filamento denso

CONECTIVIDAD DEL GRAFO:
- Modelo: Grafo basado en proximidad euclidiana
- Threshold: d < 0.35 unidades normalizadas
- Justificación: Crea constelaciones naturales sin sobrecargar visualmente
"""