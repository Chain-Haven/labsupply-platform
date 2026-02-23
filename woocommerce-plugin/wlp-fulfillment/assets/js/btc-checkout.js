/**
 * WhiteLabel Peptides — BTC Checkout Frontend
 * Generates QR code, polls blockchain for payment, updates UI in real time.
 */
(function ($) {
    'use strict';

    if (typeof wlpBtc === 'undefined') return;

    var state = {
        polling: false,
        detected: false,
        confirmed: false,
        expired: false,
        confirmations: 0,
        pollInterval: null,
        timerInterval: null,
    };

    function init() {
        generateQR();
        startTimer();
        startPolling();
        bindCopyButtons();
    }

    /* ---- QR Code ---- */
    function generateQR() {
        var container = document.getElementById('wlp-btc-qr');
        if (!container) return;

        var uri = wlpBtc.bip21_uri;
        var size = 200;

        // Use QRCode.js if available, otherwise a simple img from a public API
        if (typeof QRCode !== 'undefined') {
            new QRCode(container, { text: uri, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
        } else {
            var img = document.createElement('img');
            img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(uri);
            img.alt = 'Bitcoin Payment QR Code';
            img.width = size;
            img.height = size;
            img.style.borderRadius = '4px';
            container.appendChild(img);
        }
    }

    /* ---- Timer ---- */
    function startTimer() {
        var timerEl = document.getElementById('wlp-btc-timer-text');
        if (!timerEl || !wlpBtc.expires_at) return;

        function tick() {
            var now = Math.floor(Date.now() / 1000);
            var remaining = wlpBtc.expires_at - now;

            if (remaining <= 0 && !state.detected && !state.confirmed) {
                timerEl.textContent = wlpBtc.strings.expired;
                setStatus('expired');
                state.expired = true;
                stopPolling();
                return;
            }

            if (state.detected || state.confirmed) {
                timerEl.textContent = '';
                document.getElementById('wlp-btc-timer').style.display = 'none';
                return;
            }

            var mins = Math.floor(remaining / 60);
            var secs = remaining % 60;
            timerEl.textContent = 'Payment window: ' + mins + ':' + (secs < 10 ? '0' : '') + secs;
        }

        tick();
        state.timerInterval = setInterval(tick, 1000);
    }

    /* ---- Blockchain Polling ---- */
    function startPolling() {
        if (state.confirmed || state.expired) return;
        state.polling = true;
        poll();
        state.pollInterval = setInterval(poll, 10000); // every 10 seconds
    }

    function stopPolling() {
        state.polling = false;
        if (state.pollInterval) clearInterval(state.pollInterval);
        if (state.timerInterval) clearInterval(state.timerInterval);
    }

    function poll() {
        if (state.confirmed || state.expired) {
            stopPolling();
            return;
        }

        var url = wlpBtc.esplora_base + '/address/' + wlpBtc.address + '/txs';

        $.ajax({
            url: url,
            method: 'GET',
            dataType: 'json',
            timeout: 15000,
            success: function (txs) {
                if (!Array.isArray(txs) || txs.length === 0) return;

                var expectedSats = parseInt(wlpBtc.amount_sats, 10);
                var tolerance = Math.max(100, Math.floor(expectedSats * 0.02)); // 2% tolerance

                for (var i = 0; i < txs.length; i++) {
                    var tx = txs[i];
                    for (var j = 0; j < tx.vout.length; j++) {
                        var out = tx.vout[j];
                        if (out.scriptpubkey_address !== wlpBtc.address) continue;

                        var diff = Math.abs(out.value - expectedSats);
                        if (diff <= tolerance || out.value >= expectedSats) {
                            onPaymentDetected(tx);
                            return;
                        }
                    }
                }
            },
            error: function () {
                // Silently retry on next poll
            }
        });
    }

    function onPaymentDetected(tx) {
        if (state.detected) {
            updateConfirmations(tx);
            return;
        }

        state.detected = true;
        setStatus('detected');

        document.getElementById('wlp-btc-confirmations').style.display = 'block';
        document.getElementById('wlp-btc-timer').style.display = 'none';

        // Speed up polling for confirmations
        if (state.pollInterval) clearInterval(state.pollInterval);
        state.pollInterval = setInterval(function () { pollTxStatus(tx.txid); }, 15000);

        updateConfirmations(tx);
    }

    function pollTxStatus(txid) {
        if (state.confirmed) {
            stopPolling();
            return;
        }

        var url = wlpBtc.esplora_base + '/tx/' + txid + '/status';

        $.ajax({
            url: url,
            method: 'GET',
            dataType: 'json',
            timeout: 10000,
            success: function (status) {
                if (!status.confirmed) {
                    state.confirmations = 0;
                } else {
                    $.ajax({
                        url: wlpBtc.esplora_base + '/blocks/tip/height',
                        method: 'GET',
                        dataType: 'text',
                        timeout: 5000,
                        success: function (tipText) {
                            var tip = parseInt(tipText, 10);
                            if (tip > 0 && status.block_height) {
                                state.confirmations = tip - status.block_height + 1;
                            }
                            updateConfirmationUI();
                        }
                    });
                    return;
                }
                updateConfirmationUI();
            }
        });
    }

    function updateConfirmations(tx) {
        if (tx.status && tx.status.confirmed && tx.status.block_height) {
            $.ajax({
                url: wlpBtc.esplora_base + '/blocks/tip/height',
                method: 'GET',
                dataType: 'text',
                timeout: 5000,
                success: function (tipText) {
                    var tip = parseInt(tipText, 10);
                    if (tip > 0) {
                        state.confirmations = tip - tx.status.block_height + 1;
                    }
                    updateConfirmationUI();
                }
            });
        } else {
            state.confirmations = 0;
            updateConfirmationUI();
        }
    }

    function updateConfirmationUI() {
        var threshold = parseInt(wlpBtc.conf_threshold, 10) || 3;
        var count = Math.min(state.confirmations, threshold);

        $('#wlp-btc-conf-count').text(count);
        var pct = Math.min(100, (count / threshold) * 100);
        $('#wlp-btc-conf-fill').css('width', pct + '%');

        if (count >= threshold && !state.confirmed) {
            state.confirmed = true;
            setStatus('confirmed');
            stopPolling();
            notifyServer();
        }
    }

    /* ---- Notify WooCommerce Server ---- */
    function notifyServer() {
        $.ajax({
            url: wlpBtc.check_url,
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            headers: { 'X-WP-Nonce': wlpBtc.nonce },
            data: JSON.stringify({
                order_id: wlpBtc.order_id,
                address: wlpBtc.address,
            }),
            success: function () {
                // Order will be marked as processing on the server
                setTimeout(function () {
                    window.location.reload();
                }, 3000);
            }
        });
    }

    /* ---- Status UI ---- */
    function setStatus(newStatus) {
        var el = document.getElementById('wlp-btc-status');
        var textEl = document.getElementById('wlp-btc-status-text');
        var iconEl = el.querySelector('.wlp-btc-status-icon');

        el.className = 'wlp-btc-status wlp-btc-status-' + newStatus;

        switch (newStatus) {
            case 'waiting':
                textEl.textContent = wlpBtc.strings.waiting;
                iconEl.innerHTML = '<div class="wlp-btc-spinner"></div>';
                break;
            case 'detected':
                textEl.textContent = wlpBtc.strings.detected;
                iconEl.innerHTML = '<div class="wlp-btc-spinner"></div>';
                break;
            case 'confirmed':
                textEl.textContent = wlpBtc.strings.confirmed;
                iconEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
                break;
            case 'expired':
                textEl.textContent = wlpBtc.strings.expired;
                iconEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
                break;
        }

        document.getElementById('wlp-btc-payment').setAttribute('data-status', newStatus);
    }

    /* ---- Copy Buttons ---- */
    function bindCopyButtons() {
        $('.wlp-btc-copy-btn').on('click', function () {
            var text = $(this).data('copy');
            var btn = $(this);

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    flashCopied(btn);
                });
            } else {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                flashCopied(btn);
            }
        });
    }

    function flashCopied(btn) {
        btn.addClass('copied');
        var original = btn.html();
        btn.html('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>');
        setTimeout(function () {
            btn.removeClass('copied');
            btn.html(original);
        }, 1500);
    }

    /* ---- Boot ---- */
    $(document).ready(init);

})(jQuery);
