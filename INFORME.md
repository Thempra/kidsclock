# Informe: optimización, menú 2x2 con iconos grandes y tema oscuro del kiosco

Equipo: `thempra@192.168.50.214` (hostname `aura`) — Intel Atom x5-Z8350,
1,8 GiB de RAM, eMMC, MX Linux 23.6 / Debian 12, XFCE 4.20, sysvinit,
sin teclado físico (panel táctil Goodix). Kiosco: Firefox en modo `--kiosk`,
ventana 1280x800 en (0,0).

---

## 1. Optimización — aplicada y verificada

### Antes / después

| Métrica | Antes | Después de optimizar | Tras reinicio (6.1.0-54) |
|---|---|---|---|
| RAM disponible | 435–569 MB | 652 MB | **954 MB** |
| Presión E/S (`/proc/pressure/io`, avg10) | 2,71 | 0,20 | 6,07 en frío / ~0,2 en reposo |
| Presión memoria (avg10) | 0,36 | 0,00 | 0,29 |
| `%wa` | 12,5 | ~0 | ~0 |
| Load average (1/5/15) | — | 0,53 / 1,77 / 2,08 | 2,02 / 0,58 / 0,20 (arranque) |
| Disco `/` | 84 % | 80 % | **75 %** (3,5 GB libres) |
| gettys | 6 | 2 | 2 |
| Sockets TCP en escucha | muchos daemons | solo 22 | solo 22 |
| Gobernador CPU | ondemand | `schedutil` ×4 | `schedutil` ×4 |
| Panel XFCE | 104,8 MB | 46,9 MB | 46,9 MB |
| Swap en uso | — | 617 MB (336 zram + 281 fichero) | **117 MB, todo zram** |
| Kernel | 6.1.0-34 | 6.1.0-34 | **6.1.0-54** |

### Cambios, con rutas exactas

**Servicios parados y deshabilitados** (`update-rc.d <svc> disable` +
`/etc/init.d/<svc> stop`): `cups-browsed, cups, saned, avahi-daemon,
nfs-kernel-server, rpcbind, nfs-common, mdadm, smartmontools, rsync, openvpn,
open-vm-tools, spice-vdagent, bluetooth, haveged`. Además se mataron
`ModemManager` y `apt-notifier`.

**zram** — `/etc/default/zramswap`: `ALGO=lz4`, `PERCENT=75`,
`PRIORITY=100`. Resultado: `/dev/zram0` de 1,4 GB con prioridad 100, y
`/swap/swap` (2,8 GB, prioridad -2) como respaldo.
`/etc/sysctl.d/99-swappiness_mx.conf`: `vm.swappiness=100`,
`vm.page-cluster=0`.

**Gettys** — `/etc/inittab` (backup `.bak-optimizacion`): solo tty1 y tty2;
aplicado con `telinit q`.

**TRIM** — `discard=async` en `/etc/fstab` **falló**: el kernel 6.1 de Debian
no lo admite en ext4. Revertido a `noatime`. En su lugar,
`/etc/cron.weekly/fstrim-mx`.

**Escritorio** — a `false` en `xfconf`: `xfce4-screensaver /saver/enabled`,
`/lock/enabled`, `/lock/embedded-keyboard/enabled` y
`xfce4-power-manager /dpms-enabled`. Eliminado el plugin `popsquares`.
`Hidden=true` en `/etc/xdg/autostart/` para: `lxqt-compton,
orca-autostart, onboard-autostart, print-applet, zstartup-sound,
cleanup-notifier-mx, spice-vdagent, xfce4-notes-autostart,
mx-tweak-tray-app-autostart, apt-notifier-autostart`.
**No usar `xfce4-panel -r`: se cuelga.**

**Gobernador** — `/etc/default/cpufrequtils`: `ENABLE="true"`,
`GOVERNOR="schedutil"`, `MAX_SPEED="0"`, `MIN_SPEED="0"`; con
`S04cpufrequtils` en `rc2.d`. Cuatro núcleos en `schedutil`, driver
`intel_cpufreq`. TLP no lo pisa (`/etc/tlp.conf` líneas 87-88 comentadas).

