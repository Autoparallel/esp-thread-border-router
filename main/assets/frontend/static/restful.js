var OT_SERVER_PACKAGE_VERSION = "v1.0.0";

// Enhanced Dashboard Integration
var dashboard = {
    init: function () {
        console.log('Dashboard initializing...');
        this.refreshAllData();
    },

    refreshAllData: function () {
        console.log('Refreshing all data...');
        this.showLoading();

        Promise.allSettled([
            this.fetchNetworkProperties(),
            this.fetchNodeInformation(),
            this.fetchTopologyData(),
            this.fetchActiveDataset()
        ]).then(results => {
            console.log('All data loaded', results);
            this.hideLoading();
        }).catch(error => {
            console.error('Error loading data:', error);
            this.hideLoading();
        });
    },

    fetchNetworkProperties: function () {
        return fetch('/get_properties')
            .then(response => response.json())
            .then(data => {
                if (data.error === 0) {
                    this.updateNetworkInfo(data.result);
                }
                return data;
            });
    },

    fetchNodeInformation: function () {
        return fetch('/node_information')
            .then(response => response.json())
            .then(data => {
                if (data.error === 0) {
                    this.updateNodeInfo(data.result);
                }
                return data;
            });
    },

    fetchTopologyData: function () {
        return fetch('/topology')
            .then(response => response.json())
            .then(data => {
                console.log('Dashboard topology data:', data);
                if (data.error === 0) {
                    this.updateTopologyData(data.result);

                    // Also fetch node information for complete topology rendering
                    return fetch('/node_information')
                        .then(nodeResponse => nodeResponse.json())
                        .then(nodeData => {
                            console.log('Dashboard node data:', nodeData);
                            if (nodeData.error === 0 && typeof handle_thread_networks_topology_package === 'function') {
                                handle_thread_networks_topology_package(nodeData, data);
                            }
                            return data;
                        })
                        .catch(nodeError => {
                            console.error('Failed to fetch node information for topology:', nodeError);
                            return data;
                        });
                }
                return data;
            })
            .catch(error => {
                console.error('Failed to fetch topology data:', error);
                throw error;
            });
    },

    updateNetworkInfo: function (properties) {
        // Update network information
        this.updateElement('network-name', properties['Network:Name'] || 'Unknown');
        this.updateElement('network-panid', properties['Network:PANID'] || 'Unknown');
        this.updateElement('network-channel', properties['RCP:Channel'] || 'Unknown');

        // Update IPv6 addresses
        this.updateElement('ipv6-link-local', properties['IPv6:LinkLocalAddress'] || 'Unknown');
        this.updateElement('ipv6-mesh-local', properties['IPv6:MeshLocalAddress'] || 'Unknown');
        this.updateElement('ipv6-routing-local', properties['IPv6:RoutingLocalAddress'] || 'Unknown');
        this.updateElement('ipv6-mesh-prefix', properties['IPv6:MeshLocalPrefix'] || 'Unknown');

        // Update legacy elements too
        this.updateElement('ipv6-link_local_address', properties['IPv6:LinkLocalAddress'] || 'Unknown');
        this.updateElement('ipv6-mesh_local_address', properties['IPv6:MeshLocalAddress'] || 'Unknown');
        this.updateElement('ipv6-routing_local_address', properties['IPv6:RoutingLocalAddress'] || 'Unknown');
        this.updateElement('ipv6-mesh_local_prefix', properties['IPv6:MeshLocalPrefix'] || 'Unknown');

        // Update device role and status
        const role = properties['RCP:State'] || 'unknown';
        this.updateElement('device-role', role);
        this.updateElement('network-status', role);
        this.updateElement('openthread-role', role);

        // Update network extended PAN ID and PSKc from properties
        this.updateElement('network-extpanid', this.formatMacAddress(properties['Network:XPANID']) || 'Unknown');
        this.updateElement('network-pskc', this.formatMacAddress(properties['OpenThread:PSKc']) || 'Unknown');

        // Update other OpenThread info
        this.updateElement('openthread-version', properties['OpenThread:Version'] || 'Unknown');
        this.updateElement('openthread-version_api', properties['OpenThread:VersionAPI'] || 'Unknown');
        this.updateElement('rcp-channel', properties['RCP:Channel'] || 'Unknown');
        this.updateElement('rcp-EUI64', properties['RCP:EUI64'] || 'Unknown');
        this.updateElement('rcp-txpower', properties['RCP:TxPower'] || 'Unknown');
        this.updateElement('rcp-version', properties['RCP:Version'] || 'Unknown');

        // Update status indicator
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator) {
            if (role !== 'unknown' && role !== 'disabled' && role !== 'detached') {
                statusIndicator.classList.remove('status-offline');
                statusIndicator.classList.add('status-online');
            } else {
                statusIndicator.classList.remove('status-online');
                statusIndicator.classList.add('status-offline');
            }
        }
    },

    updateNodeInfo: function (nodeInfo) {
        this.updateElement('device-rloc16', nodeInfo['Rloc16'] || 'Unknown');

        // Handle Extended Address with multiple possible field names
        const extAddress = nodeInfo['ExtendedAddress'] || nodeInfo['ExtAddress'] || nodeInfo['extAddress'] || 'Unknown';
        const formattedExtAddress = extAddress !== 'Unknown' && extAddress.length >= 16 ?
            extAddress.match(/.{1,2}/g).join(':').toUpperCase() : extAddress;
        this.updateElement('device-ext-address', formattedExtAddress);

        this.updateElement('router-count', nodeInfo['RouterNumber'] || '0');

        // Update topology info
        this.updateElement('topology-network-name', nodeInfo['NetworkName'] || 'Unknown');
        this.updateElement('topology_netwotkname', nodeInfo['NetworkName'] || 'Unknown');

        if (nodeInfo['LeaderData'] && nodeInfo['LeaderData']['LeaderRouterId']) {
            const leaderId = '0x' + nodeInfo['LeaderData']['LeaderRouterId'].toString(16);
            this.updateElement('topology-leader', leaderId);
            this.updateElement('topology_leader', leaderId);
        }
    },

    updateTopologyData: function (topologyData) {
        if (!topologyData || !Array.isArray(topologyData)) {
            console.log('No topology data available');
            return;
        }

        // Clear existing tables
        this.clearTables();

        let routerCount = 0;
        let childCount = 0;
        const routerDetails = [];
        const childDetails = [];

        // Process each node in the topology
        topologyData.forEach(node => {
            if (node.ChildTable && Array.isArray(node.ChildTable)) {
                // This is a router
                routerDetails.push(node);
                routerCount++;

                // Add its children
                node.ChildTable.forEach(child => {
                    childDetails.push({ parent: node, child: child });
                    childCount++;
                });
            }
        });

        // Update counts
        this.updateElement('router-count', routerCount);
        this.updateElement('child-count', childCount);
        this.updateElement('total-devices', routerCount + childCount);
        this.updateElement('topology-router-count', routerCount);
        this.updateElement('topology_router_number', routerCount);

        // Populate tables
        this.populateRouterTable(routerDetails);
        this.populateChildTable(childDetails);
    },

    clearTables: function () {
        const routerTableBody = document.querySelector('#router-table tbody');
        const childTableBody = document.querySelector('#child-table tbody');

        if (routerTableBody) {
            routerTableBody.innerHTML = '';
        }
        if (childTableBody) {
            childTableBody.innerHTML = '';
        }
    },

    populateRouterTable: function (routers) {
        const tbody = document.querySelector('#router-table tbody');
        if (!tbody) return;

        if (routers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No routers found</td></tr>';
            return;
        }

        routers.forEach(router => {
            const row = tbody.insertRow();
            const routerId = router.Rloc16 ? (parseInt(router.Rloc16, 16) >> 10).toString(16).toUpperCase() : 'Unknown';
            const role = (router.LeaderData && router.RouteId === router.LeaderData.LeaderRouterId) ? 'Leader' : 'Router';

            // Get link quality info if available
            let linkQualityIn = 'N/A';
            let linkQualityOut = 'N/A';
            let routeCost = 'N/A';

            if (router.Route && router.Route.RouteData && Array.isArray(router.Route.RouteData)) {
                // Use the first route data entry for link quality
                const routeData = router.Route.RouteData[0];
                if (routeData) {
                    linkQualityIn = routeData.LinkQualityIn || 'N/A';
                    linkQualityOut = routeData.LinkQualityOut || 'N/A';
                    routeCost = routeData.RouteCost || 'N/A';
                }
            }

            row.innerHTML = `
                <td>0x${routerId}</td>
                <td>${router.Rloc16 || 'Unknown'}</td>
                <td class="small">${router.ExtAddress || 'Unknown'}</td>
                <td>${linkQualityIn}</td>
                <td>${linkQualityOut}</td>
                <td>${routeCost}</td>
                <td><span class="badge ${role === 'Leader' ? 'bg-primary' : 'bg-info'}">${role}</span></td>
            `;
        });
    },

    populateChildTable: function (children) {
        const tbody = document.querySelector('#child-table tbody');
        if (!tbody) return;

        if (children.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No child devices found</td></tr>';
            return;
        }

        children.forEach(childData => {
            const parent = childData.parent;
            const child = childData.child;
            const row = tbody.insertRow();

            const childRloc16 = parent.Rloc16 ?
                '0x' + (parseInt(parent.Rloc16, 16) + child.ChildId).toString(16).toUpperCase() :
                'Unknown';

            const modeStr = child.Mode ? this.formatMode(child.Mode) : 'Unknown';

            row.innerHTML = `
                <td>${parent.Rloc16 || 'Unknown'}</td>
                <td>${child.ChildId || 'Unknown'}</td>
                <td>${childRloc16}</td>
                <td>${child.Timeout || 'Unknown'}</td>
                <td>${modeStr}</td>
                <td><span class="badge bg-success">Connected</span></td>
            `;
        });
    },

    formatMode: function (mode) {
        if (!mode) return 'Unknown';

        // Format the mode object nicely
        const modeFlags = [];
        if (mode.mRxOnWhenIdle) modeFlags.push('RxOnIdle');
        if (mode.mDeviceType) modeFlags.push('FFD');
        if (mode.mNetworkData) modeFlags.push('FullNetData');

        return modeFlags.length > 0 ? modeFlags.join(', ') : JSON.stringify(mode);
    },

    updateElement: function (id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    },

    showLoading: function () {
        // Add loading class to main elements
        document.querySelectorAll('.card').forEach(card => {
            card.classList.add('loading');
        });

        // Spin refresh icons
        document.querySelectorAll('[id$="-refresh-icon"]').forEach(icon => {
            icon.classList.add('fa-spin');
        });
    },

    hideLoading: function () {
        // Remove loading class
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('loading');
        });

        // Stop spinning refresh icons
        document.querySelectorAll('[id$="-refresh-icon"]').forEach(icon => {
            icon.classList.remove('fa-spin');
        });
    },

    fetchActiveDataset: function () {
        return fetch('/node/dataset/active')
            .then(response => {
                if (!response.ok) {
                    if (response.status === 204) {
                        console.log('No active dataset available');
                        return { noDataset: true };
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Active dataset received:', data);
                if (data && !data.noDataset) {
                    this.updateDatasetInfo(data);
                }
                return data;
            })
            .catch(error => {
                console.error('Failed to fetch active dataset:', error);
                return { error: true };
            });
    },

    updateDatasetInfo: function (dataset) {
        console.log('Updating dataset info:', dataset);

        // Update network key from dataset TLVs
        if (dataset.NetworkKey) {
            this.updateElement('network-key', dataset.NetworkKey);
        } else if (dataset.MasterKey) {
            this.updateElement('network-key', dataset.MasterKey);
        }

        // Update channel mask from dataset
        if (dataset.ChannelMask) {
            if (typeof dataset.ChannelMask === 'number') {
                this.updateElement('network-channel-mask', `0x${dataset.ChannelMask.toString(16).toUpperCase()}`);
            } else {
                this.updateElement('network-channel-mask', dataset.ChannelMask);
            }
        } else if (dataset.Channel) {
            // If no channel mask, show single channel bit
            const channelMask = 1 << dataset.Channel;
            this.updateElement('network-channel-mask', `0x${channelMask.toString(16).toUpperCase()}`);
        }

        // Update other TLV fields if available
        if (dataset.NetworkName) {
            this.updateElement('network-name', dataset.NetworkName);
        }

        if (dataset.Channel) {
            this.updateElement('network-channel', dataset.Channel);
        }

        if (dataset.PanId) {
            this.updateElement('network-panid', `0x${dataset.PanId.toString(16).toUpperCase()}`);
        }

        if (dataset.ExtendedPanId) {
            this.updateElement('network-extpanid', this.formatMacAddress(dataset.ExtendedPanId));
        }

        if (dataset.PSKc) {
            this.updateElement('network-pskc', this.formatMacAddress(dataset.PSKc));
        }
    },

    formatMacAddress: function (macString) {
        if (!macString || macString === 'Unknown' || macString.length < 16) {
            return 'Unknown';
        }
        // Format as XX:XX:XX:XX:XX:XX:XX:XX
        return macString.match(/.{1,2}/g).join(':').toUpperCase();
    }
};

// Global functions for dashboard integration
function refreshAllData() {
    dashboard.refreshAllData();
}

function refreshTopology() {
    const icon = document.getElementById('topology-refresh-icon');
    if (icon) icon.classList.add('fa-spin');

    dashboard.fetchTopologyData().finally(() => {
        if (icon) icon.classList.remove('fa-spin');
    });
}



// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('Dashboard loading...');
    dashboard.init();
});

