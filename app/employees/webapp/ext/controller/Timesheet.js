
sap.ui.define([
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/DatePicker",
    "sap/m/Select",
    "sap/m/Input",
    "sap/m/CheckBox",
    "sap/m/TextArea",
    "sap/m/VBox",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Item",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Dialog,
    Button,
    Label,
    DatePicker,
    Select,
    Input,
    CheckBox,
    TextArea,
    VBox,
    MessageBox,
    MessageToast,
    Item,
    Filter,
    FilterOperator
) {
    "use strict";

    function toISO(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function mondayOf(date) {
        var monday = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );

        var day = monday.getDay();

        monday.setDate(
            monday.getDate() - (day === 0 ? 6 : day - 1)
        );

        return monday;
    }

    function parseLocalDate(value) {
        var parts = value.split("-").map(Number);

        return new Date(
            parts[0],
            parts[1] - 1,
            parts[2]
        );
    }

    function showError(message) {
        MessageBox.error(message);
    }

    return {
        onCreateTimesheet: async function (employeeContext) {
            if (
                !employeeContext ||
                typeof employeeContext.getProperty !== "function"
            ) {
                showError(
                    "Could not identify the employee on the current page. " +
                    "Please refresh the page and try again."
                );
                return;
            }

            var employeeID = employeeContext.getProperty("NODE_KEY");
            var model = employeeContext.getModel();

            if (!employeeID) {
                showError("The employee ID could not be found.");
                return;
            }

            var tasks;

            try {
                var taskBinding = model.bindList(
                    "/TaskSrv",
                    undefined,
                    undefined,
                    [
                        new Filter(
                            "ASSIGNEE_NODE_KEY",
                            FilterOperator.EQ,
                            employeeID
                        )
                    ],
                    {
                        $select: [
                            "NODE_KEY",
                            "TASK_NAME",
                            "STATUS",
                            "ASSIGNEE_NODE_KEY"
                        ]
                    }
                );

                try {
                    var taskContexts =
                        await taskBinding.requestContexts(0, 500);

                    tasks = taskContexts
                        .map(function (context) {
                            return context.getObject();
                        })
                        .filter(function (task) {
                            return task.STATUS !== "Done";
                        });
                } finally {
                    taskBinding.destroy();
                }
            } catch (error) {
                showError(
                    "Unable to load this employee's assigned tasks.\n\n" +
                    (error.message ||
                        "Please check the application logs.")
                );
                return;
            }

            if (!tasks.length) {
                MessageBox.information(
                    "This employee has no available assigned tasks. " +
                    "Assign a task before creating a timesheet."
                );
                return;
            }

            var today = new Date();
            var defaultMonday = mondayOf(today);

            var weekStartPicker = new DatePicker({
                width: "100%",
                value: toISO(defaultMonday),
                valueFormat: "yyyy-MM-dd",
                displayFormat: "medium"
            });

            var entryRows = [];

            var entriesContainer = new VBox({
                width: "100%"
            });

            var dialog;
            var submitButton;

            function createEntryRow() {
                var taskSelect = new Select({
                    width: "100%",
                    selectedKey: tasks[0].NODE_KEY,
                    items: tasks.map(function (task) {
                        return new Item({
                            key: task.NODE_KEY,
                            text: task.TASK_NAME
                        });
                    })
                });

                var workDate = new DatePicker({
                    width: "100%",
                    value: weekStartPicker.getValue(),
                    valueFormat: "yyyy-MM-dd",
                    displayFormat: "medium"
                });

                var hours = new Input({
                    width: "100%",
                    type: "Number",
                    placeholder: "Hours, e.g. 2.5"
                });

                var billable = new CheckBox({
                    text: "Billable",
                    selected: true
                });

                var notes = new TextArea({
                    width: "100%",
                    rows: 2,
                    maxLength: 255,
                    placeholder: "Notes (optional)"
                });

                var row = new VBox({
                    width: "100%",
                    items: [
                        new Label({ text: "Task" }),
                        taskSelect,

                        new Label({ text: "Work Date" }),
                        workDate,

                        new Label({ text: "Hours" }),
                        hours,

                        billable,

                        new Label({ text: "Notes" }),
                        notes
                    ]
                }).addStyleClass("sapUiSmallMarginBottom");

                var entry = {
                    taskSelect: taskSelect,
                    workDate: workDate,
                    hours: hours,
                    billable: billable,
                    notes: notes,
                    row: row
                };

                entryRows.push(entry);
                entriesContainer.addItem(row);
            }

            createEntryRow();

            var addEntryButton = new Button({
                text: "Add Entry",
                icon: "sap-icon://add",
                press: createEntryRow
            });

            weekStartPicker.attachChange(function (event) {
                var value = event.getSource().getValue();

                if (
                    !event.getSource().isValidValue() ||
                    !value
                ) {
                    return;
                }

                var selectedDate = parseLocalDate(value);

                if (selectedDate.getDay() !== 1) {
                    return;
                }

                entryRows.forEach(function (entry) {
                    if (!entry.workDate.getValue()) {
                        entry.workDate.setValue(value);
                    }
                });
            });

            dialog = new Dialog({
                title: "Create Timesheet",
                contentWidth: "36rem",
                contentHeight: "70%",
                verticalScrolling: true,
                horizontalScrolling: false,
                stretchOnPhone: true,

                content: [
                    new VBox({
                        width: "100%",
                        items: [
                            new Label({
                                text: "Week Start (Monday)"
                            }),
                            weekStartPicker,
                            addEntryButton,
                            entriesContainer
                        ]
                    }).addStyleClass("sapUiMediumMargin")
                ],

                beginButton: new Button({
                    text: "Create Timesheet",
                    type: "Emphasized",

                    press: async function () {
                        var weekStartValue =
                            weekStartPicker.getValue();

                        if (
                            !weekStartPicker.isValidValue() ||
                            !weekStartValue
                        ) {
                            showError(
                                "Please select a valid week start date."
                            );
                            return;
                        }

                        var weekStartDate =
                            parseLocalDate(weekStartValue);

                        if (weekStartDate.getDay() !== 1) {
                            showError(
                                "Week Start must be a Monday."
                            );
                            return;
                        }

                        var weekEndDate = new Date(weekStartDate);

                        weekEndDate.setDate(
                            weekEndDate.getDate() + 6
                        );

                        var entries = [];
                        var seen = new Set();
                        var dailyHours = {};

                        for (var entry of entryRows) {
                            var taskID =
                                entry.taskSelect.getSelectedKey();

                            var dateValue =
                                entry.workDate.getValue();

                            var hoursValue = Number(
                                entry.hours.getValue()
                            );

                            if (
                                !taskID ||
                                !entry.workDate.isValidValue() ||
                                !dateValue ||
                                !Number.isFinite(hoursValue) ||
                                hoursValue < 0.25 ||
                                hoursValue > 24
                            ) {
                                showError(
                                    "Each entry needs a task, a valid work " +
                                    "date, and hours between 0.25 and 24."
                                );
                                return;
                            }

                            var workDate =
                                parseLocalDate(dateValue);

                            if (
                                workDate < weekStartDate ||
                                workDate > weekEndDate
                            ) {
                                showError(
                                    "Every work date must fall within " +
                                    "the selected week."
                                );
                                return;
                            }

                            var duplicateKey =
                                dateValue + "|" + taskID;

                            if (seen.has(duplicateKey)) {
                                showError(
                                    "The same task cannot be entered " +
                                    "twice on the same date."
                                );
                                return;
                            }

                            seen.add(duplicateKey);

                            dailyHours[dateValue] =
                                (dailyHours[dateValue] || 0) +
                                hoursValue;

                            if (dailyHours[dateValue] > 24) {
                                showError(
                                    "Total hours for one day cannot " +
                                    "exceed 24."
                                );
                                return;
                            }

                            entries.push({
                                WORK_DATE: dateValue,
                                HOURS: hoursValue,
                                IS_BILLABLE:
                                    entry.billable.getSelected(),
                                NOTES: entry.notes.getValue().trim(),
                                TASK_ID: taskID
                            });
                        }

                        if (!entries.length) {
                            showError(
                                "Add at least one timesheet entry."
                            );
                            return;
                        }

                        var action;

                        try {
                            submitButton.setEnabled(false);
                            dialog.setBusy(true);

                            action = model.bindContext(
                                "/createTimesheet(...)"
                            );

                            action.setParameter(
                                "employeeID",
                                employeeID
                            );

                            action.setParameter(
                                "weekStart",
                                weekStartValue
                            );

                            action.setParameter(
                                "entries",
                                entries
                            );

                            await action.execute();

                            dialog.close();

                            MessageToast.show(
                                "Timesheet created successfully."
                            );

                            var pageBinding =
                                employeeContext.getBinding();

                            if (
                                pageBinding &&
                                typeof pageBinding.refresh === "function"
                            ) {
                                await pageBinding.refresh();
                            }
                        } catch (error) {
                            showError(
                                "Could not create the timesheet.\n\n" +
                                (error.message ||
                                    "Please check the backend response.")
                            );
                        } finally {
                            if (action) {
                                action.destroy();
                            }

                            if (dialog && !dialog.isDestroyed()) {
                                dialog.setBusy(false);
                                submitButton.setEnabled(true);
                            }
                        }
                    }
                }),

                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        dialog.close();
                    }
                }),

                afterClose: function () {
                    dialog.destroy();
                }
            });

            submitButton = dialog.getBeginButton();
            dialog.open();
        },

        onSubmitSelectedTimesheet: async function (
            oContext,
            aSelectedContexts
        ) {
            if (
                !Array.isArray(aSelectedContexts) ||
                aSelectedContexts.length !== 1
            ) {
                showError(
                    "Please select exactly one timesheet from Timesheet History."
                );
                return;
            }

            var timesheetContext = aSelectedContexts[0];
            var status = timesheetContext.getProperty("STATUS");

            if (status !== "Draft" && status !== "Rejected") {
                MessageBox.warning(
                    "Only Draft or Rejected timesheets can be submitted."
                );
                return;
            }

            MessageBox.confirm(
                "Are you sure you want to submit this timesheet?",
                {
                    title: "Submit Timesheet",
                    actions: [
                        MessageBox.Action.OK,
                        MessageBox.Action.CANCEL
                    ],
                    emphasizedAction: MessageBox.Action.OK,

                    onClose: async function (selectedAction) {
                        if (selectedAction !== MessageBox.Action.OK) {
                            return;
                        }

                        var actionBinding;

                        try {
                            var model = timesheetContext.getModel();

                            actionBinding = model.bindContext(
                                "submitTimesheet(...)",
                                timesheetContext
                            );

                            await actionBinding.execute();
                            await timesheetContext.requestRefresh();

                            MessageToast.show(
                                "Timesheet submitted successfully."
                            );
                        } catch (error) {
                            showError(
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