**Espacio** — `apt-get clean`; purga de `linux-image-6.1.0-21-amd64`,
`linux-headers-6.1.0-21-amd64` y `-common`; `autoremove --purge`; purga
autorizada de `thunderbird`, `openjdk-17-jre-headless` y `libreoffice*`
(27 paquetes, verificado antes con `apt-get -s`); borrados 32 `/tmp/*.zip`
de telemetría.

**earlyoom 1.7-1+b1** — `/etc/default/earlyoom` con
`EARLYOOM_ARGS="-m 5 -s 5 --avoid '(^|/)(init|X|sshd|lightdm|xfce4-session|dbus-daemon)$'"`
y `update-rc.d earlyoom defaults` (`S03earlyoom`). Una sola instancia
(PID 281116), estado OK.

**Firefox** — 16 prefs en
`/home/thempra/.mozilla/firefox/x9ggf88o.default-release-1757877375144/user.js`,
verificadas en `prefs.js`.

### Benchmarks de Firefox y por qué se abandonó esa vía

| Escenario | Uso de CPU |
|---|---|
| `about:blank` | 58 % |
| Kiosco remoto (GitHub Pages) | 87 % |
| `layout.frame_rate=20` | 98 % |
| `gfx.webrender.software` | ~91 % |
| Local sin webfont | 97 % |
| `will-change`/`contain` | 92 % |
| Base local | 97 % |

Varianza de ±10 pp entre repeticiones: la ganancia es inseparable del ruido.
**El cuello de botella es el compositor software del Atom**, no la página.
Las mediciones antiguas (128/170/271 %) eran inválidas: había cuatro
instancias de Firefox solapadas.

---

## 2. Menú del kiosco — desplegado y verificado

Commits `de5eec1` (menú de tres tarjetas), `7ef231b` (Spotify, rejilla 2x2 y
tema oscuro) y `783ffc5` (iconos grandes y tarjeta «Música») en
`github.com/Thempra/kidsclock` (rama `main`), publicados en GitHub Pages.

### Estructura

```
index.html          menú / dashboard (nueva pantalla principal)
clock/index.html    reloj (antes estaba en la raíz)
clock/styles.css
clock/script.js
games/index.html    "Juegos — En construcción"
kiosk/kiosk-home-btn.py
kiosk/README.md
```

El menú es el `index.html` de la raíz a propósito: la URL del autostart ya
serviría el menú sin tocar el `.desktop`.

Cuatro tarjetas —Domótica, Reloj, Juegos, Música— en grid `2x2`
(`grid-template-columns:repeat(2,1fr)` / `grid-template-rows:repeat(2,1fr)`,
gap 22px, padding `22px 36px 32px`). Cada tarjeta lleva franja de acento,
icono SVG inline, título, descripción y pill. Sin JS de animación, sin
webfonts, sin imágenes raster. Áreas táctiles ≥44 px. Home Assistant no se
puede embeber (`x-frame-options: SAMEORIGIN`), así que se abre a nivel de
pestaña; Música (Spotify) igual.

Una fila de cuatro tarjetas habría dado 290 px de ancho por tarjeta a 1280:
texto ilegible en una pantalla que se mira a un brazo de distancia. 2x2 da
593x312 por tarjeta.

### El icono manda

A petición del usuario el icono pasa a dominar la tarjeta: círculo de **164 px**
con SVG de **100 px** (antes 76/40), tarjeta centrada en ambos ejes y tipografía
de apoyo más discreta — título de 27 a 25 px, descripción de 15 a 14, pill de
13,5 a 12,5. El icono ocupa el 11,4 % del área de la tarjeta y el bloque de
texto solo 90 px de los 312 de alto, así que se reconoce la tarjeta por el
dibujo y las letras quedan para confirmar.

