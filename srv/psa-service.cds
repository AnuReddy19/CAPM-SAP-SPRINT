
using { psaa.db as database } from '../db/schema';
using { psaa.common as common } from '../db/common';

// =====================================================
// 1. BULK INPUT TYPES
// =====================================================

type CreateEmployeesIP : array of {
    FIRST_NAME    : common.String60;
    LAST_NAME     : common.String60;
    EMAIL         : common.Email;
    PHONE_NUMBER  : common.PhoneNo;
    JOB_TITLE     : common.String100;
    CURRENCY_CODE : common.CurrencyCode;
    HOURLY_RATE   : common.Amount;
    IS_MANAGER    : Boolean;
    IS_ACTIVE     : Boolean;
    MANAGER_ID    : UUID;
};

type CreateClientsIP : array of {
    CLIENT_NAME    : common.String100;
    CLIENT_STATUS  : common.ClientStatus;
    CONTACT_PERSON : common.String100;
    EMAIL          : common.Email;
    PHONE          : common.PhoneNo;
    STREET         : common.String255;
    BUILDING       : common.String60;
    CITY           : common.String100;
    POSTAL_CODE    : common.String20;
    COUNTRY        : common.String60;
};

type CreateProjectsIP : array of {
    PROJECT_CODE   : common.String32;
    PROJECT_NAME   : common.String100;
    PROJECT_STATUS : common.ProjectStatus;
    BILLING_TYPE   : common.BillingType;
    START_DATE     : Date;
    END_DATE       : Date;
    PLANNED_HOURS  : common.Hours;
    CLIENT_ID      : UUID;
    MANAGER_ID     : UUID;
};

type CreateBudgetsIP : array of {
    BUDGET_AMOUNT : common.Amount;
    BILLING_RATE  : common.Amount;
    RETAINER_FEE  : common.Amount;
    CURRENCY_CODE : common.CurrencyCode;
    PROJECT_ID    : UUID;
};

type CreateMilestonesIP : array of {
    MILESTONE_NAME : common.String100;
    START_DATE     : Date;
    END_DATE       : Date;
    PROJECT_ID     : UUID;
};

type CreateTasksIP : array of {
    TASK_NAME       : common.String100;
    STATUS          : common.TaskStatus;
    ESTIMATED_HOURS : common.Hours;
    MILESTONE_ID    : UUID;
    ASSIGNEE_ID     : UUID;
};

type CreateTimesheetsIP : array of {
    WEEK_START  : Date;
    WEEK_END    : Date;
    EMPLOYEE_ID : UUID;
};

type CreateTimesheetEntriesIP : array of {
    WORK_DATE   : Date;
    HOURS       : Decimal(4,2);
    IS_BILLABLE : Boolean;
    NOTES       : common.String255;
    TASK_ID     : UUID;
    PARENT_ID   : UUID;
};


type CreateInvoicesIP : array of {
    INVOICE_NO   : common.String32;
    PERIOD_FROM  : Date;
    PERIOD_TO    : Date;
    INVOICE_DATE : Date;
    PROJECT_ID   : UUID;
};

// =====================================================
// 2. FUNCTION RETURN TYPES
// =====================================================

type WhoAmI {
    user       : String(255);
    name       : String(255);
    email      : String(255);
    origin     : String(100);
    isAdmin    : Boolean;
    isUser     : Boolean;
    scopes     : array of String(255);
    employeeID : UUID;
    message    : String(255);
};

type Kpis {
    myOpenTimesheets : Integer;
    pendingApprovals : Integer;
    atRiskBudgets    : Integer;
    activeProjects   : Integer;
    draftInvoices    : Integer;
    unbilledHours    : common.Hours;
    overdueInvoices  : Integer;
    overdueAmount    : common.Amount;
    clients          : Integer;
    employees        : Integer;
};

// =====================================================
// 3. PSA SERVICE
// =====================================================