// Enhanced network scanning function
function scanNetworks() {
    const resultsDiv = document.getElementById('scan-results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2" role="status"></div>Scanning...';
    }

    http_server_scan_thread_network();
}

function showFormNetwork() {
    // Show a modern modal for network formation
    console.log('Showing form network dialog...');
    // TODO: Implement modern modal
}



/* --------------------------------------------------------------------
                            Original Code (Legacy Support)
-------------------------------------------------------------------- */
function frontend_click_for_more_form_param() {
    elem = document.getElementById("form-more-param");
    if (elem.style.display == 'block') {
        elem.style.display = 'none';
        document.getElementById('form-more-tip').innerHTML = "for more &#x21B5;";
    } else {
        elem.style.display = 'block';
        document.getElementById('form-more-tip').innerHTML = "for less &#x21B5;";
    }
}

function frontend_click_copy_network_info_to_form(arg) {
    var row = $(arg).parent().parent().find("td");
    if (row.eq(0) == "")
        return;
    var data = {
        id: row.eq(0).text(),
        network_name: row.eq(1).text(),
        extended_panid: row.eq(2).text(),
        panid: row.eq(3).text(),
        mac_address: row.eq(4).text(),
        channel: row.eq(5).text(),
        dBm: row.eq(6).text(),
        LQI: row.eq(7).text(),
    };

    document.getElementsByName("networkName")[0].value = data.network_name;
    document.getElementsByName("extPanId")[0].value = data.extended_panid;
    document.getElementsByName("panId")[0].value = data.panid;
    document.getElementsByName("channel")[0].value = data.channel;

    item = document.getElementById("form_tip");
    item.style.color = "blue";
    item.style.display = "block";
    item.innerHTML = "Form update."
}

