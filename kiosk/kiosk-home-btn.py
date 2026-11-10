#!/usr/bin/env python3
"""Botón flotante para volver al menú del kiosco desde webs externas.

Se superpone a Firefox en la esquina inferior derecha. Solo aparece cuando la
página abierta no es una de las nuestras (menú, reloj, juegos), porque esas ya
llevan su propio botón. Al pulsarlo activa la ventana del kiosco y escribe la
URL del menú con ctrl+L, así no depende del historial del navegador.

Está escrito sobre Xlib y PIL a propósito: con PyGObject/GTK3 el proceso ocupa
56 MB de RSS y este equipo tiene 1,8 GB de RAM; así se queda en ~19 MB.
"""
import subprocess
import sys
import time

from PIL import Image, ImageDraw
from Xlib import X, display
from Xlib.error import XError
from Xlib.ext import shape

MENU_URL = "https://thempra.github.io/kidsclock/"
# Títulos de nuestras páginas: en ellas el botón nativo ya existe.
OWN_TITLES = ("Casa", "Reloj de Actividades", "Juegos")

SIZE = 76
MARGIN = 18
POLL_S = 2.0
SS = 4  # supermuestreo al dibujar, para bordes suaves
INK = (45, 45, 45)


def _house(draw, box, width):
    """Trazo de una casa dentro del cuadrado box=(x0, y0, x1, y1)."""
    x0, y0, x1, y1 = box
    w = x1 - x0
    cx = (x0 + x1) / 2.0
    roof = y0
    eave = y0 + (y1 - y0) * 0.42
    base = y1
    half = w * 0.30
    draw.line([(cx - half, eave), (cx, roof), (cx + half, eave)],
              fill=INK, width=width, joint="curve")
    draw.line([(cx - half * 0.80, eave), (cx - half * 0.80, base)],
              fill=INK, width=width)
    draw.line([(cx + half * 0.80, eave), (cx + half * 0.80, base)],
              fill=INK, width=width)
    draw.line([(cx - half * 0.80, base), (cx + half * 0.80, base)],
              fill=INK, width=width)
    door_w = w * 0.16
    draw.rectangle([cx - door_w / 2, base - (y1 - y0) * 0.34,
                    cx + door_w / 2, base], fill=INK)


