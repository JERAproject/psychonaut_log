import matplotlib.pyplot as plt
import numpy as np

# =========================
# DATOS
# =========================

categorias = [
    "Logros",
    "Relaciones interpersonales",
    "Sentido vital",
    "Emociones agradables",
    "Entrega (flow)"
]

# Valores de ejemplo
valores = [2, 5, 2, 3, 4]

# =========================
# CONFIGURACIÓN GEOMÉTRICA
# =========================

# Ángulos manuales (en grados)
# Para imitar la forma del gráfico original
angulos_deg = [90, 18, -54, -126, 162]

# Convertir a radianes
angulos = np.radians(angulos_deg)

# =========================
# FIGURA
# =========================

fig, ax = plt.subplots(figsize=(8,8))
ax.set_aspect('equal')
ax.axis('off')

radio_max = 5

# =========================
# DIBUJAR EJES
# =========================

for angulo, categoria in zip(angulos, categorias):

    # Coordenadas del extremo
    x = radio_max * np.cos(angulo)
    y = radio_max * np.sin(angulo)

    # Línea del eje
    ax.plot([0, x], [0, y], color='black', lw=2)

    # Marcas numéricas
    for r in range(1, radio_max + 1):

        tx = r * np.cos(angulo)
        ty = r * np.sin(angulo)

        # pequeña marca perpendicular
        dx = 0.08 * np.cos(angulo + np.pi/2)
        dy = 0.08 * np.sin(angulo + np.pi/2)

        ax.plot(
            [tx - dx, tx + dx],
            [ty - dy, ty + dy],
            color='black',
            lw=1
        )

        # números
        ax.text(
            tx + dx*3,
            ty + dy*3,
            str(r),
            fontsize=10,
            ha='center',
            va='center'
        )

    # Etiqueta del eje
    label_x = (radio_max + 0.7) * np.cos(angulo)
    label_y = (radio_max + 0.7) * np.sin(angulo)

    ax.text(
        label_x,
        label_y,
        categoria,
        fontsize=16,
        ha='center',
        va='center',
        rotation=np.degrees(angulo)
    )

# =========================
# POLÍGONO DE RESULTADOS
# =========================

puntos_x = []
puntos_y = []

for valor, angulo in zip(valores, angulos):

    x = valor * np.cos(angulo)
    y = valor * np.sin(angulo)

    puntos_x.append(x)
    puntos_y.append(y)

# cerrar polígono
puntos_x.append(puntos_x[0])
puntos_y.append(puntos_y[0])

# línea
ax.plot(
    puntos_x,
    puntos_y,
    color='salmon',
    lw=2
)

# círculos
ax.scatter(
    puntos_x[:-1],
    puntos_y[:-1],
    s=1500,
    facecolors='none',
    edgecolors='salmon',
    linewidths=2
)

# =========================
# LÍMITES
# =========================

ax.set_xlim(-6, 6)
ax.set_ylim(-6, 6)

plt.show()