180 px de círculo desbordaba la tarjeta (`scrollHeight` > `clientHeight`): el
icono despegaba del borde superior y la pill se salía. 164 es el máximo que
cabe con el texto de una línea.

La tarjeta de Spotify se llama **Música**: el niño busca la actividad, no la
marca. El icono se mantiene en trazo, como los otros tres, para que las cuatro
tarjetas se lean como un conjunto; la marca solo aparece en la descripción
(«Canciones y podcasts para la casa») y en la pill «Para todos».

Verificación headless y **en la tablet real** a 1280x800: tarjetas en
`[36,122,593,312]`, `[651,122,593,312]`, `[36,456,593,312]`, `[651,456,593,312]`;
los cuatro círculos medidos por píxel a **164x164**; sin desbordamiento
horizontal ni vertical y sin recorte en ninguna tarjeta.

Ojo al verificar tras un despliegue: GitHub Pages manda `Cache-Control:
max-age=600` y la tablet siguió sirviendo el HTML viejo (círculos de 76 px) tras
un `ctrl+L`. Hay que forzar `ctrl+Shift+R`. El fichero en
`/home/thempra/clock/index.html` ya tenía el nuevo, así que `rsync` no era el
problema.

### Tema oscuro

El usuario lo pidió así: «tanta luz es molesta», mirando la tablet de noche.
Al principio se oscurecieron **las tres pantallas**, y después pidió que el
reloj conservara su paleta clara: se le devolvió tal cual estaba.

**Menú y juegos** siguen oscuros, con tokens compartidos: `--bg:#14161a`,
`--surface:#1d2127`, `--fg:#eceae6`, `--muted:#9a948c`, `--border:#2c3138`,
`--accent-house:#2dd4bf`, `--accent-clock:#fb923c`, `--accent-games:#a5b4fc`,
`--accent-music:#1ed760`.

**El reloj vuelve al tema claro original**, commit `f6cdd1b`: fondo metálico
en degradado (`#bfc0c0 → #e6e7e8 → #a7a8aa`), aguja horaria `#ff6b6b`, aguja
minutera `#333`, segundero `#ff9a9e`, títulos `#ff6b6b`, textos `#333`/`#666`.
Los segmentos recuperan los doce colores Material vivos (`#f44336`, `#ff9800`,
`#ffeb3b`, `#cddc39`, `#4caf50`, `#00bcd4`, `#2196f3`, `#3f51b5`, `#9c27b0`,
`#e91e63`, `#795548`, `#607d8b`). En `clock/` no queda ni un `var(--…)` ni un
color del tema oscuro.

Coste asumido y consciente: los números pequeños van en `#888`, que sobre los
segmentos saturados da **1,04:1** en el rojo y 1,13:1 en el azul — ilegibles.
Sobre el fondo del reloj sí cumple (3,54:1 sobre blanco). Es el dibujo
original; si molesta, `clock/styles.css:110` es la única línea que hay que
tocar.

Luminancia media de la captura real (0–255): menú **34,0** (antes ~236),
reloj **201,3** (con el tema oscuro llegó a ~39), juegos **24,2**.

### Botón de vuelta en el reloj

`<a class="home-btn" href="../index.html">` con SVG inline (casa 24x24,
`stroke-width:2`), `position:fixed; left:18px; bottom:18px`, 76x76,
`border-radius:50%`, `z-index:900`. Se descartó el glifo `&#8962;`: en
`Comic Neue` se renderizaba a 18x22 px e incompleto.

### Navegación táctil real (clics sobre la pantalla, no simulación)

Cuatro rutas de ida y vuelta desde el menú, todas correctas antes y después
del reinicio:

| Ruta | Título observado al entrar | Vuelta |
|---|---|---|
| Menú → Domótica | `Home Assistant — Mozilla Firefox` | overlay (1224,744) |
| Menú → Reloj | `Reloj de Actividades para Niños` | `.home-btn` (56,744) |
| Menú → Juegos | `Juegos — Mozilla Firefox` | enlace "Volver al menú" (640,545) |
| Menú → Música | `Spotify - Web Player: Listen to Music, Podcasts, and Audiobooks Online` | overlay (1224,744) |

