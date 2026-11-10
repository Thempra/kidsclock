# Informe: optimización y nuevo menú del kiosco

Equipo: `thempra@192.168.50.214` (hostname `aura`) — Intel Atom x5-Z8350,
1,8 GiB de RAM, eMMC, MX Linux 23.6 / Debian 12, XFCE 4.20, sysvinit,
sin teclado físico (panel táctil Goodix). Kiosco: Firefox en modo `--kiosk`,
ventana 1280x800 en (0,0).

---

## 1. Optimización — aplicada y verificada

### Antes / después

| Métrica | Antes | Después |
|---|---|---|
| RAM disponible | 435–569 MB | **652 MB** |
| Presión E/S (`/proc/pressure/io`, avg10) | 2,71 | **0,20** |
| Presión memoria (avg10) | 0,36 | **0,00** |
| `%wa` | 12,5 | ~0 |
| Load average (1/5/15) | — | 0,53 / 1,77 / 2,08 |
| Disco `/` | 84 % | **80 %** (2,8 GB libres) |
| gettys | 6 | **2** |
| Sockets TCP en escucha | muchos daemons | **solo 22** |
| Gobernador CPU | ondemand | `schedutil` ×4 |
| Panel XFCE | 104,8 MB | 46,9 MB |
| Swap en uso | — | 617 MB (336 zram + 281 fichero) |

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

Commit `de5eec1` en `github.com/Thempra/kidsclock` (rama `main`), publicado en
GitHub Pages.

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
sirve el menú sin tocar el `.desktop`.

Tres tarjetas de 380x614 con franja de acento, icono SVG inline, título,
descripción y pill. Grid `repeat(3,1fr)`, `overflow:hidden`. Sin JS de
animación, sin webfonts, sin imágenes raster. Áreas táctiles ≥44 px.
Home Assistant no se puede embeber (`x-frame-options: SAMEORIGIN`), así que se
abre a nivel de pestaña.

Verificación headless a 1280x800: tarjetas en `[44,142,380,614]`,
`[450,142,380,614]`, `[856,142,380,614]`; sin desbordamiento; franjas
`#0f766e` / `#c2410c` / `#4f46e5`.

### Botón de vuelta en el reloj

`<a class="home-btn" href="../index.html">` con SVG inline (casa 24x24,
`stroke-width:2`), `position:fixed; left:18px; bottom:18px`, 76x76,
`border-radius:50%`, `z-index:900`. Se descartó el glifo `&#8962;`: en
`Comic Neue` se renderizaba a 18x22 px e incompleto.

### Navegación táctil real (clics sobre la pantalla, no simulación)

Menú → Reloj, Reloj → Menú, Menú → Juegos, Juegos → Menú, Menú → Home
Assistant. Todos correctos.

---

## 3. Defecto abierto: sin salida desde Home Assistant

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

---

## 4. Upgrade del sistema — terminado

`apt-get full-upgrade` duró 2121 s y terminó limpio. `dpkg --audit` vacío.
DKMS compiló e instaló en **ambos** kernels:

| Módulo | 6.1.0-34 (en ejecución) | 6.1.0-54 (instalado) |
|---|---|---|
| `rtl8821ce` | installed | installed |
| `rtl8821cu` | installed | installed |

`apt-get clean` tras el upgrade recuperó 0,9 GB: `/` pasó de 87 % a **80 %**.

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

---

## 6. Pendiente de decisión

1. **Reinicio.** El kernel 6.1.0-54 está instalado con su `initrd` y los
   módulos DKMS listos, pero se sigue ejecutando 6.1.0-34. `uptime`: 6 días
   23 h. Tras reiniciar se liberan los ~617 MB de swap que dejó el kiosco
   viejo, se estrena el kernel y se puede purgar `linux-image-6.1.0-34-amd64`
   (~350 MB más). **No se ha reiniciado sin permiso.**
2. **Conky** está parado desde la optimización del panel; se restaura con
   `sh ~/.conky/conky-startup.sh`.
3. **`xfce4-screensaver`** sigue en `rc2.d`. Es inocuo (`enabled=false` evita el
   bloqueo); se puede quitar con `update-rc.d xfce4-screensaver disable`.

---

## 7. Cambios persistentes de seguridad y sistema

- `~/.ssh/authorized_keys` de `thempra` — clave añadida para acceso directo.
- 15 servicios deshabilitados en el arranque; `/etc/rc2.d` solo conserva lo
  esencial.
- `/etc/inittab` modificado (backup `.bak-optimizacion` disponible).
- `earlyoom` activo como red de seguridad contra el OOM killer.
- 27 paquetes purgados; 0,9 GB recuperados tras el upgrade.
