sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"psaa/alerts/test/integration/pages/AlertSrvList.gen",
	"psaa/alerts/test/integration/pages/AlertSrvObjectPage.gen"
], function (JourneyRunner, AlertSrvListGenerated, AlertSrvObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('psaa/alerts') + '/test/flp.html#app-preview',
        pages: {
			onTheAlertSrvListGenerated: AlertSrvListGenerated,
			onTheAlertSrvObjectPageGenerated: AlertSrvObjectPageGenerated
        },
        async: true
    });

    return runner;
});

