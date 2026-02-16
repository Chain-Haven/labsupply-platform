(function ($) {
    'use strict';

    var WLPAdmin = {
        init: function () {
            this.bindEvents();
        },

        bindEvents: function () {
            $('#wlp-connect-form').on('submit', this.handleConnect);
            $('#wlp-disconnect').on('click', this.handleDisconnect);
            $('#wlp-refresh-catalog').on('click', this.handleRefreshCatalog);
            $('#wlp-import-products').on('click', this.handleImportProducts);
            $('#wlp-resync-orders').on('click', this.handleResyncOrders);
            $('#wlp-debug-mode').on('change', this.handleDebugToggle);
        },

        handleConnect: function (e) {
            e.preventDefault();

            var $form = $(this);
            var $button = $form.find('button[type="submit"]');
            var $message = $('#wlp-connect-message');
            var connectCode = $('#wlp-connect-code').val().trim();

            if (!connectCode) {
                WLPAdmin.showMessage($message, wlpAdmin.strings.error + ' Please enter a connect code', 'error');
                return;
            }

            $button.prop('disabled', true).text(wlpAdmin.strings.connecting);

            $.ajax({
                url: wlpAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'wlp_connect',
                    nonce: wlpAdmin.nonce,
                    connect_code: connectCode
                },
                success: function (response) {
                    if (response.success) {
                        WLPAdmin.showMessage($message, wlpAdmin.strings.connected, 'success');
                        setTimeout(function () {
                            window.location.reload();
                        }, 1500);
                    } else {
                        WLPAdmin.showMessage($message, wlpAdmin.strings.error + ' ' + response.data, 'error');
                        $button.prop('disabled', false).text('Connect');
                    }
                },
                error: function () {
                    WLPAdmin.showMessage($message, wlpAdmin.strings.error + ' Connection failed', 'error');
                    $button.prop('disabled', false).text('Connect');
                }
            });
        },

        handleDisconnect: function () {
            if (!confirm(wlpAdmin.strings.confirm_disconnect)) {
                return;
            }

            var $button = $(this);
            $button.prop('disabled', true);

            $.ajax({
                url: wlpAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'wlp_disconnect',
                    nonce: wlpAdmin.nonce
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
            var $message = $('#wlp-catalog-message');

            $button.prop('disabled', true);

            $.ajax({
                url: wlpAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'wlp_refresh_catalog',
                    nonce: wlpAdmin.nonce
                },
                success: function (response) {
                    if (response.success) {
                        var count = response.data.products ? response.data.products.length : 0;
                        WLPAdmin.showMessage($message, 'Catalog refreshed: ' + count + ' products available', 'success');
                    } else {
                        WLPAdmin.showMessage($message, wlpAdmin.strings.error + ' ' + response.data, 'error');
                    }
                    $button.prop('disabled', false);
                },
                error: function () {
                    WLPAdmin.showMessage($message, wlpAdmin.strings.error + ' Failed to refresh catalog', 'error');
                    $button.prop('disabled', false);
                }
            });
        },

        handleImportProducts: function () {
            var $button = $(this);
            var $message = $('#wlp-catalog-message');

            $button.prop('disabled', true).text(wlpAdmin.strings.importing);

            $.ajax({
                url: wlpAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'wlp_import_products',
                    nonce: wlpAdmin.nonce
                },
                success: function (response) {
                    if (response.success) {
                        var msg = 'Import complete: ' + response.data.created + ' created, ' +
                            response.data.updated + ' updated';
                        if (response.data.failed > 0) {
                            msg += ', ' + response.data.failed + ' failed';
                        }
                        WLPAdmin.showMessage($message, msg, 'success');
                    } else {
                        WLPAdmin.showMessage($message, wlpAdmin.strings.error + ' ' + response.data, 'error');
                    }
                    $button.prop('disabled', false).html('<span class="dashicons dashicons-download"></span> Import All Products');
                },
                error: function () {
                    WLPAdmin.showMessage($message, wlpAdmin.strings.error + ' Import failed', 'error');
                    $button.prop('disabled', false).html('<span class="dashicons dashicons-download"></span> Import All Products');
                }
            });
        },

        handleResyncOrders: function () {
            var $button = $(this);
            var $message = $('#wlp-sync-message');
            var count = $('#wlp-resync-count').val();

            $button.prop('disabled', true);

            $.ajax({
                url: wlpAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'wlp_resync_orders',
                    nonce: wlpAdmin.nonce,
                    count: count
                },
                success: function (response) {
                    if (response.success) {
                        WLPAdmin.showMessage($message, response.data.message, 'success');
                    } else {
                        WLPAdmin.showMessage($message, wlpAdmin.strings.error + ' ' + response.data, 'error');
                    }
                    $button.prop('disabled', false);
                },
                error: function () {
                    WLPAdmin.showMessage($message, wlpAdmin.strings.error + ' Sync failed', 'error');
                    $button.prop('disabled', false);
                }
            });
        },

        handleDebugToggle: function () {
            var enabled = $(this).is(':checked') ? 'yes' : 'no';

            $.ajax({
                url: wlpAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'wlp_save_setting',
                    nonce: wlpAdmin.nonce,
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
        WLPAdmin.init();
    });

})(jQuery);