El overlay se oculta (`IsUnMapped`) en menú, reloj y juegos, y aparece
(`IsViewable`) en HA y Spotify. Tras el reinicio el ID de su ventana cambia
(`0x3600000` → `71303168`): hay que buscarlo con
`xdotool search --name "^kiosk-home-btn$"`, no reutilizar el viejo.

Píxel del botón tras el reinicio: blanco (255,255,255) en el centro, con
esquinas al fondo de HA — la máscara SHAPE sigue funcionando.

---

## 3. Defecto cerrado: sin salida desde Home Assistant

**Problema.** Al entrar en Domótica el usuario quedaba atrapado: HA no se puede
embeber, y el kiosco no tiene barra de navegación ni teclado.

**Decisión.** Overlay flotante que aparece solo en páginas externas y navega al
menú escribiendo la URL con `ctrl+L`. Se descartó `alt+Left`: depende del
historial y se rompe si el niño navega dentro de Lovelace.

**Detalle no obvio.** El compositor XFCE está inactivo (`xprop -root
_NET_WM_CM_S0` → `not found`), así que la transparencia no funciona y una
ventana redondeada muestra esquinas negras. Solución: **máscara de forma X11
(SHAPE)**. Activar compositing habría costado fluidez en el Atom, justo lo
contrario del punto 1.

**Reescritura por RAM.** La primera versión con GTK3 funcionaba (clic verificado
HA → Casa) pero costaba **55,6 MB de RSS**. Medido: python solo 7,9 MB; +Xlib
12,3 MB; +PIL 18,6 MB; +GTK 30,8 MB en imports y 55,6 MB en ejecución. En un
equipo de 1,8 GB cuyo frente principal era liberar memoria, eso es inaceptable.
Reescrito sobre **Xlib + PIL: 21 MB**.

**Bugs encontrados y corregidos:**

| Síntoma | Causa | Arreglo |
|---|---|---|
| `TypeError: put_image() missing 'data'` | la firma real es `(gc,x,y,w,h,format,depth,left_pad,data,onerror)`; faltaba `left_pad` | pasar `0` en esa posición |
| `struct.error: required argument is not an integer` | `shape_mask(op, kind, x_offset, y_offset, source_bitmap)` — el bitmap va el **último** | reordenar argumentos |
| Clic sin efecto | `ctrl+L` sin margen para que la barra de URL coja el foco | `sleep` 0,6 s antes de escribir, 0,4 s antes de `Return` |

**Verificación en la tablet real.** Tres ciclos consecutivos
HA → Casa → HA → Casa → HA → Casa. El botón se auto-oculta
(`Map State: IsUnMapped`) en menú, reloj y juegos, y aparece (`IsViewable`) en
Home Assistant. Icono legible, círculo limpio, esquinas al fondo de la página.
RSS estable en 21 MB.

**Instalación:** `/home/thempra/.local/bin/kiosk-home-btn.py` +
`~/.config/autostart/kiosk-home-btn.desktop`. Sin `OnlyShowIn`: el entorno del
kiosco no exporta `XDG_CURRENT_DESKTOP`, y restringirlo impediría el arranque.

### Modo kiosco en Home Assistant (`?kiosk`)

La tarjeta Domótica enlaza a `https://domotica.thempra.net/lovelace/home?kiosk`
para que el dashboard ocupe los 1280x800 completos, sin cabecera ni barra
lateral que nadie puede alcanzar sin ratón.

**`?kiosk` no es nativo de Home Assistant.** El frontend tiene la propiedad
`hass.kioskMode`, pero solo cambia con el evento `hass-kiosk-mode`, que emite la
tarjeta HACS `kiosk-mode`. Sin esa tarjeta el parámetro se ignora en silencio:
comparando capturas con y sin `?kiosk` la diferencia media era 0,0–0,2 de
brillo. Comprobado en el bundle real (`app.7349e8752c08ffeb.js`):
`window.addEventListener("hass-kiosk-mode", e => this._updateHass({kioskMode:
e.detail.enable}))`.