function frontend_log_show(title, arg) {

    document.getElementById("log_window_title").innerText = title;
    document.getElementById("log_window_title").style.fontSize = "25px";

    if (!arg.hasOwnProperty("error") || !arg.hasOwnProperty("content")) {
        document.getElementById("log_window").style.display = "flex";
        document.getElementById("log_window_content").innerText = "Unknown: ";
        return;
    }
    if (arg.error == 0)
        document.getElementById("log_window_content").style.color = "green";
    else
        document.getElementById("log_window_content").style.color = "red";

    document.getElementById("log_window").style.display = "flex";
    document.getElementById("log_window_content").innerText = arg.content;
    return;
}

function frontend_log_close() {
    document.getElementById("log_window").style.display = "none";
}

function console_show_response_result(arg) {
    console.log("Error: ", arg.error);
    console.log("Result: ", arg.result);
    console.log("Message: ", arg.message);
}

/* --------------------------------------------------------------------
                            Enhanced jQuery Integration
-------------------------------------------------------------------- */
// Use modern event handling instead of jQuery if available
function initializeTabHandling() {
    const tabLinks = document.querySelectorAll("div ul li a");
    tabLinks.forEach(link => {
        link.addEventListener('click', function () {
            // Remove active class from all
            tabLinks.forEach(l => l.classList.remove('active'));
            // Add active to clicked
            this.classList.add('active');

            const tabx = this.id.slice(5, 6);
            const panes = document.querySelectorAll(".tab-pane");
            panes.forEach((pane, i) => {
                pane.className = "tab-pane";
                if (i == tabx) {
                    pane.className = "tab-pane active";
                }
            });
        });
    });
}