@path: '/psa'
//@requires: 'authenticated-user'
service PSAService {

    // -------------------------------------------------
    // CLIENTS
    // -------------------------------------------------

    @odata.draft.enabled
    // @restrict: [
    //     { grant: '*', to: 'PSA_Admin' }
    // ]
    entity ClientSrv as projection on database.master.Clients;

    // -------------------------------------------------
    // EMPLOYEES
    // -------------------------------------------------

    @odata.draft.enabled
    // @restrict: [
    //     { grant: '*', to: 'PSA_Admin' },
    //     { grant: 'READ', to: 'PSA_User', where: 'EMAIL = $user' }
    // ]
    entity EmployeeSrv as projection on database.master.Employees {
        *,
        virtual fullName : String(121)
    };

    // -------------------------------------------------
    // PROJECTS
    // -------------------------------------------------

    @odata.draft.enabled
    // @restrict: [
    //     { grant: '*', to: 'PSA_Admin' }
    // ]
    entity ProjectSrv as projection on database.transaction.Projects {
        *,
        virtual HOURS_PERCENT : common.Percentage
    } actions {
        action recalculateBudget() returns String;
    };

    // -------------------------------------------------
    // BUDGETS
    // -------------------------------------------------

    // @restrict: [
    //     { grant: '*', to: 'PSA_Admin' }
    // ]
    entity BudgetSrv as projection on database.transaction.Budgets {
        *,
        virtual CRITICALITY : Integer
    };

    // -------------------------------------------------
    // MILESTONES
    // -------------------------------------------------

    // @restrict: [
    //     { grant: '*', to: 'PSA_Admin' }
    // ]
    entity MilestoneSrv as projection on database.transaction.Milestones;

    // -------------------------------------------------
    // TASKS
    // -------------------------------------------------

    // @restrict: [
    //     { grant: 'READ', to: 'PSA_User' },
    //     { grant: '*', to: 'PSA_Admin' }
    // ]
    entity TaskSrv as projection on database.transaction.Tasks {
        *,
        virtual PROJECT_CODE : common.String32,
        virtual CRITICALITY  : Integer
    };

    // -------------------------------------------------
    // TIMESHEETS
    // -------------------------------------------------

    @odata.draft.enabled
    // @restrict: [
    //     { grant: '*', to: 'PSA_Admin' },
    //     {
    //         grant: ['READ', 'CREATE', 'UPDATE', 'DELETE'],
    //         to: 'PSA_User',
    //         where: 'EMPLOYEE.EMAIL = $user'
    //     }
    // ]
    entity TimesheetSrv as projection on database.transaction.Timesheets {
        *,
        virtual STATUS_CRITICALITY : Integer,
        virtual IS_LOCKED           : Boolean
    } actions {
        action submitTimesheet() returns String;
    };

    // -------------------------------------------------
    // TIMESHEET ENTRIES
    // -------------------------------------------------

    // @restrict: [
    //     {
    //         grant: ['READ', 'CREATE', 'UPDATE', 'DELETE'],
    //         to: 'PSA_User',
    //         where: 'PARENT.EMPLOYEE.EMAIL = $user'
    //     },
    //     { grant: '*', to: 'PSA_Admin' }
    // ]
    entity TimesheetEntrySrv
        as projection on database.transaction.TimesheetEntries;



    // -------------------------------------------------
    // APPROVAL WORKLIST
    // -------------------------------------------------

    // @readonly
    @cds.redirection.target: false
    entity ApprovalSrv as projection on database.transaction.Timesheets
        where STATUS = 'Submitted'
    actions {
        action approveTimesheet() returns String;
        action rejectTimesheet(reason : common.String255) returns String;
    };

    // -------------------------------------------------
    // INVOICES
    // -------------------------------------------------

    //@readonly
    // @restrict: [
    //     { grant: 'READ', to: 'PSA_Admin' }
    // ]
    entity InvoiceSrv as projection on database.transaction.Invoices {
        *,
        virtual STATUS_CRITICALITY : Integer
    } actions {
        action issueInvoice() returns String;
        action markInvoicePaid() returns String;
    };

    // -------------------------------------------------
    // ALERTS
    // -------------------------------------------------

    //@readonly
    // @restrict: [
    //     { grant: 'READ', to: 'PSA_Admin' }
    // ]
    entity AlertSrv as projection on database.transaction.Alerts {
        *,
        virtual CRITICALITY : Integer
    };

    // =================================================
    // 4. TRAINING-STYLE BULK INSERT ACTIONS
    // =================================================

    //@requires: 'PSA_Admin'
    action createEmployees(employees : CreateEmployeesIP) returns String;

    //@requires: 'PSA_Admin'
    action createClients(clients : CreateClientsIP) returns String;

    //@requires: 'PSA_Admin'
    action createProjects(projects : CreateProjectsIP) returns String;

    //@requires: 'PSA_Admin'
    action createBudgets(budgets : CreateBudgetsIP) returns String;

    //@requires: 'PSA_Admin'
    action createMilestones(milestones : CreateMilestonesIP) returns String;

    //@requires: 'PSA_Admin'
    action createTasks(tasks : CreateTasksIP) returns String;

    //@requires: 'PSA_Admin'
    action createTimesheets(timesheets : CreateTimesheetsIP) returns String;

    //@requires: 'PSA_Admin'
    action createTimesheetEntries(entries : CreateTimesheetEntriesIP) returns String;

    action recalculateTimesheetTotals() returns String;

    //@requires: 'PSA_Admin'
    action createInvoices(invoices : CreateInvoicesIP) returns String;

    // =================================================
    // 5. CREATE A TIMESHEET FOR THE LOGGED-IN EMPLOYEE
    // =================================================

    action createTimesheet(
    employeeID : UUID,
    weekStart  : Date,
    entries    : CreateTimesheetEntriesIP
) returns TimesheetSrv;

    // =================================================
    // 6. BUDGET AND ALERT OPERATIONS
    // =================================================

    //@requires: 'PSA_Admin'
    action recalculateBudget(projectID : UUID) returns String;

    //@requires: 'PSA_Admin'
    action checkBudgetAlerts(projectID : UUID) returns String;

    // =================================================
    // 7. INVOICE GENERATION
    // =================================================

    //@requires: 'PSA_Admin'
    action generateInvoice(
        projectID  : UUID,
        periodFrom : Date,
        periodTo   : Date
    ) returns InvoiceSrv;

    // =================================================
    // 8. IDENTITY AND DASHBOARD
    // =================================================

    function whoAmI() returns WhoAmI;

    function kpis() returns Kpis;

    function getBudgetSummary(projectID : UUID) returns String;

    function getProjectAlerts(projectID : UUID) returns array of AlertSrv;
}
