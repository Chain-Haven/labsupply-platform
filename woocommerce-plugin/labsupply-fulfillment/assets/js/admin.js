(function ($) {
    'use strict';

    var LabSupplyAdmin = {
        init: function () {
            this.bindEvents();
        },

        bindEvents: function () {
            $('#labsupply-connect-form').on('submit', this.handleConnect);
            $('#labsupply-disconnect').on('click', this.handleDisconnect);
            $('#labsupply-refresh-catalog').on('click', this.handleRefreshCatalog);
            $('#labsupply-import-products').on('click', this.handleImportProducts);
            $('#labsupply-resync-orders').on('click', this.handleResyncOrders);
            $('#labsupply-debug-mode').on('change', this.handleDebugToggle);
        },

        handleConnect: function (e) {
            e.preventDefault();

            var $form = $(this);
            var $button = $form.find('button[type="submit"]');
            var $message = $('#labsupply-connect-message');
            var connectCode = $('#labsupply-connect-code').val().trim();

            if (!connectCode) {
                LabSupplyAdmin.showMessage($message, labsupplyAdmin.strings.error + ' Please enter a connect code', 'error');
                return;
            }

            $button.prop('disabled', true).text(labsupplyAdmin.strings.connecting);

            $.ajax({
                url: labsupplyAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'labsupply_connect',
                    nonce: labsupplyAdmin.nonce,
                    connect_code: connectCode
                },
                success: function (response) {
                    if (response.success) {
                        LabSupplyAdmin.showMessage($message, labsupplyAdmin.strings.connected, 'success');
                        setTimeout(function () {
                            window.location.reload();
                        }, 1500);
                    } else {
                        LabSupplyAdmin.showMessage($message, labsupplyAdmin.strings.error + ' ' + response.data, 'error');
                        $button.prop('disabled', false).text('Connect');
                    }
                },
                error: function () {
                    LabSupplyAdmin.showMessage($message, labsupplyAdmin.strings.error + ' Connection failed', 'error');
                    $button.prop('disabled', false).text('Connect');
                }
            });
        },

        handleDisconnect: function () {
            if (!confirm(labsupplyAdmin.strings.confirm_disconnect)) {
                return;
            }

            var $button = $(this);
            $button.prop('disabled', true);

            $.ajax({
                url: labsupplyAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'labsupply_disconnect',
                    nonce: labsupplyAdmin.nonce
                },
                success: function (response) {
                    window.location.reload();
                },
                error: function () {
                    $button.prop('disabled', false);
                    alert('Failed to disconnect');
                }
            });
        },

        handleRefreshCatalog: function () {
            var $button = $(this);
            var $message = $('#labsupply-catalog-message');

            $button.prop('disabled', true);

            $.ajax({
                url: labsupplyAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'labsupply_refresh_catalog',
                    nonce: labsupplyAdmin.nonce
                },
                success: function (response) {
                    if (response.success) {
                        var count = response.data.products ? response.data.products.length : 0;
                        LabSupplyAdmin.showMessage($message, 'Catalog refreshed: ' + count + ' products available', 'success');
                    } else {
                        LabSupplyAdmin.showMessage($message, labsupplyAdmin.strings.error + ' ' + response.data, 'error');
                    }
                    $button.prop('disabled', false);
                },
                error: function () {
                    LabSupplyAdmin.showMessage($message, labsupplyAdmin.strings.error + ' Failed to refresh catalog', 'error');
                    $button.prop('disabled', false);
                }
            });
        },

        handleImportProducts: function () {
            var $button = $(this);
            var $message = $('#labsupply-catalog-message');

            $button.prop('disabled', true).text(labsupplyAdmin.strings.importing);

            $.ajax({
                url: labsupplyAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'labsupply_import_products',
                    nonce: labsupplyAdmin.nonce
                },
                success: function (response) {
                    if (response.success) {
                        var msg = 'Import complete: ' + response.data.created + ' created, ' +
                            response.data.updated + ' updated';
                        if (response.data.failed > 0) {
                            msg += ', ' + response.data.failed + ' failed';
                        }
                        LabSupplyAdmin.showMessage($message, msg, 'success');
                    } else {
                        LabSupplyAdmin.showMessage($message, labsupplyAdmin.strings.error + ' ' + response.data, 'error');
                    }
                    $button.prop('disabled', false).html('<span class="dashicons dashicons-download"></span> Import All Products');
                },
                error: function () {
                    LabSupplyAdmin.showMessage($message, labsupplyAdmin.strings.error + ' Import failed', 'error');
                    $button.prop('disabled', false).html('<span class="dashicons dashicons-download"></span> Import All Products');
                }
            });
        },

        handleResyncOrders: function () {
            var $button = $(this);
            var $message = $('#labsupply-sync-message');
            var count = $('#labsupply-resync-count').val();

            $button.prop('disabled', true);

            $.ajax({
                url: labsupplyAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'labsupply_resync_orders',
                    nonce: labsupplyAdmin.nonce,
                    count: count
                },
                success: function (response) {
                    if (response.success) {
                        LabSupplyAdmin.showMessage($message, response.data.message, 'success');
                    } else {
                        LabSupplyAdmin.showMessage($message, labsupplyAdmin.strings.error + ' ' + response.data, 'error');
                    }
                    $button.prop('disabled', false);
                },
                error: function () {
                    LabSupplyAdmin.showMessage($message, labsupplyAdmin.strings.error + ' Sync failed', 'error');
                    $button.prop('disabled', false);
                }
            });
        },

        handleDebugToggle: function () {
            var enabled = $(this).is(':checked') ? 'yes' : 'no';

            $.ajax({
                url: labsupplyAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'labsupply_save_setting',
                    nonce: labsupplyAdmin.nonce,
                    key: 'debug_mode',
                    value: enabled
                }
            });
        },

        showMessage: function ($element, message, type) {
            $element.removeClass('success error').addClass(type).text(message).show();

            if (type === 'success') {
                setTimeout(function () {
                    $element.fadeOut();
                }, 5000);
            }
        }
    };

    $(document).ready(function () {
        LabSupplyAdmin.init();
    });

})(jQuery);
