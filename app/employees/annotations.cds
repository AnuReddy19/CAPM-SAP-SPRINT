
using PSAService as service from '../../srv/psa-service';

// =================================================
// EMPLOYEE LIST REPORT AND OBJECT PAGE
// =================================================

annotate service.EmployeeSrv with @(
    UI.SelectionFields : [
        FIRST_NAME,
        LAST_NAME,
        JOB_TITLE,
        IS_ACTIVE
    ],

    // ---------------------------------------------
    // EMPLOYEE INFORMATION
    // ---------------------------------------------

    UI.FieldGroup #EmployeeInformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'First Name',
                Value : FIRST_NAME
            },
            {
                $Type : 'UI.DataField',
                Label : 'Last Name',
                Value : LAST_NAME
            },
            {
                $Type : 'UI.DataField',
                Label : 'Job Title',
                Value : JOB_TITLE
            },
            {
                $Type : 'UI.DataField',
                Label : 'Email',
                Value : EMAIL
            },
            {
                $Type : 'UI.DataField',
                Label : 'Phone Number',
                Value : PHONE_NUMBER
            },
            {
                $Type : 'UI.DataField',
                Label : 'Manager First Name',
                Value : MANAGER.FIRST_NAME
            },
            {
                $Type : 'UI.DataField',
                Label : 'Manager Last Name',
                Value : MANAGER.LAST_NAME
            },
            {
                $Type : 'UI.DataField',
                Label : 'Hourly Rate',
                Value : HOURLY_RATE
            },
            {
                $Type : 'UI.DataField',
                Label : 'Currency',
                Value : CURRENCY_CODE
            },
            {
                $Type : 'UI.DataField',
                Label : 'Manager Role',
                Value : IS_MANAGER
            },
            {
                $Type : 'UI.DataField',
                Label : 'Active Employee',
                Value : IS_ACTIVE
            }
        ]
    },

    // ---------------------------------------------
    // EMPLOYEE LIST
    // ---------------------------------------------

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'First Name',
            Value : FIRST_NAME
        },
        {
            $Type : 'UI.DataField',
            Label : 'Last Name',
            Value : LAST_NAME
        },
        {
            $Type : 'UI.DataField',
            Label : 'Job Title',
            Value : JOB_TITLE
        },
        {
            $Type : 'UI.DataField',
            Label : 'Email',
            Value : EMAIL
        },
        {
            $Type : 'UI.DataField',
            Label : 'Phone Number',
            Value : PHONE_NUMBER
        },
        {
            $Type : 'UI.DataField',
            Label : 'Active',
            Value : IS_ACTIVE
        }
    ],

    // ---------------------------------------------
    // OBJECT PAGE SECTIONS
    // ---------------------------------------------

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'EmployeeInformation',
            Label : 'Employee Information',
            Target : '@UI.FieldGroup#EmployeeInformation'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'EmployeeTimesheetHistory',
            Label : 'Timesheet History',
            Target : 'TIMESHEETS/@UI.LineItem#EmployeeTimesheets'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'EmployeeAssignedTasks',
            Label : 'Assigned Tasks',
            Target : 'ASSIGNED_TASKS/@UI.LineItem#EmployeeTasks'
        }
    ]
);

// =================================================
// TIMESHEET HISTORY TABLE
// =================================================

annotate service.TimesheetSrv with @(
    UI.LineItem #EmployeeTimesheets : [
        {
            $Type : 'UI.DataField',
            Label : 'Week Start',
            Value : WEEK_START
        },
        {
            $Type : 'UI.DataField',
            Label : 'Week End',
            Value : WEEK_END
        },
        {
            $Type : 'UI.DataField',
            Label : 'Total Hours',
            Value : TOTAL_HOURS
        },
        {
            $Type : 'UI.DataField',
            Label : 'Status',
            Value : STATUS
        },
        {
            $Type : 'UI.DataField',
            Label : 'Rejection Reason',
            Value : REJECTION_REASON
        }
    ]
);

// =================================================
// ASSIGNED TASKS TABLE
// =================================================

annotate service.TaskSrv with @(
    UI.LineItem #EmployeeTasks : [
        {
            $Type : 'UI.DataField',
            Label : 'Task Name',
            Value : TASK_NAME
        },
        {
            $Type : 'UI.DataField',
            Label : 'Status',
            Value : STATUS
        },
        {
            $Type : 'UI.DataField',
            Label : 'Estimated Hours',
            Value : ESTIMATED_HOURS
        },
        {
            $Type : 'UI.DataField',
            Label : 'Actual Hours',
            Value : ACTUAL_HOURS
        },
        {
            $Type : 'UI.DataField',
            Label : 'Burn Percentage',
            Value : BURN_PERCENT
        }
    ]
);

// =================================================
// MANAGER VALUE HELP
// =================================================

annotate service.EmployeeSrv with {
    MANAGER @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'EmployeeSrv',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : MANAGER_NODE_KEY,
                ValueListProperty : 'NODE_KEY'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'FIRST_NAME'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'LAST_NAME'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'EMAIL'
            }
        ]
    };
};