// Legacy jQuery support if available
if (typeof $ !== 'undefined') {
    $("document").ready(function () {
        $("div ul li a").click(function () {
            $("div ul li a").removeClass("active");
            $(this).addClass("active");

            var tabx = $(this).attr('id');
            tabx = tabx.slice(5, 6);
            console.log(tabx);
            var panes = document.querySelectorAll(".tab-pane");
            for (i = 0; i < panes.length; i++) {
                panes[i].className = "tab-pane";
            }
            panes[tabx].className = "tab-pane active";
        });
    });
} else {
    // Use modern DOM event handling
    document.addEventListener('DOMContentLoaded', initializeTabHandling);
}

/* --------------------------------------------------------------------
                            Discover
-------------------------------------------------------------------- */
function fill_thread_available_network_table(data) {
    document.getElementById("available_networks_body").innerHTML =
        "<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>"; // clear table
    var rows = '';
    var row_id = 1;
    if (data.error)
        return;
    data.result.forEach(function (keys) {
        rows += '<tr>'
        for (var k in keys) {
            rows += '<td>' + keys[k] + '</td>'
        }
        rows += '<td>'
        rows +=
            "<button class=\"btn-submit\" onclick=\"frontend_show_join_network_window(this)\">Join<\/button>"
        rows += '</td>'
        rows += '</tr>'
        row_id++;
    });

    document.getElementById("available_networks_table").caption.innerText =
        "Available Thread Networks: Scan Completed"
    document.getElementById("available_networks_body").innerHTML = rows;
}

function http_server_scan_thread_network() {
    var log = { error: 0, content: "" };
    var title = "Available Network";

    document.getElementById("available_networks_table").caption.innerText =
        "Available Thread Networks: Waiting ..."

    log.content = "Waiting...";
    frontend_log_show(title, log);

    $.ajax({
        url: '/available_network',
        async: true,
        contentType: 'application/json;charset=utf-8',
        type: 'GET',
        dataType: "json",
        data: "",
        success: function (arg) {
            console_show_response_result(arg);
            fill_thread_available_network_table(arg);
            log.error = arg.error;
            log.content = arg.message;
            frontend_log_show(title, log);
        },
        error: function (arg) {
            log.error = "Error: ";
            log.content = "Unknown: ";
            frontend_log_show(title, log);
            console.log(arg);
        }
    })
}

/* --------------------------------------------------------------------
                            Join
-------------------------------------------------------------------- */
var g_available_networks_row;
function http_server_join_thread_network(root) {
    var log = { error: 0, content: "" };
    var title = "Join"
    $.ajax({
        url: '/join_network',
        async: true,
        contentType: 'application/json;charset=utf-8',
        type: 'POST',
        dataType: "json",
        data: JSON.stringify(root),
        success: function (arg) {
            console_show_response_result(arg);
            log.error = arg.error;
            log.content = arg.message;
            frontend_log_show(title, log);
        },
        error: function (arg) {
            log.error = "Error";
            log.content = "Unknown";
            frontend_log_show(title, log);
            console.log(arg)
        }
    })
}

function frontend_show_join_network_window(arg) {
    g_available_networks_row = $(arg).parent().parent().find("td");
    document.getElementById('join_window').style.display = 'block';
}

function frontend_submit_join_network(arg) {
    if (g_available_networks_row == "" || g_available_networks_row.eq(0) == "") {
        console.log("Invalid Network!");
        return;
    }
    var root = $("#join_network_table").serializeJson();
    root.index = parseInt(g_available_networks_row.eq(0).text());
    if (root.hasOwnProperty("defaultRoute") && root.defaultRoute == "on")
        root.defaultRoute = 1;
    else
        root.defaultRoute = 0;

    http_server_join_thread_network(root);
    document.getElementById('join_window').style.display = "none"
}

function frontend_cancel_join_network(data) {
    var item = document.getElementById('join_window');
    item.style.display = "none"
    return false;
}

function frontend_join_type_select(data) {
    if (data.options[data.selectedIndex].value == "network_key_type") {
        document.getElementById('join_network_key').style.display = 'block'
        document.getElementById('join_thread_pskd').style.display = 'none'
    } else if (data.options[data.selectedIndex].value == "thread_pskd_type") {
        document.getElementById('join_network_key').style.display = 'none'
        document.getElementById('join_thread_pskd').style.display = 'block'
    }
}

/* --------------------------------------------------------------------
                            Form
-------------------------------------------------------------------- */
function handle_form_response_message(arg, form_id) {
    item = document.getElementById(form_id);
    if (arg.hasOwnProperty("error") && !arg.error) {
        if (arg.result == "successful") {
            item.style.color = "green";
            item.innerHTML = arg.message;
        } else {
            item.style.color = "red";
            item.innerHTML = arg.message;
        }
    } else {
        item.style.color = "red";
        item.innerHTML = "Try against.";
    }
}

/* convert form's input to json type */
$.fn.serializeJson =
    function () {
        var serializeObj = {};
        var array = this.serializeArray();
        var str = this.serialize();
        $(array).each(function () {
            if (serializeObj[this.name]) {
                if ($.isArray(serializeObj[this.name])) {
                    serializeObj[this.name].push(this.value);
                } else {
                    serializeObj[this.name] = [serializeObj[this.name], this.value];
                }
            } else {
                serializeObj[this.name] = this.value;
            }
        });
        return serializeObj;
    }