Instalado `NemesisRE/kiosk-mode` v15.0.0 (el fork mantenido: el original
`maykar/kiosk-mode` está parado en 1.7.2 de 2021) en la instancia Docker del
Nuc — HA 2026.9.0, config `/data/homeassistant`:

| Paso | Ruta / comando |
|---|---|
| Bundle | `/data/homeassistant/www/community/kiosk-mode/kiosk-mode.js` (59 KB) |
| Recurso Lovelace | `.storage/lovelace_resources` → `/local/community/kiosk-mode/kiosk-mode.js?v=15.0.0`, tipo `module` |
| Recarga | `docker restart homeassistant` (la lista de recursos vive en memoria) |

Copia previa de `.storage/lovelace_resources` en `/root/lovelace_resources.bak.*`.

**Verificación en la tablet.** Con `?kiosk` el contenido del dashboard empieza
en **(0,0)**; sin el parámetro, en **(55,55)** por la cabecera y la barra
lateral. Flujo completo desde el menú: toque en Domótica → dashboard a pantalla
completa con el overlay de vuelta visible → botón (1224,744) → menú.

Si algún día hace falta desactivarlo sin tocar la URL, `?disable_km` al final.

---

## 4. Reinicio y kernel 6.1.0-54 — hecho

`apt-get full-upgrade` duró 2121 s y terminó limpio. `dpkg --audit` vacío.
DKMS compiló e instaló en **ambos** kernels:

| Módulo | 6.1.0-34 (ya purgado) | 6.1.0-54 (en ejecución) |
|---|---|---|
| `rtl8821ce` | installed | installed |
| `rtl8821cu` | installed | installed |
| `8812au` | — | installed |
| `broadcom-sta` | — | installed |

GRUB ya apuntaba a 6.1.0-54 como entrada por defecto, así que el reinicio no
exigió tocar `/etc/default/grub`. Arranque verificado: SSH responde a los 66 s
con `uname -r` = `6.1.0-54-amd64`, WiFi arriba por `rtw88_8822be`, los cuatro
núcleos en `schedutil`, `zram0` a 1,4 G y swap en **0 B**.

Estado tras el reinicio, con el kiosco cargado: RAM disponible **954 MB**
(frente a 652 MB antes), swap total usada 117 MB solo en zram, load 2,02 en el
primer minuto por el arranque. `/proc/pressure/io` avg10 6,07 en frío y 0,20
en reposo.

Tras confirmar que el kernel nuevo arranca se purgó el viejo en tres paquetes
exactos —`linux-image-6.1.0-34-amd64`, `linux-headers-6.1.0-34-amd64`,
`linux-headers-6.1.0-34-common`— sin `autoremove`, que habría arrastrado 15
librerías (Qt5 WebEngine, socat, lsscsi). `/` pasó de 79 % a **75 %** (3,5 GB
libres); `grub.cfg` regenerado sin ninguna referencia a 6.1.0-34.

El módulo WiFi de la tablet es `rtw88_8822be`, del kernel; los DKMS de Realtek
no son los que usa, pero se mantienen compilados por si acaso.

---

## 5. Decisiones de diseño

- **zram lz4 + swappiness 100 + page-cluster 0**: comprimir en RAM es más
  rápido que leer del eMMC.
- **`discard=async` descartado**: el kernel 6.1 de Debian no lo acepta. No
  reintentar.
- **`schedutil`**: mejor respuesta que ondemand o performance en un Atom.
- **No seguir optimizando la página del reloj**: la ganancia es inseparable del
  ruido de medición; el cuello es el compositor software.
- **`papirus-icon-theme` NO purgado**: es el tema activo
  (`Papirus-mxblue-darkpanes`).
- **`firmware-iwlwifi/atheros/amd-graphics` NO purgados**: arrastran
  `mx-apps`, `mx-system` y `mx-debian-firmware`.
