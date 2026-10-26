
using PSAService as service from '../../srv/psa-service';

annotate service.ProjectSrv with @(
    UI.SelectionFields: [
        PROJECT_CODE,
        PROJECT_NAME,
        PROJECT_STATUS,
        BILLING_TYPE,
        START_DATE,
        END_DATE
    ],

    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data: [
            {
                $Type: 'UI.DataField',
                Label: 'Project Code',
                Value: PROJECT_CODE
            },
            {
                $Type: 'UI.DataField',
                Label: 'Project Name',
                Value: PROJECT_NAME
            },
            {
                $Type: 'UI.DataField',
                Label: 'Project Status',
                Value: PROJECT_STATUS
            },
            {
                $Type: 'UI.DataField',
                Label: 'Billing Type',
                Value: BILLING_TYPE
            },
            {
                $Type: 'UI.DataField',
                Label: 'Start Date',
                Value: START_DATE
            },
            {
                $Type: 'UI.DataField',
                Label: 'End Date',
                Value: END_DATE
            },
            {
                $Type: 'UI.DataField',
                Label: 'Planned Hours',
                Value: PLANNED_HOURS
            },
            {
                $Type: 'UI.DataField',
                Label: 'Consumed Hours',
                Value: CONSUMED_HOURS
            },
            {
                $Type: 'UI.DataField',
                Label: 'Hours Percentage',
                Value: HOURS_PERCENT
            }
        ]
    },

    
UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Label: 'Project Code',
        Value: PROJECT_CODE
    },
    {
        $Type: 'UI.DataField',
        Label: 'Project Name',
        Value: PROJECT_NAME
    },
    {
        $Type: 'UI.DataField',
        Label: 'Client',
        Value: CLIENT
    },
    {
        $Type: 'UI.DataField',
        Label: 'Billing Type',
        Value: BILLING_TYPE
    },
    {
        $Type: 'UI.DataField',
        Label: 'Status',
        Value: PROJECT_STATUS
    },
    {
        $Type: 'UI.DataField',
        Label: 'Consumed Hours',
        Value: CONSUMED_HOURS
    }
]

);

annotate service.ProjectSrv with {
    CLIENT @Common.ValueList: {
        $Type: 'Common.ValueListType',
        CollectionPath: 'ClientSrv',
        Parameters: [
            {
                $Type: 'Common.ValueListParameterInOut',
                LocalDataProperty: CLIENT_NODE_KEY,
                ValueListProperty: 'NODE_KEY'
            },
            {
                $Type: 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'STREET'
            },
            {
                $Type: 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'BUILDING'
            },
            {
                $Type: 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'CITY'
            },
            {
                $Type: 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'POSTAL_CODE'
            }
        ]
    };

    MANAGER @Common.ValueList: {
        $Type: 'Common.ValueListType',
        CollectionPath: 'EmployeeSrv',
        Parameters: [
            {
                $Type: 'Common.ValueListParameterInOut',
                LocalDataProperty: MANAGER_NODE_KEY,
                ValueListProperty: 'NODE_KEY'
            },
            {
                $Type: 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'FIRST_NAME'
            },
            {
                $Type: 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'LAST_NAME'
            },
            {
                $Type: 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'EMAIL'
            },
            {
                $Type: 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'PHONE_NUMBER'
            }
        ]
    };
};


// -------------------------------------------------
// BUDGET INFORMATION
// -------------------------------------------------

annotate service.BudgetSrv with @(
    UI.FieldGroup #BudgetDetails : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Budget Amount',
                Value : BUDGET_AMOUNT
            },
            {
                $Type : 'UI.DataField',
                Label : 'Billing Rate',
                Value : BILLING_RATE
            },
            {
                $Type : 'UI.DataField',
                Label : 'Retainer Fee',
                Value : RETAINER_FEE
            },
            {
                $Type : 'UI.DataField',
                Label : 'Currency',
                Value : CURRENCY_CODE
            },
            {
                $Type : 'UI.DataField',
                Label : 'Consumed Amount',
                Value : CONSUMED_AMOUNT
            },
            {
                $Type : 'UI.DataField',
                Label : 'Remaining Amount',
                Value : REMAINING_AMOUNT
            },
            {
                $Type : 'UI.DataField',
                Label : 'Consumed Percentage',
                Value : CONSUMED_PERCENT
            },
            {
                $Type : 'UI.DataField',
                Label : 'Budget Status',
                Value : BUDGET_STATUS
            }
        ]
    }
);


// -------------------------------------------------
// PROJECT MILESTONES
// -------------------------------------------------

annotate service.MilestoneSrv with @(
    UI.LineItem #Milestones : [
        {
            $Type  : 'UI.DataField',
            Label  : 'Milestone',
            Value  : MILESTONE_NAME
        },
        {
            $Type  : 'UI.DataField',
            Label  : 'Start Date',
            Value  : START_DATE
        },
        {
            $Type  : 'UI.DataField',
            Label  : 'End Date',
            Value  : END_DATE
        },
        {
            $Type  : 'UI.DataField',
            Label  : 'Completion',
            Value  : COMPLETION_PERCENT
        }
    ]
);

// -------------------------------------------------
// PROJECT OBJECT PAGE SECTIONS
// -------------------------------------------------

annotate service.ProjectSrv with @UI.Facets : [
    {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'GeneratedFacet1',
        Label  : 'General Information',
        Target : '@UI.FieldGroup#GeneratedGroup'
    },
    
    {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'BudgetFacet',
        Label  : 'Budget Information',
        Target : 'BUDGET/@UI.FieldGroup#BudgetDetails'
    },

    {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'MilestonesFacet',
        Label  : 'Milestones',
        Target : 'MILESTONES/@UI.LineItem#Milestones'
    }
];