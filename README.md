# ESP32 Thread Border Router with Ethernet

This project implements a robust OpenThread Border Router (BR) on an ESP32 series System-on-Chip (SoC) with an Ethernet backbone. It is designed to be a single-chip solution, requiring an ESP32 device that supports the 802.15.4 Thread radio specification (such as the ESP32-C6 or ESP32-H2) connected to an Ethernet module.

This BR provides bidirectional IPv6 connectivity between a Thread mesh network and your local LAN, includes a web-based GUI for management, and automatically handles service discovery (mDNS/SRP).

## Key Features

- **Ethernet Backbone**: Uses a wired Ethernet connection for stable and reliable network connectivity.
- **Web Management UI**: A built-in web server provides a user-friendly interface to view Thread network status, topology, and other diagnostics.
- **Bidirectional IPv6 Connectivity**: Devices on the Thread network and the Ethernet LAN can seamlessly communicate with each other.
- **Service Discovery**: Implements both an SRP server for Thread devices and an mDNS discovery proxy, allowing services to be discovered across the two networks.
- **Automatic Commissioner**: Once the Thread network is formed and the device becomes a leader/router, it automatically starts the commissioner role to allow new devices to join.

## Hardware Requirements

1.  **ESP32 SoC**: An Espressif device with built-in 802.15.4 radio support.
    -   **Recommended**: ESP32-C6
    -   Also compatible: ESP32-H2
2.  **Ethernet Module**: A SPI-based Ethernet module.
    -   This project is configured and tested for the **W5500** module.
3.  **Wiring**: Connect the ESP32 and your Ethernet module via SPI pins. Refer to your specific development board's pinout for the correct GPIOs.

## Configuration

### 1. Network Credentials (`.env` file)

Sensitive network configuration should not be stored in version control. Create a `.env` file in the root of the project directory. The build system will automatically load these values.

**`.env` file contents:**

```
# Thread Network Configuration
CONFIG_OPENTHREAD_NETWORK_NAME="MyThreadNet"
CONFIG_OPENTHREAD_MESH_LOCAL_PREFIX="fd00:dead:beef::/64"
CONFIG_OPENTHREAD_NETWORK_CHANNEL=15
CONFIG_OPENTHREAD_NETWORK_PANID=0xabcd
CONFIG_OPENTHREAD_NETWORK_EXTPANID="1122334455667788"
CONFIG_OPENTHREAD_NETWORK_MASTERKEY="00112233445566778899aabbccddeeff"
CONFIG_OPENTHREAD_NETWORK_PSKC="aabbccddeeff0011223344556677"
```

> **Important**: Add `.env` to your `.gitignore` file to avoid committing secrets.

### 2. Ethernet Module Configuration

Configure the project to use your Ethernet module via the menuconfig interface:

```bash
idf.py menuconfig
```

Navigate to `Example Connection Configuration --->` and ensure the following:

-   `[ ] connect using WiFi interface` is **disabled**.
-   `[*] connect using Ethernet interface` is **enabled**.

Under the `Ethernet Type` menu, select `W5500 Module` and configure the SPI and GPIO pins to match your hardware wiring.

### 3. Auto-Start (Optional but Recommended)

For the border router to start automatically on boot, navigate to `Component config -> OpenThread ->` and enable:

-   `[*] Border Router Auto Start`

## Build and Run

1.  **Set the Target**:
    ```bash
    idf.py set-target esp32c6
    ```

2.  **Build, Flash, and Monitor**:
    ```bash
    idf.py -p (YOUR_SERIAL_PORT) build flash monitor
    ```

Once running, the device will connect to your Ethernet network, establish a Thread network with the credentials from your `.env` file, and begin operating as a border router. You can access the web management UI by navigating to the IP address assigned to the device by your DHCP server.

## Project Structure

The `main` component is organized into subdirectories for clarity and maintainability.

```
main/
├── core/                     # Core border router functionality
│   └── esp_ot_br.c           # Main application logic and initialization
├── web/                      # Web server implementation
│   ├── esp_br_web.c/h        # HTTP server core
│   ├── esp_br_web_api.c/h    # REST API handlers
│   └── esp_br_web_base.c/h   # Base web functionality
├── assets/                   # Static assets for the web UI
│   ├── frontend/             # Web UI files (HTML, CSS, JS)
│   └── ...
├── include/                  # Public header files for the main component
│   └── esp_ot_config.h       # OpenThread configuration overrides
└── CMakeLists.txt            # Component build configuration
```

-   **Assets**: The web frontend assets are embedded into the firmware binary and served from a SPIFFS partition.
-   **Build Integration**: The `main` component's `CMakeLists.txt` is configured to automatically include all source files, simplifying development.
