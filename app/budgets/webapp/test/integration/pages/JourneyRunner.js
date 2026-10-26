sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"psaa/budgets/test/integration/pages/BudgetSrvList.gen",
	"psaa/budgets/test/integration/pages/BudgetSrvObjectPage.gen"
], function (JourneyRunner, BudgetSrvListGenerated, BudgetSrvObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('psaa/budgets') + '/test/flp.html#app-preview',
        pages: {
			onTheBudgetSrvListGenerated: BudgetSrvListGenerated,
			onTheBudgetSrvObjectPageGenerated: BudgetSrvObjectPageGenerated
        },
        async: true
    });

    return runner;
});

