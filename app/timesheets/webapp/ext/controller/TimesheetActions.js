
sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (MessageBox, MessageToast) {
    "use strict";

    return {
        onSubmitTimesheet: async function (timesheetContext) {
            if (
                !timesheetContext ||
                typeof timesheetContext.getProperty !== "function"
            ) {
                MessageBox.error(
                    "Could not identify the timesheet. Please open a timesheet and try again."
                );
                return;
            }

            var status = timesheetContext.getProperty("STATUS");

            if (status !== "Draft" && status !== "Rejected") {
                MessageBox.information(
                    "Only Draft or Rejected timesheets can be submitted."
                );
                return;
            }

            MessageBox.confirm(
                "Are you sure you want to submit this timesheet for approval?",
                {
                    title: "Submit Timesheet",
                    actions: [
                        MessageBox.Action.OK,
                        MessageBox.Action.CANCEL
                    ],
                    emphasizedAction: MessageBox.Action.OK,

                    onClose: async function (action) {
                        if (action !== MessageBox.Action.OK) {
                            return;
                        }

                        var model = timesheetContext.getModel();
                        var actionBinding;

                        try {
                            // Bound actions must use the namespace-qualified name.
                            actionBinding = model.bindContext(
                                "PSAService.submitTimesheet(...)",
                                timesheetContext
                            );

                            await actionBinding.execute();

                            MessageToast.show(
                                "Timesheet submitted for approval."
                            );

                            var pageBinding =
                                timesheetContext.getBinding();

                            if (
                                pageBinding &&
                                typeof pageBinding.refresh === "function"
                            ) {
                                await pageBinding.refresh();
                            }
                        } catch (error) {
                            MessageBox.error(
                                "Could not submit the timesheet.\n\n" +
                                (error.message ||
                                    "Please check the backend response.")
                            );
                        } finally {
                            if (actionBinding) {
                                actionBinding.destroy();
                            }
                        }
                    }
                }
            );
        }
    };
});
