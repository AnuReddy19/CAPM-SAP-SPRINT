using PSAService as service from '../../srv/psa-service';
annotate service.MilestoneSrv with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'START_DATE',
                Value : START_DATE,
            },
            {
                $Type : 'UI.DataField',
                Label : 'END_DATE',
                Value : END_DATE,
            },
            {
                $Type : 'UI.DataField',
                Label : 'MILESTONE_NAME',
                Value : MILESTONE_NAME,
            },
            {
                $Type : 'UI.DataField',
                Label : 'COMPLETION_PERCENT',
                Value : COMPLETION_PERCENT,
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
            Label : 'START_DATE',
            Value : START_DATE,
        },
        {
            $Type : 'UI.DataField',
            Label : 'END_DATE',
            Value : END_DATE,
        },
        {
            $Type : 'UI.DataField',
            Label : 'MILESTONE_NAME',
            Value : MILESTONE_NAME,
        },
        {
            $Type : 'UI.DataField',
            Label : 'COMPLETION_PERCENT',
            Value : COMPLETION_PERCENT,
        },
    ],
);

annotate service.MilestoneSrv with {
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

