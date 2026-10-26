using PSAService as service from '../../srv/psa-service';
annotate service.AlertSrv with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'THRESHOLD',
                Value : THRESHOLD,
            },
            {
                $Type : 'UI.DataField',
                Label : 'CONSUMED_PERCENT',
                Value : CONSUMED_PERCENT,
            },
            {
                $Type : 'UI.DataField',
                Label : 'MESSAGE',
                Value : MESSAGE,
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
            Label : 'THRESHOLD',
            Value : THRESHOLD,
        },
        {
            $Type : 'UI.DataField',
            Label : 'CONSUMED_PERCENT',
            Value : CONSUMED_PERCENT,
        },
        {
            $Type : 'UI.DataField',
            Label : 'MESSAGE',
            Value : MESSAGE,
        },
        {
            $Type : 'UI.DataField',
            Label : 'CRITICALITY',
            Value : CRITICALITY,
        },
    ],
);

annotate service.AlertSrv with {
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

annotate service.AlertSrv with {
    TASK @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'TaskSrv',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : TASK_NODE_KEY,
                ValueListProperty : 'NODE_KEY',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'TASK_NAME',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'STATUS',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'ESTIMATED_HOURS',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'ACTUAL_HOURS',
            },
        ],
    }
};

