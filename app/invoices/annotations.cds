using PSAService as service from '../../srv/psa-service';
annotate service.InvoiceSrv with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'NET_AMOUNT',
                Value : NET_AMOUNT,
            },
            {
                $Type : 'UI.DataField',
                Label : 'TAX_AMOUNT',
                Value : TAX_AMOUNT,
            },
            {
                $Type : 'UI.DataField',
                Label : 'GROSS_AMOUNT',
                Value : GROSS_AMOUNT,
            },
            {
                $Type : 'UI.DataField',
                Label : 'CURRENCY',
                Value : CURRENCY,
            },
            {
                $Type : 'UI.DataField',
                Label : 'INVOICE_NO',
                Value : INVOICE_NO,
            },
            {
                $Type : 'UI.DataField',
                Label : 'PERIOD_FROM',
                Value : PERIOD_FROM,
            },
            {
                $Type : 'UI.DataField',
                Label : 'PERIOD_TO',
                Value : PERIOD_TO,
            },
            {
                $Type : 'UI.DataField',
                Label : 'INVOICE_DATE',
                Value : INVOICE_DATE,
            },
            {
                $Type : 'UI.DataField',
                Label : 'DUE_DATE',
                Value : DUE_DATE,
            },
            {
                $Type : 'UI.DataField',
                Label : 'BILLABLE_HOURS',
                Value : BILLABLE_HOURS,
            },
            {
                $Type : 'UI.DataField',
                Label : 'STATUS',
                Value : STATUS,
            },
            {
                $Type : 'UI.DataField',
                Label : 'STATUS_CRITICALITY',
                Value : STATUS_CRITICALITY,
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
            $Type : 'UI.DataFieldForAction',
            Action : 'PSAService.issueInvoice',
            Label : 'Issue Invoice',
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'PSAService.markInvoicePaid',
            Label : 'Mark as Paid',
        },
        {
            $Type : 'UI.DataField',
            Label : 'NET_AMOUNT',
            Value : NET_AMOUNT,
        },
        {
            $Type : 'UI.DataField',
            Label : 'TAX_AMOUNT',
            Value : TAX_AMOUNT,
        },
        {
            $Type : 'UI.DataField',
            Label : 'GROSS_AMOUNT',
            Value : GROSS_AMOUNT,
        },
        {
            $Type : 'UI.DataField',
            Label : 'CURRENCY',
            Value : CURRENCY,
        },
        {
            $Type : 'UI.DataField',
            Label : 'INVOICE_NO',
            Value : INVOICE_NO,
        },
    ],
);

annotate service.InvoiceSrv with {
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

