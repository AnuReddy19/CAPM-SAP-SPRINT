sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"psaa/timesheets/test/integration/pages/TimesheetSrvList.gen",
	"psaa/timesheets/test/integration/pages/TimesheetSrvObjectPage.gen"
], function (JourneyRunner, TimesheetSrvListGenerated, TimesheetSrvObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('psaa/timesheets') + '/test/flp.html#app-preview',
        pages: {
			onTheTimesheetSrvListGenerated: TimesheetSrvListGenerated,
			onTheTimesheetSrvObjectPageGenerated: TimesheetSrvObjectPageGenerated
        },
        async: true
    });

    return runner;
});

