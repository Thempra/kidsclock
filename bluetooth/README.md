# Bluetooth del RTL8822BE (variante UART / H5)

Parche para `drivers/bluetooth/btrtl.c` del kernel **6.1.190** de Debian, que
hace funcionar el Bluetooth del combo RTL8822BE de esta tablet cuando va por
UART con protocolo H5 (serdev `8086228A:00`, modalidad `acpi:OBDA8723:`).

El detalle del diagnóstico está en `INFORME.md`, sección 9.

## Por qué hace falta

`btrtl` no reconoce la variante UART del 8822B: no encuentra entrada en su tabla
de chips, no descarga el parche y el controlador se queda en ROM. Además, el
primer *setup* abortaba al final de la descarga (el chip reinicia el enlace H5
justo antes de leer la versión), y eso dejaba `HCI_SETUP` puesto para siempre:
el controlador quedaba arriba pero **invisible** para `bluetoothd`
(`btmgmt info` → `Index list with 0 items`).

## Qué cambia

| Cambio | Motivo |
|---|---|
| Entrada `IC_INFO(RTL_ROM_LMP_8822B, 0xb, 0x7, HCI_UART)` | Reconocer el chip y cargar `rtl8822b_fw.bin` |
| `data_frags` con techo y longitud real del último fragmento | Enviar exactamente 20256 B de parche + 14 B de config |
| Timeout tolerado solo en el último fragmento | El chip salta al firmware nuevo y no emite `Command Complete` |
| `READ_LOCAL_VERSION` con 5 reintentos y fallo no fatal | El *setup* termina bien aunque el enlace esté reiniciándose |
| Config sin entrada `0x0c` → 115200 sin flow control | Es lo que hace el driver del fabricante |
| `btrtl_get_uart_settings()` con `!ic_info` | Reconocer un chip ya parcheado sin volver a descargar |
| `HCI_QUIRK_BROKEN_LOCAL_EXT_FEATURES_PAGE_2` para 8822B/UART | El chip no soporta realmente la página 2 |

Sin parámetros de módulo: el comportamiento es incondicional.

## Compilar

Requiere las cabeceras del kernel en ejecución (`/lib/modules/$(uname -r)/build`).

```sh
mkdir btrtl && cd btrtl
cp /usr/src/linux-source-6.1/drivers/bluetooth/btrtl.[ch] .   # o el árbol completo
patch -p1 < ../btrtl-8822bs-h5.patch

cat > Makefile <<'EOF'
obj-m += btrtl.o
EOF

make -C /lib/modules/$(uname -r)/build M=$PWD modules
sudo install -m 644 btrtl.ko /lib/modules/$(uname -r)/updates/btrtl.ko
sudo depmod -a
```

## Firmware y configuración

El módulo busca `rtl_bt/rtl8822b_fw.bin` y
`rtl_bt/rtl8822bs_config-OBDA8723.bin`. El segundo **debe** ser el config real
de 14 bytes; un config sintético más largo corrompe la imagen y el chip
responde `Invalid header checksum`.

```sh
sudo cp /lib/firmware/rtl_bt/rtl8822b_config.bin \
        /lib/firmware/rtl_bt/rtl8822bs_config-OBDA8723.bin
```

Byte a byte, el config correcto es:

```
55 ab 23 87 08 00 d9 00 01 0f e4 00 01 08
```

## Aplicar en caliente

```sh
sudo rmmod hci_uart; sudo rmmod btrtl      # ambos, en ese orden
sudo modprobe hci_uart
sleep 20
sudo btmgmt info | head -3                # debe listar 1 índice
```

Recargar solo `hci_uart` deja el `btrtl` viejo en memoria y da resultados
falsos.

## Verificación

Lo que importa **no** es `hciconfig hci0` (`UP RUNNING` no prueba nada: la ruta
ioctl no publica el índice). Lo que importa es:

```sh
sudo btmgmt info        # Index list with 1 item
bluetoothctl list       # Controller 00:E0:4C:23:99:87 aura [default]
sudo dmesg | grep -E 'RTL:|MGMT'
# RTL: fw version 0xab6b705c   <- el parche, no la ROM
```

## Revertir

```sh
sudo cp /home/thempra/btrtl.ko.orig /lib/modules/$(uname -r)/updates/btrtl.ko
sudo depmod -a
sudo rmmod hci_uart; sudo rmmod btrtl; sudo modprobe hci_uart
```

El módulo parcheado no puede romper el arranque: en el peor caso `hci0` se queda
`DOWN`, como estaba antes.
