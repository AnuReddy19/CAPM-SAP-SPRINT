using PSAService as service from '../../srv/psa-service';
annotate service.ApprovalSrv with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'WEEK_START',
                Value : WEEK_START,
            },
            {
                $Type : 'UI.DataField',
                Label : 'WEEK_END',
                Value : WEEK_END,
            },
            {
                $Type : 'UI.DataField',
                Label : 'TOTAL_HOURS',
                Value : TOTAL_HOURS,
            },
            {
                $Type : 'UI.DataField',
                Label : 'STATUS',
                Value : STATUS,
            },
            {
                $Type : 'UI.DataField',
                Label : 'REJECTION_REASON',
                Value : REJECTION_REASON,
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
            Label : 'WEEK_START',
            Value : WEEK_START,
        },
        {
            $Type : 'UI.DataField',
            Label : 'WEEK_END',
            Value : WEEK_END,
        },
        {
            $Type : 'UI.DataField',
            Label : 'TOTAL_HOURS',
            Value : TOTAL_HOURS,
        },
        {
            $Type : 'UI.DataField',
            Label : 'STATUS',
            Value : STATUS,
        },
        {
            $Type : 'UI.DataField',
            Label : 'REJECTION_REASON',
            Value : REJECTION_REASON,
        },
    ],
);

annotate service.ApprovalSrv with {
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

annotate service.ApprovalSrv with {
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

