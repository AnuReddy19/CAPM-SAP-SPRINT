using PSAService as service from '../../srv/psa-service';
annotate service.BudgetSrv with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'BUDGET_AMOUNT',
                Value : BUDGET_AMOUNT,
            },
            {
                $Type : 'UI.DataField',
                Label : 'BILLING_RATE',
                Value : BILLING_RATE,
            },
            {
                $Type : 'UI.DataField',
                Label : 'RETAINER_FEE',
                Value : RETAINER_FEE,
            },
            {
                $Type : 'UI.DataField',
                Label : 'CURRENCY_CODE',
                Value : CURRENCY_CODE,
            },
            {
                $Type : 'UI.DataField',
                Label : 'CONSUMED_AMOUNT',
                Value : CONSUMED_AMOUNT,
            },
            {
                $Type : 'UI.DataField',
                Label : 'REMAINING_AMOUNT',
                Value : REMAINING_AMOUNT,
            },
            {
                $Type : 'UI.DataField',
                Label : 'CONSUMED_PERCENT',
                Value : CONSUMED_PERCENT,
            },
            {
                $Type : 'UI.DataField',
                Label : 'BUDGET_STATUS',
                Value : BUDGET_STATUS,
            },
            {
                $Type : 'UI.DataField',
                Label : 'CRITICALITY',
                Value : CRITICALITY,
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
            Label : 'BUDGET_AMOUNT',
            Value : BUDGET_AMOUNT,
        },
        {
            $Type : 'UI.DataField',
            Label : 'BILLING_RATE',
            Value : BILLING_RATE,
        },
        {
            $Type : 'UI.DataField',
            Label : 'RETAINER_FEE',
            Value : RETAINER_FEE,
        },
        {
            $Type : 'UI.DataField',
            Label : 'CURRENCY_CODE',
            Value : CURRENCY_CODE,
        },
        {
            $Type : 'UI.DataField',
            Label : 'CONSUMED_AMOUNT',
            Value : CONSUMED_AMOUNT,
        },
    ],
);

annotate service.BudgetSrv with {
    PROJECT @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'ProjectSrv',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : PROJECT_NODE_KEY,
                ValueListProperty : 'NODE_KEY',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'START_DATE',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'END_DATE',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'PROJECT_CODE',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'PROJECT_NAME',
            },
        ],
    }
};

