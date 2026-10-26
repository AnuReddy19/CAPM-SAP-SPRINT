namespace psaa.db;

using { psaa.common as common } from './common';

// =====================================================
// MASTER DATA CONTEXT
// =====================================================

context master {

    // -------------------------------------------------
    // CLIENTS
    // -------------------------------------------------

    entity Clients : common.AuditInfo, common.Address {

        @cds.on.insert: $uuid
        key NODE_KEY : common.Guid;

        CLIENT_NAME    : common.String100 not null;
        CLIENT_STATUS  : common.ClientStatus default #ACTIVE;

        CONTACT_PERSON : common.String100;
        EMAIL          : common.Email;
        PHONE          : common.PhoneNo;

        PROJECTS       : Association to many transaction.Projects
                             on PROJECTS.CLIENT = $self;
    }

    // -------------------------------------------------
    // EMPLOYEES
    // -------------------------------------------------

    entity Employees : common.AuditInfo {

        @cds.on.insert: $uuid
        key NODE_KEY : common.Guid;

        FIRST_NAME    : common.String60 not null;
        LAST_NAME     : common.String60 not null;

        EMAIL         : common.Email not null;
        PHONE_NUMBER  : common.PhoneNo;
        JOB_TITLE     : common.String100;

        CURRENCY_CODE : common.CurrencyCode default 'INR';
        HOURLY_RATE   : common.Amount default 0;

        IS_MANAGER    : Boolean default false;
        IS_ACTIVE     : Boolean default true;

        MANAGER       : Association to Employees;

        PROJECTS      : Association to many transaction.Projects
                            on PROJECTS.MANAGER = $self;

        TIMESHEETS    : Association to many transaction.Timesheets
                            on TIMESHEETS.EMPLOYEE = $self;

        APPROVED_SHEETS : Association to many transaction.Timesheets
                              on APPROVED_SHEETS.APPROVED_BY = $self;

        ASSIGNED_TASKS : Association to many transaction.Tasks
                             on ASSIGNED_TASKS.ASSIGNEE = $self;
    }
}

// =====================================================
// TRANSACTION CONTEXT
// =====================================================

context transaction {

    // -------------------------------------------------
    // PROJECTS
    // -------------------------------------------------

    entity Projects : common.AuditInfo, common.DateRange {

        @cds.on.insert: $uuid
        key NODE_KEY : common.Guid;

        PROJECT_CODE   : common.String32 not null;
        PROJECT_NAME   : common.String100 not null;
        PROJECT_STATUS : common.ProjectStatus default #DRAFT;

        BILLING_TYPE   : common.BillingType default #TM;

        PLANNED_HOURS  : common.Hours default 0;
        CONSUMED_HOURS : common.Hours default 0;

        CLIENT         : Association to master.Clients;
        MANAGER        : Association to master.Employees;

        BUDGET         : Association to one Budgets
                             on BUDGET.PROJECT = $self;

        MILESTONES     : Association to many Milestones
                             on MILESTONES.PROJECT = $self;

        ALERTS         : Association to many Alerts
                             on ALERTS.PROJECT = $self;

        INVOICES       : Association to many Invoices
                             on INVOICES.PROJECT = $self;
    }

    // -------------------------------------------------
    // BUDGETS
    // -------------------------------------------------

    entity Budgets : common.AuditInfo {

        @cds.on.insert: $uuid
        key NODE_KEY : common.Guid;

        BUDGET_AMOUNT    : common.Amount not null;
        BILLING_RATE     : common.Amount not null;
        RETAINER_FEE     : common.Amount default 0;

        CURRENCY_CODE    : common.CurrencyCode default 'INR';

        CONSUMED_AMOUNT  : common.Amount default 0;
        REMAINING_AMOUNT : common.Amount default 0;
        CONSUMED_PERCENT : common.Percentage default 0;

        BUDGET_STATUS    : common.BudgetStatus
                               default #WITHIN_BUDGET;

        PROJECT          : Association to one Projects;
    }

    // -------------------------------------------------
    // MILESTONES
    // -------------------------------------------------

    entity Milestones : common.AuditInfo, common.DateRange {

        @cds.on.insert: $uuid
        key NODE_KEY : common.Guid;

        MILESTONE_NAME     : common.String100 not null;
        COMPLETION_PERCENT : common.Percentage default 0;

        PROJECT            : Association to Projects;

        TASKS              : Association to many Tasks
                                 on TASKS.MILESTONE = $self;
    }

    // -------------------------------------------------
    // TASKS
    // -------------------------------------------------

    entity Tasks : common.AuditInfo {

        @cds.on.insert: $uuid
        key NODE_KEY : common.Guid;

        TASK_NAME       : common.String100 not null;
        STATUS          : common.TaskStatus default #TODO;

        ESTIMATED_HOURS : common.Hours not null;
        ACTUAL_HOURS    : common.Hours default 0;
        BURN_PERCENT    : common.Percentage default 0;

        MILESTONE       : Association to Milestones;
        ASSIGNEE        : Association to master.Employees;
    }

    // -------------------------------------------------
    // TIMESHEETS
    // -------------------------------------------------

    entity Timesheets : common.AuditInfo {

        @cds.on.insert: $uuid
        key NODE_KEY : common.Guid;

        WEEK_START       : Date not null;
        WEEK_END         : Date not null;

        TOTAL_HOURS      : common.Hours default 0;
        STATUS           : common.TimesheetStatus default #DRAFT;
        REJECTION_REASON : common.String255;

        EMPLOYEE         : Association to master.Employees;
        APPROVED_BY      : Association to master.Employees;

        ENTRIES          : Association to many TimesheetEntries
                               on ENTRIES.PARENT = $self;
    }

    // -------------------------------------------------
    // TIMESHEET ENTRIES
    // -------------------------------------------------

    entity TimesheetEntries : common.AuditInfo {

        @cds.on.insert: $uuid
        key NODE_KEY : common.Guid;

        WORK_DATE   : Date not null;
        HOURS       : Decimal(4,2) not null;
        IS_BILLABLE : Boolean default true;
        NOTES       : common.String255;

        PARENT      : Association to Timesheets;
        TASK        : Association to Tasks;
        INVOICE     : Association to Invoices;
    }

    // -------------------------------------------------
    // INVOICES
    // -------------------------------------------------

    entity Invoices : common.AuditInfo, common.AmountFields {

        @cds.on.insert: $uuid
        key NODE_KEY : common.Guid;

        INVOICE_NO     : common.String32 not null;

        PERIOD_FROM    : Date not null;
        PERIOD_TO      : Date not null;

        INVOICE_DATE   : Date not null;
        DUE_DATE       : Date not null;

        BILLABLE_HOURS : common.Hours default 0;
        STATUS         : common.InvoiceStatus default #DRAFT;

        PROJECT        : Association to Projects;

        ENTRIES        : Association to many TimesheetEntries
                             on ENTRIES.INVOICE = $self;
    }

    // -------------------------------------------------
    // SCOPE-CREEP ALERTS
    // -------------------------------------------------

    entity Alerts : common.AuditInfo {

        @cds.on.insert: $uuid
        key NODE_KEY : common.Guid;

        THRESHOLD        : common.Percentage not null;
        CONSUMED_PERCENT : common.Percentage not null;
        MESSAGE          : common.String255 not null;

        PROJECT          : Association to Projects;
        TASK             : Association to Tasks;
    }
}
