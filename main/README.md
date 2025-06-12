# Main Component - ESP32-C6 Thread Border Router

This is the main application component for the ESP32-C6 Thread Border Router, organized for clarity and maintainability.

## Directory Structure

```
main/
├── core/                     # Core border router functionality
│   └── esp_ot_br.c          # Main application entry point
├── web/                     # Web server implementation
│   ├── esp_br_web.c/h       # HTTP server core
│   ├── esp_br_web_api.c/h   # REST API handlers
│   └── esp_br_web_base.c/h  # Base web functionality
├── assets/                  # Static assets and resources
│   ├── frontend/            # Web UI files (HTML, CSS, JS)
│   ├── favicon.ico          # Web interface icon
│   └── openapi.yaml         # API documentation
├── include/                 # Public header files
│   └── esp_ot_config.h      # OpenThread configuration
├── CMakeLists.txt           # Component build configuration
├── idf_component.yml        # External dependencies
└── README.md                # This file
```

## Components Overview

### Core (`core/`)
Contains the main application logic for the Thread Border Router:
- **`esp_ot_br.c`**: Application entry point, initialization, and main event loop

### Web Server (`web/`)
Implements the web management interface:
- **`esp_br_web.c`**: HTTP server setup and core functionality
- **`esp_br_web_api.c`**: RESTful API endpoints for device management
- **`esp_br_web_base.c`**: Base web server utilities and helpers

### Assets (`assets/`)
Static resources served by the web interface:
- **`frontend/`**: Complete web UI (HTML, CSS, JavaScript)
- **`favicon.ico`**: Browser icon for the web interface
- **`openapi.yaml`**: API documentation in OpenAPI 3.0 format

### Include (`include/`)
Public headers and configuration:
- **`esp_ot_config.h`**: OpenThread stack configuration

## Build Integration

The component uses `file(GLOB_RECURSE)` to automatically include all `.c` files from the organized subdirectories, making it easy to add new files without modifying the build configuration.

Assets are embedded into the firmware binary and served via SPIFFS partition for the web interface. 