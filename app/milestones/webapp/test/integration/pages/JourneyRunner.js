sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"psaa/milestones/test/integration/pages/MilestoneSrvList.gen",
	"psaa/milestones/test/integration/pages/MilestoneSrvObjectPage.gen"
], function (JourneyRunner, MilestoneSrvListGenerated, MilestoneSrvObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('psaa/milestones') + '/test/flp.html#app-preview',
        pages: {
			onTheMilestoneSrvListGenerated: MilestoneSrvListGenerated,
			onTheMilestoneSrvObjectPageGenerated: MilestoneSrvObjectPageGenerated
        },
        async: true
    });

    return runner;
});

