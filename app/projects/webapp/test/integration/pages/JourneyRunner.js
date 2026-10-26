sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"psaa/projects/test/integration/pages/ProjectSrvList.gen",
	"psaa/projects/test/integration/pages/ProjectSrvObjectPage.gen"
], function (JourneyRunner, ProjectSrvListGenerated, ProjectSrvObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('psaa/projects') + '/test/flp.html#app-preview',
        pages: {
			onTheProjectSrvListGenerated: ProjectSrvListGenerated,
			onTheProjectSrvObjectPageGenerated: ProjectSrvObjectPageGenerated
        },
        async: true
    });

    return runner;
});