def build_button():
    """Devuelve (pixeles RGB, bytes de máscara de 1 bit) del botón redondo."""
    big = SIZE * SS
    img = Image.new("RGB", (big, big), (255, 255, 255))
    inset = big * 0.26
    _house(ImageDraw.Draw(img), (inset, inset, big - inset, big - inset),
           width=int(3.2 * SS))
    img = img.resize((SIZE, SIZE), Image.LANCZOS)

    circle = Image.new("L", (big, big), 0)
    ImageDraw.Draw(circle).ellipse([0, 0, big - 1, big - 1], fill=255)
    circle = circle.resize((SIZE, SIZE), Image.LANCZOS)

    rows = []
    for y in range(SIZE):
        bits = 0
        for x in range(SIZE):
            if circle.getpixel((x, y)) >= 128:
                bits |= 1 << x  # en profundidad 1 el píxel izquierdo es el bit bajo
        packed = bits.to_bytes((SIZE + 7) // 8, "little")
        rows.append(packed + b"\x00" * (-len(packed) % 4))
    return img, b"".join(rows)


def xdo(*args):
    subprocess.run(("/usr/bin/xdotool",) + args,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


class Watcher:
    """Lee el título de la ventana del kiosco desde X, sin lanzar procesos."""

    def __init__(self, dpy):
        self.dpy = dpy
        self.root = dpy.screen().root
        self.atom_name = dpy.intern_atom("_NET_WM_NAME")
        self.atom_clients = dpy.intern_atom("_NET_CLIENT_LIST")
        self.wid = None

    def _prop(self, win, atom, kind=X.AnyPropertyType):
        try:
            prop = win.get_full_property(atom, kind)
        except XError:
            return None
        return prop.value if prop else None

    def kiosk_title(self):
        """Título de la ventana del kiosco; None si no hay ninguna."""
        self.wid = None
        clients = self._prop(self.root, self.atom_clients)
        if not clients:
            return None
        for wid in clients:
            try:
                win = self.dpy.create_resource_object("window", wid)
                classes = win.get_wm_class() or ()
                if "firefox" not in " ".join(classes).lower():
                    continue
                name = self._prop(win, self.atom_name)
                title = name.decode("utf-8", "replace") if name else ""
                if title:
                    self.wid = wid
                    return title
            except XError:
                continue
        return None


class Overlay:
    def __init__(self, dpy):
        self.dpy = dpy
        self.watcher = Watcher(dpy)
        screen = dpy.screen()
        self.screen = screen
        self.visible = False

        self.pixels, mask_bytes = build_button()
        self.pixels = self.pixels.convert("RGB")
        self.mask_bytes = mask_bytes

        x = screen.width_in_pixels - SIZE - MARGIN
        y = screen.height_in_pixels - SIZE - MARGIN
        self.win = screen.root.create_window(
            x, y, SIZE, SIZE, 0,
            screen.root_depth,
            X.InputOutput,
            X.CopyFromParent,
            background_pixel=screen.white_pixel,
            event_mask=X.ExposureMask | X.ButtonPressMask,
            override_redirect=True,
        )
        self.win.set_wm_name("kiosk-home-btn")
        self.win.set_wm_class("kiosk-home-btn", "Kiosk-home-btn")

        mask = self.win.create_pixmap(SIZE, SIZE, 1)
        mask_gc = mask.create_gc()
        mask.put_image(mask_gc, 0, 0, SIZE, SIZE, X.XYPixmap, 1, 0,
                       self.mask_bytes)
        for kind in (shape.SK.Bounding, shape.SK.Input):
            self.win.shape_mask(shape.SO.Set, kind, 0, 0, mask)
        self.dpy.flush()

        self.gc = self.win.create_gc()
        self._image_bytes = self._pack_pixels()

    def _pack_pixels(self):
        buf = bytearray()
        for r, g, b in self.pixels.getdata():
            buf += bytes((b, g, r, 0))
        return bytes(buf)

    def _paint(self):
        self.win.put_image(self.gc, 0, 0, SIZE, SIZE, X.ZPixmap, 24, 0,
                           self._image_bytes)
        self.dpy.flush()

    def show(self):
        self.win.map()
        self.win.configure(stack_mode=X.Above)
        self.dpy.sync()
        self._paint()
        self.visible = True

    def hide(self):
        self.win.unmap()
        self.dpy.flush()
        self.visible = False

    def handle(self, event):
        if event.type == X.Expose and self.visible:
            self._paint()
        elif event.type == X.ButtonPress:
            self.click()

    def click(self):
        # La ventana tiene que estar activa para que el kiosco acepte ctrl+L,
        # y hay que esperar a que la barra de URL coja el foco antes de escribir.
        if self.watcher.wid:
            xdo("windowactivate", "--sync", hex(self.watcher.wid))
        xdo("key", "--clearmodifiers", "ctrl+l")
        time.sleep(0.6)
        xdo("type", "--clearmodifiers", "--delay", "30", MENU_URL)
        time.sleep(0.4)
        xdo("key", "--clearmodifiers", "Return")

    def sync(self):
        title = self.watcher.kiosk_title()
        wanted = bool(title) and not title.startswith(OWN_TITLES)
        if wanted and not self.visible:
            self.show()
        elif not wanted and self.visible:
            self.hide()


def main():
    dpy = display.Display()
    if not dpy.has_extension("SHAPE"):
        sys.exit("el servidor X no ofrece la extensión SHAPE")
    overlay = Overlay(dpy)
    next_poll = 0.0
    while True:
        while dpy.pending_events():
            overlay.handle(dpy.next_event())
        now = time.monotonic()
        if now >= next_poll:
            overlay.sync()
            next_poll = now + POLL_S
        time.sleep(0.1)


if __name__ == "__main__":
    main()
