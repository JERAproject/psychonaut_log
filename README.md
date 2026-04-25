# Psychonaut Log

Una aplicación web simple para rastrear hábitos, construida con Astro. Permite visualizar una cuadrícula de hábitos cargados desde un servicio local.

## 🚀 Estructura del Proyecto

Dentro de tu proyecto Astro, encontrarás las siguientes carpetas y archivos:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── HabitGrid.tsx  # Componente React para mostrar la cuadrícula de hábitos
│   ├── lib/
│   │   └── habits.service.ts  # Servicio para obtener hábitos
│   ├── pages/
│   │   └── Habits.astro  # Página principal para mostrar la cuadrícula de hábitos
│   └── types.ts  # (Opcional) Definiciones de tipos como Habit
├── astro.config.mjs  # Configuración de Astro con integración de React
├── package.json
└── tsconfig.json
```

Para más información sobre la estructura de proyectos en Astro, consulta [nuestra guía](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Comandos

Todos los comandos se ejecutan desde la raíz del proyecto, en una terminal:

| Comando                   | Acción                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Instala dependencias                            |
| `npm run dev`             | Inicia el servidor de desarrollo local en `localhost:4321` |
| `npm run build`           | Construye el sitio de producción en `./dist/`   |
| `npm run preview`         | Previsualiza la construcción localmente antes de desplegar |
| `npm run astro ...`       | Ejecuta comandos CLI como `astro add`, `astro check` |
| `npm run astro -- --help` | Obtén ayuda con el CLI de Astro                 |

## 👀 ¿Quieres aprender más?

Consulta [nuestra documentación](https://docs.astro.build) o únete a nuestro [servidor de Discord](https://astro.build/chat).