- **`libqt5webenginecore5` y `libwebkit2gtk-*` NO purgados**: arrastran
  `gufw`, `xfdesktop4`, `tumbler` y `yelp`.
- **`yad` descartado**: no dibuja un botón redondo con icono; renderiza una
  caja gris de 84x84.
- **No compilar el overlay en C**: faltan `Xlib.h`, `cairo.h`, `shape.h` y
  `pkg-config`; instalar las dependencias de desarrollo costaba más espacio del
  que ahorra. Xlib + PIL ya baja a 21 MB.
- **Tema oscuro en menú y juegos; el reloj vuelve a su paleta clara**: se
  oscurecieron las tres pantallas primero, y el usuario pidió después el reloj
  como estaba. Sus doce colores Material y el fondo metálico son el dibujo
  original del niño; el menú y los juegos son pantallas de tránsito y ahí sí
  compensa no deslumbrar.
- **Segmentos atenuados (`#b93a3a…#4a5563`) solo en el menú**: sobre `#14161a`
  los vivos quemaban la vista. El reloj los conserva saturados porque va sobre
  fondo claro.
- **Rejilla 2x2 fija** (`grid-template-rows:repeat(2,1fr)`): cuatro tarjetas en
  fila habrían dado 290 px de ancho con texto ilegible en 1280.
- **Icono de 164 px y tarjeta centrada**: el usuario reconoce la actividad por
  el dibujo, no por la palabra. 180 px desbordaba; 164 es el máximo que cabe
  con el texto en una línea.
- **La cuarta tarjeta se llama «Música», no «Spotify»**: se elige actividad, no
  proveedor. El icono sigue en trazo para que las cuatro se lean como conjunto.

---

## 6. Pantalla de bloqueo y Conky — resuelto

**`xfce4-screensaver`.** No es un servicio: no existe script LSB ni enlaces en
`rc2.d`/`rc5.d`, y `update-rc.d xfce4-screensaver disable` falla con
`cannot find a LSB script`. Arranca por autostart de sesión. Se marcó
`Hidden=true` en `/etc/xdg/autostart/xfce4-screensaver.desktop` y en
`/etc/xdg/autostart/xscreensaver.desktop` (este último apuntaba a un
`xscreensaver` que ni siquiera está instalado). Validado con
`desktop-file-validate`; tras el reinicio no hay ningún proceso de salvapantallas.

**Conky.** Restaurado con `conky -c ~/.conky/MX-CowonMildBlue/MX-Cowon_MildBlue`
(26 MB de RSS) y arranca solo por `~/.config/autostart/conky.desktop`, que
ejecuta `conky-startup.sh`. **Pero queda invisible**: su configuración usa
`own_window_hints = 'undecorated,below,skip_taskbar,skip_pager,sticky'`, así que
se dibuja por debajo de la ventana del kiosco, que ocupa los 1280x800 completos.
Puede comprobarse con `wmctrl`: la ventana `conky (aura)` está en (1029,35)
216x272, y esa zona de la captura es el menú, no el reloj de Conky. Verlo
exigiría subirlo por encima del kiosco, y eso rompe la pantalla completa táctil.

---

## 7. Cambios persistentes de seguridad y sistema

- `~/.ssh/authorized_keys` de `thempra` — clave añadida para acceso directo.
- 15 servicios deshabilitados en el arranque; `/etc/rc2.d` solo conserva lo
  esencial.
- 11 autostarts neutralizados con `Hidden=true` en `/etc/xdg/autostart/`,
  incluidos `xfce4-screensaver.desktop` y `xscreensaver.desktop`.
- `/etc/inittab` modificado (backup `.bak-optimizacion` disponible).
- `earlyoom` activo como red de seguridad contra el OOM killer.
- 27 paquetes purgados en la optimización + 3 del kernel 6.1.0-34; 0,9 GB tras
  el upgrade y 0,5 GB tras purgar el kernel viejo.