function http_server_upload_form_network_table() {
    item = document.getElementById("form_tip");
    item.style.color = "green";
    item.style.display = 'block';

    var root = $("#network_form").serializeJson();
    var title = "Form";
    if (root.hasOwnProperty("defaultRoute") && root.defaultRoute == "on")
        root.defaultRoute = 1;
    else
        root.defaultRoute = 0;
    if (root.hasOwnProperty("defaultRoute") && root.defaultRoute != "")
        root.channel = parseInt(root.channel);

    var log = { error: 0, content: "" };

    $.ajax({
        url: '/form_network',
        async: true,
        contentType: 'application/json;charset=utf-8',
        type: 'POST',
        dataType: "json",
        data: JSON.stringify(root),
        success: function (arg) {
            console_show_response_result(arg);
            if (arg != {})
                handle_form_response_message(arg, "form_tip");
            log.error = arg.error;
            log.content = arg.message;
            frontend_log_show(title, log);
        },
        error: function (arg) {
            log.error = "Error: ";
            log.content = "Unknown: ";
            frontend_log_show(title, log);
            console.log(arg)
        }
    })
}

/* --------------------------------------------------------------------
                            Status
-------------------------------------------------------------------- */
function decode_thread_status_package(package) {
    if (package.error)
        return;

    document.getElementById("ipv6-link_local_address").innerHTML =
        package.result["IPv6:LinkLocalAddress"];
    document.getElementById("ipv6-routing_local_address").innerHTML =
        package.result["IPv6:RoutingLocalAddress"];
    document.getElementById("ipv6-mesh_local_address").innerHTML =
        package.result["IPv6:MeshLocalAddress"];
    document.getElementById("ipv6-mesh_local_prefix").innerHTML =
        package.result["IPv6:MeshLocalPrefix"];

    document.getElementById("network-name").innerHTML =
        package.result["Network:Name"];
    document.getElementById("network-panid").innerHTML =
        package.result["Network:PANID"];
    document.getElementById("network-partition_id").innerHTML =
        package.result["Network:PartitionID"];
    document.getElementById("network-xpanid").innerHTML =
        package.result["Network:XPANID"];
    document.getElementById("network-baid").innerHTML =
        package.result["Network:BorderAgentID"];

    document.getElementById("openthread-version").innerHTML =
        package.result["OpenThread:Version"];
    document.getElementById("openthread-version_api").innerHTML =
        package.result["OpenThread:Version API"];
    document.getElementById("openthread-role").innerHTML =
        package.result["RCP:State"];
    document.getElementById("openthread-PSKc").innerHTML =
        package.result["OpenThread:PSKc"];

    document.getElementById("rcp-channel").innerHTML =
        package.result["RCP:Channel"];
    document.getElementById("rcp-EUI64").innerHTML = package.result["RCP:EUI64"];
    document.getElementById("rcp-txpower").innerHTML =
        package.result["RCP:TxPower"];
    document.getElementById("rcp-version").innerHTML =
        package.result["RCP:Version"];

    document.getElementById("WPAN-service").innerHTML =
        package.result["WPAN service"];

    document.getElementById("t-ipv6-link_local_address").innerHTML =
        package.result["IPv6:LinkLocalAddress"];
    document.getElementById("t-ipv6-routing_local_address").innerHTML =
        package.result["IPv6:RoutingLocalAddress"];
    document.getElementById("t-ipv6-mesh_local_address").innerHTML =
        package.result["IPv6:MeshLocalAddress"];
    document.getElementById("t-ipv6-mesh_local_prefix").innerHTML =
        package.result["IPv6:MeshLocalPrefix"];

    document.getElementById("t-network-name").innerHTML =
        package.result["Network:Name"];
    document.getElementById("t-network-panid").innerHTML =
        package.result["Network:PANID"];
    document.getElementById("t-network-partition_id").innerHTML =
        package.result["Network:PartitionID"];
    document.getElementById("t-network-xpanid").innerHTML =
        package.result["Network:XPANID"];
    document.getElementById("t-network-baid").innerHTML =
        package.result["Network:BorderAgentID"];

    document.getElementById("t-openthread-version").innerHTML =
        package.result["OpenThread:Version"];
    document.getElementById("t-openthread-version_api").innerHTML =
        package.result["OpenThread:Version API"];
    document.getElementById("t-openthread-role").innerHTML =
        package.result["RCP:State"];
    document.getElementById("t-openthread-PSKc").innerHTML =
        package.result["OpenThread:PSKc"];

    document.getElementById("t-rcp-channel").innerHTML =
        package.result["RCP:Channel"];
    document.getElementById("t-rcp-EUI64").innerHTML = package.result["RCP:EUI64"]
    document.getElementById("t-rcp-txpower").innerHTML =
        package.result["RCP:TxPower"];
    document.getElementById("t-rcp-version").innerHTML =
        package.result["RCP:Version"];

    document.getElementById("t-WPAN-service").innerHTML =
        package.result["WPAN service"];
}

function http_server_get_thread_network_properties() {
    var log = { error: 0, content: "" };
    var title = "Properties";
    $.ajax({
        url: '/get_properties',
        async: true,
        contentType: 'application/json;charset=utf-8',
        type: 'GET',
        dataType: "json",
        data: "",
        success: function (arg) {
            console_show_response_result(arg);
            decode_thread_status_package(arg);
            log.error = arg.error;
            log.content = arg.message;
            frontend_log_show(title, log);
        },
        error: function (arg) {
            log.error = "Error: ";
            log.content = "Unknown: ";
            frontend_log_show(title, log);
            console.log(arg)
        }
    })
}

/* --------------------------------------------------------------------
                            Setting
-------------------------------------------------------------------- */
function http_server_add_prefix_to_thread_network() {
    var root = $("#network_setting").serializeJson();
    var log = { error: 0, content: "" };
    var title = "Add Prefix";
    if (root.hasOwnProperty("defaultRoute") && root.defaultRoute == "on")
        root.defaultRoute = 1;
    else
        root.defaultRoute = 0;

    $.ajax({
        url: '/add_prefix',
        async: true,
        contentType: 'application/json;charset=utf-8',
        type: 'POST',
        dataType: "json",
        data: JSON.stringify(root),
        success: function (arg) {
            console_show_response_result(arg);
            log.error = arg.error;
            log.content = arg.message;
            frontend_log_show(title, log);
        },
        error: function (arg) {
            log.error = "Error: ";
            log.content = "Unknown: ";
            frontend_log_show(title, log);
            console.log(arg)
        }
    })
}

