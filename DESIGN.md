---
name: Psychonaut Log
version: "alpha"
description: Bitácora de registro y análisis de prácticas psiconáuticas
colors:
  background: "#010207"
  background-elevated: "#111827"
  text-primary: "#fefefe"
  text-secondary: "#aaa"
  accent: "#5b8ff9"
  border: "#2a2a35"
  card-bg: "rgba(255, 255, 255, 0.1)"
typography:
  font-heading:
    fontFamily: Inter
    fontSize: 1.2rem
    fontWeight: 600
  font-body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
  font-small:
    fontFamily: Inter
    fontSize: 0.9rem
    fontWeight: 400
  font-nav:
    fontFamily: Inter
    fontSize: 0.95rem
    fontWeight: 500
  font-logo:
    fontFamily: Inter
    fontSize: 1.1rem
    fontWeight: 700
rounded:
  sm: 8px
  md: 12px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  xxl: 2.5rem
components:
  card:
    backgroundColor: "{colors.card-bg}"
    borderRadius: "{rounded.md}"
    padding: "{spacing.lg}"
    backdropFilter: "blur(10px)"
  card-hover:
    transform: "translateY(-5px)"
  nav-link:
    color: "{colors.text-secondary}"
    padding: "{spacing.sm} {spacing.md}"
    borderRadius: "{rounded.sm}"
  nav-link-hover:
    color: "{colors.text-primary}"
    backgroundColor: "rgba(255, 255, 255, 0.05)"
  button-primary:
    backgroundColor: "{colors.accent}"
    color: "white"
    borderRadius: "{rounded.sm}"
  skip-link:
    backgroundColor: "{colors.accent}"
    color: "white"
    borderRadius: "{rounded.sm}"
---

## Overview

Psychonaut Log es una aplicación de bitácora personal para registrar y analizar prácticas psiconáuticas como meditación, visualización y autoindagación. El diseño evoca un ambiente místico-espacial con tonos oscuros profundos, creando una atmósfera contemplativa适合 la exploración interior.

## Colors

La paleta está construida sobre un fondo casi negro con textos claros y acentos sutiles.

- **Background (#010207):** Negro profundo del espacio, base de toda la aplicación.
- **Background Elevated (#111827):** Gris oscuro para elementos elevados como el menú móvil.
- **Text Primary (#fefefe):** Blanco cálido para textos principales, legible sobre fondo oscuro.
- **Text Secondary (#aaa):** Gris claro para textos de menor jerarquía y navegación.
- **Accent (#5b8ff9):** Azul vibrante para elementos interactivos y estados de focus.
- **Border (#2a2a35):** Gris oscuro para separadores y bordes sutiles.
- **Card Background (rgba 255,255,255,0.1):** Blanco semitransparente para efecto glassmorphism.

## Typography

La tipografía usa **Inter** como fuente principal, una sans-serif limpia y legible con excelente legibilidad en pantallas.

- **Headings (1.2rem, 600):** Títulos de tarjetas y secciones.
- **Body (1rem, 400):** Texto principal de contenido.
- **Small (0.9rem):** Descripciones y textos secundarios.
- **Navigation (0.95rem, 500):** Enlaces de navegación.
- **Logo (1.1rem, 700):** Nombre de marca en el header.

## Layout

- **Container:** Grid responsivo con `auto-fit`, mínimo 280px por columna, gap de 1rem.
- **Header:** Sticky con blur, max-width 1200px, padding 0.75rem vertical.
- **Cards:** Flexbox con gap 1rem, máximo ancho 600px.

## Shapes

- **Border radius small (8px):** Botones, enlaces, logo.
- **Border radius medium (12px):** Tarjetas principales.
- **Shadows:** `0 4px 6px rgba(0, 0, 0, 0.1)` para profundidad.

## Components

### Navigation

El header contiene logo y menú de navegación. Los enlaces tienen:
- Estado default: texto gris (#aaa)
- Hover: texto blanco con fondo semitransparente
- Focus visible: outline azul (#5b8ff9) con offset

### Cards

Usan efecto glassmorphism:
- Fondo blanco al 10% de opacidad
- Blur de backdrop (10px)
- Sombra sutil
- Hover: translateY(-5px) con transición

### Mobile Menu

Menú lateral desplegable desde la derecha:
- Ancho 280px
- Fondo #111827
- Transición slide de 0.3s

## Do's and Don'ts

- **Do:** Mantener el contraste alto entre texto y fondo oscuro.
- **Do:** Usar el efecto glassmorphism para tarjetas y elementos flotantes.
- **Don't:** Usar colores brillantes saturados que rompan la atmósfera oscura.
- **Don't:** Usar más de un color de acento (el azul #5b8ff9).