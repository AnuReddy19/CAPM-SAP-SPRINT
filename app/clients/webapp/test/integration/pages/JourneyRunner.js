sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"psaa/clients/test/integration/pages/ClientSrvList.gen",
	"psaa/clients/test/integration/pages/ClientSrvObjectPage.gen"
], function (JourneyRunner, ClientSrvListGenerated, ClientSrvObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('psaa/clients') + '/test/flp.html#app-preview',
        pages: {
			onTheClientSrvListGenerated: ClientSrvListGenerated,
			onTheClientSrvObjectPageGenerated: ClientSrvObjectPageGenerated
        },
        async: true
    });

    return runner;
});