function http_server_delete_prefix_from_thread_network() {
    var root = $("#network_setting").serializeJson();
    var log = { error: 0, content: "" };
    var title = "Delete Prefix";
    $.ajax({
        url: '/delete_prefix',
        async: true,
        contentType: 'application/json;charset=utf-8',
        type: 'POST',
        dataType: "json",
        data: JSON.stringify(root),
        success: function (arg) {
            console_show_response_result(arg);
            log.error = arg.error;
            log.content = arg.message;
            frontend_log_show(title, log);
        },
        error: function (arg) {
            log.error = "Error: ";
            log.content = "Unknown: ";
            frontend_log_show(title, log);
            console.log(arg)
        }
    })
}

/* --------------------------------------------------------------------
                            commission
-------------------------------------------------------------------- */
function http_server_thread_network_commissioner() {
    var root = {
        pskd: "1234567890",
    };

    $.ajax({
        url: '/commission',
        async: true,
        contentType: 'application/json;charset=utf-8',
        type: 'POST',
        dataType: "json",
        data: JSON.stringify(root),
        success: function (arg) { console_show_response_result(arg); },
        error: function (arg) { console.log(arg) }
    })
}

/* --------------------------------------------------------------------
                            Topology
-------------------------------------------------------------------- */
function ctrl_thread_network_topology(arg) {
    var node_info = undefined;
    var topology_info = undefined;
    if (arg == "Running" || arg == "Suspend") {

        $.ajax({
            url: '/node_information',
            async: true,
            contentType: 'application/json;charset=utf-8',
            type: 'GET',
            dataType: "json",
            data: "",
            success: function (msg) {
                console_show_response_result(msg);
                node_info = msg;
                if (node_info != undefined && topology_info != undefined) {
                    handle_thread_networks_topology_package(node_info, topology_info);
                }
            },
            error: function (msg) { console.log(msg) }
        })
        $.ajax({
            url: '/topology',
            async: true,
            contentType: 'application/json;charset=utf-8',
            type: 'GET',
            dataType: "json",
            data: "",
            success: function (msg) {
                console_show_response_result(msg);
                topology_info = msg;
                if (node_info != undefined && topology_info != undefined) {
                    handle_thread_networks_topology_package(node_info, topology_info);
                }
            },
            error: function (msg) { console.log(msg) }
        })
    }
}

function http_server_build_thread_network_topology(arg) {
    // Enhanced topology function that integrates with new dashboard
    const button = arg || document.getElementById("btn_topology");
    if (button) {
        button.textContent = "Loading...";
        button.disabled = true;
    }

    // Use the enhanced dashboard function
    dashboard.fetchTopologyData().finally(() => {
        if (button) {
            button.textContent = "Refresh Topology";
            button.disabled = false;
        }
    });

    // Also trigger the original topology function for backwards compatibility
    ctrl_thread_network_topology("Running");
}

function intToHexString(num, len) {
    const str = num.toString(16);
    return "0".repeat(len - str.length) + str;
}

class Topology_Graph {
    constructor() {
        this.graph_isReady = false;
        this.graph_info = { 'nodes': [], 'links': [] };
        this.nodeDetailInfo = 'Unknown';
        this.router_number = 0;
        this.detailList = {
            'ExtAddress': { 'title': false, 'content': true },
            'Rloc16': { 'title': false, 'content': true },
            'Mode': { 'title': false, 'content': false },
            'Connectivity': { 'title': false, 'content': false },
            'Route': { 'title': false, 'content': false },
            'LeaderData': { 'title': false, 'content': false },
            'NetworkData': { 'title': false, 'content': true },
            'IP6AddressList': { 'title': false, 'content': true },
            'MACCounters': { 'title': false, 'content': false },
            'ChildTable': { 'title': false, 'content': false },
            'ChannelPages': { 'title': false, 'content': false }
        };
    }

    update_detail_list() {
        for (var detailInfoKey in this.detailList) {
            this.detailList[detailInfoKey]['title'] = false;
        }
        for (var diagInfoKey in this.nodeDetailInfo) {
            if (diagInfoKey in this.detailList) {
                this.detailList[diagInfoKey]['title'] = true;
            }
        }
    }

