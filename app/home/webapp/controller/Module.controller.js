
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/TextArea",
    "sap/m/VBox"
], function (
    Controller,
    JSONModel,
    MessageBox,
    MessageToast,
    Dialog,
    Button,
    Label,
    TextArea,
    VBox
) {
    "use strict";

    var MODULES = {
        projects: {
            title: "Projects",
            description: "View project delivery, clients and planned versus consumed hours.",
            entity: "ProjectSrv",
            columns: [
                ["PROJECT_CODE", "Project Code"],
                ["PROJECT_NAME", "Project Name"],
                ["PROJECT_STATUS", "Status"],
                ["BILLING_TYPE", "Billing Type"],
                ["PLANNED_HOURS", "Planned Hours"],
                ["CONSUMED_HOURS", "Consumed Hours"]
            ]
        },
        clients: {
            title: "Clients",
            description: "View client information and account status.",
            entity: "ClientSrv",
            columns: [
                ["CLIENT_NAME", "Client"],
                ["CLIENT_STATUS", "Status"],
                ["CONTACT_PERSON", "Contact Person"],
                ["EMAIL", "Email"],
                ["PHONE", "Phone"],
                ["CITY", "City"]
            ]
        },
        employees: {
            title: "Employees",
            description: "View employee details and active status.",
            entity: "EmployeeSrv",
            columns: [
                ["fullName", "Employee"],
                ["EMAIL", "Email"],
                ["JOB_TITLE", "Job Title"],
                ["PHONE_NUMBER", "Phone"],
                ["IS_MANAGER", "Manager"],
                ["IS_ACTIVE", "Active"]
            ]
        },
        timesheets: {
            title: "Timesheets",
            description: "View weekly timesheet periods, hours and submission status.",
            entity: "TimesheetSrv",
            columns: [
                ["WEEK_START", "Week Start"],
                ["WEEK_END", "Week End"],
                ["TOTAL_HOURS", "Total Hours"],
                ["STATUS", "Status"],
                ["REJECTION_REASON", "Rejection Reason"]
            ]
        },
        approvals: {
            title: "Timesheet Approvals",
            description: "Review submitted timesheets. Rejections require a reason.",
            entity: "ApprovalSrv",
            approvals: true,
            columns: [
                ["EMPLOYEE_NODE_KEY", "Employee Reference"],
                ["WEEK_START", "Week Start"],
                ["WEEK_END", "Week End"],
                ["TOTAL_HOURS", "Total Hours"],
                ["STATUS", "Status"]
            ]
        },
        tasks: {
            title: "Tasks",
            description: "Review task assignments and progress.",
            entity: "TaskSrv",
            columns: [
                ["TASK_NAME", "Task"],
                ["STATUS", "Status"],
                ["ESTIMATED_HOURS", "Estimated Hours"],
                ["ASSIGNEE_NODE_KEY", "Assignee Reference"],
                ["PROJECT_CODE", "Project Code"]
            ]
        },
        milestones: {
            title: "Milestones",
            description: "Track project milestones and delivery dates.",
            entity: "MilestoneSrv",
            columns: [
                ["MILESTONE_NAME", "Milestone"],
                ["START_DATE", "Start Date"],
                ["END_DATE", "End Date"],
                ["PROJECT_NODE_KEY", "Project Reference"]
            ]
        },
        budgets: {
            title: "Budgets",
            description: "Monitor budget amounts and consumption.",
            entity: "BudgetSrv",
            columns: [
                ["BUDGET_AMOUNT", "Budget Amount"],
                ["CONSUMED_AMOUNT", "Consumed Amount"],
                ["REMAINING_AMOUNT", "Remaining Amount"],
                ["CONSUMED_PERCENT", "Consumed %"],
                ["BUDGET_STATUS", "Budget Status"]
            ]
        },
        invoices: {
            title: "Invoices",
            description: "View invoice amounts, dates and payment status.",
            entity: "InvoiceSrv",
            columns: [
                ["INVOICE_NO", "Invoice Number"],
                ["INVOICE_DATE", "Invoice Date"],
                ["DUE_DATE", "Due Date"],
                ["GROSS_AMOUNT", "Gross Amount"],
                ["STATUS", "Status"]
            ]
        },
        alerts: {
            title: "Alerts",
            description: "Review project and budget alerts.",
            entity: "AlertSrv",
            columns: [
                ["TITLE", "Alert"],
                ["MESSAGE", "Details"],
                ["CRITICALITY", "Criticality"],
                ["CREATED_AT", "Created"]
            ]
        }
    };

    return Controller.extend("psaa.home.controller.Module", {

        onInit: function () {
            this._model = new JSONModel({
                title: "",
                description: "",
                tableTitle: "Records",
                message: "",
                showMessage: false,
                loading: false,
                isApprovals: false,
                recordCount: 0,
                columns: [],
                items: [],
                allItems: []
            });

            this.getView().setModel(this._model, "moduleModel");
            this._service = this.getOwnerComponent().getModel();
            this._router = this.getOwnerComponent().getRouter();

            this._router.getRoute("RouteModule").attachPatternMatched(
                this._onRouteMatched, this
            );
        },

        _onRouteMatched: function (event) {
            var key = event.getParameter("arguments").page;
            this._config = MODULES[key];

            if (!this._config) {
                MessageBox.error("This module is not configured.");
                this._router.navTo("RouteHome");
                return;
            }

            this._model.setProperty("/title", this._config.title);
            this._model.setProperty("/description", this._config.description);
            this._model.setProperty("/tableTitle", this._config.title);
            this._model.setProperty("/isApprovals", !!this._config.approvals);
            this._model.setProperty("/showMessage", false);
            this._model.setProperty("/columns",
                this._config.columns.map(function (column) {
                    return {
                        label: column[1],
                        visible: true
                    };
                })
            );

            this._loadData();
        },

        _loadData: async function () {
            if (!this._config || !this._service) {
                return;
            }

            this._model.setProperty("/loading", true);

            try {
                var binding = this._service.bindList(
                    "/" + this._config.entity
                );
                var contexts = await binding.requestContexts(0, 500);
                var records = contexts.map(function (context) {
                    return context.getObject();
                });

                var items = records.map(function (record) {
                    var values = this._config.columns.map(function (column) {
                        return this._formatValue(record[column[0]], column[0]);
                    }.bind(this));

                    var item = {
                        id: record.NODE_KEY,
                        raw: record,
                        status: String(record.STATUS || record.PROJECT_STATUS ||
                            record.CLIENT_STATUS || record.BUDGET_STATUS || ""),
                        statusState: this._statusState(
                            record.STATUS || record.PROJECT_STATUS ||
                            record.CLIENT_STATUS || record.BUDGET_STATUS
                        )
                    };

                    for (var i = 0; i < 6; i++) {
                        item["field" + (i + 1)] = values[i] || "";
                    }

                    return item;
                }.bind(this));

                this._model.setProperty("/allItems", items);
                this._model.setProperty("/items", items);
                this._model.setProperty("/recordCount", items.length);

                if (this._config.approvals && items.length === 0) {
                    this._model.setProperty(
                        "/message",
                        "There are no submitted timesheets awaiting approval."
                    );
                    this._model.setProperty("/showMessage", true);
                }
            } catch (error) {
                this._model.setProperty("/items", []);
                this._model.setProperty("/allItems", []);
                this._model.setProperty("/recordCount", 0);

                MessageBox.error(
                    "Unable to load " + this._config.title + ".\n\n" +
                    this._errorText(error)
                );
            } finally {
                this._model.setProperty("/loading", false);
            }
        },

        _formatValue: function (value, field) {
            if (value === null || value === undefined || value === "") {
                return "";
            }

            if (field === "fullName") {
                return String(value);
            }

            if (field === "IS_MANAGER" || field === "IS_ACTIVE") {
                return value ? "Yes" : "No";
            }

            if (typeof value === "object") {
                return "";
            }

            return String(value);
        },

        _statusState: function (status) {
            switch (String(status || "").toUpperCase().replace(/\s+/g, "_")) {
                case "ACTIVE":
                case "APPROVED":
                case "PAID":
                case "COMPLETED":
                case "DONE":
                case "WITHIN_BUDGET":
                    return "Success";
                case "SUBMITTED":
                case "DRAFT":
                case "IN_PROGRESS":
                case "ON_HOLD":
                case "AT_RISK":
                    return "Warning";
                case "REJECTED":
                case "CANCELLED":
                case "BREACHED":
                case "INACTIVE":
                    return "Error";
                default:
                    return "None";
            }
        },

        onModuleSearch: function (event) {
            var query = String(event.getParameter("newValue") || "")
                .trim().toLowerCase();

            var filtered = this._model.getProperty("/allItems").filter(
                function (item) {
                    return Object.keys(item.raw).some(function (key) {
                        var value = item.raw[key];
                        return value !== null &&
                            value !== undefined &&
                            typeof value !== "object" &&
                            String(value).toLowerCase().includes(query);
                    });
                }
            );

            this._model.setProperty("/items", filtered);
            this._model.setProperty("/recordCount", filtered.length);
        },

        onRefreshModule: function () {
            this._loadData();
        },

        onAcceptTimesheet: function (event) {
            var context = event.getSource().getBindingContext("moduleModel");
            var item = context && context.getObject();

            if (!item || !item.id) {
                MessageBox.error("Unable to identify the selected timesheet.");
                return;
            }

            MessageBox.confirm(
                "Accept this timesheet for approval?",
                {
                    title: "Accept Timesheet",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: async function (action) {
                        if (action !== MessageBox.Action.OK) {
                            return;
                        }

                        try {
                            var operation = this._service.bindContext(
                                "/ApprovalSrv(" + item.id + ")/approveTimesheet(...)"
                            );
                            await operation.execute();
                            MessageToast.show("Timesheet approved.");
                            await this._loadData();
                        } catch (error) {
                            MessageBox.error(
                                "Could not approve the timesheet.\n\n" +
                                this._errorText(error)
                            );
                        }
                    }.bind(this)
                }
            );
        },

        onRejectTimesheet: function (event) {
            var context = event.getSource().getBindingContext("moduleModel");
            var item = context && context.getObject();

            if (!item || !item.id) {
                MessageBox.error("Unable to identify the selected timesheet.");
                return;
            }

            var reasonInput = new TextArea(
                this.createId("rejectionReasonInput"),
                {
                    width: "100%",
                    rows: 4,
                    maxLength: 255,
                    placeholder: "Enter the reason for rejection (required)"
                }
            );

            var dialog;
            dialog = new Dialog({
                title: "Reject Timesheet",
                contentWidth: "32rem",
                content: [
                    new VBox({
                        width: "100%",
                        class: "sapUiMediumMargin",
                        items: [
                            new Label({
                                text: "Rejection Reason (required)",
                                labelFor: reasonInput,
                                required: true
                            }),
                            reasonInput
                        ]
                    })
                ],
                beginButton: new Button({
                    text: "Reject",
                    type: "Reject",
                    press: async function () {
                        var reason = reasonInput.getValue().trim();

                        if (!reason) {
                            MessageBox.warning(
                                "Please enter a rejection reason before continuing."
                            );
                            return;
                        }

                        try {
                            var operation = this._service.bindContext(
                                "/ApprovalSrv(" + item.id + ")/rejectTimesheet(...)"
                            );
                            operation.setParameter("reason", reason);
                            await operation.execute();

                            dialog.close();
                            MessageToast.show("Timesheet rejected.");
                            await this._loadData();
                        } catch (error) {
                            MessageBox.error(
                                "Could not reject the timesheet.\n\n" +
                                this._errorText(error)
                            );
                        }
                    }.bind(this)
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

            this.getView().addDependent(dialog);
            dialog.open();
        },

        _errorText: function (error) {
            return error && error.message
                ? error.message
                : "Unexpected service error.";
        },

        onBackToDashboard: function () {
            this._router.navTo("RouteHome");
        },

        onExit: function () {
            if (this._router) {
                this._router.getRoute("RouteModule")
                    .detachPatternMatched(this._onRouteMatched, this);
            }

            if (this._model) {
                this._model.destroy();
            }
        }
    });
});
