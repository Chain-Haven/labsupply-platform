/**
 * WhiteLabel Peptides — BTC Payment Block Checkout Integration
 */
(function () {
    'use strict';

    var registerPaymentMethod = window.wc.wcBlocksRegistry.registerPaymentMethod;
    var createElement = window.wp.element.createElement;
    var decodeEntities = window.wp.htmlEntities.decodeEntities;
    var settings = window.wc.wcSettings.getSetting('wlp_btc_data', {});

    var title = decodeEntities(settings.title || 'Pay with Bitcoin');
    var description = decodeEntities(settings.description || '');

    var BtcIcon = function () {
        return createElement('span', {
            style: { fontSize: '20px', marginRight: '6px', lineHeight: '1' }
        }, '\u20BF');
    };

    var BtcLabel = function () {
        return createElement('span', {
            style: { display: 'flex', alignItems: 'center', fontWeight: '600' }
        },
            createElement(BtcIcon),
            title
        );
    };

    var BtcContent = function () {
        return createElement('div', {
            style: {
                padding: '12px',
                background: '#fffbf5',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: '1.5',
            }
        },
            createElement('p', { style: { margin: '0 0 8px', fontWeight: '600', color: '#92400e' } },
                '\u20BF ' + title
            ),
            createElement('p', { style: { margin: '0', color: '#78716c' } }, description),
            createElement('p', {
                style: {
                    margin: '8px 0 0',
                    fontSize: '12px',
                    color: '#a8a29e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }
            },
                createElement('span', { style: { color: '#16a34a' } }, '\u2713'),
                'Secured by the Bitcoin blockchain'
            )
        );
    };

    registerPaymentMethod({
        name: 'wlp_btc',
        label: createElement(BtcLabel),
        content: createElement(BtcContent),
        edit: createElement(BtcContent),
        canMakePayment: function () { return true; },
        ariaLabel: title,
        supports: { features: settings.supports || ['products'] },
    });
})();
