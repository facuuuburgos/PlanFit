# PlanFit — rutinas profesionales en PDF

App web (PWA) para entrenadores personales. Cargás los datos del cliente y del plan, y PlanFit genera un PDF
prolijo con portada, gráfica del plan con "estás aquí", rutinas semanales, evolución, hoja de seguimiento y recomendaciones.
Funciona en iPhone, iPad y computadora, sin internet una vez instalada.

## Publicar en GitHub Pages (igual que Entreno)
1. En GitHub: **New repository** → nombre `planfit` → Public → Create.
2. **Add file → Upload files**: arrastrá TODO el contenido de esta carpeta (index.html, sw.js, manifest.webmanifest, styles.css, carpetas `js` e `icons`) → Commit.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main` / `/ (root)` → Save.
4. En 1–2 minutos queda en `https://TU-USUARIO.github.io/planfit/`.

## Instalar en iPhone / iPad
Abrí la URL en **Safari** → botón Compartir → **Agregar a pantalla de inicio**.

## Actualizar la app
1. En `sw.js` cambiá `VERSION` (ej. `"1.0.1"`) y en `js/app.js` cambiá `UI.VERSION` al mismo valor.
2. Subí los archivos modificados a GitHub (reemplazan a los anteriores).
3. Al abrir la app aparece el aviso **"Actualizar"**; al tocarlo se carga la versión nueva.

## Importante
- Los datos se guardan **solo en el dispositivo**. Usá *Ajustes → Copia de seguridad* de vez en cuando.
- Pasar datos de iPhone a iPad: exportar copia en uno e importarla en el otro.
