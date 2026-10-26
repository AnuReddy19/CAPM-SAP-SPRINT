sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"psaa/invoices/test/integration/pages/InvoiceSrvList.gen",
	"psaa/invoices/test/integration/pages/InvoiceSrvObjectPage.gen"
], function (JourneyRunner, InvoiceSrvListGenerated, InvoiceSrvObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('psaa/invoices') + '/test/flp.html#app-preview',
        pages: {
			onTheInvoiceSrvListGenerated: InvoiceSrvListGenerated,
			onTheInvoiceSrvObjectPageGenerated: InvoiceSrvObjectPageGenerated
        },
        async: true
    });

    return runner;
});