    // Enhanced method to display device details in the new dashboard
    displayDeviceDetails(device) {
        const detailsContainer = document.getElementById('device-details');
        if (!detailsContainer) return;

        let detailsHtml = `
      <div class="device-detail-card">
        <h6 class="text-primary mb-3">
          <i class="fas fa-microchip me-2"></i>
          ${device.Role || 'Unknown'} Device
        </h6>
        <div class="detail-info">
          <div class="row mb-2">
            <div class="col-5"><strong>RLOC16:</strong></div>
            <div class="col-7"><code>${device.Rloc16 || 'Unknown'}</code></div>
          </div>
    `;

        if (device.ExtAddress) {
            const formattedMac = device.ExtAddress.length >= 16 ?
                device.ExtAddress.match(/.{1,2}/g).join(':').toUpperCase() : device.ExtAddress;
            detailsHtml += `
        <div class="row mb-2">
          <div class="col-5"><strong>MAC Address:</strong></div>
          <div class="col-7"><span class="mac-address">${formattedMac}</span></div>
        </div>
      `;
        }

        if (device.LeaderData) {
            detailsHtml += `
        <div class="row mb-2">
          <div class="col-5"><strong>Partition ID:</strong></div>
          <div class="col-7">${device.LeaderData.PartitionId || 'N/A'}</div>
        </div>
        <div class="row mb-2">
          <div class="col-5"><strong>Data Version:</strong></div>
          <div class="col-7">${device.LeaderData.DataVersion || 'N/A'}</div>
        </div>
      `;
        }

        if (device.Route && device.Route.RouteData) {
            detailsHtml += `
        <div class="row mb-2">
          <div class="col-12"><strong>Route Information:</strong></div>
        </div>
        <div class="route-info small mb-2">
      `;
            device.Route.RouteData.forEach(route => {
                detailsHtml += `
          <div class="route-entry mb-1 p-2" style="background-color: #f8f9fa; border-radius: 4px;">
            Router ID: ${route.RouteId} | 
            LQ In: ${route.LinkQualityIn} | 
            LQ Out: ${route.LinkQualityOut} | 
            Cost: ${route.RouteCost}
          </div>
        `;
            });
            detailsHtml += '</div>';
        }

        if (device.ChildTable && device.ChildTable.length > 0) {
            detailsHtml += `
        <div class="row mb-2">
          <div class="col-12"><strong>Children (${device.ChildTable.length}):</strong></div>
        </div>
        <div class="children-info small mb-2">
      `;
            device.ChildTable.forEach(child => {
                const childRloc16 = device.Rloc16 ?
                    '0x' + (parseInt(device.Rloc16, 16) + child.ChildId).toString(16).toUpperCase() :
                    'Unknown';
                detailsHtml += `
          <div class="child-entry mb-1 p-2" style="background-color: #e8f5e8; border-radius: 4px;">
            Child ${child.ChildId} (${childRloc16}) - Timeout: ${child.Timeout}s
          </div>
        `;
            });
            detailsHtml += '</div>';
        }

        if (device.IP6AddressList && device.IP6AddressList.length > 0) {
            detailsHtml += `
        <div class="row mb-2">
          <div class="col-12"><strong>IPv6 Addresses:</strong></div>
        </div>
        <div class="ip-addresses small">
      `;
            device.IP6AddressList.forEach(addr => {
                detailsHtml += `<code class="d-block mb-1">${addr}</code>`;
            });
            detailsHtml += '</div>';
        }

        detailsHtml += '</div></div>';
        detailsContainer.innerHTML = detailsHtml;
    }
}

var topology_update = new Topology_Graph();

function handle_thread_networks_topology_package(node, diag) {
    var nodeMap = {};
    var count, src, dist, rloc, child, rlocOfParent, rlocOfChild, diagOfNode,
        linkNode, childInfo;
    let topology = new Topology_Graph();

    var diag_package = diag["result"];
    if (!diag_package) return;

    for (diagOfNode of diag_package) {
        diagOfNode['RouteId'] = '0x' + intToHexString(diagOfNode['Rloc16'] >> 10, 2);
        diagOfNode['Rloc16'] = '0x' + intToHexString(diagOfNode['Rloc16'], 4);

        if (diagOfNode['LeaderData']) {
            diagOfNode['LeaderData']['LeaderRouterId'] =
                '0x' + intToHexString(diagOfNode['LeaderData']['LeaderRouterId'], 2);
        }

        if (diagOfNode['Route'] && diagOfNode['Route']['RouteData']) {
            for (linkNode of diagOfNode['Route']['RouteData']) {
                linkNode['RouteId'] = '0x' + intToHexString(linkNode['RouteId'], 2);
            }
        }
    }

    count = 0;
    var node_info = node["result"];
    for (diagOfNode of diag_package) {
        if ('ChildTable' in diagOfNode) {
            rloc = parseInt(diagOfNode['Rloc16'], 16).toString(16);
            nodeMap[rloc] = count;

            if (diagOfNode['LeaderData'] &&
                diagOfNode['RouteId'] == diagOfNode['LeaderData']['LeaderRouterId']) {
                diagOfNode['Role'] = 'Leader';
            } else {
                diagOfNode['Role'] = 'Router';
            }

            topology.graph_info.nodes.push(diagOfNode);

            if (diagOfNode['Rloc16'] === node_info['Rloc16']) {
                topology.nodeDetailInfo = diagOfNode;
                // Display this device's details in the new dashboard
                topology.displayDeviceDetails(diagOfNode);
            }
            count = count + 1;
        }
    }

    topology.router_number = count;

    // Update both old and new dashboard elements
    const elements = [
        { id: "topology_netwotkname", value: node_info["NetworkName"] },
        { id: "topology-network-name", value: node_info["NetworkName"] },
        { id: "topology_leader", value: "0x" + node_info["LeaderData"]["LeaderRouterId"].toString(16) },
        { id: "topology-leader", value: "0x" + node_info["LeaderData"]["LeaderRouterId"].toString(16) },
        { id: "topology_router_number", value: count.toString() },
        { id: "topology-router-count", value: count.toString() }
    ];

    elements.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
            element.innerHTML = item.value;
        }
    });

    // Build router-child links
    src = 0;
    for (diagOfNode of diag_package) {
        if ('ChildTable' in diagOfNode) {
            // Link between routers
            if (diagOfNode['Route'] && diagOfNode['Route']['RouteData']) {
                for (linkNode of diagOfNode['Route']['RouteData']) {
                    rloc = (parseInt(linkNode['RouteId'], 16) << 10).toString(16);
                    if (rloc in nodeMap) {
                        dist = nodeMap[rloc];
                        if (src < dist) {
                            topology.graph_info.links.push({
                                'source': src,
                                'target': dist,
                                'weight': 1,
                                'type': 0,
                                'linkInfo': {
                                    'inQuality': linkNode['LinkQualityIn'],
                                    'outQuality': linkNode['LinkQualityOut']
                                }
                            });
                        }
                    }
                }
            }

            // Link between router and child
            if (diagOfNode['ChildTable']) {
                for (childInfo of diagOfNode['ChildTable']) {
                    child = {};
                    rlocOfParent = parseInt(diagOfNode['Rloc16'], 16).toString(16);
                    rlocOfChild = (parseInt(diagOfNode['Rloc16'], 16) + childInfo['ChildId']).toString(16);

                    src = nodeMap[rlocOfParent];

                    child['Rloc16'] = '0x' + rlocOfChild;
                    child['RouteId'] = diagOfNode['RouteId'];
                    nodeMap[rlocOfChild] = count;
                    child['Role'] = 'Child';
                    topology.graph_info.nodes.push(child);
                    topology.graph_info.links.push({
                        'source': src,
                        'target': count,
                        'weight': 1,
                        'type': 1,
                        'linkInfo': {
                            'Timeout': childInfo['Timeout'],
                            'Mode': childInfo['Mode']
                        }
                    });
                    count = count + 1;
                }
            }
        }
        src = src + 1;
    }

    // Update the global topology object
    topology_update = topology;

    // Draw the enhanced topology
    draw_thread_topology_graph(topology);
}

