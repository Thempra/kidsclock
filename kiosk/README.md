# Botón de inicio del kiosco

`kiosk-home-btn.py` dibuja un botón circular flotante en la esquina inferior
derecha de la pantalla. Solo aparece cuando la ventana de Firefox muestra una
página **externa** (por ejemplo Home Assistant); en el menú, el reloj y los
juegos se oculta, porque esas páginas ya llevan su propio botón de vuelta.

Al pulsarlo activa la ventana del kiosco y navega al menú escribiendo la URL
con `ctrl+L`, de modo que no depende del historial del navegador.

## Requisitos

- El kiosco corre en modo `--kiosk`, sin barra de navegación ni teclado.
- `xdotool` para enviar las teclas a Firefox.
- `python3-xlib`, `python3-pil` y la extensión SHAPE del servidor X.
- Servidor X **sin compositor**: el recorte circular se hace con la extensión
  SHAPE, no con transparencia ARGB.

## Instalación en la tablet

```bash
install -Dm755 kiosk-home-btn.py ~/.local/bin/kiosk-home-btn.py
cat > ~/.config/autostart/kiosk-home-btn.desktop <<'DESK'
[Desktop Entry]
Type=Application
Name=Botón de inicio del kiosco
Comment=Vuelve al menú desde webs externas (Home Assistant)
Exec=/home/thempra/.local/bin/kiosk-home-btn.py
Terminal=false
NoDisplay=true
X-GNOME-Autostart-enabled=true
DESK
```

## Detalles de implementación

- Sondea cada 2 s la lista `_NET_CLIENT_LIST` y el título `_NET_WM_NAME` de la
  ventana de Firefox, leyéndolos directamente por Xlib (sin lanzar procesos).
- Consumo medido: ~21 MB de RSS. Con PyGObject/GTK3 eran 56 MB, demasiado para
  un equipo de 1,8 GB de RAM.
- El icono y la máscara circular se dibujan con PIL con supermuestreo 4x y se
  suben como mapa de bits de 1 bit para la región SHAPE.
