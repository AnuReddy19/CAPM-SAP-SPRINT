sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"psaa/tasks/test/integration/pages/TaskSrvList.gen",
	"psaa/tasks/test/integration/pages/TaskSrvObjectPage.gen"
], function (JourneyRunner, TaskSrvListGenerated, TaskSrvObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('psaa/tasks') + '/test/flp.html#app-preview',
        pages: {
			onTheTaskSrvListGenerated: TaskSrvListGenerated,
			onTheTaskSrvObjectPageGenerated: TaskSrvObjectPageGenerated
        },
        async: true
    });

    return runner;
});

