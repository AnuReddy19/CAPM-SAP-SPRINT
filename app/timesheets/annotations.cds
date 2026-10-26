
using PSAService as service from '../../srv/psa-service';

annotate service.TimesheetSrv with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Week Start',
                Value : WEEK_START,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Week End',
                Value : WEEK_END,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Total Hours',
                Value : TOTAL_HOURS,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Status',
                Value : STATUS,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Rejection Reason',
                Value : REJECTION_REASON,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Status Indicator',
                Value : STATUS_CRITICALITY,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Editing Locked',
                Value : IS_LOCKED,
            },
        ],
    },

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Week Start',
            Value : WEEK_START,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Week End',
            Value : WEEK_END,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Total Hours',
            Value : TOTAL_HOURS,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Status',
            Value : STATUS,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Rejection Reason',
            Value : REJECTION_REASON,
        },
    ],

    UI.HeaderInfo : {
        TypeName : 'Timesheet',
        TypeNamePlural : 'Timesheets',
        Title : {
            $Type : 'UI.DataField',
            Value : WEEK_START,
        },
        Description : {
            $Type : 'UI.DataField',
            Value : STATUS,
        },
    },
);

annotate service.TimesheetSrv with {
    EMPLOYEE @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'EmployeeSrv',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : EMPLOYEE_NODE_KEY,
                ValueListProperty : 'NODE_KEY',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'FIRST_NAME',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'LAST_NAME',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'EMAIL',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'PHONE_NUMBER',
            },
        ],
    }
};

annotate service.TimesheetSrv with {
    APPROVED_BY @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'EmployeeSrv',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : APPROVED_BY_NODE_KEY,
                ValueListProperty : 'NODE_KEY',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'FIRST_NAME',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'LAST_NAME',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'EMAIL',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'PHONE_NUMBER',
            },
        ],
    }
};
