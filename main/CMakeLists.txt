# Main Component Build Configuration
# Organized structure: core/ web/ assets/ include/

# Collect all source files from organized subdirectories
file(GLOB_RECURSE CORE_SRCS "core/*.c")
file(GLOB_RECURSE WEB_SRCS "web/*.c")

# Register the component with organized source files
idf_component_register(
    SRCS ${CORE_SRCS} ${WEB_SRCS}
    INCLUDE_DIRS "include" "web" "core"
    PRIV_REQUIRES 
        json mdns fatfs spiffs esp_eth nvs_flash freertos openthread 
        esp_http_server protocol_examples_common esp_coex hal newlib 
        driver esp_netif esp_event esp_wifi
    EMBED_FILES 
        "assets/favicon.ico" 
        "assets/openapi.yaml"
)

# Create SPIFFS partition for web frontend assets
spiffs_create_partition_image(web_storage ${CMAKE_CURRENT_SOURCE_DIR}/assets/frontend FLASH_IN_PROJECT)
