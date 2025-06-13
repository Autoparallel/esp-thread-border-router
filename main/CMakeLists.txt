idf_component_register(SRCS "core/esp_ot_br.c" "web/esp_br_web.c" "web/esp_br_web_api.c" "web/esp_br_web_base.c"
                       INCLUDE_DIRS "." "include" "web"
                       PRIV_REQUIRES json mdns fatfs spiffs esp_eth nvs_flash freertos openthread esp_http_server protocol_examples_common esp_coex hal newlib driver esp_netif esp_event esp_wifi
                       EMBED_FILES "assets/favicon.ico" "assets/openapi.yaml")

spiffs_create_partition_image(web_storage ${CMAKE_CURRENT_SOURCE_DIR}/assets/frontend FLASH_IN_PROJECT)