function draw_thread_topology_graph(arg) {
    // Enhanced D3.js visualization that works with both old and new dashboards
    const canvasId = document.getElementById("topology-canvas") ? "topology-canvas" : "tolology_canvas";
    const canvas = document.getElementById(canvasId);

    if (!canvas) {
        console.error("Topology canvas not found");
        return;
    }

    // Clear previous content
    canvas.innerHTML = '';

    if (!arg.graph_info.nodes || arg.graph_info.nodes.length === 0) {
        canvas.innerHTML = '<div class="text-center p-4"><p class="text-muted">No topology data available</p></div>';
        return;
    }

    var json = arg.graph_info;
    var width = canvas.offsetWidth || 800;
    var height = canvas.offsetHeight || 500;

    // Create SVG
    var svg = d3.select(`#${canvasId}`)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background-color', '#ffffff');

    // Enhanced force simulation
    var force = d3.forceSimulation(json.nodes)
        .force('link', d3.forceLink(json.links)
            .id(d => d.index)
            .distance(80)
            .strength(0.8))
        .force('charge', d3.forceManyBody()
            .strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide()
            .radius(25));

    // Create tooltip
    var tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('padding', '10px')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('border-radius', '5px')
        .style('pointer-events', 'none')
        .style('opacity', 0);

    // Links
    var link = svg.selectAll('.link')
        .data(json.links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .style('stroke', d => d.type === 0 ? '#999' : '#ccc')
        .style('stroke-width', d => d.type === 0 ? 2 : 1)
        .style('stroke-dasharray', d => d.type === 1 ? '5,5' : 'none');

    // Nodes
    var node = svg.selectAll('.node')
        .data(json.nodes)
        .enter()
        .append('g')
        .attr('class', d => `node ${d.Role}`)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended))
        .on('click', function (event, d) {
            // Enhanced click handler
            d3.selectAll('.node circle')
                .style('stroke', '#484e46')
                .style('stroke-width', '1px');

            d3.select(this).select('circle')
                .style('stroke', '#f39191')
                .style('stroke-width', '3px');

            // Update detail display in new dashboard
            if (topology_update.displayDeviceDetails) {
                topology_update.displayDeviceDetails(d);
            }

            // Legacy detail update
            topology_update.nodeDetailInfo = d;
            topology_update.update_detail_list();
        });

    // Router nodes
    node.filter(d => d.Role === 'Router' || d.Role === 'Leader')
        .append('circle')
        .attr('r', d => d.Role === 'Leader' ? 15 : 12)
        .style('fill', d => d.Role === 'Leader' ? '#0ea2bd' : '#03e2dd')
        .style('stroke', d => d.Role === 'Leader' ? '#1e6b7a' : '#484e46')
        .style('stroke-width', d => d.Role === 'Leader' ? '3px' : '2px')
        .on('mouseover', function (event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            const formattedMac = d.ExtAddress && d.ExtAddress.length >= 16 ?
                d.ExtAddress.match(/.{1,2}/g).join(':').toUpperCase() : d.ExtAddress;
            tooltip.html(`
        <strong>${d.Role}</strong><br/>
        RLOC16: ${d.Rloc16}<br/>
        ${formattedMac ? `MAC: ${formattedMac}` : ''}
      `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function () {
            tooltip.transition().duration(500).style('opacity', 0);
        });

    // Child nodes
    node.filter(d => d.Role === 'Child')
        .append('circle')
        .attr('r', 8)
        .style('fill', '#aad4b0')
        .style('stroke', '#484e46')
        .style('stroke-width', '1px')
        .style('stroke-dasharray', '2,1')
        .on('mouseover', function (event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`
        <strong>Child Device</strong><br/>
        RLOC16: ${d.Rloc16}
      `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function () {
            tooltip.transition().duration(500).style('opacity', 0);
        });

    // Labels - show RLOC16 and MAC address
    node.append('text')
        .attr('dy', -20)
        .attr('text-anchor', 'middle')
        .style('font-size', '9px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text(d => d.Rloc16);

    // Add MAC address labels for devices that have them
    node.filter(d => d.ExtAddress && d.ExtAddress !== 'Unknown')
        .append('text')
        .attr('dy', 25)
        .attr('text-anchor', 'middle')
        .style('font-size', '7px')
        .style('fill', '#666')
        .text(d => {
            const mac = d.ExtAddress.length >= 16 ?
                d.ExtAddress.match(/.{1,2}/g).slice(-3).join(':') : '';
            return mac ? `...${mac}` : '';
        });

    // Force simulation tick
    force.on('tick', function () {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node
            .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) force.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) force.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}
