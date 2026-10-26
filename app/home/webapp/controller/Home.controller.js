
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Select",
    "sap/m/DatePicker",
    "sap/ui/core/Item",
    "sap/m/ToolbarSpacer"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Dialog,
    Button,
    Label,
    Input,
    VBox,
    HBox,
    Select,
    DatePicker,
    Item,
    ToolbarSpacer
) {
    "use strict";

    return Controller.extend("psaa.home.controller.Home", {

        // ==========================================
        // INITIALIZATION
        // ==========================================

        onInit: function () {
            this._oViewModel = new JSONModel({
                connectionStatus: "Connecting",
                connectionState: "Information",
                lastUpdated: "",
                projectCount: 0,
                projects: [],
                allProjects: [],
                kpis: {
                    activeProjects: 0,
                    atRiskBudgets: 0,
                    pendingApprovals: 0,
                    draftInvoices: 0,
                    overdueAmount: 0
                }
            });

            this.getView().setModel(
                this._oViewModel,
                "viewModel"
            );

            this._oServiceModel =
                this.getOwnerComponent().getModel();

            this._oRouter =
                this.getOwnerComponent().getRouter();

            if (!this._oServiceModel) {
                this._setConnectionStatus(
                    "Service model unavailable",
                    "Error"
                );
                return;
            }

            this._loadDashboard();
        },

        // ==========================================
        // DASHBOARD DATA
        // ==========================================

        _setConnectionStatus: function (text, state) {
            this._oViewModel.setProperty(
                "/connectionStatus",
                text
            );

            this._oViewModel.setProperty(
                "/connectionState",
                state
            );
        },

        _getErrorMessage: function (error) {
            return error && error.message
                ? error.message
                : "An unexpected service error occurred.";
        },

        _number: function (value) {
            var result = Number(value);
            return Number.isFinite(result) ? result : 0;
        },

        _loadDashboard: async function () {
            this._setConnectionStatus(
                "Loading dashboard",
                "Information"
            );

            try {
                await Promise.all([
                    this._loadKpis(),
                    this._loadProjects()
                ]);

                this._oViewModel.setProperty(
                    "/lastUpdated",
                    "Last refreshed: " +
                        new Date().toLocaleString()
                );

                this._setConnectionStatus(
                    "Connected",
                    "Success"
                );
            } catch (error) {
                this._setConnectionStatus(
                    "Data loading failed",
                    "Error"
                );

                MessageBox.error(
                    "Unable to load dashboard information.\n\n" +
                    this._getErrorMessage(error)
                );
            }
        },

        _readEntitySet: async function (entitySet) {
            var binding = this._oServiceModel.bindList(
                "/" + entitySet
            );

            var contexts = await binding.requestContexts(
                0,
                500
            );

            return contexts.map(function (context) {
                return context.getObject();
            });
        },

        _loadKpis: async function () {
            var operation =
                this._oServiceModel.bindContext("/kpis(...)");

            await operation.execute();

            var result =
                operation.getBoundContext().getObject() || {};

            this._oViewModel.setProperty("/kpis", {
                activeProjects: this._number(
                    result.activeProjects
                ),
                atRiskBudgets: this._number(
                    result.atRiskBudgets
                ),
                pendingApprovals: this._number(
                    result.pendingApprovals
                ),
                draftInvoices: this._number(
                    result.draftInvoices
                ),
                overdueAmount: this._number(
                    result.overdueAmount
                )
            });
        },

        // ==========================================
        // PROJECT TABLE
        // ==========================================

        _loadProjects: async function () {
            var results = await Promise.all([
                this._readEntitySet("ProjectSrv"),
                this._readEntitySet("ClientSrv")
            ]);

            var projects = results[0];
            var clients = results[1];
            var clientMap = {};

            clients.forEach(function (client) {
                clientMap[client.NODE_KEY] =
                    client.CLIENT_NAME || "";
            });

            var formattedProjects = projects.map(
                function (project) {
                    var planned = this._number(
                        project.PLANNED_HOURS
                    );

                    var consumed = this._number(
                        project.CONSUMED_HOURS
                    );

                    var burn = planned > 0
                        ? Math.min(
                            100,
                            (consumed / planned) * 100
                        )
                        : 0;

                    var status =
                        project.PROJECT_STATUS || "";

                    return {
                        id: project.NODE_KEY,
                        code: project.PROJECT_CODE || "",
                        name: project.PROJECT_NAME || "",
                        clientName:
                            clientMap[project.CLIENT_NODE_KEY] || "",
                        billingType: project.BILLING_TYPE || "",
                        status: status,
                        statusState: this._statusState(status),
                        plannedHours: planned,
                        consumedHours: consumed,
                        hoursBurn: burn,
                        hoursBurnText: burn.toFixed(1) + "%",
                        hoursBurnState: burn >= 100
                            ? "Error"
                            : burn >= 75
                                ? "Warning"
                                : "Success"
                    };
                }.bind(this)
            );

            this._oViewModel.setProperty(
                "/allProjects",
                formattedProjects
            );

            this._oViewModel.setProperty(
                "/projects",
                formattedProjects
            );

            this._oViewModel.setProperty(
                "/projectCount",
                formattedProjects.length
            );
        },

        _statusState: function (status) {
            switch (
                String(status).toUpperCase().replace(/\s+/g, "_")
            ) {
                case "ACTIVE":
                case "IN_PROGRESS":
                case "COMPLETED":
                    return "Success";

                case "ON_HOLD":
                case "DRAFT":
                    return "Warning";

                case "CANCELLED":
                case "REJECTED":
                    return "Error";

                default:
                    return "None";
            }
        },

        onRefresh: function () {
            this._loadDashboard();
        },

        onProjectSearch: function (event) {
            this._applyProjectFilters(
                event.getParameter("newValue")
            );
        },

        onProjectStatusChange: function () {
            this._applyProjectFilters();
        },

        _applyProjectFilters: function (searchText) {
            var search = searchText;

            if (search === undefined) {
                search = this.byId(
                    "projectSearchField"
                ).getValue();
            }

            var selectedStatus = this.byId(
                "projectStatusFilter"
            ).getSelectedKey();

            var normalizedSearch =
                String(search || "").toLowerCase();

            var filtered = this._oViewModel
                .getProperty("/allProjects")
                .filter(function (project) {
                    var matchesSearch =
                        project.code.toLowerCase().includes(
                            normalizedSearch
                        ) ||
                        project.name.toLowerCase().includes(
                            normalizedSearch
                        ) ||
                        project.clientName.toLowerCase().includes(
                            normalizedSearch
                        );

                    var normalizedStatus = String(
                        project.status
                    ).toUpperCase().replace(/\s+/g, "_");

                    var matchesStatus =
                        selectedStatus === "ALL" ||
                        normalizedStatus === selectedStatus;

                    return matchesSearch && matchesStatus;
                });

            this._oViewModel.setProperty(
                "/projects",
                filtered
            );

            this._oViewModel.setProperty(
                "/projectCount",
                filtered.length
            );
        },

        // ==========================================
        // SIDEBAR
        // ==========================================

        onToggleSidebar: function () {
            var toolPage = this.byId("managerToolPage");

            if (toolPage) {
                toolPage.setSideExpanded(
                    !toolPage.getSideExpanded()
                );
            }
        },

        

onNavigationSelect: function (event) {
    var item = event.getParameter("item");
    var key = item && item.getKey();

    if (!key) {
        return;
    }

    if (key === "dashboard") {
        this._oRouter.navTo("RouteHome");
        return;
    }

    if (key === "refresh") {
        this.onRefresh();
        return;
    }

    var applications = {
        projects: "psaa.projects",
        clients: "psaa.clients",
        employees: "psaa.employees",
        timesheets: "psaa.timesheets",
        approvals: "psaa.approvals",
        tasks: "psaa.tasks",
        milestones: "psaa.milestones",
        budgets: "psaa.budgets",
        invoices: "psaa.invoices",
        alerts: "psaa.alerts"
    };

    var appId = applications[key];

    if (appId) {
        window.location.href =
            "/" + appId +
            "/index.html?sap-ui-xx-viewCache=false";
    }
},


        // ==========================================
        // PROJECT SELECTION
        // ==========================================

        onProjectSelect: function (event) {
            var context = event.getSource()
                .getBindingContext("viewModel");

            if (context) {
                this._openProjectDetails(
                    context.getObject()
                );
            }
        },

        onProjectOpen: function (event) {
            var context = event.getSource()
                .getBindingContext("viewModel");

            if (context) {
                this._openProjectDetails(
                    context.getObject()
                );
            }
        },

        
_openProjectDetails: function (project) {
    if (!project || !project.id) {
        MessageToast.show("Unable to identify the selected project.");
        return;
    }

    var projectId = encodeURIComponent(project.id);

    // ProjectSrv is draft-enabled, so its key also includes IsActiveEntity.
    window.location.href =
        "/psaa.projects/index.html#/ProjectSrv(NODE_KEY=" +
        projectId +
        ",IsActiveEntity=true)";
},

        // ==========================================
        // CREATE PROJECT FORM
        // ==========================================

        onCreateProject: async function () {
            try {
                var results = await Promise.all([
                    this._readEntitySet("ClientSrv"),
                    this._readEntitySet("EmployeeSrv")
                ]);

                this._openCreateProjectDialog(
                    results[0],
                    results[1]
                );
            } catch (error) {
                MessageBox.error(
                    "Unable to load clients and managers for the project form.\n\n" +
                    this._getErrorMessage(error)
                );
            }
        },

        _openCreateProjectDialog: function (
            clients,
            employees
        ) {
            var codeInput = new Input(
                this.createId("newProjectCodeInput"),
                {
                    width: "100%",
                    placeholder: "e.g. PSA-004"
                }
            );

            var nameInput = new Input(
                this.createId("newProjectNameInput"),
                {
                    width: "100%",
                    placeholder: "Project name"
                }
            );

            var clientSelect = new Select(
                this.createId("newProjectClientSelect"),
                {
                    width: "100%",
                    items: clients.map(function (client) {
                        return new Item({
                            key: client.NODE_KEY,
                            text: client.CLIENT_NAME || client.NODE_KEY
                        });
                    })
                }
            );

            var managerSelect = new Select(
                this.createId("newProjectManagerSelect"),
                {
                    width: "100%",
                    items: employees
                        .filter(function (employee) {
                            return employee.IS_ACTIVE !== false;
                        })
                        .map(function (employee) {
                            return new Item({
                                key: employee.NODE_KEY,
                                text:
                                    (employee.FIRST_NAME || "") +
                                    " " +
                                    (employee.LAST_NAME || "")
                            });
                        })
                }
            );

            var statusSelect = new Select(
                this.createId("newProjectStatusSelect"),
                {
                    width: "100%",
                    selectedKey: "Draft",
                    items: [
                        new Item({ key: "Draft", text: "Draft" }),
                        new Item({ key: "Active", text: "Active" }),
                        new Item({ key: "On Hold", text: "On Hold" })
                    ]
                }
            );

            var billingSelect = new Select(
                this.createId("newProjectBillingSelect"),
                {
                    width: "100%",
                    selectedKey: "T&M",
                    items: [
                        new Item({ key: "Fixed", text: "Fixed" }),
                        new Item({ key: "T&M", text: "Time and Materials" }),
                        new Item({ key: "Retainer", text: "Retainer" })
                    ]
                }
            );

            var startDate = new DatePicker(
                this.createId("newProjectStartDate"),
                {
                    width: "100%",
                    valueFormat: "yyyy-MM-dd",
                    displayFormat: "medium"
                }
            );

            var endDate = new DatePicker(
                this.createId("newProjectEndDate"),
                {
                    width: "100%",
                    valueFormat: "yyyy-MM-dd",
                    displayFormat: "medium"
                }
            );

            var plannedHours = new Input(
                this.createId("newProjectPlannedHours"),
                {
                    width: "100%",
                    type: "Number",
                    placeholder: "Planned hours"
                }
            );

            var form = new VBox({
                width: "100%",
                class: "sapUiMediumMargin",
                items: [
                    new Label({
                        text: "Project Code",
                        labelFor: codeInput
                    }),
                    codeInput,

                    new Label({
                        text: "Project Name",
                        labelFor: nameInput
                    }),
                    nameInput,

                    new Label({
                        text: "Client",
                        labelFor: clientSelect
                    }),
                    clientSelect,

                    new Label({
                        text: "Project Manager",
                        labelFor: managerSelect
                    }),
                    managerSelect,

                    new Label({
                        text: "Status",
                        labelFor: statusSelect
                    }),
                    statusSelect,

                    new Label({
                        text: "Billing Type",
                        labelFor: billingSelect
                    }),
                    billingSelect,

                    new Label({
                        text: "Start Date",
                        labelFor: startDate
                    }),
                    startDate,

                    new Label({
                        text: "End Date",
                        labelFor: endDate
                    }),
                    endDate,

                    new Label({
                        text: "Planned Hours",
                        labelFor: plannedHours
                    }),
                    plannedHours
                ]
            });

            var dialog;

            dialog = new Dialog({
                title: "Create Project",
                contentWidth: "34rem",
                contentHeight: "75%",
                verticalScrolling: true,
                horizontalScrolling: false,
                content: [form],

                beginButton: new Button({
                    text: "Save",
                    type: "Emphasized",
                    press: async function () {
                        var code = codeInput.getValue().trim();
                        var name = nameInput.getValue().trim();
                        var hours = Number(
                            plannedHours.getValue()
                        );
                        var start = startDate.getValue();
                        var end = endDate.getValue();

                        if (!code || !name) {
                            MessageBox.warning(
                                "Enter the project code and project name."
                            );
                            return;
                        }

                        if (
                            !clientSelect.getSelectedKey() ||
                            !managerSelect.getSelectedKey()
                        ) {
                            MessageBox.warning(
                                "Select a client and project manager."
                            );
                            return;
                        }

                        if (
                            !start ||
                            !end ||
                            end < start
                        ) {
                            MessageBox.warning(
                                "Enter valid start and end dates. The end date must not precede the start date."
                            );
                            return;
                        }

                        if (!Number.isFinite(hours) || hours <= 0) {
                            MessageBox.warning(
                                "Planned hours must be greater than zero."
                            );
                            return;
                        }

                        var action = this._oServiceModel
                            .bindContext("/createProjects(...)");

                        action.setParameter("projects", [{
                            PROJECT_CODE: code,
                            PROJECT_NAME: name,
                            PROJECT_STATUS: statusSelect.getSelectedKey(),
                            BILLING_TYPE: billingSelect.getSelectedKey(),
                            START_DATE: start,
                            END_DATE: end,
                            PLANNED_HOURS: hours,
                            CLIENT_ID: clientSelect.getSelectedKey(),
                            MANAGER_ID: managerSelect.getSelectedKey()
                        }]);

                        try {
                            await action.execute();

                            dialog.close();

                            MessageToast.show(
                                "Project creation request completed."
                            );

                            await this._loadDashboard();
                        } catch (error) {
                            MessageBox.error(
                                "The project could not be created.\n\n" +
                                this._getErrorMessage(error)
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

        // ==========================================
        // CLEANUP
        // ==========================================

        onExit: function () {
            if (this._oViewModel) {
                this._oViewModel.destroy();
            }
        }
    });
});
