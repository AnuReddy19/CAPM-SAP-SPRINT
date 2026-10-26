sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"psaa/approvals/test/integration/pages/ApprovalSrvList.gen",
	"psaa/approvals/test/integration/pages/ApprovalSrvObjectPage.gen"
], function (JourneyRunner, ApprovalSrvListGenerated, ApprovalSrvObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('psaa/approvals') + '/test/flp.html#app-preview',
        pages: {
			onTheApprovalSrvListGenerated: ApprovalSrvListGenerated,
			onTheApprovalSrvObjectPageGenerated: ApprovalSrvObjectPageGenerated
        },
        async: true
    });

    return runner;
});

